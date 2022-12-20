import { Context } from "semantic-release";

import { callFotingo } from "~/callFotingo";

let isFotingoConfigured: boolean | undefined;

/**
 * Return if all configuration needed to run fotingo is available
 */
export function isConfigured() {
  return isFotingoConfigured === true;
}

export async function verifyConditions(_: Record<string, unknown>, context: Context): Promise<void> {
  try {
    await callFotingo(["verify"], context.logger, { env: context.env });
  } catch (error) {
    if (/Missing required configuration/.test(error.message)) {
      isFotingoConfigured = false;
      context.logger.log("Skipping fotingo. Missing configuration parameters");
      return;
    }
    throw error;
  }
  isFotingoConfigured = true;
}
