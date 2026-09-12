import "dotenv/config";

import {
  checkDeviceReachability,
} from "../services/camara.service";


async function main() {

  console.log(
    "=== Nokia Device Status Test ==="
  );


  const result =
    await checkDeviceReachability(
      "+99999991000"
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