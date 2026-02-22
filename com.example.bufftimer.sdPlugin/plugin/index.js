/* eslint-disable no-console */
const { exec } = require('child_process');

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
  }
  return args;
}

function mergeSettings(settings = {}) {
  return {
    ...DEFAULTS,
    ...settings,
    timerBSeconds: Math.max(1, Number(settings.timerBSeconds ?? DEFAULTS.timerBSeconds)),
    timerCSeconds: Math.max(1, Number(settings.timerCSeconds ?? DEFAULTS.timerCSeconds)),
    blinkBHz: Math.min(3, Math.max(1, Number(settings.blinkBHz ?? DEFAULTS.blinkBHz))),
    blinkCHz: Math.min(3, Math.max(1, Number(settings.blinkCHz ?? DEFAULTS.blinkCHz))),
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

function parseHotkey(hotkey) {
  return hotkey
    .split('+')
    .map((part) => part.trim().toLowerCase())
    .filter(Boolean);
}

function triggerHotkeyWindows(parts) {
  if (!parts.length) return;

  const modifierMap = {
    ctrl: '^',
    control: '^',
    shift: '+',
    alt: '%'
  };

  const keyMap = {
    enter: '{ENTER}',
    tab: '{TAB}',
    esc: '{ESC}',
    escape: '{ESC}',
    space: ' '
  };

  const modifiers = parts.filter((p) => modifierMap[p]).map((p) => modifierMap[p]).join('');
  const key = parts.find((p) => !modifierMap[p]) || '';
  const keyToken = keyMap[key] || key.toUpperCase();
  const sendKeys = `${modifiers}${keyToken}`;

  const cmd = `powershell -NoProfile -ExecutionPolicy Bypass -Command "Add-Type -AssemblyName System.Windows.Forms; [System.Windows.Forms.SendKeys]::SendWait('${sendKeys}')"`;
  exec(cmd, (error) => {
    if (error) console.error('Hotkey konnte unter Windows nicht gesendet werden:', error.message);
  });
}

function triggerHotkeyMac(parts) {
  if (!parts.length) return;

  const modifierMap = {
    ctrl: 'control down',
    control: 'control down',
    shift: 'shift down',
    alt: 'option down',
    option: 'option down',
    cmd: 'command down',
    command: 'command down'
  };

  const key = parts.find((p) => !modifierMap[p]) || '';
  const modifiers = parts.filter((p) => modifierMap[p]).map((p) => modifierMap[p]).join(', ');
  const usingPart = modifiers ? ` using {${modifiers}}` : '';
  const cmd = `osascript -e 'tell application "System Events" to keystroke "${key}"${usingPart}'`;
  exec(cmd, (error) => {
    if (error) console.error('Hotkey konnte unter macOS nicht gesendet werden:', error.message);
  });
}

function triggerHotkey(hotkey) {
  const parts = parseHotkey(hotkey);
  if (!parts.length) return;

  if (process.platform === 'win32') {
    triggerHotkeyWindows(parts);
    return;
  }

  if (process.platform === 'darwin') {
    triggerHotkeyMac(parts);
    return;
  }

  console.warn(`Hotkey auf Plattform ${process.platform} nicht implementiert.`);
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
  const settings = mergeSettings((message.payload && message.payload.settings) || {});
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

  entry.settings = mergeSettings((message.payload && message.payload.settings) || {});
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

  ws.onopen = () => {
    send(ws, registerEvent, { uuid: pluginUUID });
  };

  ws.onmessage = (raw) => {
    const message = JSON.parse(raw.data || raw);
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
  };

  ws.onclose = () => {
    contexts.forEach((entry) => clearRuntime(entry));
    contexts.clear();
  };
}

const args = parseArgs(process.argv);
connectElgatoStreamDeckSocket(args.port, args.pluginUUID, args.registerEvent);
