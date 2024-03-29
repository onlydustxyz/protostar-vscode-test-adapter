import * as vscode from "../__mocks__/vscode";
import { RunHandler } from "../src/runner";
import { anyNumber, isA, mockDeep } from "jest-mock-extended";
import child_process from "child_process";
import { MockChildProcess, mockSpawn } from "spawn-mock";
import { Formatter } from "../src/formatter";

jest.mock("child_process");

describe("runner", () => {
  const controller = mockDeep<vscode.TestController>();
  const outputChannel = mockDeep<vscode.OutputChannel>();

  const runner = new RunHandler(controller, outputChannel);
  const formatter = new Formatter();

  beforeEach(() => {
    jest.resetAllMocks();
  });

  describe("executeTest", () => {
    it("should execute a test and update its state when success", async () => {
      const testRun = mockDeep<vscode.TestRun>();

      const testItem = mockDeep<vscode.TestItem>({
        id: "test_contract.cairo::test_function",
      });

      const workspaceFolder = mockDeep<vscode.WorkspaceFolder>({
        uri: {
          scheme: "directory",
          fsPath: "path/to/starklings",
        },
        name: "starklings",
        index: 1,
      });

      const spawn = mockSpawn(function (childProcess: MockChildProcess) {
        const { cmd, args, options } = childProcess;
        expect(cmd).toStrictEqual("protostar");
        expect(args).toStrictEqual(["-p", "ci", "test", testItem.id]);
        expect(options!.cwd).toStrictEqual(workspaceFolder.uri.fsPath);

        childProcess.stdout.write(`[PASS] test_contract.cairo test_function`);
        childProcess.stderr.write("Progress [16/24]");

        childProcess.end();
      });

      //vscode.commands.executeCommand.mockImplementation();

      vscode.workspace.getWorkspaceFolder.mockReturnValue(workspaceFolder);
      testItem.children.get.calledWith(testItem.id).mockReturnValue(undefined);

      (child_process.spawn as jest.Mock).mockImplementation(spawn);
      await runner.executeTest(testRun, testItem);

      expect(testRun.started).toHaveBeenCalledWith(testItem);
      expect(testRun.passed).toHaveBeenCalledWith(testItem, anyNumber());
    });

    it("should execute a test from root and update its state when success", async () => {
      const testRun = mockDeep<vscode.TestRun>();

      const workspaceFolder = mockDeep<vscode.WorkspaceFolder>({
        uri: {
          scheme: "directory",
          fsPath: "path/to/starklings",
        },
        name: "starklings",
        index: 1,
      });

      const root = mockDeep<vscode.TestItem>({
        id: "starklings",
        uri: workspaceFolder.uri,
      });

      const testItem = mockDeep<vscode.TestItem>({
        id: "test_contract.cairo::test_function",
      });

      const spawn = mockSpawn(function (childProcess: MockChildProcess) {
        const { cmd, args, options } = childProcess;
        expect(cmd).toStrictEqual("protostar");
        expect(args).toStrictEqual(["-p", "ci", "test"]);
        expect(options!.cwd).toStrictEqual(workspaceFolder.uri.fsPath);

        childProcess.stdout.write(`[PASS] test_contract.cairo test_function`);
        childProcess.stderr.write("Progress [16/24]");

        childProcess.end();
      });

      vscode.workspace.getWorkspaceFolder.mockReturnValue(workspaceFolder);
      testItem.children.get.calledWith(root.id).mockReturnValue(testItem);

      (child_process.spawn as jest.Mock).mockImplementation(spawn);
      await runner.executeTest(testRun, root);

      expect(testRun.started).toHaveBeenCalledWith(root);
      expect(testRun.passed).toHaveBeenCalledWith(root, anyNumber());
    });
  });

  describe("executeTest", () => {
    it("should execute a test suite update each test state", async () => {
      const testRun = mockDeep<vscode.TestRun>();

      const testItem = mockDeep<vscode.TestItem>({
        id: "test_contract.cairo",
      });

      const workspaceFolder = mockDeep<vscode.WorkspaceFolder>({
        uri: {
          fsPath: "path/to/starklings",
        },
        name: "starklings",
        index: 1,
      });

      const spawn = mockSpawn(function (childProcess: MockChildProcess) {
        const { cmd, args, options } = childProcess;
        expect(cmd).toStrictEqual("protostar");
        expect(args).toStrictEqual(["-p", "ci", "test", testItem.id]);
        expect(options!.cwd).toStrictEqual(workspaceFolder.uri.fsPath);

        childProcess.stdout.write(
          `[PASS] test_contract.cairo test_function_success`
        );
        childProcess.stdout.write(
          `[FAIL] test_contract.cairo test_function_failed`
        );

        childProcess.end();
      });

      vscode.workspace.getWorkspaceFolder.mockReturnValue(workspaceFolder);

      const testItemSuccess = mockDeep<vscode.TestItem>({
        id: "test_contract.cairo::test_function_success",
      });
      const testItemFail = mockDeep<vscode.TestItem>({
        id: "test_contract.cairo::test_function_failed",
      });
      testItem.children.get
        .calledWith(testItemSuccess.id)
        .mockReturnValue(testItemSuccess);
      testItem.children.get
        .calledWith(testItemFail.id)
        .mockReturnValue(testItemFail);

      (child_process.spawn as jest.Mock).mockImplementation(spawn);
      await runner.executeTest(testRun, testItem);

      expect(testRun.started).toHaveBeenCalledWith(testItem);
      expect(testRun.passed).toHaveBeenCalledWith(testItemSuccess, anyNumber());
      expect(testRun.failed).toHaveBeenCalledWith(
        testItemFail,
        isA(vscode.TestMessage),
        anyNumber()
      );
    });

    it("should not execute a test if no uri provided", async () => {
      const testRun = mockDeep<vscode.TestRun>();

      const testItem = mockDeep<vscode.TestItem>({
        id: "test_contract.cairo",
        uri: undefined,
      });

      await runner.executeTest(testRun, testItem);

      expect(testRun.started).not.toHaveBeenCalled();
    });
  });

  describe("handleRequest", () => {
    it("should handle a Test run request with all tests", async () => {
      const testRun = mockDeep<vscode.TestRun>();
      const testItem = mockDeep<vscode.TestItem>({
        id: "test_contract.cairo",
      });

      controller.createTestRun.mockReturnValue(testRun);
      controller.items.forEach.mockImplementation((callback) =>
        callback(testItem, controller.items)
      );

      const workspaceFolder = mockDeep<vscode.WorkspaceFolder>({
        uri: {
          fsPath: "path/to/starklings",
        },
        name: "starklings",
        index: 1,
      });

      const spawn = mockSpawn(function (childProcess: MockChildProcess) {
        const { cmd, args, options } = childProcess;
        expect(cmd).toStrictEqual("protostar");
        expect(args).toStrictEqual(["-p", "ci", "test", testItem.id]);
        expect(options!.cwd).toStrictEqual(workspaceFolder.uri.fsPath);

        childProcess.stdout.write(
          `[PASS] test_contract.cairo test_function_success`
        );
        childProcess.stdout.write(
          `[FAIL] test_contract.cairo test_function_failed`
        );

        childProcess.end();
      });

      vscode.workspace.getWorkspaceFolder.mockReturnValue(workspaceFolder);

      const testItemSuccess = mockDeep<vscode.TestItem>({
        id: "test_contract.cairo::test_function_success",
      });
      const testItemFail = mockDeep<vscode.TestItem>({
        id: "test_contract.cairo::test_function_failed",
      });
      testItem.children.get
        .calledWith(testItemSuccess.id)
        .mockReturnValue(testItemSuccess);
      testItem.children.get
        .calledWith(testItemFail.id)
        .mockReturnValue(testItemFail);

      (child_process.spawn as jest.Mock).mockImplementation(spawn);

      const request = mockDeep<vscode.TestRunRequest>({
        include: undefined,
        exclude: undefined,
      });
      const token = mockDeep<vscode.CancellationToken>({
        isCancellationRequested: false,
      });

      await runner.handleRequest(request, token);

      expect(controller.createTestRun).toHaveBeenCalledWith(request);
      expect(testRun.started).toHaveBeenCalledWith(testItem);
      expect(testRun.passed).toHaveBeenCalledWith(testItemSuccess, anyNumber());
      expect(testRun.failed).toHaveBeenCalledWith(
        testItemFail,
        isA(vscode.TestMessage),
        anyNumber()
      );
      expect(testRun.end).toHaveBeenCalled();
    });

    it("should handle a Test run request with a filtered input", async () => {
      const testRun = mockDeep<vscode.TestRun>();
      const testItemIncluded = mockDeep<vscode.TestItem>({
        id: "test_contract_included.cairo",
      });
      const testItemExcluded = mockDeep<vscode.TestItem>({
        id: "test_contract_excluded.cairo",
      });

      controller.createTestRun.mockReturnValue(testRun);

      const workspaceFolder = mockDeep<vscode.WorkspaceFolder>({
        uri: {
          fsPath: "path/to/starklings",
        },
        name: "starklings",
        index: 1,
      });

      const spawn = mockSpawn(function (childProcess: MockChildProcess) {
        const { cmd, args, options } = childProcess;
        expect(cmd).toStrictEqual("protostar");
        expect(args).toStrictEqual(["-p", "ci", "test", testItemIncluded.id]);
        expect(options!.cwd).toStrictEqual(workspaceFolder.uri.fsPath);

        childProcess.stdout.write(
          `[PASS] test_contract.cairo test_function_success`
        );
        childProcess.stdout.write(
          `[FAIL] test_contract.cairo test_function_failed`
        );

        // end the child process
        childProcess.end();
      });

      vscode.workspace.getWorkspaceFolder.mockReturnValue(workspaceFolder);

      const testItemSuccess = mockDeep<vscode.TestItem>({
        id: "test_contract.cairo::test_function_success",
      });
      const testItemFail = mockDeep<vscode.TestItem>({
        id: "test_contract.cairo::test_function_failed",
      });
      testItemIncluded.children.get
        .calledWith(testItemSuccess.id)
        .mockReturnValue(testItemSuccess);
      testItemIncluded.children.get
        .calledWith(testItemFail.id)
        .mockReturnValue(testItemFail);

      (child_process.spawn as jest.Mock).mockImplementation(spawn);

      const excludedTests = mockDeep<vscode.TestItem[]>();
      jest
        .mocked(excludedTests.includes)
        .mockImplementation((searchElement: vscode.TestItem) => {
          return searchElement.id === testItemExcluded.id;
        });

      const request = mockDeep<vscode.TestRunRequest>({
        include: [testItemIncluded, testItemExcluded],
        exclude: excludedTests,
      });
      const token = mockDeep<vscode.CancellationToken>({
        isCancellationRequested: false,
      });

      await runner.handleRequest(request, token);

      expect(controller.createTestRun).toHaveBeenCalledWith(request);
      expect(testRun.started).toHaveBeenCalledWith(testItemIncluded);
      expect(testRun.passed).toHaveBeenCalledWith(testItemSuccess, anyNumber());
      expect(testRun.failed).toHaveBeenCalledWith(
        testItemFail,
        isA(vscode.TestMessage),
        anyNumber()
      );
      expect(testRun.end).toHaveBeenCalled();
    });

    it("should not execute a test if cancellation is requested", async () => {
      const testRun = mockDeep<vscode.TestRun>();
      const testItem = mockDeep<vscode.TestItem>({
        id: "test_contract.cairo",
      });

      controller.createTestRun.mockReturnValue(testRun);
      controller.items.forEach.mockImplementation((callback) =>
        callback(testItem, controller.items)
      );

      const request = mockDeep<vscode.TestRunRequest>({
        include: undefined,
        exclude: undefined,
      });
      const token = mockDeep<vscode.CancellationToken>({
        isCancellationRequested: true,
      });

      await runner.handleRequest(request, token);

      expect(controller.createTestRun).toHaveBeenCalledWith(request);
      expect(testRun.started).not.toHaveBeenCalled();
      expect(testRun.end).toHaveBeenCalled();
    });

    it("should log test result if test succeeded", async () => {
      const testRun = mockDeep<vscode.TestRun>();

      const testItem = mockDeep<vscode.TestItem>({
        id: "test_contract.cairo::test_function",
      });

      const workspaceFolder = mockDeep<vscode.WorkspaceFolder>({
        uri: {
          scheme: "directory",
          fsPath: "path/to/starklings",
        },
        name: "starklings",
        index: 1,
      });

      const spawn = mockSpawn(function (childProcess: MockChildProcess) {
        const { cmd, args, options } = childProcess;
        expect(cmd).toStrictEqual("protostar");
        expect(args).toStrictEqual(["-p", "ci", "test", testItem.id]);
        expect(options!.cwd).toStrictEqual(workspaceFolder.uri.fsPath);

        childProcess.end();
      });

      vscode.workspace.getWorkspaceFolder.mockReturnValue(workspaceFolder);
      testItem.children.get.calledWith(testItem.id).mockReturnValue(undefined);

      (child_process.spawn as jest.Mock).mockImplementation(spawn);
      await runner.executeTest(testRun, testItem);

      runner.parseTestCommandOutput(
        testRun,
        testItem,
        0,
        "[PASS] onlyDust/tests/test_main.cairo test_increase_balance (time=2.97s)"
      );

      expect(testRun.appendOutput).toHaveBeenNthCalledWith(
        2,
        formatter.formatInBold(
          formatter.formatInGreen(
            "1/1" +
              " " +
              "PASS" +
              ": " +
              "onlyDust/tests/test_main.cairo test_increase_balance" +
              " " +
              "(time=2.97s)"
          )
        )
      );
    });

    it("should log test result if test succeeded", async () => {
      const testRun = mockDeep<vscode.TestRun>();

      const testItem = mockDeep<vscode.TestItem>({
        id: "test_contract.cairo::test_function",
      });

      const workspaceFolder = mockDeep<vscode.WorkspaceFolder>({
        uri: {
          scheme: "directory",
          fsPath: "path/to/starklings",
        },
        name: "starklings",
        index: 1,
      });

      const spawn = mockSpawn(function (childProcess: MockChildProcess) {
        const { cmd, args, options } = childProcess;
        expect(cmd).toStrictEqual("protostar");
        expect(args).toStrictEqual(["-p", "ci", "test", testItem.id]);
        expect(options!.cwd).toStrictEqual(workspaceFolder.uri.fsPath);

        childProcess.end();
      });

      vscode.workspace.getWorkspaceFolder.mockReturnValue(workspaceFolder);
      testItem.children.get.calledWith(testItem.id).mockReturnValue(undefined);

      (child_process.spawn as jest.Mock).mockImplementation(spawn);
      await runner.executeTest(testRun, testItem);

      runner.parseTestCommandOutput(
        testRun,
        testItem,
        0,
        "[FAIL] onlyDust/tests/test_main.cairo test_increase_balance (time=2.07s)\n[type] TRANSACTION_FAILED\n[code] 39\n[details]:\nonlyDust/tests/test_main.cairo:13:5: Error at pc=0:130:\nAn ASSERT_EQ instruction failed: 42 != 43.\nassert result_after = 43\n^**********************^\nCairo traceback (most recent call last):\nonlyDust/tests/test_main.cairo:6:6: (pc=0:140)\nfunc test_increase_balance{syscall_ptr : felt*, range_check_ptr, pedersen_ptr : HashBuiltin*}():\n^*******************^"
      );

      expect(testRun.appendOutput).toHaveBeenNthCalledWith(
        2,
        formatter.formatInBold(
          formatter.formatInRed(
            "1/1" +
              " " +
              "FAIL" +
              ": " +
              "onlyDust/tests/test_main.cairo test_increase_balance" +
              " " +
              "(time=2.07s)"
          )
        )
      );

      expect(testRun.appendOutput).toHaveBeenNthCalledWith(
        3,
        formatter.formatWithTab(
          formatter.formatInRed(
            "[details]:\r\n\tonlyDust/tests/test_main.cairo:13:5: Error at pc=0:130:\r\n\tAn ASSERT_EQ instruction failed: 42 != 43.\r\n\tassert result_after = 43\r\n\t^**********************^\r\n\tCairo traceback (most recent call last):\r\n\tonlyDust/tests/test_main.cairo:6:6: (pc=0:140)\r\n\tfunc test_increase_balance{syscall_ptr : felt*, range_check_ptr, pedersen_ptr : HashBuiltin*}():\r\n\t^*******************"
          )
        )
      );
    });
  });
});
