import prisma from "../config/prisma";

import {
  checkSimSwap,
  checkDeviceSwap,
  checkDeviceReachability,
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
      String(result.swapped),

    riskScore:
      result.swapped
        ? 80
        : 10,

    isPositive:
      !result.swapped,

    details:
      result.swapped

        ? "A recent SIM swap was detected for this phone number."

        : "No recent SIM swap was detected for this phone number.",
  };


  await saveRiskSignal(
    trustRequestId,
    signal
  );


  return signal;
}


/**
 * ============================================================
 * DEVICE SWAP
 * ============================================================
 */
export async function collectDeviceSwapSignal(
  trustRequestId: number,
  phoneNumber: string
): Promise<NetworkSignal> {

  console.log(
    `📡 Checking Device Swap for ${phoneNumber}`
  );


  const result =
    await checkDeviceSwap(
      phoneNumber,
      240
    );


  console.log(
    "📡 Device Swap result:",
    result
  );


  const signal: NetworkSignal = {

    signalType:
      "DEVICE_SWAP",

    source:
      "NOKIA_CAMARA",

    value:
      String(result.swapped),

    riskScore:
      result.swapped
        ? 75
        : 10,

    isPositive:
      !result.swapped,

    details:
      result.swapped

        ? "A recent device swap was detected for this phone number."

        : "No recent device swap was detected for this phone number.",
  };


  await saveRiskSignal(
    trustRequestId,
    signal
  );


  return signal;
}


/**
 * ============================================================
 * DEVICE STATUS / REACHABILITY
 * ============================================================
 */
export async function collectDeviceStatusSignal(
  trustRequestId: number,
  phoneNumber: string
): Promise<NetworkSignal> {

  console.log(
    `📡 Checking Device Status for ${phoneNumber}`
  );


  const result =
    await checkDeviceReachability(
      phoneNumber
    );


  console.log(
    "📡 Device Status result:",
    result
  );


  const connectivity =
    result.connectivity &&
    result.connectivity.length > 0

      ? result.connectivity.join(", ")

      : "NONE";


  const signal: NetworkSignal = {

    signalType:
      "DEVICE_STATUS",

    source:
      "NOKIA_CAMARA",

    value:
      String(result.reachable),

    /*
     * A reachable device is positive.
     * An unreachable device increases risk.
     */
    riskScore:
      result.reachable
        ? 10
        : 60,

    isPositive:
      result.reachable,

    details:
      result.reachable

        ? `Device is reachable through the network (${connectivity}).`

        : "Device is currently not reachable through the mobile network.",
  };


  await saveRiskSignal(
    trustRequestId,
    signal
  );


  return signal;
}


/**
 * ============================================================
 * SAVE RISK SIGNAL
 * ============================================================
 */
async function saveRiskSignal(
  trustRequestId: number,
  signal: NetworkSignal
) {

  return prisma.riskSignal.create({

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
}


/**
 * ============================================================
 * AI-SELECTED EVIDENCE ORCHESTRATOR
 * ============================================================
 */
export async function collectSelectedEvidence(

  trustRequestId: number,

  selectedSignals: string[],

  phoneNumber?: string

): Promise<NetworkSignal[]> {

  const signals:
    NetworkSignal[] = [];


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


  if (!phoneNumber) {

    console.log(
      "⚠️ No phone number provided. Network APIs requiring a phone number will be skipped."
    );

    return signals;
  }


  for (
    const signalType
    of selectedSignals
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
         * Number Verification requires its
         * appropriate consent / authorization flow.
         *
         * We will integrate this separately instead
         * of pretending that an API-key-only call
         * verifies the user's number.
         */

        console.log(
          "⚠️ NUMBER_VERIFICATION requires the CAMARA authorization flow and is not executed yet."
        );

        break;


      // ======================================================
      // SIM SWAP
      // ======================================================

      case "SIM_SWAP":

        console.log(
          "📡 AI selected SIM_SWAP"
        );

        try {

          const signal =
            await collectSimSwapSignal(
              trustRequestId,
              phoneNumber
            );

          signals.push(signal);

        } catch (error) {

          console.error(
            "❌ SIM_SWAP failed:",
            error
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

        try {

          const signal =
            await collectDeviceStatusSignal(
              trustRequestId,
              phoneNumber
            );

          signals.push(signal);

        } catch (error) {

          console.error(
            "❌ DEVICE_STATUS failed:",
            error
          );

        }

        break;


      // ======================================================
      // DEVICE SWAP
      // ======================================================

      case "DEVICE_SWAP":

        console.log(
          "📡 AI selected DEVICE_SWAP"
        );

        try {

          const signal =
            await collectDeviceSwapSignal(
              trustRequestId,
              phoneNumber
            );

          signals.push(signal);

        } catch (error) {

          console.error(
            "❌ DEVICE_SWAP failed:",
            error
          );

        }

        break;


      // ======================================================
      // LOCATION VERIFICATION
      // ======================================================

      case "LOCATION_VERIFICATION":

        console.log(
          "📡 AI selected LOCATION_VERIFICATION"
        );

        console.log(
          "⚠️ LOCATION_VERIFICATION is not connected yet."
        );

        break;


      // ======================================================
      // UNKNOWN
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
    "📡 Collected network signals:"
  );

  console.log(
    JSON.stringify(
      signals,
      null,
      2
    )
  );

  console.log(
    "========================================"
  );


  return signals;
}