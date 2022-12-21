import { beforeEach, jest } from "@jest/globals";
import { spawn } from "child_process";
import { Commit, Context } from "semantic-release";

import { publish } from "~/publish";
import { verifyConditions } from "~/verifyConditions";

import { getLogger, mockFotingoCommand } from "./utils";

jest.mock("child_process", () => ({ spawn: jest.fn() }));
jest.mock("path", () => ({ dirname: jest.fn().mockReturnValue(""), resolve: jest.fn().mockReturnValue("fotingo") }));

const spawnMock = spawn as unknown as jest.Mock;

describe("publish", () => {
  const commits = [
    { message: "feat: add something\nFixes #TEST-1234" },
    { message: "fix: fix something\nFixes #TEST-12" },
  ] as Commit[];

  const nextRelease = {
    gitHead: "HEAD",
    gitTag: "1.0.0",
    notes: "This is a release",
    type: "major",
    version: "1.0.0",
  };

  const branch = { name: "main" };

  const options = {
    branches: [],
    repositoryUrl: "https://github.com/tagoro9/semantic-release-fotingo",
    tagFormat: "",
    plugins: [],
  };

  const runVerify = async (missingConfiguration = false) => {
    await mockFotingoCommand({
      callCommand: () => verifyConditions({}, { branch, env: { FOTINGO_ENV_TEST: "test" }, logger: getLogger() }),
      exitCode: 0,
      ...(missingConfiguration ? { exitCode: 20 } : {}),
      spawnMock,
    });
    spawnMock.mockReset();
  };

  beforeEach(async () => {
    await runVerify();
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  test("calls fotingo release with the context env", async () => {
    const logger = getLogger();
    await mockFotingoCommand({
      callCommand: () =>
        publish({}, {
          branch,
          commits,
          env: { FOTINGO_ENV_TEST: "test" },
          logger,
          nextRelease,
          options,
        } as Context),
      exitCode: 0,
      spawnMock,
    });
    expect(spawnMock).toHaveBeenCalled();
    expect(spawnMock.mock.calls[0].slice(0, -1)).toMatchInlineSnapshot(`
      [
        "fotingo",
        [
          "release",
          "-y",
          "-n",
          "semantic-release-fotingo-1.0.0",
          "-i",
          "TEST-1234",
          "-i",
          "TEST-12",
        ],
      ]
    `);
    expect(spawnMock.mock.calls[0][2]).toMatchInlineSnapshot(`
      {
        "env": {
          "CI": "true",
          "FOTINGO_ENV_TEST": "test",
          "FOTINGO_GIT_REMOTE": "https://github.com/tagoro9/semantic-release-fotingo",
        },
      }
    `);
    expect(logger.log).toHaveBeenCalled();
    expect(logger.log.mock.calls[0][0]).toMatchInlineSnapshot(
      `"Creating release semantic-release-fotingo-1.0.0 with issues: TEST-1234,TEST-12"`
    );
  });

  test("it does not include the repo in the release name when it can't find it", async () => {
    await mockFotingoCommand({
      callCommand: () => publish({}, { branch, commits, env: {}, logger: getLogger(), nextRelease } as Context),
      exitCode: 0,
      spawnMock,
    });
    expect(spawnMock.mock.calls[0].slice(0, -1)).toMatchInlineSnapshot(`
      [
        "fotingo",
        [
          "release",
          "-y",
          "-n",
          "1.0.0",
          "-i",
          "TEST-1234",
          "-i",
          "TEST-12",
        ],
      ]
    `);
  });

  test("it's a noop when there are no issues in the commits", async () => {
    await mockFotingoCommand({
      callCommand: () => publish({}, { branch, env: {}, logger: getLogger(), nextRelease } as Context),
      exitCode: 0,
      spawnMock,
    });
    expect(spawnMock).not.toHaveBeenCalled();
  });

  test("it's a noop when there is no release", async () => {
    await mockFotingoCommand({
      callCommand: () => publish({}, { branch, commits, env: {}, logger: getLogger() } as Context),
      exitCode: 0,
      spawnMock,
    });
    expect(spawnMock).not.toHaveBeenCalled();
  });

  test("it's a noop when it is a dry run", async () => {
    await mockFotingoCommand({
      callCommand: () =>
        publish({}, {
          branch,
          env: {},
          logger: getLogger(),
          options: { ...options, dryRun: true },
        } as Context),
      exitCode: 0,
      spawnMock,
    });
    expect(spawnMock).not.toHaveBeenCalled();
  });

  test.each(["prerelease", "prepatch", "preminor", "premajor"])(
    "it's a noop when it's a release of type: %s",
    async (type) => {
      await mockFotingoCommand({
        callCommand: () =>
          publish({}, {
            branch,
            commits,
            env: {},
            logger: getLogger(),
            nextRelease: { ...nextRelease, type },
          } as Context),
        exitCode: 0,
        spawnMock,
      });
      expect(spawnMock).not.toHaveBeenCalled();
    }
  );

  test("logs an error if fotingo errors out", async () => {
    const logger = getLogger();
    await mockFotingoCommand({
      callCommand: () => publish({}, { branch, commits, env: {}, logger, nextRelease } as Context),
      shouldSucceed: false,
      spawnMock,
    });
    expect(logger.error).toHaveBeenCalledTimes(2);
    expect(logger.error.mock.calls).toMatchInlineSnapshot(`
      [
        [
          "fotingo release command failed",
        ],
        [
          [Error: Fotingo failed],
        ],
      ]
    `);
  });

  test("log an error on any non zero exit code", async () => {
    const logger = getLogger();
    await mockFotingoCommand({
      callCommand: () => publish({}, { branch, commits, env: {}, logger: logger, nextRelease } as Context),
      exitCode: 1,
      spawnMock,
    });
    expect(logger.error).toHaveBeenCalledTimes(2);
    expect(logger.error.mock.calls).toMatchInlineSnapshot(`
      [
        [
          "fotingo release command failed",
        ],
        [
          [Error: Fotingo exited with code 1],
        ],
      ]
    `);
  });

  test("it's a noop if the configuration is missing", async () => {
    await runVerify(true);
    const logger = getLogger();
    await mockFotingoCommand({
      callCommand: () => publish({}, { branch, env: {}, logger, nextRelease } as Context),
      exitCode: 0,
      spawnMock,
    });
    expect(spawnMock).not.toHaveBeenCalled();
    expect(logger.log.mock.calls).toMatchInlineSnapshot(`
      [
        [
          "Skipping fotingo. Missing configuration parameters",
        ],
      ]
    `);
  });
});
