import { externalApiClient } from "./api";

let cachedAccessToken = "";
let cachedAccessTokenExpiresAt = 0;

function resolveTokenExpiry(expiresInValue) {
  const now = Date.now();
  const numericExpiresIn = Number(expiresInValue || 0);

  if (!numericExpiresIn) {
    return now + 60 * 1000;
  }

  const currentEpochSeconds = Math.floor(now / 1000);
  if (numericExpiresIn > currentEpochSeconds) {
    return Math.max((numericExpiresIn - 60) * 1000, now + 60 * 1000);
  }

  return now + Math.max(numericExpiresIn - 60, 60) * 1000;
}

function getCredentialConfig() {
  return {
    email: process.env.EVALUATION_EMAIL,
    name: process.env.EVALUATION_NAME,
    rollNo: process.env.EVALUATION_ROLL_NO,
    accessCode: process.env.EVALUATION_ACCESS_CODE,
    clientID: process.env.EVALUATION_CLIENT_ID,
    clientSecret: process.env.EVALUATION_CLIENT_SECRET,
  };
}

function assertCredentials(credentials) {
  const missingKeys = Object.entries(credentials)
    .filter(([, value]) => !value)
    .map(([key]) => key);

  if (missingKeys.length > 0) {
    throw new Error(
      `Missing evaluation credentials: ${missingKeys.join(", ")}`
    );
  }
}

export async function getAccessToken() {
  const now = Date.now();
  if (cachedAccessToken && now < cachedAccessTokenExpiresAt) {
    return cachedAccessToken;
  }

  const credentials = getCredentialConfig();
  assertCredentials(credentials);

  const response = await externalApiClient.post("/auth", credentials);
  const accessToken = response.data?.access_token;

  if (!accessToken) {
    throw new Error("Auth response did not include an access token.");
  }

  cachedAccessToken = accessToken;
  cachedAccessTokenExpiresAt = resolveTokenExpiry(response.data?.expires_in);

  return cachedAccessToken;
}

export function clearCachedAccessToken() {
  cachedAccessToken = "";
  cachedAccessTokenExpiresAt = 0;
}
