import { Context } from "semantic-release";

import { callFotingo } from "~/callFotingo";

export async function verifyConditions(_: Record<string, unknown>, context: Context): Promise<void> {
  console.log(JSON.stringify(context, undefined, 2));
  await callFotingo(["verify"], context.logger, { env: context.env });
}
