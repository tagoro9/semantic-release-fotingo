import { sync } from "conventional-commits-parser";
import { Context, Result } from "semantic-release";

import { callFotingo } from "~/callFotingo";

/**
 * Given the release context, return the list of issues that were fixed so they
 * can be passed to fotingo
 * @param context Release context
 * @returns List of fixes issues in the release
 */
function getIssuesInRelease(context: Result | Context): string[] {
  if (typeof context === "object" && "commits" in context) {
    return context.commits
      .map((commit) => sync(commit.message).references)
      .flat()
      .filter((reference) => reference.action && /fixes/i.test(reference.action))
      .map((reference) => reference.issue);
  }
  return [];
}

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
  const issues = getIssuesInRelease(context).map((issue) => `-i ${issue}`);
  await callFotingo(["release", "-n", context.nextRelease.version, ...issues], context.logger, { env: context.env });
}
