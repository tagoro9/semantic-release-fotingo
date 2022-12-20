import { jest } from "@jest/globals";
import { spawn } from "child_process";

import { isConfigured, verifyConditions } from "~/verifyConditions";

import { getLogger, mockFotingoCommand } from "./utils";

jest.mock("child_process", () => ({ spawn: jest.fn() }));
jest.mock("path", () => ({ dirname: jest.fn().mockReturnValue(""), resolve: jest.fn().mockReturnValue("fotingo") }));
const spawnMock = spawn as unknown as jest.Mock;

describe("verifyConditions", () => {
  const branch = { name: "main" };

  afterEach(() => {
    jest.clearAllMocks();
  });

  test("calls fotingo release with the context env", async () => {
    const logger = getLogger();
    await mockFotingoCommand({
      callCommand: () => verifyConditions({}, { branch, env: { FOTINGO_ENV_TEST: "test" }, logger }),
      exitCode: 0,
      spawnMock,
    });
    expect(spawnMock).toHaveBeenCalled();
    expect(spawnMock.mock.calls[0].slice(0, -1)).toMatchInlineSnapshot(`
      [
        "fotingo",
        [
          "verify",
        ],
      ]
    `);
    expect(spawnMock.mock.calls[0][2]).toMatchInlineSnapshot(`
      {
        "env": {
          "CI": "true",
          "FOTINGO_ENV_TEST": "test",
        },
      }
    `);
    expect(logger.log).toHaveBeenCalled();
    expect(logger.log.mock.calls[1][0]).toMatchInlineSnapshot(`"Test"`);
    expect(isConfigured()).toBeTruthy();
  });

  test("throws an error if fotingo errors out", async () => {
    await expect(
      mockFotingoCommand({
        callCommand: () => verifyConditions({}, { branch, env: { FOTINGO_ENV_TEST: "test" }, logger: getLogger() }),
        shouldSucceed: false,
        spawnMock,
      })
    ).rejects.toMatchInlineSnapshot(`[Error: Fotingo failed]`);
    expect(isConfigured()).toBeTruthy();
  });

  test("rejects on any non zero exit code", async () => {
    await expect(
      mockFotingoCommand({
        callCommand: () => verifyConditions({}, { branch, env: { FOTINGO_ENV_TEST: "test" }, logger: getLogger() }),
        exitCode: 1,
        spawnMock,
      })
    ).rejects.toMatchInlineSnapshot(`[Error: Fotingo exited with code 1]`);
    expect(isConfigured()).toBeTruthy();
  });

  test("skips fotingo if it is not properly configured", async () => {
    await mockFotingoCommand({
      callCommand: () => verifyConditions({}, { branch, env: { FOTINGO_ENV_TEST: "test" }, logger: getLogger() }),
      error: new Error("Missing required configuration: test"),
      shouldSucceed: false,
      spawnMock,
    });
    expect(isConfigured()).toBeFalsy();
  });
});
