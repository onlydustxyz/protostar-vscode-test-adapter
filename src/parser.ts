import { TextDecoder } from 'util';
import { TestController, OutputChannel, TestItem, workspace } from 'vscode';

export class Parser {
	controller: TestController;
	outputChannel: OutputChannel;

	constructor(controller: TestController, outputChannel: OutputChannel) {
		this.controller = controller;
		this.outputChannel = outputChannel;
	}

	parseTestsInFileContents = async (file: TestItem, contents?: string) => {
		// If a document is open, VS Code already knows its contents. If this is being
		// called from the resolveHandler when a document isn't open, we'll need to
		// read them from disk ourselves.
		if (contents === undefined && file.uri) {
			const rawContent = await workspace.fs.readFile(file.uri);
			contents = new TextDecoder().decode(rawContent);
		}

		const testRegex = /^func (test_[A-Za-z0-9_]*).*$/;

		const children = (contents || '')
			.split('\n')
			.map(line => {
				const label = line.match(testRegex)?.at(1)
				if (label === undefined) { return null; }

				const id = `${file.id}::${label}`;
				this.outputChannel.appendLine(`[${workspace.name}] Found new test: ${id}`);
				return this.controller.createTestItem(id, label, file.uri);
			})
			.filter(line => !!line) as TestItem[]
			;

		file.children.replace(children);
	}
}
