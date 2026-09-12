import "dotenv/config";

import {
  runTrustAgent,
  TrustAgentInput,
} from "./src/services/aiAgent.service";


async function testScenario(
  name: string,
  input: TrustAgentInput
) {

  console.log("\n========================================");
  console.log(`🧪 ${name}`);
  console.log("========================================");

  try {

    const result =
      await runTrustAgent(input);

    console.log("\n🤖 AI RESULT:");

    console.log(
      JSON.stringify(
        result,
        null,
        2
      )
    );

  } catch (error) {

    console.error(
      "❌ Test failed:",
      error
    );
  }
}


async function main() {

  /*
   * TEST 1
   *
   * High-risk login.
   *
   * We expect the AI to consider stronger evidence,
   * potentially including DEVICE_ROAMING.
   */

  await testScenario(
    "HIGH-RISK LOGIN",
    {
      action: "LOGIN",

      phoneNumber:
        "+99999991000",

      ipAddress:
        "185.10.20.30",

      userAgent:
        "Mozilla/5.0",

      attemptCount:
        1,

      actionRiskLevel:
        "HIGH",
    }
  );


  /*
   * TEST 2
   *
   * Normal low-risk login.
   *
   * The AI should avoid unnecessary network calls.
   */

  await testScenario(
    "LOW-RISK LOGIN",
    {
      action: "LOGIN",

      phoneNumber:
        "+99999991001",

      ipAddress:
        "185.10.20.30",

      userAgent:
        "Mozilla/5.0",

      attemptCount:
        1,

      actionRiskLevel:
        "LOW",
    }
  );


  /*
   * TEST 3
   *
   * Suspicious OTP activity.
   *
   * Five attempts should make the AI request
   * stronger evidence.
   */

  await testScenario(
    "SUSPICIOUS OTP ACTIVITY",
    {
      action: "OTP_REQUEST",

      phoneNumber:
        "+99999991000",

      ipAddress:
        "185.10.20.30",

      userAgent:
        "Mozilla/5.0",

      attemptCount:
        7,

      actionRiskLevel:
        "HIGH",
    }
  );


    /*
   * TEST 4
   *
   * High-risk account change while the user appears
   * to be traveling internationally.
   *
   * Roaming context should be potentially useful here.
   */

  await testScenario(
    "HIGH-RISK ACCOUNT CHANGE WHILE TRAVELING",
    {
      action: "CHANGE_PHONE_NUMBER",

      phoneNumber:
        "+99999991000",

      ipAddress:
        "185.10.20.30",

      userAgent:
        "Mozilla/5.0",

      attemptCount:
        1,

      actionRiskLevel:
        "HIGH",
    }
  );

}


main();