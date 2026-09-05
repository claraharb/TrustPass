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
  OTP_BOMBING: 0.35,
};

export function calculateTrustDecision(
  input: DecisionInput
): TrustDecisionResult {
  let score = 100;

  // =========================================================
  // 1. BASE ACTION RISK
  // =========================================================

  if (input.actionRiskLevel === "HIGH") {
    score -= 10;
  } else if (input.actionRiskLevel === "MEDIUM") {
    score -= 5;
  }

  // =========================================================
  // 2. SEPARATE POSITIVE AND NEGATIVE SIGNALS
  // =========================================================

  const negativeSignals = input.signals.filter(
    (signal) => !signal.isPositive
  );

  const positiveSignals = input.signals.filter(
    (signal) => signal.isPositive
  );

  // =========================================================
  // 3. APPLY SIGNAL WEIGHTS
  // =========================================================

  for (const signal of input.signals) {
    const weight =
      SIGNAL_WEIGHTS[signal.signalType] ?? 0.10;

    if (signal.isPositive) {
      /*
       * Positive evidence provides some reassurance,
       * but deliberately has limited influence.
       */
      const positiveContribution = Math.round(
        (100 - signal.riskScore) *
          weight *
          0.10
      );

      score += positiveContribution;
    } else {
      /*
       * Negative evidence has the main influence.
       */
      const negativeContribution = Math.round(
        signal.riskScore * weight
      );

      score -= negativeContribution;
    }
  }

  // =========================================================
  // 4. IDENTIFY NEGATIVE SIGNAL TYPES
  // =========================================================

  const negativeSignalTypes = new Set(
    negativeSignals.map(
      (signal) => signal.signalType
    )
  );

  const hasNegativeSimSwap =
    negativeSignalTypes.has("SIM_SWAP");

  const hasNegativeDeviceSwap =
    negativeSignalTypes.has("DEVICE_SWAP");

  const hasNegativeOtpBombing =
    negativeSignalTypes.has("OTP_BOMBING");

  // =========================================================
  // 5. COMBINATION RISK
  // =========================================================

  /*
   * SIM Swap + OTP Bombing
   */
  if (
    hasNegativeSimSwap &&
    hasNegativeOtpBombing
  ) {
    score -= 10;
  }

  /*
   * SIM Swap + Device Swap
   */
  if (
    hasNegativeSimSwap &&
    hasNegativeDeviceSwap
  ) {
    score -= 10;
  }

  /*
   * SIM Swap + Device Swap + OTP Bombing
   */
  if (
    hasNegativeSimSwap &&
    hasNegativeDeviceSwap &&
    hasNegativeOtpBombing
  ) {
    score -= 10;
  }

  // =========================================================
  // 6. HIGH-RISK ACTION + SIGNIFICANT SIM SWAP
  // =========================================================

  /*
   * A significant SIM swap during a HIGH-risk action
   * cannot result in ALLOW.
   */

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
      /*
       * Cap the score in the CHALLENGE range.
       */
      score = Math.min(score, 59);
    }
  }

  // =========================================================
  // 7. STRONG FRAUD COMBINATION
  // =========================================================

  /*
   * SIM Swap + Device Swap + OTP Bombing
   *
   * Multiple independent fraud indicators
   * are considered CRITICAL.
   */

  if (
    hasNegativeSimSwap &&
    hasNegativeDeviceSwap &&
    hasNegativeOtpBombing
  ) {
    score = Math.min(score, 29);
  }

  // =========================================================
  // 8. CLAMP SCORE
  // =========================================================

  score = Math.max(
    0,
    Math.min(100, score)
  );

  // =========================================================
  // 9. DETERMINE RISK LEVEL
  // =========================================================

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

  // =========================================================
  // 10. DETERMINE FINAL DECISION
  // =========================================================

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

  // =========================================================
  // 11. BUILD EXPLANATION
  // =========================================================

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

  // ---------------------------------------------------------
  // Negative evidence
  // ---------------------------------------------------------

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

  // ---------------------------------------------------------
  // Positive evidence
  // ---------------------------------------------------------

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

  // =========================================================
  // 12. COMBINATION EXPLANATIONS
  // =========================================================

  /*
   * SIM Swap + OTP Bombing
   */
  if (
    hasNegativeSimSwap &&
    hasNegativeOtpBombing
  ) {
    explanationParts.push(
      "SIM swap activity combined with OTP bombing significantly increases account-takeover risk."
    );
  }

  /*
   * SIM Swap + Device Swap
   */
  if (
    hasNegativeSimSwap &&
    hasNegativeDeviceSwap
  ) {
    explanationParts.push(
      "SIM and device swap indicators together increase confidence that the request is suspicious."
    );
  }

  /*
   * SIM Swap + Device Swap + OTP Bombing
   */
  if (
    hasNegativeSimSwap &&
    hasNegativeDeviceSwap &&
    hasNegativeOtpBombing
  ) {
    explanationParts.push(
      "Multiple independent fraud indicators are present."
    );
  }

  // =========================================================
  // 13. CHALLENGE EXPLANATION
  // =========================================================

  /*
   * Only explain "additional verification" when the
   * actual final decision is CHALLENGE.
   *
   * This prevents a BLOCK response from containing
   * contradictory challenge language.
   */

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

  // =========================================================
  // 14. FINAL SCORE
  // =========================================================

  explanationParts.push(
    `Final trust score: ${score}/100.`
  );

  // =========================================================
  // 15. FINAL RECOMMENDATION
  // =========================================================

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

  // =========================================================
  // 16. RETURN RESULT
  // =========================================================

  return {
    trustScore: score,
    riskLevel,
    decision,
    explanation:
      explanationParts.join(" "),
  };
}

// =========================================================
// SAVE TRUST DECISION
// =========================================================

export async function saveTrustDecision(
  trustRequestId: number,
  result: TrustDecisionResult
) {
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
}