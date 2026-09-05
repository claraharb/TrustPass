import prisma from "../config/prisma";
import { collectSimSwapSignal } from "./networkSignal.service";
export type RiskLevel = "LOW" | "MEDIUM" | "HIGH";

export type EvidenceType =
  | "NUMBER_VERIFICATION"
  | "SIM_SWAP"
  | "DEVICE_STATUS"
  | "DEVICE_SWAP"
  | "LOCATION_VERIFICATION";

export interface EvidenceRequirement {
  type: EvidenceType;
  required: boolean;
  reason: string;
}

export interface TrustEngineInput {
  protectedActionId: number;
  phoneNumber?: string;
  ipAddress?: string;
  userAgent?: string;
}

export interface TrustEngineAssessment {
  actionRiskLevel: RiskLevel;
  evidenceRequirements: EvidenceRequirement[];
}

export async function assessProtectedAction(
  input: TrustEngineInput
): Promise<TrustEngineAssessment> {
  const protectedAction = await prisma.protectedAction.findUnique({
    where: {
      id: input.protectedActionId,
    },
  });

  if (!protectedAction || !protectedAction.isActive) {
    throw new Error("Protected action not found or inactive");
  }

  const actionRiskLevel = normalizeRiskLevel(protectedAction.riskLevel);

  const evidenceRequirements = determineRequiredEvidence(
    actionRiskLevel,
    input
  );

  return {
    actionRiskLevel,
    evidenceRequirements,
  };
}

function normalizeRiskLevel(value: string): RiskLevel {
  const normalized = value.toUpperCase();

  if (normalized === "LOW") {
    return "LOW";
  }

  if (normalized === "HIGH") {
    return "HIGH";
  }

  return "MEDIUM";
}

function determineRequiredEvidence(
  riskLevel: RiskLevel,
  input: TrustEngineInput
): EvidenceRequirement[] {
  const evidence: EvidenceRequirement[] = [];

  if (input.phoneNumber) {
    evidence.push({
      type: "NUMBER_VERIFICATION",
      required: true,
      reason:
        "A phone number was provided and can be verified through the network.",
    });

    evidence.push({
      type: "SIM_SWAP",
      required: riskLevel !== "LOW",
      reason:
        riskLevel === "HIGH"
          ? "High-risk actions require checking for recent SIM changes."
          : "Medium-risk actions benefit from SIM swap verification.",
    });
  }

  evidence.push({
    type: "DEVICE_STATUS",
    required: riskLevel === "HIGH",
    reason:
      riskLevel === "HIGH"
        ? "High-risk actions require device status verification."
        : "Device status is optional for this risk level.",
  });

  evidence.push({
    type: "DEVICE_SWAP",
    required: riskLevel === "HIGH",
    reason:
      riskLevel === "HIGH"
        ? "High-risk actions require checking for recent device changes."
        : "Device swap is optional for this risk level.",
  });

  return evidence;
}

export async function collectRequiredEvidence(
  trustRequestId: number,
  assessment: TrustEngineAssessment,
  phoneNumber?: string
) {
  const signals = [];

  for (const requirement of assessment.evidenceRequirements) {
    if (!requirement.required) {
      continue;
    }

    if (requirement.type === "SIM_SWAP" && phoneNumber) {
      const signal = await collectSimSwapSignal(
        trustRequestId,
        phoneNumber
      );

      signals.push(signal);
    }
  }

  return signals;
}