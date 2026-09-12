import prisma from "../config/prisma";

export type FinalRiskLevel =
  | "LOW"
  | "MEDIUM"
  | "HIGH"
  | "CRITICAL";

export type TrustDecisionType =
  | "ALLOW"
  | "CHALLENGE"
  | "BLOCK";

export interface DecisionInput {
  actionRiskLevel: "LOW" | "MEDIUM" | "HIGH";

  signals: Array<{
    signalType: string;
    riskScore: number;
    isPositive: boolean;
    details?: string;
  }>;
}

export interface TrustDecisionResult {
  trustScore: number;
  riskLevel: FinalRiskLevel;
  decision: TrustDecisionType;
  explanation: string;
}

const SIGNAL_WEIGHTS: Record<string, number> = {
  SIM_SWAP: 0.30,
  DEVICE_SWAP: 0.25,
  DEVICE_STATUS: 0.15,
  NUMBER_VERIFICATION: 0.15,
  LOCATION_VERIFICATION: 0.15,

  // Device roaming is contextual evidence, so it carries less
  // weight than direct fraud indicators.
  DEVICE_ROAMING: 0.10,

  OTP_BOMBING: 0.35,
};

export function calculateTrustDecision(
  input: DecisionInput
): TrustDecisionResult {
  let score = 100;

  if (input.actionRiskLevel === "HIGH") {
    score -= 10;
  } else if (input.actionRiskLevel === "MEDIUM") {
    score -= 5;
  }

  const negativeSignals = input.signals.filter(
    (signal) => !signal.isPositive
  );

  const positiveSignals = input.signals.filter(
    (signal) => signal.isPositive
  );

  for (const signal of input.signals) {
    const weight =
      SIGNAL_WEIGHTS[signal.signalType] ?? 0.10;

    if (signal.isPositive) {
      // Positive evidence provides some reassurance, but
      // deliberately has limited influence on the score.
      const positiveContribution = Math.round(
        (100 - signal.riskScore) *
          weight *
          0.10
      );

      score += positiveContribution;
    } else {
      const negativeContribution = Math.round(
        signal.riskScore * weight
      );

      score -= negativeContribution;
    }
  }

  const negativeSignalTypes = new Set(
    negativeSignals.map(
      (signal) => signal.signalType
    )
  );

  const hasNegativeSimSwap =
    negativeSignalTypes.has("SIM_SWAP");

  const hasNegativeDeviceSwap =
    negativeSignalTypes.has("DEVICE_SWAP");

  const hasNegativeDeviceRoaming =
    negativeSignalTypes.has("DEVICE_ROAMING");

  const hasNegativeOtpBombing =
    negativeSignalTypes.has("OTP_BOMBING");

  if (
    hasNegativeSimSwap &&
    hasNegativeOtpBombing
  ) {
    score -= 10;
  }

  if (
    hasNegativeSimSwap &&
    hasNegativeDeviceSwap
  ) {
    score -= 10;
  }

  if (
    hasNegativeSimSwap &&
    hasNegativeDeviceSwap &&
    hasNegativeOtpBombing
  ) {
    score -= 10;
  }

  // Roaming alone is not considered fraud, but combined with a
  // SIM swap it increases account-takeover suspicion.
  if (
    hasNegativeSimSwap &&
    hasNegativeDeviceRoaming
  ) {
    score -= 5;
  }

  // A device change while roaming provides additional
  // contextual risk evidence.
  if (
    hasNegativeDeviceSwap &&
    hasNegativeDeviceRoaming
  ) {
    score -= 5;
  }

  // A significant SIM swap during a HIGH-risk action cannot
  // result in ALLOW, so cap the score in the CHALLENGE range.
  if (
    input.actionRiskLevel === "HIGH" &&
    hasNegativeSimSwap
  ) {
    const simSwapSignal =
      negativeSignals.find(
        (signal) =>
          signal.signalType === "SIM_SWAP"
      );

    if (
      simSwapSignal &&
      simSwapSignal.riskScore >= 40
    ) {
      score = Math.min(score, 59);
    }
  }

  if (
    input.actionRiskLevel === "HIGH" &&
    hasNegativeOtpBombing
  ) {
    const otpBombingSignal =
      negativeSignals.find(
        (signal) =>
          signal.signalType === "OTP_BOMBING"
      );

    if (
      otpBombingSignal &&
      otpBombingSignal.riskScore >= 40
    ) {
      score = Math.min(score, 59);
    }
  }

  // A number the network confirms was BOTH recently SIM-swapped
  // and recently moved to another device is treated as CRITICAL
  // on its own — this is direct network-verified evidence, not a
  // behavioral pattern, so it doesn't need repeated attempts (e.g.
  // OTP bombing) to justify a block.
  if (
    hasNegativeSimSwap &&
    hasNegativeDeviceSwap
  ) {
    score = Math.min(score, 29);
  }

  score = Math.max(
    0,
    Math.min(100, score)
  );

  let riskLevel: FinalRiskLevel;

  if (score >= 80) {
    riskLevel = "LOW";
  } else if (score >= 60) {
    riskLevel = "MEDIUM";
  } else if (score >= 40) {
    riskLevel = "HIGH";
  } else {
    riskLevel = "CRITICAL";
  }

  let decision: TrustDecisionType;

  if (
    riskLevel === "LOW" ||
    riskLevel === "MEDIUM"
  ) {
    decision = "ALLOW";
  } else if (riskLevel === "HIGH") {
    decision = "CHALLENGE";
  } else {
    decision = "BLOCK";
  }

  const explanationParts: string[] = [];

  if (input.actionRiskLevel === "HIGH") {
    explanationParts.push(
      "The protected action has high inherent risk."
    );
  } else if (
    input.actionRiskLevel === "MEDIUM"
  ) {
    explanationParts.push(
      "The protected action has medium inherent risk."
    );
  }

  if (negativeSignals.length > 0) {
    explanationParts.push(
      `Negative signals detected: ${negativeSignals
        .map(
          (signal) =>
            `${signal.signalType} (${signal.riskScore}/100)`
        )
        .join(", ")}.`
    );
  }

  if (positiveSignals.length > 0) {
    explanationParts.push(
      `Positive evidence: ${positiveSignals
        .map(
          (signal) =>
            `${signal.signalType} (${signal.riskScore}/100)`
        )
        .join(", ")}.`
    );
  }

  if (
    hasNegativeSimSwap &&
    hasNegativeOtpBombing
  ) {
    explanationParts.push(
      "SIM swap activity combined with OTP bombing significantly increases account-takeover risk."
    );
  }

  if (
    hasNegativeSimSwap &&
    hasNegativeDeviceSwap
  ) {
    explanationParts.push(
      "The network confirmed both a recent SIM swap and a recent device swap for this number — strong, direct evidence of account takeover regardless of attempt history."
    );
  }

  if (
    hasNegativeSimSwap &&
    hasNegativeDeviceSwap &&
    hasNegativeOtpBombing
  ) {
    explanationParts.push(
      "Repeated OTP activity further reinforces these network-confirmed fraud indicators."
    );
  }

  if (
    hasNegativeSimSwap &&
    hasNegativeDeviceRoaming
  ) {
    explanationParts.push(
      "SIM swap activity combined with device roaming increases contextual account-takeover risk."
    );
  }

  if (
    hasNegativeDeviceSwap &&
    hasNegativeDeviceRoaming
  ) {
    explanationParts.push(
      "Device swap activity combined with device roaming provides additional contextual risk evidence."
    );
  }

  // Only explain "additional verification" when the final
  // decision is actually CHALLENGE, so a BLOCK response never
  // contains contradictory challenge language.
  if (
    decision === "CHALLENGE" &&
    input.actionRiskLevel === "HIGH" &&
    hasNegativeSimSwap
  ) {
    const simSwapSignal =
      negativeSignals.find(
        (signal) =>
          signal.signalType === "SIM_SWAP"
      );

    if (
      simSwapSignal &&
      simSwapSignal.riskScore >= 40
    ) {
      explanationParts.push(
        "A significant SIM swap risk was detected during a high-risk action, so additional verification is required."
      );
    }
  }

  explanationParts.push(
    `Final trust score: ${score}/100.`
  );

  if (decision === "ALLOW") {
    explanationParts.push(
      "The available evidence is sufficiently trustworthy and the transaction can proceed."
    );
  } else if (decision === "CHALLENGE") {
    explanationParts.push(
      "The transaction contains suspicious indicators but does not have enough evidence for an immediate block. Step-up verification is recommended."
    );
  } else {
    explanationParts.push(
      "The available evidence indicates that the transaction is too risky and should be blocked."
    );
  }

  return {
    trustScore: score,
    riskLevel,
    decision,
    explanation:
      explanationParts.join(" "),
  };
}

