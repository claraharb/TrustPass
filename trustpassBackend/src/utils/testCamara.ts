import "dotenv/config";
import { checkSimSwap } from "../services/camara.service";

async function main() {
  const result = await checkSimSwap(
    "+99999991000",
    240
  );

  console.log("CAMARA SIM Swap result:");
  console.log(JSON.stringify(result, null, 2));
}

main().catch((error) => {
  console.error("CAMARA test failed:");
  console.error(error);
});