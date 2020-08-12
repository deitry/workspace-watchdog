// TODO: ?
// https://code.visualstudio.com/api/references/vscode-api#DocumentColorProvider

import * as vscode from 'vscode';

const bkgColorProperty = "backgroundColor";
const includeProperty = "includeFolders";
const excludeProperty = "excludeFolders";
const extensionNamespace = "workspaceWatchdog";

class Config
{
	bkgColor: string;
	includeFolders?: string[];
	excludeFolders?: string[];

	constructor()
	{
		let conf = vscode.workspace.getConfiguration(extensionNamespace);

		if (!conf)
			throw new Error("Missed Workspace Watchdog configuration");

		this.bkgColor = conf.get(
			bkgColorProperty,
			"rgba(65,65,85,1)"
		);

		if (conf.has(includeProperty))
			this.includeFolders = conf.get(includeProperty);

		if (conf.has(excludeProperty))
			this.excludeFolders = conf.get(excludeProperty)
	}

	isFileIncluded(path: string)
	{
		let relPath: string = vscode.workspace.asRelativePath(path, false);

		return relPath == path;
	}
}

export function activate(context: vscode.ExtensionContext)
{
	let config = new Config();

	let updateColor = function (e: vscode.TextEditor | undefined)
	{
		if (e == undefined
			|| e.document == undefined
			|| e.viewColumn == undefined)
		{
			// e.viewColumn is undefined for vscode special editors like one in Output pane
			return;
		}

		// if returned value same as input then file is outside workspace
		if (config.isFileIncluded(e.document.uri.path))
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

	let refreshAll = function ()
	{
		// Refresh color for already opened editors
		for (var e of vscode.window.visibleTextEditors)
			updateColor(e);
	};

	vscode.workspace.onDidChangeConfiguration((e: vscode.ConfigurationChangeEvent) =>
	{
		if (e.affectsConfiguration(extensionNamespace))
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
