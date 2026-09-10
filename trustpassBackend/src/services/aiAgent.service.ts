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


const apiKey =
  process.env.GEMINI_API_KEY;


if (!apiKey) {
  throw new Error(
    "GEMINI_API_KEY is not defined"
  );
}


const client =
  new GoogleGenAI({
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
 * The Agent does NOT directly make the final
 * ALLOW / CHALLENGE / BLOCK decision.
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


DEVICE_ROAMING

Checks whether the device is currently roaming on another
mobile network or in another country.

Roaming does NOT automatically mean fraud.

It is contextual evidence that can be useful when combined
with other suspicious signals or when the transaction is
sensitive.


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

DEVICE_ROAMING may be considered when roaming context
would materially improve the assessment.


2. LOGIN

For login requests:

- Consider NUMBER_VERIFICATION when a phone number exists.
- Consider SIM_SWAP when a phone number exists.
- Consider device evidence for higher-risk situations.
- Consider DEVICE_ROAMING when roaming context could
  materially help distinguish legitimate travel from
  suspicious account activity.


3. HIGH-RISK ACTIONS

High-risk actions should generally receive stronger
telecom evidence than low-risk actions.

Consider:

- NUMBER_VERIFICATION
- SIM_SWAP
- DEVICE_SWAP
- DEVICE_STATUS
- DEVICE_ROAMING

Do NOT automatically select every signal.


4. LOW-RISK ACTIONS

Avoid unnecessary network API calls.

Only select signals that materially help the assessment.

For a normal low-risk transaction, use the smallest
reasonable set of evidence.


5. OTP BOMBING

Repeated OTP attempts increase fraud risk.

A high number of attempts should make the agent consider
additional evidence.

Possible additional signals include:

- DEVICE_STATUS
- DEVICE_SWAP
- DEVICE_ROAMING

DEVICE_ROAMING should only be selected if it adds
meaningful contextual evidence.


6. DEVICE ROAMING

DEVICE_ROAMING is contextual evidence.

Do NOT select DEVICE_ROAMING simply because the action
is high risk.

Select DEVICE_ROAMING when roaming context would
materially improve the assessment, for example:

- unusual travel or geographic context is relevant,
- the transaction involves sensitive account access,
- the combination of roaming and another signal may indicate
  account takeover,
- the device's current network context helps explain
  suspicious behavior,
- or other available evidence is insufficient.

Roaming does NOT automatically mean fraud.

Do NOT block a transaction solely because the device
is roaming.


7. MINIMUM NECESSARY EVIDENCE

Select the MINIMUM set of network signals needed to
meaningfully assess the transaction.

Do NOT automatically select every available signal.

Use these guidelines:

LOW-RISK:
Usually select 1–2 signals.

MEDIUM-RISK:
Usually select 2–3 signals.

HIGH-RISK:
Usually select 3–4 signals.

Do not select more than 4 signals.

Avoid unnecessary network API calls because they increase
latency and consume telecom API resources.


8. SIGNAL PRIORITY

Prefer signals that directly address the risk of the
specific transaction.

For authentication-related transactions:

1. NUMBER_VERIFICATION
2. SIM_SWAP
3. DEVICE_SWAP
4. DEVICE_STATUS
5. DEVICE_ROAMING when contextual information is useful

For suspicious OTP activity:

1. SIM_SWAP
2. NUMBER_VERIFICATION
3. DEVICE_SWAP
4. DEVICE_STATUS

DEVICE_ROAMING may be added when roaming context provides
additional useful evidence.

Do not select a signal merely because it is available.


9. ADDITIONAL EVIDENCE

Set:

additionalEvidenceNeeded = true

when:

- suspicious behavior exists,
- the transaction has high risk,
- the selected evidence is insufficient,
- signals are likely to conflict,
- or another signal would materially improve confidence.

Set:

additionalEvidenceNeeded = false

when the selected signals are sufficient for the current
assessment.

IMPORTANT:

For LOW-RISK transactions, additionalEvidenceNeeded should
normally be false unless there is explicit suspicious
behavior or conflicting information.

If you select a small sufficient set of signals for a
low-risk transaction, return:

additionalEvidenceNeeded = false.


10. CONSISTENCY

Your response must be internally consistent.

If riskAssessment is LOW and there is no suspicious
behavior, additionalEvidenceNeeded should be false.

If additionalEvidenceNeeded is true, your reason must
explain why more evidence is needed.

If you select multiple signals for additional
investigation, explain why those signals are relevant.

Do not claim that a network API has detected fraud.

You are selecting APIs that TrustPass should call NEXT.


11. FINAL DECISION

You MUST NOT return:

ALLOW
CHALLENGE
BLOCK

The deterministic Trust Engine is responsible for the
final decision after network evidence is collected.


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
DEVICE_ROAMING
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
     * If Gemini is unavailable,
     * rate-limited, or returns invalid data,
     * TrustPass continues using deterministic
     * fallback logic.
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
    "DEVICE_ROAMING",
    "LOCATION_VERIFICATION",
  ];


  // ==========================================================
  // VALIDATE RISK ASSESSMENT
  // ==========================================================

  if (
    !validRiskLevels.includes(
      decision.riskAssessment
    )
  ) {

    throw new Error(
      "AI Agent returned an invalid risk assessment"
    );
  }


  // ==========================================================
  // VALIDATE SELECTED SIGNALS
  // ==========================================================

  if (
    !Array.isArray(
      decision.selectedSignals
    )
  ) {

    throw new Error(
      "AI Agent returned invalid selectedSignals"
    );
  }


  /*
   * TrustPass should not allow the AI to select
   * an excessive number of network APIs.
   */

  if (
    decision.selectedSignals.length > 4
  ) {

    throw new Error(
      "AI Agent selected too many network signals"
    );
  }


  /*
   * Validate every selected signal.
   */

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


  // ==========================================================
  // VALIDATE ADDITIONAL EVIDENCE FLAG
  // ==========================================================

  if (
    typeof decision.additionalEvidenceNeeded !==
    "boolean"
  ) {

    throw new Error(
      "AI Agent returned invalid additionalEvidenceNeeded"
    );
  }


  // ==========================================================
  // VALIDATE REASON
  // ==========================================================

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


  // ==========================================================
  // CONSISTENCY CHECK
  // ==========================================================

  /*
   * A LOW-risk transaction should not request
   * additional evidence unless there is a specific
   * suspicious context.
   *
   * Since the AI response does not explicitly provide
   * a separate suspicious flag, we reject this combination
   * and allow the deterministic fallback to handle it.
   */

  if (
    decision.riskAssessment === "LOW" &&
    decision.additionalEvidenceNeeded === true
  ) {

    throw new Error(
      "AI Agent returned inconsistent LOW risk assessment with additionalEvidenceNeeded=true"
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


    let selectedSignals: string[];


    if (
      suspiciousOtpActivity ||
      input.actionRiskLevel ===
        "HIGH"
    ) {

      selectedSignals = [
        "SIM_SWAP",
        "NUMBER_VERIFICATION",
        "DEVICE_STATUS",
        "DEVICE_ROAMING",
      ];

    } else {

      selectedSignals = [
        "SIM_SWAP",
        "NUMBER_VERIFICATION",
      ];
    }


    return {

      riskAssessment:
        suspiciousOtpActivity
          ? "HIGH"
          : input.actionRiskLevel,


      selectedSignals:
        selectedSignals,


      additionalEvidenceNeeded:
        suspiciousOtpActivity ||
        input.actionRiskLevel ===
          "HIGH",


      reason:
        suspiciousOtpActivity

          ? "AI service unavailable. Repeated OTP requests require stronger telecom and device-context evidence."

          : input.actionRiskLevel ===
            "HIGH"

            ? "AI service unavailable. High-risk OTP request requires stronger telecom evidence."

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

    let selectedSignals:
      string[] = [];


    if (
      input.phoneNumber
    ) {

      selectedSignals = [
        "NUMBER_VERIFICATION",
        "SIM_SWAP",
      ];


      /*
       * High-risk login gets additional
       * roaming context.
       */

      if (
        input.actionRiskLevel ===
        "HIGH"
      ) {

        selectedSignals.push(
          "DEVICE_ROAMING"
        );
      }
    }


    return {

      riskAssessment:
        input.actionRiskLevel,


      selectedSignals:
        selectedSignals,


      additionalEvidenceNeeded:
        input.actionRiskLevel ===
          "HIGH",


      reason:
        input.actionRiskLevel ===
          "HIGH"

          ? "AI service unavailable. TrustPass selected authentication evidence and roaming context for the high-risk login."

          : "AI service unavailable. TrustPass selected authentication-related telecom evidence.",
    };
  }


  // ==========================================================
  // GENERIC HIGH-RISK ACTION
  // ==========================================================

  if (
    input.actionRiskLevel ===
    "HIGH"
  ) {

    return {

      riskAssessment:
        "HIGH",


      selectedSignals:
        input.phoneNumber

          ? [
              "NUMBER_VERIFICATION",
              "SIM_SWAP",
              "DEVICE_SWAP",
              "DEVICE_ROAMING",
            ]

          : [],


      additionalEvidenceNeeded:
        true,


      reason:
        "AI service unavailable. TrustPass selected conservative telecom and device-context evidence for the high-risk action.",
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
      false,


    reason:
      "AI service unavailable. TrustPass selected conservative fallback evidence.",
  };
}