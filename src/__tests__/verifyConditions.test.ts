import { spawn } from "child_process";

import { getLogger, mockFotingoCommand } from "~/testUtils";
import { verifyConditions } from "~/verifyConditions";

jest.mock("child_process", () => ({ spawn: jest.fn() }));
const spawnMock = (spawn as unknown) as jest.Mock;

describe("verifyConditions", () => {
  afterEach(() => {
    jest.clearAllMocks();
  });

  test("calls fotingo release with the context env", async () => {
    const logger = getLogger();
    await mockFotingoCommand({
      callCommand: () => verifyConditions({}, { env: { FOTINGO_ENV_TEST: "test" }, logger }),
      exitCode: 0,
      spawnMock,
    });
    expect(spawnMock).toHaveBeenCalled();
    expect(spawnMock.mock.calls[0].slice(0, -1)).toMatchInlineSnapshot(`
      Array [
        "fotingo",
        Array [
          "verify",
        ],
      ]
    `);
    expect(logger.log).toHaveBeenCalled();
    expect(logger.log.mock.calls[0][0]).toMatchInlineSnapshot(`"Test"`);
  });

  test("throws an error if fotingo errors out", async () => {
    await expect(
      mockFotingoCommand({
        callCommand: () => verifyConditions({}, { env: { FOTINGO_ENV_TEST: "test" }, logger: getLogger() }),
        shouldSucceed: false,
        spawnMock,
      })
    ).rejects.toMatchInlineSnapshot(`[Error: Fotingo failed]`);
  });

  test("rejects on any non zero exit code", async () => {
    await expect(
      mockFotingoCommand({
        callCommand: () => verifyConditions({}, { env: { FOTINGO_ENV_TEST: "test" }, logger: getLogger() }),
        exitCode: 1,
        spawnMock,
      })
    ).rejects.toMatchInlineSnapshot(`[Error: Fotingo exited with code 1]`);
  });
});
