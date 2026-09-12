import "dotenv/config";
import {
  runTrustAgent,
} from "../services/aiAgent.service";

async function main() {
  console.log("=== TrustPass AI Agent Test ===");

  const result = await runTrustAgent({
    action: "OTP_REQUEST",
    phoneNumber: "+99999991000",
    ipAddress: "192.168.1.100",
    userAgent: "Mozilla/5.0",
    attemptCount: 7,
    actionRiskLevel: "HIGH",
  });

  console.log(
    JSON.stringify(result, null, 2)
  );
}

main().catch(console.error);