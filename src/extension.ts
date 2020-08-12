// TODO: ?
// https://code.visualstudio.com/api/references/vscode-api#DocumentColorProvider

import * as vscode from 'vscode';

const bkgColorProperty = "backgroundColor";
const extNs = "workspaceWatchdog"; // extensionNamespace
const nsBkgColorProperty = extNs + '.' + bkgColorProperty;

class Config
{
	bkgColor: string;

	constructor()
	{
		var conf = vscode.workspace.getConfiguration(extNs);

		if (!conf)
			throw new Error("Missed Workspace Watchdog configuration");

		this.bkgColor = conf.get(
			bkgColorProperty,
			"rgba(65,65,85,1)"
		);
	}
}

export function activate(context: vscode.ExtensionContext)
{

	var config = new Config();

	var updateColor = function (e: vscode.TextEditor | undefined)
	{
		if (e == undefined
			|| e.document == undefined
			|| e.viewColumn == undefined)
		{
			// e.viewColumn is undefined for vscode special editors like one in Output pane
			return;
		}

		var relPath: string =
			vscode.workspace.asRelativePath(e.document.uri.path, false);

		// if returned value same as input then file is outside workspace
		if (relPath == e.document.uri.path)
		{

			// TODO: set up REAL background of editor

			// This actually applies to background only where the text is
			var bkg = vscode.window.createTextEditorDecorationType({
				backgroundColor: config.bkgColor,
			});

			e.setDecorations(
				bkg,
				[
					new vscode.Range(
						new vscode.Position(0, 0),
						new vscode.Position(
							e.document.lineCount - 1,
							0
						)
					)
				]
			);
		}
	};

	var refreshAll = function ()
	{
		// Refresh color for already opened editors
		for (var e of vscode.window.visibleTextEditors)
			updateColor(e);
	};

	vscode.workspace.onDidChangeConfiguration((e: vscode.ConfigurationChangeEvent) =>
	{
		if (e.affectsConfiguration(extNs))
		{
			// Reload configuration
			config = new Config();
			refreshAll();
		}
	});

	vscode.window.onDidChangeActiveTextEditor(updateColor);

	console.log('Workspace Watchdog is now active.');
	refreshAll();
}

export function deactivate() { }
