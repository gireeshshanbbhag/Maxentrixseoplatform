import { query } from "./_generated/server";

/**
 * Exposes non-secret public config values from environment variables to the frontend.
 * GOOGLE_CLIENT_ID is safe to expose — it's the OAuth client identifier, not a secret.
 */
export const getGoogleClientId = query({
  args: {},
  handler: async (): Promise<string | null> => {
    return process.env.GOOGLE_CLIENT_ID ?? null;
  },
});
