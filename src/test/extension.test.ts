import * as assert from 'assert';
import * as vscode from 'vscode';
import * as path from 'path';
import * as fs from 'fs';

async function loadXML(filePath: string): Promise<string> {
    return new Promise<string>((resolve, reject) => {
        fs.readFile(filePath, 'utf-8', (err, data) => {
            if (err) {
                reject(err);
            } else {
                resolve(data);
            }
        });
    });
}

async function performDocumentFormat(xmlText: string): Promise<vscode.TextEditor> {
    const xmlUri = vscode.Uri.parse('untitled:' + path.join(__dirname, 'test.xml'));
    const doc = await vscode.workspace.openTextDocument(xmlUri);
    const editor = await vscode.window.showTextDocument(doc);

    await editor.edit(editBuilder => {
        editBuilder.insert(new vscode.Position(0, 0), xmlText);
    });

    await vscode.commands.executeCommand('editor.action.formatDocument');

    return editor;
}

async function compareXML(inputXML: string, outputXML: string) {
    const unformattedFilePath = path.join(__dirname, '../test/unformatted/', inputXML);
    const formattedFilePath = path.join(__dirname, '../test/formatted/', outputXML);
    
    const unformattedXML = await loadXML(unformattedFilePath);
    const expectedFormattedXML = (await loadXML(formattedFilePath)).replaceAll('\r', '');

    const editor = await performDocumentFormat(unformattedXML);

    assert.strictEqual(editor.document.getText().replaceAll('\r', ''), expectedFormattedXML);
}

function copyTestFiles() {
  const unformattedDir = path.join(__dirname, '../../src/test/unformatted');
  const formattedDir = path.join(__dirname, '../../src/test/formatted');

    fs.accessSync(unformattedDir, fs.constants.R_OK);
    fs.accessSync(formattedDir, fs.constants.R_OK);

    const unformattedFiles = fs.readdirSync(unformattedDir);
    const formattedFiles = fs.readdirSync(formattedDir);

    assert.strictEqual(unformattedFiles.length, formattedFiles.length);

    const unformattedOutputDir = path.join(__dirname, '../test/unformatted');
    const formattedOutputDir = path.join(__dirname, '../test/formatted');

    fs.mkdirSync(unformattedOutputDir, { recursive: true });
    fs.mkdirSync(formattedOutputDir, { recursive: true });

    for (const file of unformattedFiles) {
      fs.copyFileSync(path.join(unformattedDir, file), path.join(unformattedOutputDir, file));
    }
    
    for (const file of formattedFiles) {
      fs.copyFileSync(path.join(formattedDir, file), path.join(formattedOutputDir, file));
    }

}

suite('Bulk Format XML Files', function() {
    this.timeout(5000);

    copyTestFiles();
    const testFiles = fs.readdirSync(path.join(__dirname, '../test/unformatted'));

    for (const file of testFiles) {
        test(`Format ${file} File`, async function() {
            await compareXML(file, file);
        });
    }

});
