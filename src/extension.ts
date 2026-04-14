import * as vscode from "vscode";
import { promises as fs } from "node:fs";
import * as path from "node:path";
import * as os from "node:os";

const STATE_FILE = path.join(os.tmpdir(), "abgox.InputTip.State");

let colorKeys: string[] = [];
let lastAppliedState: string | undefined;
let isProcessing = false;
let pendingState: string | undefined;
let pendingForce = false;
let originalColors: Record<string, string | null | undefined> = {};
let fileWatcher: vscode.Disposable | undefined;
let currentAbortController: AbortController | undefined;

let syncTimer: NodeJS.Timeout | undefined;
let isConfigUpdating = false;

const output = vscode.window.createOutputChannel("InputTip for VSCode", {
  log: true,
});

export async function activate(context: vscode.ExtensionContext) {
  output.info("Activating extension...");

  const props =
    context.extension.packageJSON?.contributes?.configuration?.properties?.[
      "InputTip.color"
    ]?.properties?.["CN"].properties;

  colorKeys = props
    ? Object.keys(props)
    : ["editorCursor.foreground", "terminalCursor.foreground"];

  context.subscriptions.push(
    vscode.window.onDidChangeWindowState((e) => {
      if (e.focused) {
        setTimeout(() => void refreshFromFile(true), 100);
      }
    }),
    vscode.workspace.onDidChangeConfiguration((e) => {
      if (e.affectsConfiguration("InputTip")) {
        void refreshFromFile(true);
      }
    }),
    {
      dispose: () => {
        stopWatcher();
        if (currentAbortController) {
          currentAbortController.abort();
        }
        if (syncTimer) {
          clearTimeout(syncTimer);
        }
      },
    },
  );

  setupFileWatcher();
  void refreshFromFile(true);

  output.info(`Extension activated.`);
  output.info(`Color keys: ${colorKeys.join(", ")}`);
  output.info(`State path: ${STATE_FILE}`);
}

function setupFileWatcher() {
  stopWatcher();

  const watcher = vscode.workspace.createFileSystemWatcher(
    new vscode.RelativePattern(
      path.dirname(STATE_FILE),
      path.basename(STATE_FILE),
    ),
  );

  watcher.onDidChange(() => void refreshFromFile());
  watcher.onDidCreate(() => void refreshFromFile());
  watcher.onDidDelete(() => void refreshFromFile(true));

  fileWatcher = watcher;
}

function stopWatcher() {
  if (fileWatcher) {
    fileWatcher.dispose();
    fileWatcher = undefined;
  }
}

async function refreshFromFile(force = false) {
  if (!force && !vscode.window.state.focused) {
    return;
  }
  if (currentAbortController) {
    currentAbortController.abort();
  }
  const controller = new AbortController();
  currentAbortController = controller;

  try {
    const content = await fs.readFile(STATE_FILE, {
      encoding: "utf8",
      signal: controller.signal,
    });
    const state = content.trim();

    if (force || state !== lastAppliedState) {
      await dispatchUpdate(state, force);
    }
  } catch (err: any) {
    if (err.name === "AbortError") {
      return;
    }

    if (err.code === "ENOENT") {
      vscode.window.showWarningMessage(
        `The state file not found: ${STATE_FILE}`,
      );
      await dispatchUpdate("", force);
      return;
    }
    output.debug(`Read error: ${err.message}`);
  } finally {
    if (currentAbortController === controller) {
      currentAbortController = undefined;
    }
  }
}

async function dispatchUpdate(state: string, force: boolean) {
  pendingState = state;
  if (force) {
    pendingForce = true;
  }

  if (isProcessing) {
    return;
  }
  isProcessing = true;
  try {
    while (pendingState !== undefined) {
      const target = pendingState;
      const currentForce = pendingForce;

      pendingState = undefined;
      pendingForce = false;

      lastAppliedState = target;
      await syncColors(target, currentForce);
    }
  } finally {
    isProcessing = false;
  }
}

async function syncColors(state: string, force: boolean) {
  if (syncTimer) {
    clearTimeout(syncTimer);
  }

  return new Promise<void>((resolve) => {
    syncTimer = setTimeout(async () => {
      if (isConfigUpdating) {
        resolve();
        return;
      }
      isConfigUpdating = true;
      try {
        await performActualUpdate(state, force);
      } catch (err: any) {
        vscode.window.showErrorMessage(
          `Failed to write 'workbench.colorCustomizations': ${err.message}`,
        );
      } finally {
        isConfigUpdating = false;
        resolve();
      }
    }, 50);
  });
}

async function performActualUpdate(state: string, force: boolean) {
  const config = vscode.workspace.getConfiguration();
  const allColorConfigs =
    config.get<Record<string, Record<string, string>>>("InputTip.color") || {};
  const targetTheme = state ? allColorConfigs[state] : undefined;

  const inspect = config.inspect<Record<string, string>>(
    "workbench.colorCustomizations",
  );

  const targetConfig = inspect?.workspaceValue
    ? vscode.ConfigurationTarget.Workspace
    : vscode.ConfigurationTarget.Global;

  const currentCustoms = {
    ...((targetConfig === vscode.ConfigurationTarget.Workspace
      ? inspect?.workspaceValue
      : inspect?.globalValue) || {}),
  };

  let hasChanged = false;

  for (const key of colorKeys) {
    const newColorFromConfig = targetTheme ? targetTheme[key] : undefined;
    const isKeyUsedAnywhere = Object.values(allColorConfigs).some(
      (s) => s && s[key] !== undefined,
    );

    if (isKeyUsedAnywhere && originalColors[key] === undefined) {
      const currentValue = currentCustoms[key];
      const isAlreadyAPluginColor = Object.values(allColorConfigs).some(
        (s) => s && s[key] !== undefined && s[key] === currentValue,
      );

      if (isAlreadyAPluginColor) {
        originalColors[key] = null;
        output.debug(
          `Detected existing plugin color for ${key}, backup set to null.`,
        );
      } else {
        originalColors[key] = currentValue ?? null;
        output.debug(`Backed up: ${key} = ${currentValue}`);
      }
    }

    if (newColorFromConfig) {
      if (currentCustoms[key] !== newColorFromConfig) {
        currentCustoms[key] = newColorFromConfig;
        hasChanged = true;
      }
    } else if (originalColors[key] !== undefined) {
      const backupValue = originalColors[key];
      if (backupValue === null) {
        if (key in currentCustoms) {
          delete currentCustoms[key];
          hasChanged = true;
        }
      } else if (currentCustoms[key] !== backupValue) {
        currentCustoms[key] = backupValue;
        hasChanged = true;
      }
    }
  }

  if (hasChanged || force) {
    await config.update(
      "workbench.colorCustomizations",
      currentCustoms,
      targetConfig,
    );
    output.debug(state ? `Applied State: ${state}` : "Colors Reset");
  }
}

export async function deactivate() {
  stopWatcher();
  if (currentAbortController) {
    currentAbortController.abort();
  }
  if (syncTimer) {
    clearTimeout(syncTimer);
  }
}
