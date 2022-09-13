import * as vscode from 'vscode';
import { DeepMockProxy, mockDeep, mockFn } from 'jest-mock-extended';

export type TestController = vscode.TestController;
export type OutputChannel = vscode.OutputChannel;
export type TestItem = vscode.TestItem;
export type TestRun = vscode.TestRun;
export type TestRunRequest = vscode.TestRunRequest;
export type CancellationToken = vscode.CancellationToken;
export type Uri = vscode.Uri;
export type TextDocument = vscode.TextDocument;
export type WorkspaceFolder = vscode.WorkspaceFolder;
export type ExtensionContext = vscode.ExtensionContext;
export type FileSystemWatcher = vscode.FileSystemWatcher;
export type TestRunProfile = vscode.TestRunProfile;
export type Disposable = vscode.Disposable;
export type TextDocumentChangeEvent = vscode.TextDocumentChangeEvent;

export const RelativePattern = mockFn();
export const TestMessage = mockFn();

export namespace commands {
  export const executeCommand = mockFn();
}

export namespace workspace {
  export var name = 'workspace';
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
}

export namespace tests {
  export const createTestController = mockFn();
}

export namespace window {
  export const createOutputChannel = mockFn();
}