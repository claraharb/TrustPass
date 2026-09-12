import "dotenv/config";

import {
  checkDeviceSwap,
} from "../services/camara.service";


async function main() {

  console.log(
    "=== Nokia Device Swap Test ==="
  );


  const result =
    await checkDeviceSwap(
      "+99999991001",
      240
    );


  console.log(
    JSON.stringify(
      result,
      null,
      2
    )
  );
}


main().catch(
  console.error
);