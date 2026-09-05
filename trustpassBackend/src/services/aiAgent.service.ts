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
 * ============================================================
 * TRUSTPASS AI AGENT
 * ============================================================
 *
 * The AI Agent analyzes the transaction and determines
 * which telecom/network signals should be collected.
 *
 * The Agent does NOT directly make the final ALLOW /
 * CHALLENGE / BLOCK decision.
 *
 * Instead:
 *
 * Request
 *    ↓
 * AI Agent
 *    ↓
 * Select relevant evidence
 *    ↓
 * CAMARA APIs
 *    ↓
 * Trust Engine
 *    ↓
 * Final decision
 */
export async function runTrustAgent(
  input: TrustAgentInput
): Promise<TrustAgentDecision> {

  const prompt = `
You are TrustPass AI, an intelligent fraud-prevention
and telecom-evidence orchestration agent.

Your responsibility is to analyze a digital transaction
and decide which available telecom/network signals should
be collected to assess its trustworthiness.

You are an ORCHESTRATION AGENT.

You do NOT directly approve or block the transaction.

Your job is to determine what evidence TrustPass should
collect next.

============================================================
TRANSACTION INFORMATION
============================================================

Protected action:
${input.action}

Protected action risk level:
${input.actionRiskLevel}

Phone number:
${input.phoneNumber ?? "Not provided"}

IP address:
${input.ipAddress ?? "Not provided"}

User agent:
${input.userAgent ?? "Not provided"}

Current/reported OTP attempt count:
${input.attemptCount ?? "Not provided"}


============================================================
AVAILABLE NETWORK SIGNALS
============================================================

NUMBER_VERIFICATION

Verifies whether the phone number can be verified
through the operator/network.


SIM_SWAP

Checks whether the SIM associated with the phone number
was recently changed.


DEVICE_STATUS

Checks whether the device is currently reachable through
the mobile network.


DEVICE_SWAP

Checks whether the phone number/SIM was recently associated
with another device.


LOCATION_VERIFICATION

Checks whether the user's network location is consistent
with the expected context.


============================================================
AGENT DECISION RULES
============================================================

1. OTP_REQUEST

OTP requests are sensitive because attackers may abuse
OTP systems through repeated requests.

Consider:

- NUMBER_VERIFICATION
- SIM_SWAP

If OTP activity is suspicious or the action is high risk,
consider stronger device evidence such as:

- DEVICE_STATUS
- DEVICE_SWAP


2. LOGIN

For login requests:

- Consider NUMBER_VERIFICATION when a phone number exists.
- Consider SIM_SWAP when a phone number exists.
- Consider device evidence for higher-risk situations.


3. HIGH-RISK ACTIONS

High-risk actions should generally receive stronger
telecom evidence than low-risk actions.


4. LOW-RISK ACTIONS

Avoid unnecessary network API calls.

Only select signals that materially help the assessment.


5. OTP BOMBING

Repeated OTP attempts increase fraud risk.

A high number of attempts should make the agent consider
additional evidence.


6. EVIDENCE SELECTION

Do NOT automatically select every available signal.

Choose only the signals that are relevant to this
specific transaction.


7. ADDITIONAL EVIDENCE

Set:

additionalEvidenceNeeded = true

when:

- suspicious behavior exists,
- the transaction has high risk,
- available evidence is insufficient,
- signals conflict,
- or additional network evidence would materially
  improve confidence.

Set:

additionalEvidenceNeeded = false

only when the currently available information is
sufficient for the current stage of assessment.


8. CONSISTENCY

If you select multiple network signals because the
transaction requires additional investigation,
additionalEvidenceNeeded should normally be true.

Never say that additional evidence is required while
returning additionalEvidenceNeeded=false.

Do not claim that a network API has detected fraud.

You are selecting APIs that TrustPass should call NEXT.


============================================================
OUTPUT FORMAT
============================================================

Return ONLY valid JSON.

Do not use markdown.

Do not wrap the JSON in a code block.

Do not include text before or after the JSON.

Return exactly:

{
  "riskAssessment": "HIGH",
  "selectedSignals": [
    "SIM_SWAP"
  ],
  "additionalEvidenceNeeded": true,
  "reason": "Short explanation"
}

Allowed riskAssessment values:

LOW
MEDIUM
HIGH

Allowed selectedSignals:

NUMBER_VERIFICATION
SIM_SWAP
DEVICE_STATUS
DEVICE_SWAP
LOCATION_VERIFICATION

additionalEvidenceNeeded:

true
false
`;


  try {

    console.log(
      "🤖 TrustPass AI Agent analyzing request..."
    );


    const interaction =
      await client.interactions.create({

        model:
          "gemini-3.6-flash",

        input:
          prompt,
      });


    const text =
      interaction.output_text?.trim();


    if (!text) {
      throw new Error(
        "AI Agent returned an empty response"
      );
    }


    console.log(
      "🤖 AI Agent raw response:"
    );

    console.log(text);


    const cleanedText =
      cleanJsonResponse(text);


    const parsed =
      JSON.parse(
        cleanedText
      ) as TrustAgentDecision;


    validateAgentDecision(
      parsed
    );


    console.log(
      "🤖 AI Agent decision:"
    );

    console.log(
      JSON.stringify(
        parsed,
        null,
        2
      )
    );


    return parsed;

  } catch (error) {

    console.error(
      "TrustPass AI Agent failed:",
      error
    );


    /*
     * If Gemini is unavailable, TrustPass
     * continues using deterministic fallback
     * logic.
     */

    return fallbackAgentDecision(
      input
    );
  }
}


