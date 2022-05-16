import * as vscode from 'vscode';
import { TestSuiteInfo, TestInfo, TestRunStartedEvent, TestRunFinishedEvent, TestSuiteEvent, TestEvent } from 'vscode-test-adapter-api';
import { Log } from 'vscode-test-adapter-util';
import { resolve, relative } from 'path';
const { readdir } = require('fs').promises;
import { Dirent, readFileSync } from 'fs';
import { ChildProcess, spawn } from 'child_process';

const root = {
	type: 'suite',
	id: 'root',
	label: 'root',
} as TestSuiteInfo;

const isAllowed = (directory: string): boolean => {
	return !['.git', 'lib'].includes(directory);
}

const findTestSuites = async (rootDir: string, dir: string, matchingRegex: RegExp): Promise<TestSuiteInfo[]> => {
	const dirents = await readdir(dir, { withFileTypes: true });

	const files = await Promise.all(dirents
		.filter((dirent: Dirent) => dirent.isDirectory() ? isAllowed(dirent.name) : dirent.name.match(matchingRegex))
		.map((dirent: Dirent) => {
			const res = resolve(dir, dirent.name);
			return dirent.isDirectory() ?
				findTestSuites(rootDir, res, matchingRegex) :
				{
					type: 'suite',
					id: relative(rootDir, res),
					label: dirent.name.replace(/.cairo$/, ''),
					file: res,
				} as TestSuiteInfo;
		}));
	return Array.prototype.concat(...files);
}

const buildTests = async (dir: string, log: Log): Promise<TestSuiteInfo> => {
	const testSuites = await findTestSuites(dir, dir, /test_.*.cairo/);

	testSuites.forEach((suite: TestSuiteInfo) => {
		feed(suite, log);
	});

	root.children = testSuites;
	return root;
}

const feed = (suite: TestSuiteInfo, log: Log) => {
	log.info(suite.id);

	suite.children = readFileSync(suite.file!).toString()
		.split('\n')
		.map((content: string, index: number, array: string[]) => {
			return {
				type: 'test',
				label: content,
				file: suite.file,
				line: index,
			} as TestInfo;
		})
		.filter((info: TestInfo) => info.label.match(/func test_.*/))
		.map((info: TestInfo) => {
			const testRegex = /func (test_[A-Za-z0-9_]*)/;
			const func = info.label.match(testRegex)?.at(1) || info.label
			info.label = func
			info.id = `${suite.id}::${func}`;
			log.info(`   - ${info.id}`);
			return info;
		});
}

export function loadTests(workspace: vscode.WorkspaceFolder, log: Log): Promise<TestSuiteInfo> {
	return buildTests(workspace.uri.fsPath, log);
}

export function runTests(
	tests: string[],
	testStatesEmitter: vscode.EventEmitter<TestRunStartedEvent | TestRunFinishedEvent | TestSuiteEvent | TestEvent>,
	workspace: vscode.WorkspaceFolder,
	log: Log
): ChildProcess[] {
	const nodes = tests
		.map((id: string) => findNode(root, id))
		.filter((node: TestInfo | TestSuiteInfo | undefined) => node !== undefined)
		;

	return nodes.map((node: TestInfo | TestSuiteInfo | undefined) => runNode(node!, testStatesEmitter, workspace, log))
}

function findNode(searchNode: TestSuiteInfo | TestInfo, id: string): TestSuiteInfo | TestInfo | undefined {
	if (searchNode.id === id) {
		return searchNode;
	} else if (searchNode.type === 'suite') {
		for (const child of searchNode.children) {
			const found = findNode(child, id);
			if (found) return found;
		}
	}
	return undefined;
}

function runNode(
	node: TestSuiteInfo | TestInfo,
	testStatesEmitter: vscode.EventEmitter<TestRunStartedEvent | TestRunFinishedEvent | TestSuiteEvent | TestEvent>,
	workspace: vscode.WorkspaceFolder,
	log: Log
) {
	const workspaceFolder = workspace.uri.fsPath;
	const testFile = relative(workspaceFolder, node.file!);
	const testCommand = node.type === 'suite' ? testFile : `${testFile}::${node.label}`;

	startNode(node, testStatesEmitter);
	log.info(`> protostar test ${testCommand}`);
	const testProcess = spawn(`protostar`, [`test`, testCommand], { cwd: workspaceFolder });

	testProcess.stdout.on('data', (data: any) => {
		return parseTestCommandOutput(node, clean(data.toString()), testStatesEmitter, log)
	});

	testProcess.on('close', (code: number) => {
		log.info(`Test ended with return code: ${code}`);
		if (node.type == 'suite') {
			completeTestSuite(node, testStatesEmitter);
		}
	});

	return testProcess;
}

const clean = (line: string): string => line.replace(/[\u001b\u009b][[()#;?]*(?:[0-9]{1,4}(?:;[0-9]{0,4})*)?[0-9A-ORZcf-nqry=><]/g, '')

const parseTestCommandOutput = (
	node: TestInfo | TestSuiteInfo,
	output: string,
	testStatesEmitter: vscode.EventEmitter<TestRunStartedEvent | TestRunFinishedEvent | TestSuiteEvent | TestEvent>,
	log: Log
) => {
	log.info(output);

	const testResultRegex = /^\[(PASS|FAIL)\] (.*) (.*)$/;
	const testResults = output
		.split('\n')
		.map(line => line.match(testResultRegex))
		.filter(match => match !== null);

	for (const match of testResults) {
		const status = match![1];
		const file = match![2];
		const func = match![3];
		const id = `${file}::${func}`

		const childNode = findNode(node, id);
		if (childNode?.type == 'test') {
			status === 'PASS' ? completeTestSuccess(childNode, testStatesEmitter) : completeTestFailed(childNode, testStatesEmitter);
		}
	}
}

function startNode(
	node: TestSuiteInfo | TestInfo,
	testStatesEmitter: vscode.EventEmitter<TestRunStartedEvent | TestRunFinishedEvent | TestSuiteEvent | TestEvent>,
) {
	if (node.type === 'suite') {
		for (const child of node.children) {
			startNode(child, testStatesEmitter);
		}
	} else { // node.type === 'test'
		testStatesEmitter.fire(<TestEvent>{ type: 'test', test: node, state: 'running' });
	}
}

function completeTestSuite(
	node: TestSuiteInfo,
	testStatesEmitter: vscode.EventEmitter<TestRunStartedEvent | TestRunFinishedEvent | TestSuiteEvent | TestEvent>
) {
	testStatesEmitter.fire(<TestSuiteEvent>{ type: 'suite', suite: node, state: 'completed' });
}

function completeTestSuccess(
	node: TestInfo,
	testStatesEmitter: vscode.EventEmitter<TestRunStartedEvent | TestRunFinishedEvent | TestSuiteEvent | TestEvent>
) {
	testStatesEmitter.fire(<TestEvent>{ type: 'test', test: node, state: 'passed' });
}

function completeTestFailed(
	node: TestInfo,
	testStatesEmitter: vscode.EventEmitter<TestRunStartedEvent | TestRunFinishedEvent | TestSuiteEvent | TestEvent>
) {
	testStatesEmitter.fire(<TestEvent>{ type: 'test', test: node, state: 'failed' });
}