export async function saveTrustDecision(
  trustRequestId: number,
  result: TrustDecisionResult
) {
  const existingDecision =
    await prisma.trustDecision.findUnique({
      where: {
        trustRequestId,
      },
    });

  if (existingDecision) {
    console.log(
      `🛡️ TrustDecision already exists for TrustRequest ${trustRequestId}. Returning existing decision.`
    );

    return existingDecision;
  }

  try {
    const decision =
      await prisma.trustDecision.create({
        data: {
          trustRequestId,

          trustScore:
            result.trustScore,

          riskLevel:
            result.riskLevel,

          decision:
            result.decision,

          explanation:
            result.explanation,
        },
      });

    await prisma.trustRequest.update({
      where: {
        id: trustRequestId,
      },

      data: {
        status: "COMPLETED",

        completedAt:
          new Date(),
      },
    });

    return decision;

  } catch (error: any) {

    // A concurrent callback may have created the decision
    // between the check above and this insert; if so, return
    // that instead of failing.
    if (error?.code === "P2002") {
      console.log(
        `🛡️ Concurrent callback detected for TrustRequest ${trustRequestId}.`
      );

      const existingDecision =
        await prisma.trustDecision.findUnique({
          where: {
            trustRequestId,
          },
        });

      if (existingDecision) {
        return existingDecision;
      }
    }

    throw error;
  }
}
