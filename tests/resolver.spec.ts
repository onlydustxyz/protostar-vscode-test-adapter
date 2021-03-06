import { mockDeep } from 'jest-mock-extended';
import { Parser } from '../src/parser';
import { ResolveHandler } from '../src/resolver';

import * as vscode from '../__mocks__/vscode';


const parser = mockDeep<Parser>();

jest.mock('../src/parser', () => {
    return {
        Parser: jest.fn().mockImplementation(() => parser)
    }
});

describe('resolver', () => {
    const controller = mockDeep<vscode.TestController>();
    const outputChannel = mockDeep<vscode.OutputChannel>();

    const resolver = new ResolveHandler(controller, outputChannel);

    const testFile = mockDeep<vscode.TestItem>({
        id: 'test_sample.cairo',
        uri: {
            scheme: 'file',
            fsPath: 'path/to/test_contract.cairo',
        }
    });

    const root = mockDeep<vscode.TestItem>({
        id: 'root',
        uri: {
            scheme: 'file',
            fsPath: 'root/',
        }
    });

    const testDocument = mockDeep<vscode.TextDocument>({
        uri: testFile.uri!,
    });

    const testItem = mockDeep<vscode.TestItem>();

    const workspaceFolder = mockDeep<vscode.WorkspaceFolder>({
        uri: {
            scheme: 'directory',
            fsPath: 'path/to/starklings',
        },
        name: "starklings",
        index: 1
    });

    beforeEach(() => {
        jest.resetAllMocks();
    });

    describe('getOrCreateFile', () => {

        it('should not create a file if test in lib folder', () => {
            vscode.workspace.asRelativePath.calledWith(testFile.uri!.fsPath).mockReturnValue("lib/path/to/test_contract.cairo");

            expect(resolver.getOrCreateFile(root, testFile.uri!)).toBeNull();

            expect(root.children.get).not.toHaveBeenCalled();
            expect(controller.createTestItem).not.toHaveBeenCalled();
        });

        it('should not create a file if test in .git folder', () => {
            vscode.workspace.asRelativePath.calledWith(testFile.uri!.fsPath).mockReturnValue(".git/path/to/test_contract.cairo");

            expect(resolver.getOrCreateFile(root, testFile.uri!)).toBeNull();

            expect(root.children.get).not.toHaveBeenCalled();
            expect(controller.createTestItem).not.toHaveBeenCalled();
        });

        it('should not create a file if test is not a file', () => {
            const directoryUri = { ...testFile.uri!, ...{ scheme: 'directory' } };
            vscode.workspace.asRelativePath.calledWith(testFile.uri!.fsPath).mockReturnValue(testFile.uri!.fsPath);

            expect(resolver.getOrCreateFile(root, directoryUri)).toBeNull();

            expect(root.children.get).not.toHaveBeenCalled();
            expect(controller.createTestItem).not.toHaveBeenCalled();
        });

        it('should not create a file if test does not match pattern', () => {
            vscode.workspace.asRelativePath.calledWith(testFile.uri!.fsPath).mockReturnValue("path/to/not_a_test_contract.cairo");

            expect(resolver.getOrCreateFile(root, testFile.uri!)).toBeNull();

            expect(root.children.get).not.toHaveBeenCalled();
            expect(controller.createTestItem).not.toHaveBeenCalled();
        });

        it('should not create a file if already exists', () => {
            vscode.workspace.asRelativePath.calledWith(testFile.uri!.fsPath).mockReturnValue(testFile.uri!.fsPath);

            root.children.get.mockReturnValueOnce(testItem);

            expect(resolver.getOrCreateFile(root, testFile.uri!)).toBe(testItem);

            expect(controller.createTestItem).not.toHaveBeenCalled();
        });

        it('should create a file if it does not already exists', () => {
            vscode.workspace.asRelativePath.calledWith(testFile.uri!.fsPath).mockReturnValue(testFile.uri!.fsPath);

            root.children.get.mockReturnValueOnce(undefined);
            controller.createTestItem.calledWith(testFile.uri!.fsPath, 'test_contract.cairo', testFile.uri!).mockReturnValue(testItem);

            const file = resolver.getOrCreateFile(root, testFile.uri!);
            expect(file!.canResolveChildren).toBeTruthy();

            expect(root.children.add).toHaveBeenCalledWith(file);
        });
    });

    describe('discoverAllFilesInWorkspace', () => {
        it('should do nothing if no workspace folder opened', async () => {
            vscode.workspace.workspaceFolders = null;
            expect(await resolver.discoverAllFilesInWorkspace()).toStrictEqual([]);
        });

        it('should find test files for each workspace folder opened', async () => {

            const starkonquest = mockDeep<vscode.WorkspaceFolder>({
                uri: { scheme: 'directory', path: 'path/to/starkonquest' },
                name: "starkonquest",
                index: 0
            });

            const starklings = mockDeep<vscode.WorkspaceFolder>({
                uri: { scheme: 'directory', path: 'path/to/starklings' },
                name: "starklings",
                index: 1
            });

            vscode.workspace.workspaceFolders = [starkonquest, starklings];

            controller.createTestItem.calledWith(starkonquest.name, starkonquest.name, starkonquest.uri).mockReturnValue(root);
            controller.createTestItem.calledWith(starklings.name, starklings.name, starklings.uri).mockReturnValue(root);

            const watcher = mockDeep<vscode.FileSystemWatcher>();

            watcher.onDidCreate.mockImplementation((listener: (e: vscode.Uri) => any) => {
                listener(mockDeep<vscode.Uri>());
                return mockDeep<vscode.Disposable>();
            });

            watcher.onDidChange.mockImplementation((listener: (e: vscode.Uri) => any) => {
                listener(mockDeep<vscode.Uri>());
                return mockDeep<vscode.Disposable>();
            });

            watcher.onDidDelete.mockImplementation((listener: (e: vscode.Uri) => any) => {
                listener(mockDeep<vscode.Uri>());
                expect(root.children.delete).toHaveBeenCalled();
                return mockDeep<vscode.Disposable>();
            });

            vscode.workspace.createFileSystemWatcher.mockReturnValue(watcher);
            vscode.workspace.findFiles.mockReturnValueOnce([testFile.uri!]);
            vscode.workspace.findFiles.mockReturnValueOnce([testFile.uri!, testFile.uri!]);

            vscode.workspace.asRelativePath.mockReturnValue(testFile.uri!.fsPath);
            root.children.get.mockReturnValue(testFile);

            await resolver.discoverAllFilesInWorkspace();

            expect(vscode.RelativePattern).toHaveBeenCalledWith(starkonquest, '**/test_*.cairo')
            expect(vscode.RelativePattern).toHaveBeenCalledWith(starklings, '**/test_*.cairo')

            expect(watcher.onDidCreate).toHaveBeenCalledTimes(2);
            expect(watcher.onDidChange).toHaveBeenCalledTimes(2);
            expect(watcher.onDidDelete).toHaveBeenCalledTimes(2);

            expect(root.children.get).toHaveBeenCalledTimes(3);
            expect(parser.parseTestsInFileContents).toHaveBeenCalledWith(testFile);
            expect(parser.parseTestsInFileContents).toHaveBeenCalledTimes(3);
        });
    });

    describe('parseTestsInFile', () => {
        it('should not call the parser if file is not created', () => {
            vscode.workspace.asRelativePath.mockReturnValue('not_a_test');

            resolver.parseTestsInFile(testFile.uri!);

            expect(parser.parseTestsInFileContents).not.toHaveBeenCalled();
        });

        it('should call the parser if file is created', async () => {
            vscode.workspace.asRelativePath.mockReturnValue(testFile.uri!.fsPath);
            vscode.workspace.getWorkspaceFolder.calledWith(testFile.uri).mockReturnValue(workspaceFolder);
            controller.items.get.mockReturnValue(root);
            root.children.get.mockReturnValue(testFile);

            await resolver.parseTestsInFile(testFile.uri!);

            expect(parser.parseTestsInFileContents).toHaveBeenCalledWith(testFile);
        });
    });

    describe('parseTestsInDocument', () => {
        it('should not call the parser if file is not created', async () => {
            vscode.workspace.asRelativePath.mockReturnValue('not_a_test');

            await resolver.parseTestsInDocument(testDocument);

            expect(parser.parseTestsInFileContents).not.toHaveBeenCalled();
        });

        it('should call the parser if file is created', async () => {
            vscode.workspace.asRelativePath.mockReturnValue(testFile.uri!.fsPath);
            vscode.workspace.getWorkspaceFolder.calledWith(testDocument.uri).mockReturnValue(workspaceFolder);
            controller.items.get.mockReturnValue(root);
            root.children.get.mockReturnValue(testFile);
            testDocument.getText.mockReturnValue('content');

            await resolver.parseTestsInDocument(testDocument);

            expect(parser.parseTestsInFileContents).toHaveBeenCalledWith(testFile, 'content');
        });
    });

});
