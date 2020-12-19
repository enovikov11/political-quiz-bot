const express = require('express'), http = require('http'), ws = require('ws'),
    { listenPort, SYNC_INTERVAL_MS } = require('./settings'), { calc } = require('./logic'), connections = new Set(),
    app = express(), server = http.createServer(app), wss = new ws.Server({ server });

let result;

wss.on('connection', connection => {
    connections.add(connection);
    connection.on('close', () => {
        connections.delete(connection);
    })

    if (result) {
        [...connections].forEach(conn => {
            try {
                conn.send(result);
            } catch (e) { }
        });
    }
});

app.use(express.static('./static'));

server.listen(listenPort);

function updateResults(state) {
    if (state.nextSyncAt > Date.now()) {
        return;
    }

    state.nextSyncAt = Date.now() + SYNC_INTERVAL_MS;

    result = JSON.stringify(calc(state));
    [...connections].forEach(conn => {
        try {
            conn.send(result);
        } catch (e) { }
    });
}

module.exports = { updateResults };