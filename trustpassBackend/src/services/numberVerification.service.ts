import crypto from "crypto";

interface NumberVerificationTokenResponse {
  access_token: string;
  token_type?: string;
  expires_in?: number;
  id_token?: string;
}

interface NumberVerificationResult {
  devicePhoneNumberVerified: boolean;
}

interface VerificationSession {
  phoneNumber: string;
  trustRequestId: number;
  state: string;
  nonce: string;
  createdAt: number;
}

interface CompletedVerification {
  phoneNumber: string;
  trustRequestId: number;
  verified: boolean;
  completedAt: number;
}

const verificationSessions = new Map<
  string,
  VerificationSession
>();

const completedVerifications = new Map<
  string,
  CompletedVerification
>();

const SESSION_EXPIRATION_MS = 10 * 60 * 1000;
const COMPLETED_RESULT_EXPIRATION_MS = 2 * 60 * 1000;

function getNumberVerificationConfig() {
  const clientId = process.env.NOKIA_NV_CLIENT_ID;
  const clientSecret = process.env.NOKIA_NV_CLIENT_SECRET;
  const redirectUri = process.env.NOKIA_NV_REDIRECT_URI;
  const authorizationUrl =
    process.env.NOKIA_NV_AUTHORIZATION_URL;
  const tokenUrl = process.env.NOKIA_NV_TOKEN_URL;

  if (
    !clientId ||
    !clientSecret ||
    !redirectUri ||
    !authorizationUrl ||
    !tokenUrl
  ) {
    throw new Error(
      "Nokia Number Verification configuration is missing"
    );
  }

  return {
    clientId,
    clientSecret,
    redirectUri,
    authorizationUrl,
    tokenUrl,
  };
}

export function isNumberVerificationConfigured() {
  return Boolean(
    process.env.NOKIA_NV_CLIENT_ID &&
    process.env.NOKIA_NV_CLIENT_SECRET &&
    process.env.NOKIA_NV_REDIRECT_URI &&
    process.env.NOKIA_NV_AUTHORIZATION_URL &&
    process.env.NOKIA_NV_TOKEN_URL
  );
}

/**
 * TEMPORARY DEMO BYPASS.
 *
 * When enabled, Number Verification is marked verified=true
 * immediately instead of redirecting through Nokia's OAuth flow.
 * This exists only to keep demos working without depending on a
 * live tunnel; remove NUMBER_VERIFICATION_DEMO_BYPASS from .env
 * (or set it to anything other than "true") to go back to the
 * real Nokia flow.
 */
export function isNumberVerificationBypassed() {
  return process.env.NUMBER_VERIFICATION_DEMO_BYPASS === "true";
}

function getNokiaConfig() {
  const apiKey = process.env.NOKIA_RAPIDAPI_KEY;
  const host = process.env.NOKIA_RAPIDAPI_HOST;

  if (!apiKey || !host) {
    throw new Error(
      "Nokia Network as Code configuration is missing"
    );
  }

  return {
    apiKey,
    host,
  };
}

/**
 * Creates the Nokia Number Verification authorization URL.
 */
export function createNumberVerificationAuthorizationUrl(
  phoneNumber: string,
  trustRequestId: number
) {
  const {
    clientId,
    redirectUri,
    authorizationUrl,
  } = getNumberVerificationConfig();

  const state = crypto
    .randomBytes(32)
    .toString("hex");

  const nonce = crypto
    .randomBytes(32)
    .toString("hex");

  console.log(
    "NV STATE CREATED:",
    state
  );

  verificationSessions.set(state, {
    phoneNumber,
    trustRequestId,
    state,
    nonce,
    createdAt: Date.now(),
  });

  const params = new URLSearchParams({
    scope:
      "dpv:FraudPreventionAndDetection number-verification:verify",

    response_type: "code",

    client_id: clientId,

    redirect_uri: redirectUri,

    login_hint: phoneNumber,

    prompt: "none",

    state,

    nonce,
  });

  return {
    authorizationUrl:
      `${authorizationUrl}?${params.toString()}`,

    state,
  };
}

/**
 * Retrieves and validates a Number Verification session.
 */
function getVerificationSession(
  state: string
) {
  console.log(
    "NV STATE RECEIVED:",
    state
  );

  console.log(
    "NV STORED STATES:",
    Array.from(
      verificationSessions.keys()
    )
  );

  const session =
    verificationSessions.get(state);

  if (!session) {
    throw new Error(
      "Invalid or expired Number Verification state"
    );
  }

  if (
    Date.now() - session.createdAt >
    SESSION_EXPIRATION_MS
  ) {
    verificationSessions.delete(state);

    throw new Error(
      "Number Verification session has expired"
    );
  }

  return session;
}

