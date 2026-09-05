import prisma from "../config/prisma";

export interface OtpActivityResult {
  attemptCount: number;
  recentAttempts: number;
  isBombing: boolean;
  riskScore: number;
  isPositive: boolean;
  details: string;
}

export async function analyzeOtpActivity(
  clientId: number,
  phoneNumber?: string,
  ipAddress?: string,
  attemptCount?: number
): Promise<OtpActivityResult> {
  const windowStart = new Date(
    Date.now() - 10 * 60 * 1000
  );

  const recentRequests =
    await prisma.trustRequest.count({
      where: {
        clientId,

        phoneNumber,

        protectedAction: {
          name: "OTP_REQUEST",
        },

        createdAt: {
          gte: windowStart,
        },
      },
    });

  /*
   * The current request is not yet included in the database
   * when this function runs, so add it to the recent count.
   *
   * If the caller explicitly provides an attemptCount, use the
   * larger value so the API can represent the client's observed
   * number of attempts.
   */
  const totalAttempts = Math.max(
    recentRequests + 1,
    attemptCount ?? 1
  );

  // =========================================================
  // DEFAULT: NORMAL OTP ACTIVITY
  // =========================================================

  let isBombing = false;

  let riskScore = 10;

  let details =
    "OTP request frequency appears normal.";

  // =========================================================
  // SEVERE OTP BOMBING
  // =========================================================

  if (totalAttempts >= 10) {
    isBombing = true;

    riskScore = 90;

    details =
      "Severe OTP bombing detected: a very high number of OTP requests occurred within a short period.";
  }

  // =========================================================
  // OTP BOMBING
  // =========================================================

  else if (totalAttempts >= 5) {
    isBombing = true;

    riskScore = 70;

    details =
      "OTP bombing detected: repeated OTP requests occurred within a short period.";
  }

  // =========================================================
  // SUSPICIOUS OTP ACTIVITY
  // =========================================================

  else if (totalAttempts >= 3) {
    /*
     * This is suspicious activity, but not strong enough
     * to classify as full OTP bombing.
     */
    isBombing = false;

    riskScore = 40;

    details =
      "Suspicious OTP activity: multiple OTP requests occurred within a short period.";
  }

  // =========================================================
  // NORMAL ACTIVITY
  // =========================================================

  else {
    isBombing = false;

    riskScore = 10;

    details =
      "OTP request frequency appears normal.";
  }

  // =========================================================
  // POSITIVE / NEGATIVE EVIDENCE
  // =========================================================

  /*
   * riskScore < 40 means the activity is considered
   * positive/reassuring evidence.
   *
   * riskScore >= 40 means the activity is suspicious
   * or malicious and therefore negative evidence.
   */
  const isPositive = riskScore < 40;

  return {
    attemptCount: totalAttempts,

    recentAttempts: recentRequests,

    isBombing,

    riskScore,

    isPositive,

    details,
  };
}