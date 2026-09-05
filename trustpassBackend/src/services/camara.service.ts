interface SimSwapResult {
  swapped: boolean;
}

export async function checkSimSwap(
  phoneNumber: string,
  maxAge: number = 240
): Promise<SimSwapResult> {
  const apiKey = process.env.NOKIA_RAPIDAPI_KEY;
  const host = process.env.NOKIA_RAPIDAPI_HOST;
  const url = process.env.NOKIA_SIM_SWAP_URL;

  if (!apiKey || !host || !url) {
    throw new Error("Nokia Network as Code configuration is missing");
  }

  const response = await fetch(url, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "X-RapidAPI-Key": apiKey,
      "X-RapidAPI-Host": host,
    },
    body: JSON.stringify({
      phoneNumber,
      maxAge,
    }),
  });

  if (!response.ok) {
    const errorBody = await response.text();

    throw new Error(
      `Nokia SIM Swap API failed (${response.status}): ${errorBody}`
    );
  }

  const data = (await response.json()) as {
    swapped?: boolean;
  };

  if (typeof data.swapped !== "boolean") {
    throw new Error("Invalid SIM Swap response from Nokia");
  }

  return {
    swapped: data.swapped,
  };
}