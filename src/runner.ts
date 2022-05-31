import { spawn } from 'child_process';
import { TestController, OutputChannel, TestRunRequest, TestItem, TestRun, TestMessage, CancellationToken, workspace } from 'vscode';

export class RunHandler {
	controller: TestController;
	outputChannel: OutputChannel;

	constructor(controller: TestController, outputChannel: OutputChannel) {
		this.controller = controller;
		this.outputChannel = outputChannel
	}

	handleRequest = async (
		request: TestRunRequest,
		token: CancellationToken
	) => {
		const run = this.controller.createTestRun(request);
		const queue: TestItem[] = [];

		// Loop through all included tests, or all known tests, and add them to our queue
		if (request.include) {
			request.include.forEach(test => queue.push(test));
		} else {
			this.controller.items.forEach(test => queue.push(test));
		}

		// For every test that was queued, try to run it. Call run.passed() or run.failed().
		// The `TestMessage` can contain extra information, like a failing location or
		// a diff output. But here we'll just give it a textual message.
		while (queue.length > 0 && !token.isCancellationRequested) {
			// eslint-disable-next-line @typescript-eslint/no-non-null-assertion
			const test = queue.pop()!;

			// Skip tests the user asked to exclude
			if (request.exclude?.includes(test)) {
				continue;
			}

			// Otherwise, just run the test case. Note that we don't need to manually
			// set the state of parent tests; they'll be set automatically.
			await this.executeTest(run, test);
		}

		// Make sure to end the run after all tests have been executed:
		run.end();
	}

	parseTestCommandOutput = (run: TestRun, test: TestItem, start: number, output: string) => {
		const testResultRegex = /^\[(PASS|FAIL)\] (.*) (.*)$/;
		const testResults = output
			.split('\n')
			.map(line => line.match(testResultRegex))
			.filter(match => match) as RegExpMatchArray[];

		for (const match of testResults) {
			const status = match[1];
			const file = match[2];
			const func = match[3];
			const id = `${file}::${func}`

			const duration = Date.now() - start;
			const parent = test.children.get(file) || test
			const testCase = parent.children.get(id) || parent;
			status == `PASS` ?
				run.passed(testCase, duration) : run.failed(testCase, new TestMessage(`Test failed`), duration)
		}
	}

	executeTest = async (run: TestRun, test: TestItem) => {
		const start = Date.now();

		const workspaceFolder = test.uri ? workspace.getWorkspaceFolder(test.uri) : undefined;

		if (workspaceFolder !== undefined && test.uri) {
			run.started(test);

			const isRoot = workspaceFolder.uri.fsPath === test.uri.fsPath;
			const args = ['-p', 'ci', 'test'];
			if (!isRoot) { args.push(test.id); }

			this.outputChannel.appendLine(`(${workspaceFolder.uri.fsPath}) > protostar ${args.join(" ")}`);
			const child = spawn(`protostar`, args, { cwd: workspaceFolder.uri.fsPath });

			child.stdout.on('data', (data) => {
				this.outputChannel.appendLine(data.toString())
				this.parseTestCommandOutput(run, test, start, data.toString())
			});

			child.stderr.on('data', (data) => {
				this.outputChannel.appendLine(data.toString())
			});

			await new Promise((resolve) => {
				child.on('close', resolve)
			});
		}
	};
}
