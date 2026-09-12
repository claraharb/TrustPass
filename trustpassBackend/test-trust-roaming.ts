import "dotenv/config";
import { calculateTrustDecision } from "./src/services/trustDecision.service";

function testScenario(
  name: string,
  actionRiskLevel: "LOW" | "MEDIUM" | "HIGH",
  signals: Array<{
    signalType: string;
    riskScore: number;
    isPositive: boolean;
    details?: string;
  }>
) {
  console.log("\n========================================");
  console.log(`🧪 ${name}`);
  console.log("========================================");

  const result = calculateTrustDecision({
    actionRiskLevel,
    signals,
  });

  console.log("\n🛡️ TRUST ENGINE RESULT:");
  console.log(JSON.stringify(result, null, 2));
}

// ============================================================
// TEST 1 — ROAMING ALONE
// ============================================================

testScenario(
  "ROAMING ALONE",
  "LOW",
  [
    {
      signalType: "DEVICE_ROAMING",
      riskScore: 50,
      isPositive: false,
      details: "Device is currently roaming in HU.",
    },
  ]
);

// ============================================================
// TEST 2 — SIM SWAP + ROAMING
// ============================================================

testScenario(
  "SIM SWAP + ROAMING",
  "HIGH",
  [
    {
      signalType: "SIM_SWAP",
      riskScore: 80,
      isPositive: false,
      details: "SIM was recently changed.",
    },
    {
      signalType: "DEVICE_ROAMING",
      riskScore: 50,
      isPositive: false,
      details: "Device is currently roaming in HU.",
    },
  ]
);

// ============================================================
// TEST 3 — DEVICE SWAP + ROAMING
// ============================================================

testScenario(
  "DEVICE SWAP + ROAMING",
  "HIGH",
  [
    {
      signalType: "DEVICE_SWAP",
      riskScore: 75,
      isPositive: false,
      details: "Device was recently changed.",
    },
    {
      signalType: "DEVICE_ROAMING",
      riskScore: 50,
      isPositive: false,
      details: "Device is currently roaming in HU.",
    },
  ]
);

// ============================================================
// TEST 4 — STRONG FRAUD COMBINATION
// ============================================================

testScenario(
  "SIM SWAP + DEVICE SWAP + OTP BOMBING + ROAMING",
  "HIGH",
  [
    {
      signalType: "SIM_SWAP",
      riskScore: 80,
      isPositive: false,
      details: "SIM was recently changed.",
    },
    {
      signalType: "DEVICE_SWAP",
      riskScore: 75,
      isPositive: false,
      details: "Device was recently changed.",
    },
    {
      signalType: "OTP_BOMBING",
      riskScore: 90,
      isPositive: false,
      details: "Multiple OTP requests detected.",
    },
    {
      signalType: "DEVICE_ROAMING",
      riskScore: 50,
      isPositive: false,
      details: "Device is currently roaming in HU.",
    },
  ]
);

// ============================================================
// TEST 5 — POSITIVE ROAMING
// ============================================================

testScenario(
  "NON-ROAMING DEVICE",
  "LOW",
  [
    {
      signalType: "DEVICE_ROAMING",
      riskScore: 5,
      isPositive: true,
      details: "Device is not currently roaming.",
    },
  ]
);