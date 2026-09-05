import prisma from "../config/prisma";

export type FinalRiskLevel = "LOW" | "MEDIUM" | "HIGH" | "CRITICAL";

export type TrustDecisionType =
  | "ALLOW"
  | "CHALLENGE"
  | "BLOCK";

interface DecisionResult {
  trustScore: number;
  riskLevel: FinalRiskLevel;
  decision: TrustDecisionType;
  explanation: string;
}

export async function calculateTrustDecision(
  trustRequestId: number
): Promise<DecisionResult> {
  const trustRequest = await prisma.trustRequest.findUnique({
    where: {
      id: trustRequestId,
    },
    include: {
      protectedAction: true,
      riskSignals: true,
    },
  });

  if (!trustRequest) {
    throw new Error("Trust request not found");
  }

  /*
   * Start with maximum trust.
   */
  let trustScore = 100;

  /*
   * Adjust score according to the protected action risk.
   */
  switch (trustRequest.protectedAction.riskLevel.toUpperCase()) {
    case "HIGH":
      trustScore -= 25;
      break;

    case "MEDIUM":
      trustScore -= 15;
      break;

    case "LOW":
      break;

    default:
      trustScore -= 15;
  }

  /*
   * Apply the risk signals collected from network APIs.
   */
  for (const signal of trustRequest.riskSignals) {
    /*
     * riskScore is nullable in the database.
     * If it is null, treat it as 0.
     */
    const riskScore = signal.riskScore ?? 0;

    if (signal.isPositive) {
      /*
       * Positive signals have a small effect.
       */
      trustScore -= Math.round(riskScore * 0.1);
    } else {
      /*
       * Negative signals have a stronger effect.
       */
      trustScore -= Math.round(riskScore * 0.5);
    }
  }

  /*
   * Keep the trust score between 0 and 100.
   */
  trustScore = Math.max(0, Math.min(100, trustScore));

  /*
   * Convert trust score into a final risk level.
   */
  let riskLevel: FinalRiskLevel;

  if (trustScore >= 80) {
    riskLevel = "LOW";
  } else if (trustScore >= 60) {
    riskLevel = "MEDIUM";
  } else if (trustScore >= 30) {
    riskLevel = "HIGH";
  } else {
    riskLevel = "CRITICAL";
  }

  /*
   * Convert the risk level into a final decision.
   */
  let decision: TrustDecisionType;

  if (riskLevel === "LOW") {
    decision = "ALLOW";
  } else if (riskLevel === "MEDIUM") {
    decision = "ALLOW";
  } else if (riskLevel === "HIGH") {
    decision = "CHALLENGE";
  } else {
    decision = "BLOCK";
  }

  /*
   * Find negative signals to explain the decision.
   */
  const negativeSignals = trustRequest.riskSignals.filter(
    (signal) => !signal.isPositive
  );

  let explanation = `Protected action "${trustRequest.protectedAction.name}" has ${trustRequest.protectedAction.riskLevel.toLowerCase()} action risk.`;

  if (negativeSignals.length > 0) {
    const signalNames = negativeSignals
      .map((signal) => signal.signalType)
      .join(", ");

    explanation += ` Risk signals detected: ${signalNames}.`;
  } else {
    explanation +=
      " No significant negative network signals were detected.";
  }

  explanation += ` Final trust score: ${trustScore}/100.`;

  return {
    trustScore,
    riskLevel,
    decision,
    explanation,
  };
}

export async function saveTrustDecision(
  trustRequestId: number,
  result: DecisionResult
) {
  /*
   * Save the final decision in the TrustDecision table.
   */
  const decision = await prisma.trustDecision.create({
    data: {
      trustRequestId,
      decision: result.decision,
      trustScore: result.trustScore,
      riskLevel: result.riskLevel,
      explanation: result.explanation,
    },
  });

  /*
   * Mark the TrustRequest as completed.
   */
  await prisma.trustRequest.update({
    where: {
      id: trustRequestId,
    },
    data: {
      status: "COMPLETED",
      completedAt: new Date(),
    },
  });

  return decision;
}