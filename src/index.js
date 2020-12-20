/*
Проверять:
- много сообщений
- пригласили в группу
- пришло некорректное обновление
- два сообщения почти сразу
- пересланное сообщение
- что-то зависло
- сеть потеряна
- сеть флапает
- пустой текст
- одно сообщение упало а другое нет

indivisual results generator by puppeteer
settings.js
docker
autotesting: units for logic, screenshot for results, load
*/

const fs = require('fs'),
    { UPDATE_POLLING_INTERVAL_S, UPDATE_POLLING_TIMEOUT_MS, stateFilename } = require('./settings'),
    { apiRaw, apiEnqueue } = require('./api'), { processUpdates, getInitialState } = require('./logic'),
    { updateResults } = require('./results');

let state = getInitialState(), isRunning = true;

try {
    state = JSON.parse(fs.readFileSync(stateFilename, 'utf-8'));
} catch (e) { }

(async () => {
    state.nextSyncAt = 0;
    updateResults(state);
    while (isRunning) {
        const updates = await apiRaw('getUpdates', {
            offset: state.offset, timeout: UPDATE_POLLING_INTERVAL_S, allowed_updates: ['message', 'callback_query']
        }, UPDATE_POLLING_TIMEOUT_MS);

        let calls = [];
        processUpdates(updates, state, calls);
        for (let i = 0; i < calls.length; i++) {
            apiEnqueue(...calls[i]);
        }
        updateResults(state);
    }
    process.exit(0);
})().catch(console.error);

process.on('SIGINT', () => { isRunning = false; });