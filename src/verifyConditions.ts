import { Context } from "semantic-release";

import { callFotingo } from "~/callFotingo";

export async function verifyConditions(_: Record<string, unknown>, context: Context): Promise<void> {
  await callFotingo(["verify"], context.logger, { env: context.env });
}
