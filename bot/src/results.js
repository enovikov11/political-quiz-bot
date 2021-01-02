const { SYNC_INTERVAL_MS, stateFilename } = require('./settings'), { calc } = require('./logic'),
    express = require('express'), https = require('https'), ws = require('ws'),
    app = express(), server = https.createServer(listenConfig.options, app),
    wss = new ws.Server({ server }), connections = new Set();
let result = '';

wss.on('connection', conn => {
    connections.add(conn);
    conn.on('close', () => { connections.delete(conn); })
    try {
        conn.send(result);
    } catch (e) { }
});

server.listen(443);

function updateResults(state) {
    if (state.nextSyncAt > Date.now()) {
        return;
    }

    state.nextSyncAt = Date.now() + SYNC_INTERVAL_MS;
    const jsonState = JSON.stringify(state);
    fs.writeFileSync(stateFilename, jsonState);

    result = JSON.stringify(calc(state));
    [...connections].forEach(conn => {
        try {
            conn.send(result);
        } catch (e) { }
    });
}

module.exports = { updateResults };