const fs = require('fs'),
    { stateFilename } = require('./settings'), { apiRaw, apiEnqueue } = require('./api'),
    { initialState, processUpdates } = require('./logic'), { updateResults } = require('./results');

let state = initialState();

try {
    state = JSON.parse(fs.readFileSync(stateFilename, 'utf-8'));
} catch (e) { }

(async () => {
    while (true) {
        const timeout = Math.max(15, Math.round(((state.nextAvailableUpdateAt || 0) - Date.now()) / 1000))

        const updates = await apiRaw('getUpdates', {
            offset: state.lastUpdateId + 1, timeout, allowed_updates: ['message', 'callback_query']
        }, 30000);

        let calls = [];
        const results = processUpdates(state, updates, calls);
        for (let i = 0; i < calls.length; i++) {
            apiEnqueue(...calls[i]);
        }
        updateResults(state, results);
    }
})().catch(console.error);