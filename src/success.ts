import { spawn } from "child_process";
import createDebugger from "debug";
import { Context } from "semantic-release";

const debug = createDebugger("semantic-release-fotingo:success");

/**
 * Invoke a fotingo command as a child process
 * @param arguments_ Arguments
 * @param logger Semantic release logger
 * @param [options] Command options
 * @param [options.cwd] Working directory where to run the cmd
 * @param [options.env] Command environment
 */
function callFotingo(
  arguments_: string | string[],
  logger: Context["logger"],
  options?: { cwd?: string; env?: { [k: string]: string } }
): Promise<void> {
  return new Promise<void>((resolve, reject) => {
    debug("running fotingo release");
    const fotingoCmd = spawn("fotingo", Array.isArray(arguments_) ? arguments_ : [arguments_], options);
    fotingoCmd.stdout.on("data", (data) => {
      logger.log(data.toString());
    });
    fotingoCmd.stderr.on("data", (data) => {
      logger.error(data.toString());
    });
    fotingoCmd.on("error", (error) => {
      debug("crowdin command returned an error %o", error);
      reject(error);
    });
    fotingoCmd.on("close", (code) => {
      debug("crowdin command exited with code %s", code);
      if (code !== 0) {
        reject(new Error(`Fotingo exited with code ${code}`));
      } else {
        resolve();
      }
    });
  });
}

export async function success(_: Record<string, unknown>, context: Context): Promise<void> {
  await callFotingo(["release", "-n"], context.logger, { env: context.env });
}
