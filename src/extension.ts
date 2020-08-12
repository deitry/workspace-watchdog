// TODO: ?
// https://code.visualstudio.com/api/references/vscode-api#DocumentColorProvider

import * as vscode from 'vscode';
import * as path from 'path';

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

	/**
	 * @param absPath Absolute path
	 */
	private isFileInWorkspace(absPath: string): boolean
	{
		// if returned value same as input then file is outside workspace
		let relPath: string = vscode.workspace.asRelativePath(absPath, false);
		return relPath != absPath;
	}

	private isFileNotExcluded(absPath: string): boolean
	{
		if (this.excludeFolders)
		{
			return this.excludeFolders.every(folder => {
				folder = vscode.workspace.asRelativePath(folder, false);
				let relPath = vscode.workspace.asRelativePath(absPath, false);
				return path.relative(folder, relPath).includes("..");
			});
		}

		// assuming we already checked that it is in included folders
		return true;
	}

	/**
	 * @param absPath Absolute path to file
	 */
	isFileIncluded(absPath: string): boolean
	{
		if (this.includeFolders)
		{
			let included = this.includeFolders.some(folder =>
			{
				folder = vscode.workspace.asRelativePath(folder, false);
				absPath = vscode.workspace.asRelativePath(absPath, false);
				return !path.relative(folder, absPath).includes("..");
			});
			if (!included)
				return false;
		}
		else
		{
			// check workspace only if includeFolders is empty
			if (!this.isFileInWorkspace(absPath))
				return false;
		}

		return this.isFileNotExcluded(absPath);
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

		if (!config.isFileIncluded(e.document.uri.path))
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
