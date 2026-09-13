interface SimSwapResult {
  swapped: boolean;
}

interface DeviceSwapResult {
  swapped: boolean;
}

interface DeviceReachabilityResult {
  reachable: boolean;
  connectivity?: string[];
  lastStatusTime?: string;
}

interface DeviceRoamingResult {
  roaming: boolean;
  countryCode?: number;
  countryName?: string[];
  lastStatusTime?: string;
}

/**
 * Common Nokia Network as Code configuration.
 */
function getNokiaConfig() {
  const apiKey = process.env.NOKIA_RAPIDAPI_KEY;
  const host = process.env.NOKIA_RAPIDAPI_HOST;

  if (!apiKey || !host) {
    throw new Error("Nokia Network as Code configuration is missing");
  }

  return { apiKey, host };
}

export async function checkSimSwap(
  phoneNumber: string,
  maxAge: number = 240
): Promise<SimSwapResult> {
  const { apiKey, host } = getNokiaConfig();

  const url = process.env.NOKIA_SIM_SWAP_URL;

  if (!url) {
    throw new Error("NOKIA_SIM_SWAP_URL is not defined");
  }

  const response = await fetch(url, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "X-RapidAPI-Key": apiKey,
      "X-RapidAPI-Host": host,
    },
    body: JSON.stringify({ phoneNumber, maxAge }),
  });

  if (!response.ok) {
    const errorBody = await response.text();
    throw new Error(
      `Nokia SIM Swap API failed (${response.status}): ${errorBody}`
    );
  }

  const data = (await response.json()) as { swapped?: boolean };

  if (typeof data.swapped !== "boolean") {
    throw new Error("Invalid SIM Swap response from Nokia");
  }

  return { swapped: data.swapped };
}

/**
 * Checks whether the SIM associated with the phone number
 * was recently moved to another physical device.
 */
export async function checkDeviceSwap(
  phoneNumber: string,
  maxAge: number = 240
): Promise<DeviceSwapResult> {
  const { apiKey, host } = getNokiaConfig();

  const url = process.env.NOKIA_DEVICE_SWAP_URL;

  if (!url) {
    throw new Error("NOKIA_DEVICE_SWAP_URL is not defined");
  }

  const response = await fetch(url, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "X-RapidAPI-Key": apiKey,
      "X-RapidAPI-Host": host,
    },
    body: JSON.stringify({ phoneNumber, maxAge }),
  });

  if (!response.ok) {
    const errorBody = await response.text();
    throw new Error(
      `Nokia Device Swap API failed (${response.status}): ${errorBody}`
    );
  }

  const data = (await response.json()) as { swapped?: boolean };

  if (typeof data.swapped !== "boolean") {
    throw new Error("Invalid Device Swap response from Nokia");
  }

  return { swapped: data.swapped };
}

/**
 * Checks whether the device is currently reachable through
 * the mobile network.
 */
export async function checkDeviceReachability(
  phoneNumber: string
): Promise<DeviceReachabilityResult> {
  const { apiKey, host } = getNokiaConfig();

  const url = process.env.NOKIA_DEVICE_STATUS_URL;

  if (!url) {
    throw new Error("NOKIA_DEVICE_STATUS_URL is not defined");
  }

  const response = await fetch(url, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "X-RapidAPI-Key": apiKey,
      "X-RapidAPI-Host": host,
    },
    body: JSON.stringify({ device: { phoneNumber } }),
  });

  if (!response.ok) {
    const errorBody = await response.text();
    throw new Error(
      `Nokia Device Status API failed (${response.status}): ${errorBody}`
    );
  }

  const data = (await response.json()) as {
    reachable?: boolean;
    connectivity?: string[];
    lastStatusTime?: string;
  };

  if (typeof data.reachable !== "boolean") {
    throw new Error("Invalid Device Status response from Nokia");
  }

  return {
    reachable: data.reachable,
    connectivity: data.connectivity,
    lastStatusTime: data.lastStatusTime,
  };
}

/**
 * Checks whether the device is currently roaming.
 *
 * Nokia Device Roaming Status Retrieve v1.1 sandbox numbers:
 * +99999991000 → roaming
 * +99999991001 → not roaming
 */
export async function checkDeviceRoaming(
  phoneNumber: string
): Promise<DeviceRoamingResult> {
  const { apiKey, host } = getNokiaConfig();

  const url = process.env.NOKIA_DEVICE_ROAMING_URL;

  if (!url) {
    throw new Error("NOKIA_DEVICE_ROAMING_URL is not defined");
  }

  const response = await fetch(url, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "X-RapidAPI-Key": apiKey,
      "X-RapidAPI-Host": host,
    },
    body: JSON.stringify({ device: { phoneNumber } }),
  });

  if (!response.ok) {
    const errorBody = await response.text();
    throw new Error(
      `Nokia Device Roaming API failed (${response.status}): ${errorBody}`
    );
  }

  const data = (await response.json()) as {
    roaming?: boolean;
    countryCode?: number;
    countryName?: string[];
    lastStatusTime?: string;
  };

  if (typeof data.roaming !== "boolean") {
    throw new Error("Invalid Device Roaming response from Nokia");
  }

  return {
    roaming: data.roaming,
    countryCode: data.countryCode,
    countryName: data.countryName,
    lastStatusTime: data.lastStatusTime,
  };
}
