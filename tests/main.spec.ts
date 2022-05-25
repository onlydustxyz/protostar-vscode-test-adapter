import { anyFunction, mockDeep } from 'jest-mock-extended';
import { activate } from '../src/main';
import { Parser } from '../src/parser';
import { ResolveHandler } from '../src/resolver';
import { RunHandler } from '../src/runner';

import * as vscode from '../__mocks__/vscode';

const parser = mockDeep<Parser>();
jest.mock('../src/parser', () => {
    return {
        Parser: jest.fn().mockImplementation(() => parser)
    }
});

const resolver = mockDeep<ResolveHandler>();
jest.mock('../src/resolver', () => {
    return {
        ResolveHandler: jest.fn().mockImplementation(() => {
            return resolver;
        })
    }
});

const runner = mockDeep<RunHandler>();
jest.mock('../src/runner', () => {
    return {
        RunHandler: jest.fn().mockImplementation(() => {
            return runner;
        })
    }
});

describe('main', () => {
    describe('activate', () => {

        it('should create a controller', async () => {
            const controller = mockDeep<vscode.TestController>();
            vscode.tests.createTestController.calledWith('protostar-test-controller', 'Protostar Test Controller').mockReturnValue(controller);

            const outputChannel = mockDeep<vscode.OutputChannel>();
            vscode.window.createOutputChannel.calledWith('Protostar Tests').mockReturnValue(outputChannel);

            const request = mockDeep<vscode.TestRunRequest>();
            const token = mockDeep<vscode.CancellationToken>();

            controller.createRunProfile.calledWith('Run', vscode.TestRunProfileKind.Run, anyFunction()).mockImplementation(
                (label: string, kind: vscode.TestRunProfileKind, runHandler: (request: vscode.TestRunRequest, token: vscode.CancellationToken) => void | Thenable<void>) => {
                    runHandler(request, token);
                    return mockDeep<vscode.TestRunProfile>();
                });

            const changeEvent = mockDeep<vscode.TextDocumentChangeEvent>({
                document: mockDeep<vscode.TextDocument>()
            });
            vscode.workspace.onDidChangeTextDocument.calledWith(anyFunction()).mockImplementation((listener: (e: vscode.TextDocumentChangeEvent) => any) => {
                listener(changeEvent);
            });

            const context = mockDeep<vscode.ExtensionContext>()
            await activate(context);

            expect(context.subscriptions.push).toHaveBeenCalledWith(controller);

            expect(resolver.parseTestsInDocument).toHaveBeenCalledWith(changeEvent.document);

            expect(vscode.workspace.onDidOpenTextDocument).toHaveBeenCalled();

            expect(RunHandler).toHaveBeenCalledWith(controller, outputChannel);
            expect(runner.handleRequest).toHaveBeenCalledWith(request, token);

            expect(controller.resolveHandler).toBeInstanceOf(Function);

            const testItem = mockDeep<vscode.TestItem>();
            await controller.resolveHandler!(testItem);
            expect(parser.parseTestsInFileContents).toHaveBeenCalledWith(testItem);

            await controller.resolveHandler!(undefined);
            expect(resolver.discoverAllFilesInWorkspace).toHaveBeenCalled();
        });
    });
});
