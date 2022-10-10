import * as vscode from 'vscode';
import { RunHandler } from './runner';
import { ResolveHandler } from './resolver';
import { Parser } from './parser';

export async function activate(context: vscode.ExtensionContext) {
	const manualLaunchCommand = vscode.commands
		.registerCommand("vscode-protostar-test-adapter.launchProtostarExtension", () => {
			vscode.window.showInformationMessage('Protostar Test Explorer launched successfully!\n\
				(Please use this command only if the extension was not automatically launched, \
				i.e. you changed protostar default configuration)');
		})	
	context.subscriptions.push(manualLaunchCommand);

	const controller = vscode.tests.createTestController('protostar-test-controller', 'Protostar Test Controller');
	context.subscriptions.push(controller);

	const outputChannel = vscode.window.createOutputChannel('Protostar Tests');

	const resolveHandler = new ResolveHandler(controller, outputChannel);
	const parser = new Parser(controller, outputChannel);
	const runHandler = new RunHandler(controller, outputChannel);

	controller.resolveHandler = async test => {
		test ? await parser.parseTestsInFileContents(test) : await resolveHandler.discoverAllFilesInWorkspace();
	};

	vscode.workspace.onDidOpenTextDocument(resolveHandler.parseTestsInDocument);
	vscode.workspace.onDidChangeTextDocument(e => resolveHandler.parseTestsInDocument(e.document));

	const callback = (request: vscode.TestRunRequest, token: vscode.CancellationToken) => {
		runHandler.handleRequest(request, token);
	};

	controller.createRunProfile('Run', vscode.TestRunProfileKind.Run, callback);
}
