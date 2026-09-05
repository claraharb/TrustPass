import prisma from "../config/prisma";

import {
  checkSimSwap,
} from "./camara.service";


interface NetworkSignal {

  signalType: string;

  source: string;

  value: string;

  riskScore: number;

  isPositive: boolean;

  details: string;
}


/**
 * ============================================================
 * SIM SWAP
 * ============================================================
 *
 * Calls Nokia Network as Code / CAMARA SIM Swap API.
 *
 * This is currently our first real telecom signal.
 */
export async function collectSimSwapSignal(
  trustRequestId: number,

  phoneNumber: string
): Promise<NetworkSignal> {

  console.log(
    `📡 Checking SIM Swap for ${phoneNumber}`
  );


  const result =
    await checkSimSwap(
      phoneNumber,

      240
    );


  console.log(
    "📡 SIM Swap result:",
    result
  );


  const signal: NetworkSignal = {

    signalType:
      "SIM_SWAP",

    source:
      "NOKIA_CAMARA",

    value:
      String(
        result.swapped
      ),

    /*
     * Higher risk when a recent
     * SIM swap is detected.
     */
    riskScore:
      result.swapped
        ? 80
        : 10,

    /*
     * A non-swapped SIM is positive.
     * A recently swapped SIM is negative.
     */
    isPositive:
      !result.swapped,

    details:
      result.swapped

        ? "A recent SIM swap was detected for this phone number."

        : "No recent SIM swap was detected for this phone number.",
  };


  // ==========================================================
  // Save network signal to database
  // ==========================================================

  await prisma.riskSignal.create({

    data: {

      trustRequestId,

      signalType:
        signal.signalType,

      source:
        signal.source,

      value:
        signal.value,

      riskScore:
        signal.riskScore,

      isPositive:
        signal.isPositive,

      details:
        signal.details,
    },
  });


  return signal;
}


/**
 * ============================================================
 * AI-SELECTED EVIDENCE ORCHESTRATOR
 * ============================================================
 *
 * The AI Agent gives us something like:
 *
 * [
 *   "NUMBER_VERIFICATION",
 *   "SIM_SWAP",
 *   "DEVICE_STATUS"
 * ]
 *
 * This function decides which actual network APIs
 * to execute.
 *
 * The important architectural idea is:
 *
 * AI Agent
 *     ↓
 * selectedSignals
 *     ↓
 * networkSignal.service
 *     ↓
 * CAMARA APIs
 */
export async function collectSelectedEvidence(

  trustRequestId: number,

  selectedSignals: string[],

  phoneNumber?: string

): Promise<NetworkSignal[]> {

  const signals: NetworkSignal[] = [];


  console.log(
    "========================================"
  );

  console.log(
    "📡 Network Evidence Orchestrator"
  );

  console.log(
    "📡 AI selected:",
    selectedSignals
  );

  console.log(
    "========================================"
  );


  // ==========================================================
  // Execute each signal selected by the AI
  // ==========================================================

  for (
    const signalType of selectedSignals
  ) {

    switch (signalType) {


      // ======================================================
      // NUMBER VERIFICATION
      // ======================================================

      case "NUMBER_VERIFICATION":

        console.log(
          "📡 AI selected NUMBER_VERIFICATION"
        );

        /*
         * CAMARA Number Verification requires
         * an OAuth / consent flow.
         *
         * We will integrate the real API separately.
         */

        console.log(
          "⚠️ NUMBER_VERIFICATION is not connected yet"
        );

        break;


      // ======================================================
      // SIM SWAP
      // ======================================================

      case "SIM_SWAP":

        console.log(
          "📡 AI selected SIM_SWAP"
        );


        if (!phoneNumber) {

          console.log(
            "⚠️ SIM_SWAP skipped: phone number not provided"
          );

          break;
        }


        try {

          const signal =
            await collectSimSwapSignal(
              trustRequestId,

              phoneNumber
            );


          signals.push(signal);

        } catch (error) {

          console.error(
            "❌ SIM_SWAP API failed:",
            error
          );

          /*
           * We don't crash the entire TrustPass
           * request because one external API failed.
           */

          console.log(
            "⚠️ Continuing without SIM_SWAP signal"
          );
        }

        break;


      // ======================================================
      // DEVICE STATUS
      // ======================================================

      case "DEVICE_STATUS":

        console.log(
          "📡 AI selected DEVICE_STATUS"
        );

        /*
         * Real CAMARA Device Status integration
         * will be added next.
         */

        console.log(
          "⚠️ DEVICE_STATUS is not connected yet"
        );

        break;


      // ======================================================
      // DEVICE SWAP
      // ======================================================

      case "DEVICE_SWAP":

        console.log(
          "📡 AI selected DEVICE_SWAP"
        );

        /*
         * Real CAMARA Device Swap integration
         * will be added next.
         */

        console.log(
          "⚠️ DEVICE_SWAP is not connected yet"
        );

        break;


      // ======================================================
      // LOCATION VERIFICATION
      // ======================================================

      case "LOCATION_VERIFICATION":

        console.log(
          "📡 AI selected LOCATION_VERIFICATION"
        );

        /*
         * Real CAMARA Location Verification integration
         * will be added later.
         */

        console.log(
          "⚠️ LOCATION_VERIFICATION is not connected yet"
        );

        break;


      // ======================================================
      // UNKNOWN SIGNAL
      // ======================================================

      default:

        console.warn(
          `⚠️ Unknown AI-selected signal: ${signalType}`
        );

        break;
    }
  }


  console.log(
    "========================================"
  );

  console.log(
    "📡 Collected network signals:",
    signals
  );

  console.log(
    "========================================"
  );


  return signals;
}