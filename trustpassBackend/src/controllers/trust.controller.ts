import { Request, Response } from "express";
import { z } from "zod";
import prisma from "../config/prisma";
import { validateApiKey } from "../services/apiKey.service";
import { checkRequestLimit, recordApiUsage } from "../services/usage.service";
import { assessProtectedAction } from "../services/trustEngine.service";
import { collectSelectedEvidence } from "../services/networkSignal.service";
import {
  calculateTrustDecision,
  saveTrustDecision,
} from "../services/trustDecision.service";
import { analyzeOtpActivity } from "../services/otpActivity.service";
import { runTrustAgent } from "../services/aiAgent.service";
import {
  createNumberVerificationAuthorizationUrl,
  isNumberVerificationConfigured,
  isNumberVerificationBypassed,
} from "../services/numberVerification.service";

const trustCheckSchema = z.object({
  action: z.string().min(1),
  phoneNumber: z.string().optional(),
  ipAddress: z.string().optional(),
  userAgent: z.string().optional(),
  attemptCount: z.number().int().min(1).optional(),
});

export async function trustCheck(req: Request, res: Response) {
  try {
    const apiKey = req.headers["x-api-key"];

    if (!apiKey || typeof apiKey !== "string") {
      return res.status(401).json({
        message: "API key is required",
      });
    }

    const validatedKey = await validateApiKey(apiKey);

    if (!validatedKey) {
      return res.status(401).json({
        message: "Invalid or inactive API key",
      });
    }

    const usageCheck = await checkRequestLimit(validatedKey.clientId);

    if (!usageCheck.allowed) {
      return res.status(429).json({
        message: usageCheck.reason,
        remainingRequests: usageCheck.remainingRequests,
      });
    }

    const parsed = trustCheckSchema.safeParse(req.body);

    if (!parsed.success) {
      return res.status(400).json({
        message: "Invalid request",
        errors: parsed.error.flatten(),
      });
    }

    const { action, phoneNumber, ipAddress, userAgent, attemptCount } =
      parsed.data;

    const protectedAction = await prisma.protectedAction.findFirst({
      where: {
        clientId: validatedKey.clientId,
        name: action,
        isActive: true,
      },
    });

    if (!protectedAction) {
      return res.status(404).json({
        message: "Protected action not found or inactive",
      });
    }

    const requestId = `TR-${Date.now()}-${Math.random()
      .toString(36)
      .substring(2, 8)
      .toUpperCase()}`;

    const trustRequest = await prisma.trustRequest.create({
      data: {
        clientId: validatedKey.clientId,
        protectedActionId: protectedAction.id,
        requestId,
        phoneNumber,
        ipAddress,
        userAgent,
        status: "PENDING",
      },
    });

    const assessment = await assessProtectedAction({
      protectedActionId: protectedAction.id,
      phoneNumber,
      ipAddress,
      userAgent,
    });

    const aiDecision = await runTrustAgent({
      action,
      phoneNumber,
      ipAddress,
      userAgent,
      attemptCount,
      actionRiskLevel: assessment.actionRiskLevel,
    });

    if (
      aiDecision.selectedSignals.includes("NUMBER_VERIFICATION") &&
      !isNumberVerificationConfigured()
    ) {
      aiDecision.selectedSignals = aiDecision.selectedSignals.filter(
        (signal) => signal !== "NUMBER_VERIFICATION"
      );
      aiDecision.reason = `${aiDecision.reason} Number Verification is not configured, so the available network signals will be used.`;
      console.warn(
        "Number Verification is not configured; continuing with available signals."
      );
    }

    await prisma.trustRequest.update({
      where: { id: trustRequest.id },
      data: {
        aiSelectedSignals: JSON.stringify(aiDecision.selectedSignals),
      },
    });

    if (
      aiDecision.selectedSignals.includes("NUMBER_VERIFICATION") &&
      !isNumberVerificationBypassed()
    ) {
      if (!phoneNumber) {
        return res.status(400).json({
          message: "Phone number is required for Number Verification",
          requestId: trustRequest.requestId,
        });
      }

      const numberVerification = createNumberVerificationAuthorizationUrl(
        phoneNumber,
        trustRequest.id
      );

      await prisma.trustRequest.update({
        where: { id: trustRequest.id },
        data: {
          numberVerificationState: numberVerification.state,
          status: "PENDING",
        },
      });

      return res.status(202).json({
        requestId: trustRequest.requestId,
        status: "PENDING",
        pendingAction: "NUMBER_VERIFICATION",
        authorizationUrl: numberVerification.authorizationUrl,
        assessment: {
          actionRiskLevel: assessment.actionRiskLevel,
          evidenceRequirements: assessment.evidenceRequirements,
        },
        aiAgent: {
          riskAssessment: aiDecision.riskAssessment,
          selectedSignals: aiDecision.selectedSignals,
          additionalEvidenceNeeded: aiDecision.additionalEvidenceNeeded,
          reason: aiDecision.reason,
        },
        message: "Number Verification is required to complete the trust assessment.",
      });
    }

    const signals = await collectSelectedEvidence(
      trustRequest.id,
      aiDecision.selectedSignals,
      phoneNumber
    );

    let otpActivity = null;

    if (action === "OTP_REQUEST") {
      otpActivity = await analyzeOtpActivity(
        validatedKey.clientId,
        phoneNumber,
        ipAddress,
        attemptCount
      );

      await prisma.riskSignal.create({
        data: {
          trustRequestId: trustRequest.id,
          signalType: "OTP_BOMBING",
          source: "TRUSTPASS_BEHAVIOR_ENGINE",
          value: String(otpActivity.attemptCount),
          riskScore: otpActivity.riskScore,
          isPositive: otpActivity.isPositive,
          details: otpActivity.details,
        },
      });

      signals.push({
        signalType: "OTP_BOMBING",
        source: "TRUSTPASS_BEHAVIOR_ENGINE",
        value: String(otpActivity.attemptCount),
        riskScore: otpActivity.riskScore,
        isPositive: !otpActivity.isBombing,
        details: otpActivity.details,
      });
    }

    const decisionResult = calculateTrustDecision({
      actionRiskLevel: assessment.actionRiskLevel,
      signals: signals.map((signal) => ({
        signalType: signal.signalType,
        riskScore: signal.riskScore,
        isPositive: signal.isPositive,
        details: signal.details,
      })),
    });

    const savedDecision = await saveTrustDecision(
      trustRequest.id,
      decisionResult
    );

    await recordApiUsage(
      validatedKey.clientId,
      validatedKey.id,
      "/api/v1/trust/check",
      "POST",
      200,
      trustRequest.requestId
    );

    return res.status(200).json({
      requestId: trustRequest.requestId,
      status: "COMPLETED",
      assessment: {
        actionRiskLevel: assessment.actionRiskLevel,
        evidenceRequirements: assessment.evidenceRequirements,
      },
      aiAgent: {
        riskAssessment: aiDecision.riskAssessment,
        selectedSignals: aiDecision.selectedSignals,
        additionalEvidenceNeeded: aiDecision.additionalEvidenceNeeded,
        reason: aiDecision.reason,
      },
      signals,
      decision: {
        trustScore: savedDecision.trustScore,
        riskLevel: savedDecision.riskLevel,
        decision: savedDecision.decision,
        explanation: savedDecision.explanation,
      },
      message: "Trust assessment completed",
    });
  } catch (error) {
    console.error("Trust check failed:", error);

    return res.status(500).json({
      message: "Internal server error",
    });
  }
}
