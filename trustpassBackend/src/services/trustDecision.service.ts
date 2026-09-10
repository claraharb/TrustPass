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

// ============================================================
// SIGNAL WEIGHTS
// ============================================================

const SIGNAL_WEIGHTS: Record<string, number> = {
  SIM_SWAP: 0.30,
  DEVICE_SWAP: 0.25,
  DEVICE_STATUS: 0.15,
  NUMBER_VERIFICATION: 0.15,
  LOCATION_VERIFICATION: 0.15,

  // Device roaming is contextual evidence.
  // It should have less influence than direct fraud indicators.
  DEVICE_ROAMING: 0.10,

  OTP_BOMBING: 0.35,
};

// ============================================================
// CALCULATE TRUST DECISION
// ============================================================

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

  const hasNegativeDeviceRoaming =
    negativeSignalTypes.has("DEVICE_ROAMING");

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

  /*
   * SIM Swap + Device Roaming
   *
   * Roaming alone is not considered fraud.
   * However, roaming combined with a SIM swap
   * increases account-takeover suspicion.
   */
  if (
    hasNegativeSimSwap &&
    hasNegativeDeviceRoaming
  ) {
    score -= 5;
  }

  /*
   * Device Swap + Device Roaming
   *
   * A device change while roaming provides
   * additional contextual risk evidence.
   */
  if (
    hasNegativeDeviceSwap &&
    hasNegativeDeviceRoaming
  ) {
    score -= 5;
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

  /*
   * HIGH-risk action + OTP bombing
   */

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
      /*
       * Keep the score in the CHALLENGE range.
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

  /*
   * SIM Swap + Device Roaming
   */
  if (
    hasNegativeSimSwap &&
    hasNegativeDeviceRoaming
  ) {
    explanationParts.push(
      "SIM swap activity combined with device roaming increases contextual account-takeover risk."
    );
  }

  /*
   * Device Swap + Device Roaming
   */
  if (
    hasNegativeDeviceSwap &&
    hasNegativeDeviceRoaming
  ) {
    explanationParts.push(
      "Device swap activity combined with device roaming provides additional contextual risk evidence."
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

// ============================================================
// SAVE TRUST DECISION
// ============================================================

export async function saveTrustDecision(
  trustRequestId: number,
  result: TrustDecisionResult
) {
  // ----------------------------------------------------------
  // 1. Check whether a decision already exists
  // ----------------------------------------------------------

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

  // ----------------------------------------------------------
  // 2. Create the decision
  // ----------------------------------------------------------

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

    // --------------------------------------------------------
    // 3. Mark TrustRequest as completed
    // --------------------------------------------------------

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

    // --------------------------------------------------------
    // 4. Handle concurrent callback race
    // --------------------------------------------------------

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