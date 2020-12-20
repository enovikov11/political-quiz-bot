const { listenConfig, SYNC_INTERVAL_MS } = require('./settings'), { calc } = require('./logic'),
    express = require('express'), app = express(),

    server = listenConfig.type === 'https' ? require('https').createServer(listenConfig.options, app) :
        require('http').createServer(app),

    ws = require('ws'), wss = new ws.Server({ server }), connections = new Set();

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

server.listen(listenConfig.port);

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