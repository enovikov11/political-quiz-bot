const fs = require('fs'),
    { stateFilename } = require('./settings'), { apiRaw, apiEnqueue } = require('./api'),
    { initialState, processUpdates } = require('./logic'), { updateResults } = require('./results');

let state = initialState(), isRunning = true;

try {
    state = JSON.parse(fs.readFileSync(stateFilename, 'utf-8'));
} catch (e) { }

(async () => {
    while (isRunning) {
        const updates = await apiRaw('getUpdates', {
            offset: state.offset, timeout: 15, allowed_updates: ['message', 'callback_query']
        }, 30000);

        let calls = [];
        const results = processUpdates(updates, state, calls);
        for (let i = 0; i < calls.length; i++) {
            apiEnqueue(...calls[i]);
        }
        updateResults(state, results);
    }
    process.exit(0);
})().catch(console.error);

process.on('SIGINT', () => { isRunning = false; });
