let websocket = null;
let uuid = null;
let actionInfo = null;

const fields = [
  'iconA',
  'iconB',
  'iconC',
  'timerBSeconds',
  'timerCSeconds',
  'blinkBEnabled',
  'blinkCEnabled',
  'blinkBHz',
  'blinkCHz'
];

function send(event, payload = {}) {
  websocket.send(JSON.stringify({ event, context: uuid, ...payload }));
}

function getSettingsFromForm() {
  return {
    iconA: document.getElementById('iconA').value,
    iconB: document.getElementById('iconB').value,
    iconC: document.getElementById('iconC').value,
    timerBSeconds: Number(document.getElementById('timerBSeconds').value),
    timerCSeconds: Number(document.getElementById('timerCSeconds').value),
    blinkBEnabled: Number(document.getElementById('blinkBEnabled').value) === 1,
    blinkCEnabled: Number(document.getElementById('blinkCEnabled').value) === 1,
    blinkBHz: Number(document.getElementById('blinkBHz').value),
    blinkCHz: Number(document.getElementById('blinkCHz').value)
  };
}

function applySettingsToForm(settings) {
  fields.forEach((field) => {
    if (settings[field] === undefined) return;
    const node = document.getElementById(field);
    if (!node) return;
    if (typeof settings[field] === 'boolean') {
      node.value = settings[field] ? '1' : '0';
    } else {
      node.value = String(settings[field]);
    }
  });
}

function attachListeners() {
  fields.forEach((field) => {
    const node = document.getElementById(field);
    node.addEventListener('change', () => {
      send('setSettings', { payload: getSettingsFromForm() });
    });
  });
}

function connectElgatoStreamDeckSocket(inPort, inUUID, inRegisterEvent, inInfo, inActionInfo) {
  uuid = inUUID;
  actionInfo = JSON.parse(inActionInfo);

  websocket = new WebSocket(`ws://127.0.0.1:${inPort}`);
  websocket.onopen = () => {
    websocket.send(JSON.stringify({
      event: inRegisterEvent,
      uuid
    }));

    send('getSettings', {
      context: actionInfo.context
    });

    applySettingsToForm(actionInfo.payload.settings || {});
    attachListeners();
  };

  websocket.onmessage = (evt) => {
    const msg = JSON.parse(evt.data);
    if (msg.event === 'didReceiveSettings') {
      applySettingsToForm(msg.payload.settings || {});
    }
  };
}

window.connectElgatoStreamDeckSocket = connectElgatoStreamDeckSocket;
