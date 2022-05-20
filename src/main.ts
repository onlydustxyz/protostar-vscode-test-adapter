import * as vscode from 'vscode';
import { RunHandler } from './runner';
import { ResolveHandler } from './resolver';


export async function activate(context: vscode.ExtensionContext) {
	const controller = vscode.tests.createTestController('protostar-test-controller', 'Protostar Test Controller');
	context.subscriptions.push(controller);

	const outputChannel = vscode.window.createOutputChannel('Protostar Tests');

	const resolveHandler = new ResolveHandler(controller, outputChannel);
	controller.resolveHandler = async test => {
		await resolveHandler.resolve(test);
	};

	vscode.workspace.onDidOpenTextDocument(resolveHandler.parseTestsInDocument);
	vscode.workspace.onDidChangeTextDocument(e => resolveHandler.parseTestsInDocument(e.document));

	controller.createRunProfile(
		'Run',
		vscode.TestRunProfileKind.Run,
		(request, token) => {
			new RunHandler(controller, outputChannel).hanleRequest(request, token);
		}
	);
}
