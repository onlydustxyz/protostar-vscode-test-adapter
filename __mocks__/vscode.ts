import * as vscode from 'vscode';
import { DeepMockProxy, mockDeep, mockFn } from 'jest-mock-extended';

export interface TestController extends vscode.TestController { };
export interface OutputChannel extends vscode.OutputChannel { };
export interface TestItem extends vscode.TestItem { };
export interface TestRun extends vscode.TestRun { };
export interface TestRunRequest extends vscode.TestRunRequest { };
export interface CancellationToken extends vscode.CancellationToken { };
export interface Uri extends vscode.Uri { };
export interface TextDocument extends vscode.TextDocument { };
export interface WorkspaceFolder extends vscode.WorkspaceFolder { };
export interface ExtensionContext extends vscode.ExtensionContext { };
export interface FileSystemWatcher extends vscode.FileSystemWatcher { };
export interface TestRunProfile extends vscode.TestRunProfile { };
export interface Disposable extends vscode.Disposable { };
export interface TextDocumentChangeEvent extends vscode.TextDocumentChangeEvent { };

export const RelativePattern = mockFn();
export const TestMessage = mockFn();

export namespace workspace {
    export var name = '';
    export const fs = mockDeep<vscode.FileSystem>();
    export const asRelativePath = mockFn();
    export var workspaceFolders = [] as DeepMockProxy<vscode.WorkspaceFolder>[] | null;
    export const createFileSystemWatcher = mockFn();
    export const findFiles = mockFn();
    export const onDidOpenTextDocument = mockFn();
    export const onDidChangeTextDocument = mockFn();
    export const getWorkspaceFolder = mockFn();
}

export enum TestRunProfileKind {
    Run = 1,
    Debug = 2,
    Coverage = 3,
};

export namespace tests {
    export const createTestController = mockFn();
}

export namespace window {
    export const createOutputChannel = mockFn();
}