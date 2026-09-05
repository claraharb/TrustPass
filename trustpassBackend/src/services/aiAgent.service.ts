import { GoogleGenAI } from "@google/genai";

export interface TrustAgentInput {
  action: string;
  phoneNumber?: string;
  ipAddress?: string;
  userAgent?: string;
  attemptCount?: number;
  actionRiskLevel: "LOW" | "MEDIUM" | "HIGH";
}

export interface TrustAgentDecision {
  riskAssessment: "LOW" | "MEDIUM" | "HIGH";
  selectedSignals: string[];
  additionalEvidenceNeeded: boolean;
  reason: string;
}

const apiKey = process.env.GEMINI_API_KEY;

if (!apiKey) {
  throw new Error("GEMINI_API_KEY is not defined");
}

const client = new GoogleGenAI({
  apiKey,
});

/**
 * TrustPass AI Agent
 *
 * The agent analyzes a protected action and decides
 * which network/telecom signals are relevant.
 */
export async function runTrustAgent(
  input: TrustAgentInput
): Promise<TrustAgentDecision> {
  const prompt = `
You are TrustPass AI, an intelligent fraud-prevention agent.

Your job is to analyze a digital transaction and determine
which telecom/network signals should be collected before
making a trust decision.

IMPORTANT:
- You are an orchestration agent.
- You decide which available network APIs/signals are useful.
- Do NOT automatically select every signal.
- Select only signals relevant to the transaction.
- Consider both the protected action and behavioral context.
- Repeated OTP requests can indicate OTP bombing.
- A recent SIM swap is an important fraud signal.
- High-risk actions may require stronger evidence.
- If the available information is insufficient, request additional evidence.

PROTECTED ACTION:
${input.action}

ACTION RISK LEVEL:
${input.actionRiskLevel}

PHONE NUMBER:
${input.phoneNumber ?? "Not provided"}

IP ADDRESS:
${input.ipAddress ?? "Not provided"}

USER AGENT:
${input.userAgent ?? "Not provided"}

RECENT OTP ATTEMPT COUNT:
${input.attemptCount ?? "Not provided"}

AVAILABLE NETWORK SIGNALS:

1. NUMBER_VERIFICATION
   Determines whether the provided phone number can be verified
   by the network.

2. SIM_SWAP
   Determines whether the SIM associated with the phone number
   was recently changed.

3. DEVICE_STATUS
   Provides information about the current device status.

4. DEVICE_SWAP
   Determines whether the user recently changed devices.

5. LOCATION_VERIFICATION
   Verifies whether the user's location is consistent with
   the expected context.

DECISION GUIDELINES:

- OTP_REQUEST:
  Consider SIM_SWAP and NUMBER_VERIFICATION.
  If the OTP request frequency is suspicious, consider additional
  device/network evidence.

- LOGIN:
  Consider NUMBER_VERIFICATION and SIM_SWAP when a phone number
  is available.
  Consider device evidence for higher-risk situations.

- HIGH risk actions:
  Prefer stronger evidence than LOW-risk actions.

- LOW risk actions:
  Avoid unnecessary network API calls.

- If repeated OTP attempts are detected, treat this as an
  important behavioral risk indicator.

- Do not claim that a network API detected fraud before it
  has actually been called.

- The selected signals represent APIs that TrustPass should
  call next.

Return ONLY valid JSON.

Do not use markdown.
Do not wrap the JSON in \`\`\`.
Do not add text before or after the JSON.

Return exactly this structure:

{
  "riskAssessment": "LOW",
  "selectedSignals": [],
  "additionalEvidenceNeeded": false,
  "reason": "Short explanation"
}

Allowed riskAssessment values:
LOW
MEDIUM
HIGH

Allowed selectedSignals values:
NUMBER_VERIFICATION
SIM_SWAP
DEVICE_STATUS
DEVICE_SWAP
LOCATION_VERIFICATION

additionalEvidenceNeeded must be either true or false.
`;

  try {
    console.log("🤖 TrustPass AI Agent analyzing request...");

    const interaction = await client.interactions.create({
      model: "gemini-3.6-flash",
      input: prompt,
    });

    const text = interaction.output_text?.trim();

    if (!text) {
      throw new Error("AI Agent returned an empty response");
    }

    console.log("🤖 AI Agent raw response:");
    console.log(text);

    const cleanedText = cleanJsonResponse(text);

    const parsed = JSON.parse(
      cleanedText
    ) as TrustAgentDecision;

    validateAgentDecision(parsed);

    console.log("🤖 AI Agent decision:");
    console.log(
      JSON.stringify(parsed, null, 2)
    );

    return parsed;
  } catch (error) {
    console.error(
      "TrustPass AI Agent failed:",
      error
    );

    /*
     * If Gemini is unavailable, TrustPass continues
     * using a deterministic fallback.
     *
     * This prevents the fraud-protection API from
     * completely failing because of an AI/API outage.
     */
    return fallbackAgentDecision(input);
  }
}

