import { spawn } from "child_process";

import EventEmitter = require("events");
import { Context, LoggerFunction } from "semantic-release";

/**
 * Mock a call to spawn. The passed callback receives the arguments passed to the spawn function and a child process mock
 */
function mockSpawn(
  spawnMock: jest.Mock,
  callback: (arguments_: Parameters<typeof spawn>, childProcess: ReturnType<typeof spawn>) => void
): void {
  const eventEmitter = new EventEmitter.EventEmitter();
  Object.assign(eventEmitter, {
    stderr: new EventEmitter.EventEmitter(),
    stdout: new EventEmitter.EventEmitter(),
  });
  spawnMock.mockImplementation((...arguments_) => {
    setTimeout(() => callback(arguments_, eventEmitter as unknown as ReturnType<typeof spawn>), 0);
    return eventEmitter as unknown as ReturnType<typeof spawn>;
  });
}

/**
 * Mock the execution of a fotingo command, by emitting some
 * messages in the mocked spawn function
 * @param callCommand Function that actually calls the command
 * @param callback Function that gets instantiated when spawn is called. It recevied the arguments spawn is called with
 * and an event emitter to send messages to the calling function
 * @param error Error to emit if shouldSucceed is false
 * @param exitCode Fotingo exit code
 * @param shouldSucceed Flag indicating if the command should succeed or fail
 * @param spawnMock Mocked spawn function
 */
export async function mockFotingoCommand({
  callCommand,
  callback,
  error = new Error("Fotingo failed"),
  exitCode = 0,
  shouldSucceed = true,
  spawnMock,
}: {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  callCommand: () => Promise<any>;
  callback?: (arguments_: Parameters<typeof spawn>, childProcess: ReturnType<typeof spawn>) => void;
  error?: Error;
  exitCode?: number;
  shouldSucceed?: boolean;
  spawnMock: jest.Mock;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
}): Promise<any> {
  mockSpawn(
    spawnMock,
    callback ??
      ((_, childProcess) => {
        // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
        childProcess.stdout!.emit("data", "Test");
        if (shouldSucceed) {
          childProcess.emit("close", exitCode);
        } else {
          childProcess.emit("error", error);
        }
      })
  );
  return callCommand();
}

/**
 * Build a semantic release logger mock
 */
export function getLogger(): Record<keyof Context["logger"], jest.Mock<LoggerFunction>> {
  const properties = [
    "await",
    "complete",
    "debug",
    "error",
    "fatal",
    "fav",
    "info",
    "log",
    "note",
    "pause",
    "pending",
    "star",
    "start",
    "success",
    "wait",
    "warn",
    "watch",
  ];
  return Object.fromEntries(properties.map((property) => [property, jest.fn()])) as Record<
    keyof Context["logger"],
    jest.Mock<LoggerFunction>
  >;
}
