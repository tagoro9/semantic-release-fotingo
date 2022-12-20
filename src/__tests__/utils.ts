import { spawn } from "child_process";

import EventEmitter = require("events");
import { Context, LoggerFunction } from "semantic-release";

/**
 * Mock a call to spawn. Return a similar api backed by event emitters
 */
function mockSpawn(spawnMock: jest.Mock) {
  const eventEmitter = new EventEmitter.EventEmitter();
  Object.assign(eventEmitter, {
    stderr: new EventEmitter.EventEmitter(),
    stdout: new EventEmitter.EventEmitter(),
  });
  spawnMock.mockImplementation(() => eventEmitter);
  return eventEmitter as unknown as ReturnType<typeof spawn>;
}

/**
 * Mock the execution of a fotingo command, by emitting some
 * messages in the mocked spawn function
 * @param callCommand Function that actually calls the command
 * @param error Error to emit if shouldSucceed is false
 * @param exitCode Fotingo exit code
 * @param shouldSucceed Flag indicating if the command should succeed or fail
 * @param spawnMock Mocked spawn function
 */
export async function mockFotingoCommand({
  callCommand,
  exitCode = 0,
  shouldSucceed = true,
  spawnMock,
  error = new Error("Fotingo failed"),
}: {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  callCommand: () => Promise<any>;
  error?: Error;
  exitCode?: number;
  shouldSucceed?: boolean;
  spawnMock: jest.Mock;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
}): Promise<any> {
  const eventEmitter = mockSpawn(spawnMock);
  const commandPromise = callCommand();
  // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
  eventEmitter.stdout!.emit("data", "Test");
  if (shouldSucceed) {
    eventEmitter.emit("close", exitCode);
  } else {
    eventEmitter.emit("error", error);
  }
  return commandPromise;
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
