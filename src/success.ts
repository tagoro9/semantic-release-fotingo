import { Context } from "semantic-release";

import { callFotingo } from "~/callFotingo";

export async function success(_: Record<string, unknown>, context: Context): Promise<void> {
  await callFotingo(["release", "-n"], context.logger, { env: context.env });
}
