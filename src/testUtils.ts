import { spawn } from "child_process";

import EventEmitter = require("events");

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
  return (eventEmitter as unknown) as ReturnType<typeof spawn>;
}

/**
 * Mock the execution of a fotingo command, by emitting some
 * messages in the mocked spawn function
 * @param callCommand Function that actually calls the command
 * @param exitCode Fotingo exit code
 * @param shouldSucceed Flag indicating if the command should succeed or fail
 */
export async function mockFotingoCommand({
  callCommand,
  exitCode = 0,
  shouldSucceed = true,
  spawnMock,
}: {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  callCommand: () => Promise<any>;
  exitCode?: number;
  shouldSucceed?: boolean;
  spawnMock: jest.Mock;
}) {
  const eventEmitter = mockSpawn(spawnMock);
  const commandPromise = callCommand();
  // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
  eventEmitter.stdout!.emit("data", "Test");
  if (shouldSucceed) {
    eventEmitter.emit("close", exitCode);
  } else {
    eventEmitter.emit("error", new Error("Fotingo failed"));
  }
  return commandPromise;
}

/**
 * Build a semantic release logger mock
 */
export function getLogger() {
  return {
    error: jest.fn(),
    log: jest.fn(),
  };
}
