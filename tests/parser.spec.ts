import { mockDeep } from 'jest-mock-extended';
import { readFile } from 'fs/promises';
import { Parser } from '../src/parser';
import * as vscode from '../__mocks__/vscode';

describe('parser', () => {

    const controller = mockDeep<vscode.TestController>();
    const outputChannel = mockDeep<vscode.OutputChannel>();

    const parser = new Parser(controller, outputChannel);

    const testItem = mockDeep<vscode.TestItem>({
        id: 'test_sample.cairo',
        uri: mockDeep<vscode.Uri>({
            fsPath: `./tests/test_sample.cairo`,
        })
    });

    const testItemCellEmpty = mockDeep<vscode.TestItem>({
        id: `test_sample.cairo::test_cell_empty`,
        label: `test_cell_empty`,
        uri: testItem.uri
    });

    const testItemAddDust = mockDeep<vscode.TestItem>({
        id: `test_sample.cairo::test_cell_add_dust`,
        label: `test_cell_add_dust`,
        uri: testItem.uri
    });

    beforeEach(() => {
        jest.resetAllMocks();
    });

    describe('parseTestsInFileContents', () => {
        it('should find functions from test file', async () => {
            controller.createTestItem.mockReturnValueOnce(testItemCellEmpty);
            controller.createTestItem.mockReturnValueOnce(testItemAddDust);

            const testFileContent = await readFile('./tests/test_sample.cairo');
            parser.parseTestsInFileContents(testItem, testFileContent.toString());

            expect(controller.createTestItem).toHaveBeenCalledTimes(2);
            expect(controller.createTestItem).toHaveBeenCalledWith(testItemCellEmpty.id, testItemCellEmpty.label, testItemCellEmpty.uri);
            expect(controller.createTestItem).toHaveBeenCalledWith(testItemAddDust.id, testItemAddDust.label, testItemAddDust.uri);
            expect(testItem.children.replace).toHaveBeenCalledWith([testItemCellEmpty, testItemAddDust]);
        });

        it('should not find functions if test has no uri', async () => {
            await parser.parseTestsInFileContents({ ...testItem, uri: undefined });

            expect(vscode.workspace.fs.readFile).not.toHaveBeenCalled();
            expect(controller.createTestItem).not.toHaveBeenCalled();
        });

        it('should decode the test file before parsing if no content provided', async () => {
            controller.createTestItem.mockReturnValueOnce(testItemCellEmpty);
            controller.createTestItem.mockReturnValueOnce(testItemAddDust);
            vscode.workspace.fs.readFile.mockImplementation(() => readFile('./tests/test_sample.cairo'));

            await parser.parseTestsInFileContents(testItem);

            expect(vscode.workspace.fs.readFile).toHaveBeenCalledWith(testItem.uri);
            expect(controller.createTestItem).toHaveBeenCalledTimes(2);
            expect(controller.createTestItem).toHaveBeenCalledWith(testItemCellEmpty.id, testItemCellEmpty.label, testItemCellEmpty.uri);
            expect(controller.createTestItem).toHaveBeenCalledWith(testItemAddDust.id, testItemAddDust.label, testItemAddDust.uri);
            expect(testItem.children.replace).toHaveBeenCalledWith([testItemCellEmpty, testItemAddDust]);
        });
    });

});
