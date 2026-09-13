import prisma from "../config/prisma";
import {
  checkSimSwap,
  checkDeviceSwap,
  checkDeviceReachability,
  checkDeviceRoaming,
} from "./camara.service";
import { isNumberVerificationBypassed } from "./numberVerification.service";

interface NetworkSignal {
  signalType: string;
  source: string;
  value: string;
  riskScore: number;
  isPositive: boolean;
  details: string;
}

export async function collectSimSwapSignal(
  trustRequestId: number,
  phoneNumber: string
): Promise<NetworkSignal> {
  const result = await checkSimSwap(phoneNumber, 240);

  const signal: NetworkSignal = {
    signalType: "SIM_SWAP",
    source: "NOKIA_CAMARA",
    value: String(result.swapped),
    riskScore: result.swapped ? 80 : 10,
    isPositive: !result.swapped,
    details: result.swapped
      ? "A recent SIM swap was detected for this phone number."
      : "No recent SIM swap was detected for this phone number.",
  };

  await saveRiskSignal(trustRequestId, signal);

  return signal;
}

export async function collectDeviceSwapSignal(
  trustRequestId: number,
  phoneNumber: string
): Promise<NetworkSignal> {
  const result = await checkDeviceSwap(phoneNumber, 240);

  const signal: NetworkSignal = {
    signalType: "DEVICE_SWAP",
    source: "NOKIA_CAMARA",
    value: String(result.swapped),
    riskScore: result.swapped ? 75 : 10,
    isPositive: !result.swapped,
    details: result.swapped
      ? "A recent device swap was detected for this phone number."
      : "No recent device swap was detected for this phone number.",
  };

  await saveRiskSignal(trustRequestId, signal);

  return signal;
}

export async function collectDeviceStatusSignal(
  trustRequestId: number,
  phoneNumber: string
): Promise<NetworkSignal> {
  const result = await checkDeviceReachability(phoneNumber);

  const connectivity =
    result.connectivity && result.connectivity.length > 0
      ? result.connectivity.join(", ")
      : "NONE";

  const signal: NetworkSignal = {
    signalType: "DEVICE_STATUS",
    source: "NOKIA_CAMARA",
    value: String(result.reachable),
    riskScore: result.reachable ? 10 : 60,
    isPositive: result.reachable,
    details: result.reachable
      ? `Device is reachable through the network (${connectivity}).`
      : "Device is currently not reachable through the mobile network.",
  };

  await saveRiskSignal(trustRequestId, signal);

  return signal;
}

export async function collectDeviceRoamingSignal(
  trustRequestId: number,
  phoneNumber: string
): Promise<NetworkSignal> {
  const result = await checkDeviceRoaming(phoneNumber);

  // Roaming does not automatically mean fraud, so it gets a
  // moderate risk score instead of a high one.
  const signal: NetworkSignal = {
    signalType: "DEVICE_ROAMING",
    source: "NOKIA_CAMARA",
    value: String(result.roaming),
    riskScore: result.roaming ? 50 : 5,
    isPositive: !result.roaming,
    details: result.roaming
      ? `Device is currently roaming${
          result.countryName && result.countryName.length > 0
            ? ` in ${result.countryName.join(", ")}`
            : ""
        }.`
      : "Device is not currently roaming.",
  };

  await saveRiskSignal(trustRequestId, signal);

  return signal;
}

/**
 * Saves the result returned by Nokia Number Verification.
 *
 * The actual OAuth/API verification is performed by
 * numberVerification.service.ts.
 */
export async function collectNumberVerificationSignal(
  trustRequestId: number,
  verified: boolean
): Promise<NetworkSignal> {
  const signal: NetworkSignal = {
    signalType: "NUMBER_VERIFICATION",
    source: "NOKIA_CAMARA",
    value: String(verified),
    riskScore: verified ? 5 : 90,
    isPositive: verified,
    details: verified
      ? "Nokia Number Verification confirmed that the phone number matches the device."
      : "Nokia Number Verification could not confirm that the phone number matches the device.",
  };

  await saveRiskSignal(trustRequestId, signal);

  return signal;
}

async function saveRiskSignal(trustRequestId: number, signal: NetworkSignal) {
  return prisma.riskSignal.create({
    data: {
      trustRequestId,
      signalType: signal.signalType,
      source: signal.source,
      value: signal.value,
      riskScore: signal.riskScore,
      isPositive: signal.isPositive,
      details: signal.details,
    },
  });
}

/**
 * AI-selected evidence orchestrator: runs the network signal
 * checks the AI Agent selected, and returns whatever succeeds.
 */
export async function collectSelectedEvidence(
  trustRequestId: number,
  selectedSignals: string[],
  phoneNumber?: string
): Promise<NetworkSignal[]> {
  const signals: NetworkSignal[] = [];

  if (!phoneNumber) {
    return signals;
  }

  for (const signalType of selectedSignals) {
    switch (signalType) {
      case "NUMBER_VERIFICATION":
        if (isNumberVerificationBypassed()) {
          // Demo bypass: mark it verified immediately instead of
          // requiring the Nokia OAuth flow. See
          // isNumberVerificationBypassed() for how to turn this off.
          try {
            const signal = await collectNumberVerificationSignal(
              trustRequestId,
              true
            );
            signals.push(signal);
          } catch (error) {
            console.error("NUMBER_VERIFICATION bypass failed:", error);
          }
          break;
        }

        // Number Verification is intentionally not executed here —
        // it requires the Nokia OAuth/consent flow. The trust
        // controller detects this signal before calling this
        // orchestrator and returns 202 PENDING. After the user
        // completes Nokia verification, the callback saves the
        // result using collectNumberVerificationSignal().
        break;

      case "SIM_SWAP":
        try {
          const signal = await collectSimSwapSignal(
            trustRequestId,
            phoneNumber
          );
          signals.push(signal);
        } catch (error) {
          console.error("SIM_SWAP signal failed:", error);
        }
        break;

      case "DEVICE_STATUS":
        try {
          const signal = await collectDeviceStatusSignal(
            trustRequestId,
            phoneNumber
          );
          signals.push(signal);
        } catch (error) {
          console.error("DEVICE_STATUS signal failed:", error);
        }
        break;

      case "DEVICE_SWAP":
        try {
          const signal = await collectDeviceSwapSignal(
            trustRequestId,
            phoneNumber
          );
          signals.push(signal);
        } catch (error) {
          console.error("DEVICE_SWAP signal failed:", error);
        }
        break;

      case "DEVICE_ROAMING":
        try {
          const signal = await collectDeviceRoamingSignal(
            trustRequestId,
            phoneNumber
          );
          signals.push(signal);
        } catch (error) {
          console.error("DEVICE_ROAMING signal failed:", error);
        }
        break;

      case "LOCATION_VERIFICATION":
        // Not connected yet.
        break;

      default:
        console.warn(`Unknown AI-selected signal: ${signalType}`);
        break;
    }
  }

  return signals;
}
