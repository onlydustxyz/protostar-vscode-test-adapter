import * as vscode from 'vscode';
import { TestAdapter, TestLoadStartedEvent, TestLoadFinishedEvent, TestRunStartedEvent, TestRunFinishedEvent, TestSuiteEvent, TestEvent } from 'vscode-test-adapter-api';
import { Log } from 'vscode-test-adapter-util';
import { loadTests, runTests } from './protostarTests';
import { ChildProcess } from 'child_process';

export class ProtostarAdapter implements TestAdapter {

	private runningTestProcesses: ChildProcess[] = [];

	private disposables: { dispose(): void }[] = [];

	private readonly testsEmitter = new vscode.EventEmitter<TestLoadStartedEvent | TestLoadFinishedEvent>();
	private readonly testStatesEmitter = new vscode.EventEmitter<TestRunStartedEvent | TestRunFinishedEvent | TestSuiteEvent | TestEvent>();
	private readonly autorunEmitter = new vscode.EventEmitter<void>();

	get tests(): vscode.Event<TestLoadStartedEvent | TestLoadFinishedEvent> { return this.testsEmitter.event; }
	get testStates(): vscode.Event<TestRunStartedEvent | TestRunFinishedEvent | TestSuiteEvent | TestEvent> { return this.testStatesEmitter.event; }
	get autorun(): vscode.Event<void> | undefined { return this.autorunEmitter.event; }

	constructor(
		public readonly workspace: vscode.WorkspaceFolder,
		private readonly log: Log
	) {
		this.log.info('Initializing protostar adapter');

		this.disposables.push(this.testsEmitter);
		this.disposables.push(this.testStatesEmitter);
		this.disposables.push(this.autorunEmitter);
	}

	async load(): Promise<void> {
		this.log.info('Loading protostar tests');

		this.testsEmitter.fire(<TestLoadStartedEvent>{ type: 'started' });
		const loadedTests = await loadTests(this.workspace, this.log);
		this.testsEmitter.fire(<TestLoadFinishedEvent>{ type: 'finished', suite: loadedTests });
	}

	async run(tests: string[]): Promise<void> {
		if (this.runningTestProcesses.length > 0) return; // it is safe to ignore a call to `run()`

		this.testStatesEmitter.fire(<TestRunStartedEvent>{ type: 'started', tests });

		this.log.info(`Running tests ${JSON.stringify(tests, null, 2)}`);

		return new Promise<void>((resolve, _) => {
			this.runningTestProcesses = runTests(tests, this.testStatesEmitter, this.workspace, this.log);
			this.log.info(`${this.runningTestProcesses.length} process running: ${this.runningTestProcesses.map(p => p.pid)}`);

			// we will _always_ receive an `exit` event when the child process ends, even if it crashes or
			// is killed, so this is a good place to send the `TestRunFinishedEvent` and resolve the Promise
			this.runningTestProcesses.forEach(childProcess => childProcess.once('exit', () => {
				this.log.info(`Process ${childProcess.pid} finished`);
				this.runningTestProcesses = this.runningTestProcesses.filter(runningProcess => childProcess.pid != runningProcess.pid);

				if (this.runningTestProcesses.length === 0) {
					this.testStatesEmitter.fire({ type: 'finished' });
					resolve();
				}
			}));
		});
	}

	cancel(): void {
		this.runningTestProcesses.forEach(p => p.kill());
		// there is no need to do anything else here because we will receive an `exit` event from the child process
	}

	dispose(): void {
		this.cancel();
		for (const disposable of this.disposables) {
			disposable.dispose();
		}
		this.disposables = [];
	}
}
