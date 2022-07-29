import { spawn } from "child_process";
import createDebugger from "debug";
import { Context } from "semantic-release";

const debug = createDebugger("semantic-release-fotingo");

/**
 * Invoke a fotingo command as a child process
 * @param arguments_ Arguments
 * @param logger Semantic release logger
 * @param [options] Command options
 * @param [options.cwd] Working directory where to run the cmd
 * @param [options.env] Command environment
 */
export function callFotingo(
  arguments_: string | string[],
  logger: Context["logger"],
  options?: { cwd?: string; env?: { [k: string]: string } }
): Promise<void> {
  return new Promise<void>((resolve, reject) => {
    const arguments__ = Array.isArray(arguments_) ? arguments_ : [arguments_];
    debug(`running fotingo release with args: ${arguments__}`);
    const fotingoCmd = spawn("fotingo", arguments__, options);
    fotingoCmd.stdout.on("data", (data: string) => {
      logger.log(data.toString());
    });
    fotingoCmd.stderr.on("data", (data: string) => {
      logger.error(data.toString());
    });
    fotingoCmd.on("error", (error: Error) => {
      debug("fotingo command returned an error %o", error);
      reject(error);
    });
    fotingoCmd.on("close", (code: number) => {
      debug("fotingo command exited with code %s", code);
      if (code !== 0) {
        reject(new Error(`Fotingo exited with code ${code}`));
      } else {
        resolve();
      }
    });
  });
}