/**
 * Remove markdown formatting if the model
 * accidentally returns a JSON code block.
 */
function cleanJsonResponse(
  text: string
): string {
  return text
    .replace(/^```json\s*/i, "")
    .replace(/^```\s*/i, "")
    .replace(/```\s*$/i, "")
    .trim();
}

/**
 * Validate the structure returned by Gemini.
 *
 * We never blindly trust an LLM response.
 */
function validateAgentDecision(
  decision: TrustAgentDecision
): void {
  const validRiskLevels = [
    "LOW",
    "MEDIUM",
    "HIGH",
  ];

  const validSignals = [
    "NUMBER_VERIFICATION",
    "SIM_SWAP",
    "DEVICE_STATUS",
    "DEVICE_SWAP",
    "LOCATION_VERIFICATION",
  ];

  if (
    !validRiskLevels.includes(
      decision.riskAssessment
    )
  ) {
    throw new Error(
      "AI Agent returned an invalid risk assessment"
    );
  }

  if (
    !Array.isArray(
      decision.selectedSignals
    )
  ) {
    throw new Error(
      "AI Agent returned invalid selectedSignals"
    );
  }

  for (const signal of decision.selectedSignals) {
    if (!validSignals.includes(signal)) {
      throw new Error(
        `AI Agent returned invalid signal: ${signal}`
      );
    }
  }

  if (
    typeof decision.additionalEvidenceNeeded !==
    "boolean"
  ) {
    throw new Error(
      "AI Agent returned invalid additionalEvidenceNeeded"
    );
  }

  if (
    typeof decision.reason !== "string" ||
    decision.reason.trim().length === 0
  ) {
    throw new Error(
      "AI Agent returned invalid reason"
    );
  }
}

/**
 * Deterministic fallback.
 *
 * Used when Gemini is unavailable, rate-limited,
 * returns invalid JSON, or another AI error occurs.
 */
function fallbackAgentDecision(
  input: TrustAgentInput
): TrustAgentDecision {
  console.log(
    "⚠️ Using TrustPass AI fallback logic"
  );

  /*
   * OTP requests are one of our most important
   * TrustPass demo scenarios.
   */
  if (input.action === "OTP_REQUEST") {
    const suspiciousOtpActivity =
      input.attemptCount !== undefined &&
      input.attemptCount >= 5;

    return {
      riskAssessment:
        suspiciousOtpActivity
          ? "HIGH"
          : input.actionRiskLevel,

      selectedSignals: [
        "SIM_SWAP",
        "NUMBER_VERIFICATION",
      ],

      additionalEvidenceNeeded:
        suspiciousOtpActivity,

      reason: suspiciousOtpActivity
        ? "AI service unavailable. Repeated OTP requests require stronger telecom verification."
        : "AI service unavailable. TrustPass selected essential telecom evidence for the OTP request.",
    };
  }

  /*
   * LOGIN fallback.
   */
  if (input.action === "LOGIN") {
    return {
      riskAssessment:
        input.actionRiskLevel,

      selectedSignals:
        input.phoneNumber
          ? [
              "NUMBER_VERIFICATION",
              "SIM_SWAP",
            ]
          : [],

      additionalEvidenceNeeded:
        input.actionRiskLevel === "HIGH",

      reason:
        "AI service unavailable. TrustPass selected basic authentication-related telecom evidence.",
    };
  }

  /*
   * Generic fallback for other protected actions.
   */
  return {
    riskAssessment:
      input.actionRiskLevel,

    selectedSignals:
      input.phoneNumber
        ? ["NUMBER_VERIFICATION"]
        : [],

    additionalEvidenceNeeded:
      input.actionRiskLevel === "HIGH",

    reason:
      "AI service unavailable. TrustPass selected conservative fallback evidence.",
  };
}