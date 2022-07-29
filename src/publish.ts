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
    return (context.commits || [])
      .flatMap((commit) => sync(commit.message).references)
      .filter((reference) => reference.action && /fixes/i.test(reference.action))
      .map((reference) => reference.issue);
  }
  return [];
}

export async function publish(_: Record<string, unknown>, context: Context): Promise<void> {
  const issues = getIssuesInRelease(context).flatMap((issue) => ["-i", issue.trim()]);
  context.logger.log(`Creating release with issues: ${issues.join(",")}`);
  if (context.options?.dryRun) {
    context.logger.log("Skipping fotingo release. Dry run");
    return;
  }
  if (!context.nextRelease) {
    context.logger.error("Could not find next release. Exiting");
    return;
  }
  if (issues.length === 0) {
    context.logger.log("No issues found in this release. Skipping fotingo release");
    return;
  }
  try {
    await callFotingo(["release", "-y", "-n", context.nextRelease.version, ...issues], context.logger, {
      env: context.env,
    });
  } catch (error) {
    context.logger.error("fotingo release command failed");
    context.logger.error(error);
  }
}
