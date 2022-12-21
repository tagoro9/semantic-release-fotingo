import { spawn } from "child_process";
import createDebugger from "debug";
// eslint-disable-next-line unicorn/import-style
import { dirname, resolve as pathResolve } from "path";
import { Context } from "semantic-release";

const debug = createDebugger("semantic-release-fotingo");

/**
 * Invoke a fotingo command as a child process
 * @param arguments_ Arguments
 * @param context Semantic release context
 * @param [options] Command options
 * @param [options.cwd] Working directory where to run the cmd
 * @param [options.env] Command environment
 */
export function callFotingo(
  arguments_: string | string[],
  { logger }: Context,
  options?: { cwd?: string; env?: { [k: string]: string } }
): Promise<void> {
  return new Promise<void>((resolve, reject) => {
    const arguments__ = Array.isArray(arguments_) ? arguments_ : [arguments_];
    debug(`running fotingo release with args: ${arguments__}`);
    // eslint-disable-next-line unicorn/prefer-module
    const fotingoPath = pathResolve(dirname(require.resolve("fotingo")), "../../.bin/fotingo");
    logger.log(`Running fotingo from ${fotingoPath}`);
    const fotingoCmd = spawn(fotingoPath, arguments__, { ...options, env: { ...options?.env, CI: "true" } });
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
      if (code === 0) {
        resolve();
      } else {
        reject(new Error(`Fotingo exited with code ${code}`));
      }
    });
  });
}
