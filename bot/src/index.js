const fs = require('fs'),
    { stateFilename } = require('./settings'), { apiRaw, apiEnqueue } = require('./api'),
    { initialState, processUpdates, processRebuild, getResults } = require('./logic'), { updateResults } = require('./results');

let state = initialState();

try {
    state = JSON.parse(fs.readFileSync(stateFilename, 'utf-8'));
} catch (e) { }

(async () => {
    while (true) {
        const updates = await apiRaw('getUpdates', {
            offset: state.lastUpdateId + 1, timeout: '30', allowed_updates: ['message', 'callback_query']
        }, 30000);

        let calls = [];
        processUpdates(state, updates, calls);
        for (let i = 0; i < calls.length; i++) {
            apiEnqueue(calls[i]);
        }
        updateResults(state, getResults(state));
    }
})().catch(console.error);

setInterval(() => {
    if (state.nextAvailableUpdateAt && state.nextAvailableUpdateAt < Date.now()) {
        let calls = [];
        const results = processRebuild(state, calls);
        for (let i = 0; i < calls.length; i++) {
            apiEnqueue(calls[i]);
        }
    }
    updateResults(state, getResults(state));
}, 5000);