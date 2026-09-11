import { Request, Response } from "express";
import { z } from "zod";
import prisma from "../config/prisma";

import { validateApiKey } from "../services/apiKey.service";

import {
    checkRequestLimit,
    recordApiUsage,
} from "../services/usage.service";

import {
    assessProtectedAction,
} from "../services/trustEngine.service";

import {
    collectSelectedEvidence,
} from "../services/networkSignal.service";

import {
    calculateTrustDecision,
    saveTrustDecision,
} from "../services/trustDecision.service";

import {
    analyzeOtpActivity,
} from "../services/otpActivity.service";

import {
    runTrustAgent,
} from "../services/aiAgent.service";

import {
    createNumberVerificationAuthorizationUrl,
    isNumberVerificationConfigured,
} from "../services/numberVerification.service";


const trustCheckSchema = z.object({
    action: z.string().min(1),

    phoneNumber: z.string().optional(),

    ipAddress: z.string().optional(),

    userAgent: z.string().optional(),

    attemptCount: z
        .number()
        .int()
        .min(1)
        .optional(),
});


export async function trustCheck(
    req: Request,
    res: Response
) {
    try {

        // =========================================================
        // 1. Validate API key
        // =========================================================

        const apiKey = req.headers["x-api-key"];

        if (
            !apiKey ||
            typeof apiKey !== "string"
        ) {
            return res.status(401).json({
                message: "API key is required",
            });
        }

        const validatedKey =
            await validateApiKey(apiKey);

        if (!validatedKey) {
            return res.status(401).json({
                message:
                    "Invalid or inactive API key",
            });
        }


        // =========================================================
        // 2. Check subscription and request limit
        // =========================================================

        const usageCheck =
            await checkRequestLimit(
                validatedKey.clientId
            );

        if (!usageCheck.allowed) {
            return res.status(429).json({
                message: usageCheck.reason,

                remainingRequests:
                    usageCheck.remainingRequests,
            });
        }


        // =========================================================
        // 3. Validate request body
        // =========================================================

        const parsed =
            trustCheckSchema.safeParse(
                req.body
            );

        if (!parsed.success) {
            return res.status(400).json({
                message: "Invalid request",

                errors:
                    parsed.error.flatten(),
            });
        }

        const {
            action,
            phoneNumber,
            ipAddress,
            userAgent,
            attemptCount,
        } = parsed.data;


        // =========================================================
        // 4. Find protected action
        // =========================================================

        const protectedAction =
            await prisma.protectedAction.findFirst({
                where: {
                    clientId:
                        validatedKey.clientId,

                    name:
                        action,

                    isActive:
                        true,
                },
            });

        if (!protectedAction) {
            return res.status(404).json({
                message:
                    "Protected action not found or inactive",
            });
        }


        // =========================================================
        // 5. Generate unique TrustPass request ID
        // =========================================================

        const requestId =
            `TR-${Date.now()}-${Math.random()
                .toString(36)
                .substring(2, 8)
                .toUpperCase()}`;


        // =========================================================
        // 6. Create TrustRequest
        // =========================================================

        const trustRequest =
            await prisma.trustRequest.create({
                data: {
                    clientId:
                        validatedKey.clientId,

                    protectedActionId:
                        protectedAction.id,

                    requestId,

                    phoneNumber,

                    ipAddress,

                    userAgent,

                    status:
                        "PENDING",
                },
            });


        // =========================================================
        // 7. Trust Engine assesses protected action
        // =========================================================

        const assessment =
            await assessProtectedAction({
                protectedActionId:
                    protectedAction.id,

                phoneNumber,

                ipAddress,

                userAgent,
            });


        // =========================================================
        // 8. TrustPass AI Agent decides which
        //    network signals should be collected
        // =========================================================

        console.log(
            "========================================"
        );

        console.log(
            "🤖 Starting TrustPass AI Agent"
        );

        const aiDecision =
            await runTrustAgent({
                action,

                phoneNumber,

                ipAddress,

                userAgent,

                attemptCount,

                actionRiskLevel:
                    assessment.actionRiskLevel,
            });

        console.log(
            "🤖 AI Agent selected signals:",
            aiDecision.selectedSignals
        );

        console.log(
            "🤖 AI Agent risk assessment:",
            aiDecision.riskAssessment
        );

        console.log(
            "🤖 Additional evidence needed:",
            aiDecision.additionalEvidenceNeeded
        );

        console.log(
            "🤖 AI Agent reason:",
            aiDecision.reason
        );

        console.log(
            "========================================"
        );

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


        // =========================================================
        // 8.1. Persist AI-selected signals
        // =========================================================

        await prisma.trustRequest.update({
            where: {
                id:
                    trustRequest.id,
            },

            data: {
                aiSelectedSignals:
                    JSON.stringify(
                        aiDecision.selectedSignals
                    ),
            },
        });


        // =========================================================
        // 8.5. Handle Number Verification if selected by AI
        // =========================================================

        if (
            aiDecision.selectedSignals.includes(
                "NUMBER_VERIFICATION"
            )
        ) {

            if (!phoneNumber) {

                return res.status(400).json({

                    message:
                        "Phone number is required for Number Verification",

                    requestId:
                        trustRequest.requestId,
                });
            }


            const numberVerification =
                createNumberVerificationAuthorizationUrl(
                    phoneNumber,

                    trustRequest.id
                );


            // -----------------------------------------------------
            // Save Nokia OAuth state
            // -----------------------------------------------------

            await prisma.trustRequest.update({

                where: {
                    id:
                        trustRequest.id,
                },

                data: {

                    numberVerificationState:
                        numberVerification.state,

                    status:
                        "PENDING",
                },
            });


            // -----------------------------------------------------
            // Return PENDING
            // -----------------------------------------------------

            return res.status(202).json({

                requestId:
                    trustRequest.requestId,

                status:
                    "PENDING",

                pendingAction:
                    "NUMBER_VERIFICATION",

                authorizationUrl:
                    numberVerification.authorizationUrl,


                // -------------------------------------------------
                // Protected action assessment
                // -------------------------------------------------

                assessment: {

                    actionRiskLevel:
                        assessment.actionRiskLevel,

                    evidenceRequirements:
                        assessment.evidenceRequirements,
                },


                // -------------------------------------------------
                // AI Agent information
                // -------------------------------------------------

                aiAgent: {

                    riskAssessment:
                        aiDecision.riskAssessment,

                    selectedSignals:
                        aiDecision.selectedSignals,

                    additionalEvidenceNeeded:
                        aiDecision.additionalEvidenceNeeded,

                    reason:
                        aiDecision.reason,
                },


                message:
                    "Number Verification is required to complete the trust assessment.",
            });
        }


        // =========================================================
        // 9. Collect network evidence selected
        //    by the AI Agent
        // =========================================================

        const signals =
            await collectSelectedEvidence(

                trustRequest.id,

                aiDecision.selectedSignals,

                phoneNumber
            );


        // =========================================================
        // 10. Analyze OTP behavior
        // =========================================================

        let otpActivity = null;

        if (
            action === "OTP_REQUEST"
        ) {

            otpActivity =
                await analyzeOtpActivity(

                    validatedKey.clientId,

                    phoneNumber,

                    ipAddress,

                    attemptCount
                );


            // -----------------------------------------------------
            // Save OTP bombing as RiskSignal
            // -----------------------------------------------------

            await prisma.riskSignal.create({

                data: {

                    trustRequestId:
                        trustRequest.id,

                    signalType:
                        "OTP_BOMBING",

                    source:
                        "TRUSTPASS_BEHAVIOR_ENGINE",

                    value:
                        String(
                            otpActivity.attemptCount
                        ),

                    riskScore:
                        otpActivity.riskScore,

                    isPositive:
                        otpActivity.isPositive,

                    details:
                        otpActivity.details,
                },
            });


            // -----------------------------------------------------
            // Add behavioral signal to response
            // -----------------------------------------------------

            signals.push({

                signalType:
                    "OTP_BOMBING",

                source:
                    "TRUSTPASS_BEHAVIOR_ENGINE",

                value:
                    String(
                        otpActivity.attemptCount
                    ),

                riskScore:
                    otpActivity.riskScore,

                isPositive:
                    !otpActivity.isBombing,

                details:
                    otpActivity.details,
            });
        }


        // =========================================================
        // 11. Calculate final TrustPass decision
        // =========================================================

        const decisionResult =
            calculateTrustDecision({

                actionRiskLevel:
                    assessment.actionRiskLevel,

                signals:
                    signals.map(
                        (signal) => ({

                            signalType:
                                signal.signalType,

                            riskScore:
                                signal.riskScore,

                            isPositive:
                                signal.isPositive,

                            details:
                                signal.details,
                        })
                    ),
            });


        // =========================================================
        // 12. Save TrustDecision and complete request
        // =========================================================

        const savedDecision =
            await saveTrustDecision(

                trustRequest.id,

                decisionResult
            );


        // =========================================================
        // 13. Record API usage
        // =========================================================

        await recordApiUsage(

            validatedKey.clientId,

            validatedKey.id,

            "/api/v1/trust/check",

            "POST",

            200,

            trustRequest.requestId
        );


        // =========================================================
        // 14. Return TrustPass result
        // =========================================================

        return res.status(200).json({

            requestId:
                trustRequest.requestId,

            status:
                "COMPLETED",


            // -----------------------------------------------------
            // Protected action assessment
            // -----------------------------------------------------

            assessment: {

                actionRiskLevel:
                    assessment.actionRiskLevel,

                evidenceRequirements:
                    assessment.evidenceRequirements,
            },


            // -----------------------------------------------------
            // AI Agent decision
            // -----------------------------------------------------

            aiAgent: {

                riskAssessment:
                    aiDecision.riskAssessment,

                selectedSignals:
                    aiDecision.selectedSignals,

                additionalEvidenceNeeded:
                    aiDecision.additionalEvidenceNeeded,

                reason:
                    aiDecision.reason,
            },


            // -----------------------------------------------------
            // Collected risk signals
            // -----------------------------------------------------

            signals,


            // -----------------------------------------------------
            // Final TrustPass decision
            // -----------------------------------------------------

            decision: {

                trustScore:
                    savedDecision.trustScore,

                riskLevel:
                    savedDecision.riskLevel,

                decision:
                    savedDecision.decision,

                explanation:
                    savedDecision.explanation,
            },


            message:
                "Trust assessment completed",
        });

    } catch (error) {

        console.error(
            "Trust check failed:",
            error
        );

        return res.status(500).json({

            message:
                "Internal server error",
        });
    }
}