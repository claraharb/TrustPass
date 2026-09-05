import "dotenv/config";

import { calculateTrustDecision } from "../services/trustDecision.service";

function main() {
  console.log("========================================");
  console.log("TrustPass Trust Decision Test");
  console.log("========================================");

  // =========================================================
  // 1. LEGITIMATE REQUEST
  // =========================================================

  const legitimate = calculateTrustDecision({
    actionRiskLevel: "HIGH",

    signals: [
      {
        signalType: "SIM_SWAP",
        riskScore: 10,
        isPositive: true,
        details: "No recent SIM swap detected.",
      },
      {
        signalType: "DEVICE_STATUS",
        riskScore: 10,
        isPositive: true,
        details: "Device is reachable.",
      },
      {
        signalType: "DEVICE_SWAP",
        riskScore: 10,
        isPositive: true,
        details: "No recent device swap detected.",
      },
      {
        signalType: "OTP_BOMBING",
        riskScore: 10,
        isPositive: true,
        details: "OTP request frequency appears normal.",
      },
    ],
  });

  console.log("\n🟢 LEGITIMATE REQUEST");

  console.log(
    JSON.stringify(
      legitimate,
      null,
      2
    )
  );

  // =========================================================
  // 2. SUSPICIOUS REQUEST
  // =========================================================

  const suspicious = calculateTrustDecision({
    actionRiskLevel: "HIGH",

    signals: [
      {
        signalType: "SIM_SWAP",
        riskScore: 50,
        isPositive: false,
        details: "Recent SIM swap detected.",
      },
      {
        signalType: "DEVICE_STATUS",
        riskScore: 10,
        isPositive: true,
        details: "Device is reachable.",
      },
    ],
  });

  console.log("\n🟡 SUSPICIOUS REQUEST");

  console.log(
    JSON.stringify(
      suspicious,
      null,
      2
    )
  );

  // =========================================================
  // 3. FRAUDULENT REQUEST
  // =========================================================

  const fraudulent = calculateTrustDecision({
    actionRiskLevel: "HIGH",

    signals: [
      {
        signalType: "SIM_SWAP",
        riskScore: 80,
        isPositive: false,
        details: "Recent SIM swap detected.",
      },
      {
        signalType: "DEVICE_SWAP",
        riskScore: 75,
        isPositive: false,
        details: "Recent device swap detected.",
      },
      {
        signalType: "DEVICE_STATUS",
        riskScore: 10,
        isPositive: true,
        details: "Device is reachable.",
      },
      {
        signalType: "OTP_BOMBING",
        riskScore: 70,
        isPositive: false,
        details: "Repeated OTP requests detected.",
      },
    ],
  });

  console.log("\n🔴 FRAUDULENT REQUEST");

  console.log(
    JSON.stringify(
      fraudulent,
      null,
      2
    )
  );

  console.log("\n========================================");
  console.log("Test completed.");
  console.log("========================================");
}

main();