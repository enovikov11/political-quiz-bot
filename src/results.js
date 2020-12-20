const { listenConfig, SYNC_INTERVAL_MS, stateLogFilename, stateFilename } = require('./settings'), { calc } = require('./logic'),
    express = require('express'), app = express(),

    server = listenConfig.type === 'https' ? require('https').createServer(listenConfig.options, app) :
        require('http').createServer(app),

    ws = require('ws'), wss = new ws.Server({ server }), connections = new Set(),

    fs = require('fs'), fd = fs.openSync(stateLogFilename, 'a');;

let result = '';

wss.on('connection', conn => {
    connections.add(conn);
    connection.on('close', () => { connections.delete(conn); })
    try {
        conn.send(result);
    } catch (e) { }
});

app.use(express.static('./static'));

server.listen(listenConfig.port);

function updateResults(state) {
    if (state.nextSyncAt > Date.now()) {
        return;
    }

    state.nextSyncAt = Date.now() + SYNC_INTERVAL_MS;
    const jsonState = JSON.stringify(state);
    fs.writeFileSync(stateFilename, jsonState);
    fs.appendFile(fd, jsonState + '\n', () => { });

    result = JSON.stringify(calc(state));
    [...connections].forEach(conn => {
        try {
            conn.send(result);
        } catch (e) { }
    });
}

module.exports = { updateResults };