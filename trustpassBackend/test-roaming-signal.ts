import "dotenv/config";

import {
  collectDeviceRoamingSignal,
} from "./src/services/networkSignal.service";


async function main() {

  console.log(
    "🌍 Testing Device Roaming Network Signal...\n"
  );


  // Use an existing TrustRequest ID from your database.
  const trustRequestId = 21;

  const phoneNumber =
    "+99999991000";


  try {

    const signal =
      await collectDeviceRoamingSignal(
        trustRequestId,
        phoneNumber
      );


    console.log(
      "\n✅ Device Roaming Network Signal:"
    );

    console.log(
      JSON.stringify(
        signal,
        null,
        2
      )
    );


  } catch (error) {

    console.error(
      "\n❌ Device Roaming Network Signal failed:"
    );

    console.error(error);
  }
}


main();