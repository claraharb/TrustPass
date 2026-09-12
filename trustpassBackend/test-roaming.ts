import "dotenv/config";
import { checkDeviceRoaming } from "./src/services/camara.service";

async function main() {
  console.log("🌍 Testing Nokia Device Roaming...\n");

  const phoneNumber = "+99999991001";

  try {
    const result = await checkDeviceRoaming(phoneNumber);

    console.log("✅ Device Roaming response:");
    console.log(JSON.stringify(result, null, 2));

  } catch (error) {
    console.error("❌ Device Roaming test failed:");
    console.error(error);
  }
}

main();
