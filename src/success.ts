import { Context } from "semantic-release";

import { callFotingo } from "~/callFotingo";

export async function success(_: Record<string, unknown>, context: Context): Promise<void> {
  if (context.options?.dryRun) {
    console.log(JSON.stringify(context, undefined, 2));
    context.logger.log("Skipping fotingo release. Dry run");
    return;
  }
  if (!context.nextRelease) {
    context.logger.error("Could not find next release. Exiting");
    return;
  }
  await callFotingo(["release", "-n", context.nextRelease.version], context.logger, { env: context.env });
}
