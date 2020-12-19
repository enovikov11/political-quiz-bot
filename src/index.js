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

const { UPDATE_POLLING_INTERVAL_S, UPDATE_POLLING_TIMEOUT_MS } = require('./settings'),
    { apiRaw, apiEnqueue } = require('./api-actor'),
    { process } = require('./api-logic');

let state = { offset: 0, lastSyncAt: 0, maxAvailableQuestionId: 0, answers: {} };

(async () => {
    while (true) {
        const updates = await apiRaw('getUpdates', {
            offset: state.offset, timeout: UPDATE_POLLING_INTERVAL_S, allowed_updates: ['message', 'callback_query']
        }, UPDATE_POLLING_TIMEOUT_MS);

        let calls = [];
        process(updates, state, calls);
        for (let i = 0; i < calls.length; i++) {
            apiEnqueue(...calls[i]);
        }
    }
})().catch(console.error);