/**
 * ============================================================
 * CLEAN GEMINI RESPONSE
 * ============================================================
 *
 * Removes accidental markdown code fences.
 */
function cleanJsonResponse(
  text: string
): string {

  return text

    .replace(
      /^```json\s*/i,
      ""
    )

    .replace(
      /^```\s*/i,
      ""
    )

    .replace(
      /```\s*$/i,
      ""
    )

    .trim();
}


/**
 * ============================================================
 * VALIDATE AI RESPONSE
 * ============================================================
 *
 * Never blindly trust an LLM response.
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


  for (
    const signal
    of decision.selectedSignals
  ) {

    if (
      !validSignals.includes(
        signal
      )
    ) {

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
    typeof decision.reason !==
    "string" ||
    decision.reason.trim()
      .length === 0
  ) {

    throw new Error(
      "AI Agent returned invalid reason"
    );
  }
}


/**
 * ============================================================
 * FALLBACK AI LOGIC
 * ============================================================
 *
 * Used when Gemini is unavailable,
 * rate-limited, or returns invalid data.
 */
function fallbackAgentDecision(
  input: TrustAgentInput
): TrustAgentDecision {

  console.log(
    "⚠️ Using TrustPass AI fallback logic"
  );


  // ==========================================================
  // OTP REQUEST
  // ==========================================================

  if (
    input.action ===
    "OTP_REQUEST"
  ) {

    const suspiciousOtpActivity =
      input.attemptCount !==
      undefined &&
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
        suspiciousOtpActivity ||
        input.actionRiskLevel ===
        "HIGH",


      reason:
        suspiciousOtpActivity

          ? "AI service unavailable. Repeated OTP requests require stronger telecom verification."

          : "AI service unavailable. TrustPass selected essential telecom evidence for the OTP request.",
    };
  }


  // ==========================================================
  // LOGIN
  // ==========================================================

  if (
    input.action ===
    "LOGIN"
  ) {

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
        input.actionRiskLevel ===
        "HIGH",


      reason:
        "AI service unavailable. TrustPass selected authentication-related telecom evidence.",
    };
  }


  // ==========================================================
  // GENERIC FALLBACK
  // ==========================================================

  return {

    riskAssessment:
      input.actionRiskLevel,


    selectedSignals:
      input.phoneNumber

        ? [
          "NUMBER_VERIFICATION",
        ]

        : [],


    additionalEvidenceNeeded:
      input.actionRiskLevel ===
      "HIGH",


    reason:
      "AI service unavailable. TrustPass selected conservative fallback evidence.",
  };
}