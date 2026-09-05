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

  const totalAttempts = Math.max(
    recentRequests + 1,
    attemptCount ?? 1
  );

  let isBombing = false;
  let riskScore = 10;
  let details =
    "OTP request frequency appears normal.";

  if (totalAttempts >= 10) {
    isBombing = true;
    riskScore = 90;
    details =
      "Severe OTP bombing detected: a very high number of OTP requests occurred within a short period.";
  } else if (totalAttempts >= 5) {
    isBombing = true;
    riskScore = 70;
    details =
      "OTP bombing detected: repeated OTP requests occurred within a short period.";
  } else if (totalAttempts >= 3) {
    riskScore = 40;
    details =
      "Suspicious OTP activity: multiple OTP requests occurred within a short period.";
  }

  return {
    attemptCount: totalAttempts,
    recentAttempts: recentRequests,
    isBombing,
    riskScore,
    isPositive: riskScore < 40,
    details,
  };
}