import { spawn } from "child_process";
import EventEmitter = require("events");
import { success } from "~/success";

jest.mock("child_process", () => ({ spawn: jest.fn() }));

const spawnMock = (spawn as unknown) as jest.Mock;

/**
 * Mock a call to spawn. Return a similar api backed by event emitters
 */
function mockSpawn() {
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
async function mockFotingoCommand({
  callCommand,
  exitCode = 0,
  shouldSucceed = true,
}: {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  callCommand: () => Promise<any>;
  exitCode?: number;
  shouldSucceed?: boolean;
}) {
  const eventEmitter = mockSpawn();
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
function getLogger() {
  return {
    error: jest.fn(),
    log: jest.fn(),
  };
}

describe("success", () => {
  afterEach(() => {
    jest.clearAllMocks();
  });

  test("calls fotingo release with the context env", async () => {
    const logger = getLogger();
    await mockFotingoCommand({
      callCommand: () => success({}, { env: { FOTINGO_ENV_TEST: "test" }, logger }),
      exitCode: 0,
    });
    expect(spawnMock).toHaveBeenCalled();
    expect(spawnMock.mock.calls[0].slice(0, -1)).toMatchInlineSnapshot(`
      Array [
        "fotingo",
        Array [
          "release",
        ],
      ]
    `);
    expect(logger.log).toHaveBeenCalled();
    expect(logger.log.mock.calls[0][0]).toMatchInlineSnapshot(`"Test"`);
  });

  test("throws an error if fotingo errors out", async () => {
    await expect(
      mockFotingoCommand({
        callCommand: () => success({}, { env: { FOTINGO_ENV_TEST: "test" }, logger: getLogger() }),
        shouldSucceed: false,
      })
    ).rejects.toMatchInlineSnapshot(`[Error: Fotingo failed]`);
  });

  test("rejects on any non zero exit code", async () => {
    await expect(
      mockFotingoCommand({
        callCommand: () => success({}, { env: { FOTINGO_ENV_TEST: "test" }, logger: getLogger() }),
        exitCode: 1,
      })
    ).rejects.toMatchInlineSnapshot(`[Error: Fotingo exited with code 1]`);
  });
});
