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

const { api } = require('./api');
const { run } = require('./lib');
const { initStorage, read, write } = require('./storage');
const { process } = require('./logic');
const { update } = require('./results');

const UPDATE_POLLING_INTERVAL = '60';
const REBUILD_RESULTS_INTERVAL = 30000;

(async () => {
    await initStorage();
    setInterval(update, REBUILD_RESULTS_INTERVAL);
    let offset = 0;
    while (true) {
        try {
            const updates = await api('getUpdates', {
                offset, timeout: UPDATE_POLLING_INTERVAL, allowed_updates: ['message', 'callback_query']
            });
            if (!updates) { continue; }
            offset = Math.max(...updates.map(({ update_id }) => update_id)) + 1;

            updates.map(update => {
                let id = update?.message?.chat?.id || update?.callback_query?.message?.chat?.id;
                if (!id) { return; }
                run(id, async () => {
                    const state = await read(id), calls = process(update, state);
                    await write(id, state);
                    for (let i = 0; i < calls.length; i++) {
                        run(id, () => api(...calls[i]));
                    }
                });
            });
        } catch (e) {
            console.error(e);
        }
    }
})();