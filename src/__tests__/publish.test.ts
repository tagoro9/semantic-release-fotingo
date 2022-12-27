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

  const branch = { name: "main", main: true, type: "release" };

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
      callback(arguments_, childProcess) {
        const fotingoCommand = arguments_[1][0];
        if (fotingoCommand === "release") {
          childProcess.stdout?.emit("data", "Test");
          childProcess.emit("close", 0);
        } else if (fotingoCommand === "inspect") {
          childProcess.stdout?.emit("data", "{");
          childProcess.stdout?.emit(
            "data",
            '"commits": [], "issues": [{"raw": "#TEST-678", "issue": "TEST-678"}], "name": "c/test-678_fotingo_gets_tickets_from_a_brach"'
          );
          childProcess.stdout?.emit("data", "}");
          childProcess.emit("close", 0);
        }
      },
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
    expect(spawnMock).toHaveBeenCalledTimes(2);
    expect(spawnMock.mock.calls[0].slice(0, -1)).toMatchInlineSnapshot(`
      [
        "fotingo",
        [
          "inspect",
          "-b",
          "main",
        ],
      ]
    `);
    expect(spawnMock.mock.calls[1].slice(0, -1)).toMatchInlineSnapshot(`
      [
        "fotingo",
        [
          "release",
          "-y",
          "-n",
          "semantic-release-fotingo-1.0.0",
          "-i",
          "TEST-678",
          "-i",
          "TEST-1234",
          "-i",
          "TEST-12",
        ],
      ]
    `);
    expect(spawnMock.mock.calls[1][2]).toMatchInlineSnapshot(`
      {
        "env": {
          "CI": "true",
          "FOTINGO_ENV_TEST": "test",
          "FOTINGO_GIT_REMOTE": "https://github.com/tagoro9/semantic-release-fotingo",
        },
      }
    `);
    expect(logger.log).toHaveBeenCalled();
    expect(logger.log.mock.calls[1][0]).toMatchInlineSnapshot(`"{"`);
  });

  test("it does not include the repo in the release name when it can't find it", async () => {
    await mockFotingoCommand({
      callCommand: () => publish({}, { branch, commits, env: {}, logger: getLogger(), nextRelease } as Context),
      exitCode: 0,
      spawnMock,
    });
    expect(spawnMock.mock.calls[1].slice(0, -1)).toMatchInlineSnapshot(`
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

  test("it's a noop when there are no issues", async () => {
    await mockFotingoCommand({
      callCommand: () => publish({}, { branch, env: {}, logger: getLogger(), nextRelease } as Context),
      exitCode: 0,
      spawnMock,
    });
    expect(spawnMock).toHaveBeenCalled();
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

  test.each([{ type: "maintenance", main: false }, { type: "prerelease" }, { type: "release", main: false }])(
    "it's a noop when it's a pre-release of type: %o",
    async (branchConfig) => {
      await mockFotingoCommand({
        callCommand: () =>
          publish({}, {
            branch: { ...branch, ...branchConfig },
            commits,
            env: {},
            logger: getLogger(),
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
    expect(logger.error).toHaveBeenCalledTimes(3);
    expect(logger.error.mock.calls).toMatchInlineSnapshot(`
      [
        [
          "Failed call fotingo inspect",
          [Error: Fotingo failed],
        ],
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
    expect(logger.error).toHaveBeenCalledTimes(3);
    expect(logger.error.mock.calls).toMatchInlineSnapshot(`
      [
        [
          "Failed call fotingo inspect",
          [Error: Fotingo exited with code 1],
        ],
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