/**
 * Exchanges the Nokia authorization code
 * for an access token.
 */
async function exchangeAuthorizationCode(
  code: string
): Promise<NumberVerificationTokenResponse> {
  const {
    clientId,
    clientSecret,
    tokenUrl,
  } = getNumberVerificationConfig();

  const body = new URLSearchParams({
    client_id: clientId,

    client_secret: clientSecret,

    grant_type: "authorization_code",

    code,
  });

  const response = await fetch(
    tokenUrl,
    {
      method: "POST",

      headers: {
        "Content-Type":
          "application/x-www-form-urlencoded",
      },

      body: body.toString(),
    }
  );

  if (!response.ok) {
    const errorBody =
      await response.text();

    throw new Error(
      `Nokia Number Verification token request failed (${response.status}): ${errorBody}`
    );
  }

  const data =
    (await response.json()) as Partial<NumberVerificationTokenResponse>;

  if (
    !data.access_token ||
    typeof data.access_token !==
      "string"
  ) {
    throw new Error(
      "Invalid access token response from Nokia"
    );
  }

  return {
    access_token:
      data.access_token,

    token_type:
      data.token_type,

    expires_in:
      data.expires_in,

    id_token:
      data.id_token,
  };
}

/**
 * Executes Nokia Number Verification.
 */
async function verifyPhoneNumber(
  phoneNumber: string,
  accessToken: string
): Promise<NumberVerificationResult> {
  const {
    apiKey,
    host,
  } = getNokiaConfig();

  const response = await fetch(
    "https://network-as-code.p-eu.rapidapi.com/passthrough/camara/v1/number-verification/number-verification/v0/verify",
    {
      method: "POST",

      headers: {
        "Content-Type":
          "application/json",

        "X-RapidAPI-Key":
          apiKey,

        "X-RapidAPI-Host":
          host,

        Authorization:
          `Bearer ${accessToken}`,
      },

      body: JSON.stringify({
        phoneNumber,
      }),
    }
  );

  if (!response.ok) {
    const errorBody =
      await response.text();

    throw new Error(
      `Nokia Number Verification API failed (${response.status}): ${errorBody}`
    );
  }

  const data =
    (await response.json()) as Partial<NumberVerificationResult>;

  if (
    typeof data.devicePhoneNumberVerified !==
    "boolean"
  ) {
    throw new Error(
      "Invalid Number Verification response from Nokia"
    );
  }

  return {
    devicePhoneNumberVerified:
      data.devicePhoneNumberVerified,
  };
}

/**
 * Handles the Nokia OAuth callback.
 *
 * Supports duplicate callbacks safely.
 */
export async function handleNumberVerificationCallback(
  code: string,
  state: string
) {
  /*
   * Check whether this state has already completed. This
   * prevents duplicate browser/network callbacks from
   * appearing as failed verifications.
   */
  const completed =
    completedVerifications.get(state);

  if (completed) {
    if (
      Date.now() - completed.completedAt <=
      COMPLETED_RESULT_EXPIRATION_MS
    ) {
      console.log(
        "NV CALLBACK: returning previously completed result."
      );

      return {
        phoneNumber:
          completed.phoneNumber,

        trustRequestId:
          completed.trustRequestId,

        verified:
          completed.verified,
      };
    }

    completedVerifications.delete(state);
  }

  const session =
    getVerificationSession(state);

  try {
    console.log(
      "NV CALLBACK: exchanging authorization code..."
    );

    const token =
      await exchangeAuthorizationCode(
        code
      );

    console.log(
      "NV CALLBACK: access token received."
    );

    console.log(
      "NV CALLBACK: verifying phone number..."
    );

    const result =
      await verifyPhoneNumber(
        session.phoneNumber,
        token.access_token
      );

    console.log(
      "NV CALLBACK: verification result:",
      result.devicePhoneNumberVerified
    );

    const completedResult = {
      phoneNumber:
        session.phoneNumber,

      trustRequestId:
        session.trustRequestId,

      verified:
        result.devicePhoneNumberVerified,

      completedAt: Date.now(),
    };

    /*
     * Save the completed result temporarily so duplicate
     * callbacks can return the same answer.
     */
    completedVerifications.set(
      state,
      completedResult
    );

    return {
      phoneNumber:
        completedResult.phoneNumber,

      trustRequestId:
        completedResult.trustRequestId,

      verified:
        completedResult.verified,
    };
  } finally {
    /*
     * The OAuth state is no longer needed after the
     * verification has completed.
     */
    verificationSessions.delete(state);
  }
}
