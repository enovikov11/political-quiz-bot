const fs = require('fs'),
    { UPDATE_POLLING_INTERVAL_S, UPDATE_POLLING_TIMEOUT, stateFilename } = require('./settings'),
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
        }, UPDATE_POLLING_TIMEOUT);

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