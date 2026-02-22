/* eslint-disable no-console */
const WebSocket = require('ws');

let keySender = null;
try {
  // Optional dependency. If unavailable, plugin still runs and logs warning.
  // npm i node-key-sender
  keySender = require('node-key-sender');
} catch (_error) {
  keySender = null;
}

const ACTION_UUID = 'com.example.bufftimer.action';
const DEFAULTS = {
  hotkey: 'CTRL+SHIFT+1',
  iconA: 'images/state-a.svg',
  iconB: 'images/state-b.svg',
  iconC: 'images/state-c.svg',
  timerBSeconds: 30,
  timerCSeconds: 10,
  blinkBEnabled: true,
  blinkCEnabled: true,
  blinkBHz: 1,
  blinkCHz: 3
};

const contexts = new Map();

function parseArgs(argv) {
  const args = {};
  for (let i = 0; i < argv.length; i += 1) {
    if (argv[i] === '-port') args.port = argv[i + 1];
    if (argv[i] === '-pluginUUID') args.pluginUUID = argv[i + 1];
    if (argv[i] === '-registerEvent') args.registerEvent = argv[i + 1];
    if (argv[i] === '-info') args.info = argv[i + 1];
  }
  return args;
}

function mergeSettings(settings = {}) {
  return {
    ...DEFAULTS,
    ...settings,
    timerBSeconds: Number(settings.timerBSeconds ?? DEFAULTS.timerBSeconds),
    timerCSeconds: Number(settings.timerCSeconds ?? DEFAULTS.timerCSeconds),
    blinkBHz: Number(settings.blinkBHz ?? DEFAULTS.blinkBHz),
    blinkCHz: Number(settings.blinkCHz ?? DEFAULTS.blinkCHz),
    blinkBEnabled: Boolean(settings.blinkBEnabled ?? DEFAULTS.blinkBEnabled),
    blinkCEnabled: Boolean(settings.blinkCEnabled ?? DEFAULTS.blinkCEnabled)
  };
}

function send(ws, event, payload = {}) {
  ws.send(JSON.stringify({ event, ...payload }));
}

function setImage(ws, context, image) {
  send(ws, 'setImage', { context, payload: { image, target: 0 } });
}

function setSettings(ws, context, settings) {
  send(ws, 'setSettings', { context, payload: settings });
}

function triggerHotkey(hotkey) {
  if (!keySender) {
    console.warn(`Hotkey "${hotkey}" nicht ausgelöst: optionales Paket node-key-sender fehlt.`);
    return;
  }

  const parts = hotkey
    .split('+')
    .map((p) => p.trim().toLowerCase())
    .filter(Boolean);

  if (parts.length === 0) return;
  keySender.sendCombination(parts).catch((error) => {
    console.error('Hotkey konnte nicht gesendet werden:', error.message);
  });
}

function clearRuntime(entry) {
  if (entry.timeoutId) clearTimeout(entry.timeoutId);
  if (entry.intervalId) clearInterval(entry.intervalId);
  entry.timeoutId = null;
  entry.intervalId = null;
}

function enterStateA(ws, entry) {
  clearRuntime(entry);
  entry.phase = 'A';
  setImage(ws, entry.context, entry.settings.iconA);
}

function startBlink(ws, entry, iconPath, hz) {
  let visible = true;
  const periodMs = Math.max(333, Math.min(1000, Math.round(1000 / hz)));

  entry.intervalId = setInterval(() => {
    visible = !visible;
    setImage(ws, entry.context, visible ? iconPath : 'images/state-blank.svg');
  }, periodMs);
}

function runB(ws, entry) {
  clearRuntime(entry);
  entry.phase = 'B';
  setImage(ws, entry.context, entry.settings.iconB);

  if (entry.settings.blinkBEnabled) {
    startBlink(ws, entry, entry.settings.iconB, entry.settings.blinkBHz);
  }

  entry.timeoutId = setTimeout(() => runC(ws, entry), entry.settings.timerBSeconds * 1000);
}

function runC(ws, entry) {
  clearRuntime(entry);
  entry.phase = 'C';
  setImage(ws, entry.context, entry.settings.iconC);

  if (entry.settings.blinkCEnabled) {
    startBlink(ws, entry, entry.settings.iconC, entry.settings.blinkCHz);
  }

  entry.timeoutId = setTimeout(() => enterStateA(ws, entry), entry.settings.timerCSeconds * 1000);
}

function restartCycle(ws, entry) {
  triggerHotkey(entry.settings.hotkey);
  runB(ws, entry);
}

function handleWillAppear(ws, message) {
  const settings = mergeSettings(message.payload.settings);
  const entry = {
    context: message.context,
    settings,
    phase: 'A',
    timeoutId: null,
    intervalId: null
  };

  contexts.set(message.context, entry);
  setSettings(ws, message.context, settings);
  enterStateA(ws, entry);
}

function handleWillDisappear(message) {
  const entry = contexts.get(message.context);
  if (!entry) return;
  clearRuntime(entry);
  contexts.delete(message.context);
}

function handleDidReceiveSettings(ws, message) {
  const entry = contexts.get(message.context);
  if (!entry) return;

  entry.settings = mergeSettings(message.payload.settings);
  if (entry.phase === 'A') {
    setImage(ws, entry.context, entry.settings.iconA);
  }
}

function handleKeyDown(ws, message) {
  const entry = contexts.get(message.context);
  if (!entry) return;
  restartCycle(ws, entry);
}

function connectElgatoStreamDeckSocket(port, pluginUUID, registerEvent) {
  const ws = new WebSocket(`ws://127.0.0.1:${port}`);

  ws.on('open', () => {
    send(ws, registerEvent, { uuid: pluginUUID });
  });

  ws.on('message', (raw) => {
    const message = JSON.parse(raw.toString());

    if (message.action !== ACTION_UUID) return;

    switch (message.event) {
      case 'willAppear':
        handleWillAppear(ws, message);
        break;
      case 'willDisappear':
        handleWillDisappear(message);
        break;
      case 'didReceiveSettings':
        handleDidReceiveSettings(ws, message);
        break;
      case 'keyDown':
        handleKeyDown(ws, message);
        break;
      default:
        break;
    }
  });

  ws.on('close', () => {
    contexts.forEach((entry) => clearRuntime(entry));
    contexts.clear();
  });
}

const args = parseArgs(process.argv);
connectElgatoStreamDeckSocket(args.port, args.pluginUUID, args.registerEvent);
