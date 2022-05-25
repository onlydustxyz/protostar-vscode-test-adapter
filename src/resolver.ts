import { Parser } from './parser';
import { TestController, OutputChannel, RelativePattern, workspace, Uri, TextDocument } from 'vscode';

export class ResolveHandler {
	controller: TestController;
	outputChannel: OutputChannel;
	parser: Parser;

	constructor(controller: TestController, outputChannel: OutputChannel) {
		this.controller = controller;
		this.outputChannel = outputChannel;
		this.parser = new Parser(this.controller, this.outputChannel);
	}

	discoverAllFilesInWorkspace = () => {
		if (!workspace.workspaceFolders) {
			return []; // handle the case of no open folders
		}

		return Promise.all(
			workspace.workspaceFolders.map(async workspaceFolder => {
				const pattern = new RelativePattern(workspaceFolder, '**/test_*.cairo');
				const watcher = workspace.createFileSystemWatcher(pattern);

				watcher.onDidCreate(uri => this.getOrCreateFile(uri));
				watcher.onDidChange(uri => this.parseTestsInFile(uri));
				watcher.onDidDelete(uri => this.controller.items.delete(uri.toString()));

				for (const file of await workspace.findFiles(pattern)) {
					this.getOrCreateFile(file);
				}

				return watcher;
			})
		);
	}

	// In this function, we'll get the file TestItem if we've already found it,
	// otherwise we'll create it with `canResolveChildren = true` to indicate it
	// can be passed to the `controller.resolveHandler` to gets its children.
	getOrCreateFile = (uri: Uri) => {
		if (!isAllowed(uri)) { return null; }

		const existing = this.controller.items.get(uri.toString());
		if (existing) {
			return existing;
		}

		const file = this.controller.createTestItem(workspace.asRelativePath(uri.fsPath), uri.fsPath.split('/').pop()!, uri);
		file.canResolveChildren = true;
		this.controller.items.add(file);
		this.outputChannel.appendLine(`[${workspace.name}] Found new test file: ${file.id}`);

		return file;
	}

	parseTestsInDocument = async (e: TextDocument) => {
		const file = this.getOrCreateFile(e.uri);
		if (file) {
			await this.parser.parseTestsInFileContents(file, e.getText());
		}
	}

	parseTestsInFile = async (uri: Uri) => {
		const file = this.getOrCreateFile(uri);
		if (file) {
			await this.parser.parseTestsInFileContents(file);
		}
	}
};

const isAllowed = (uri: Uri): boolean => {
	const relativePath = workspace.asRelativePath(uri.fsPath).split('/');
	const root = relativePath[0];
	const filename = relativePath[relativePath.length - 1]
	return !['.git', 'lib'].includes(root) &&
		uri.scheme === 'file' &&
		filename.match(/^test_.*\.cairo$/) !== null;
}

