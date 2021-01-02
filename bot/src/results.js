const { stateFilename } = require('./settings'),
    express = require('express'), https = require('https'), ws = require('ws'),
    app = express(), server = https.createServer(listenConfig.options, app),
    wss = new ws.Server({ server }), connections = new Set();
let result = '';

wss.on('connection', conn => {
    connections.add(conn);
    conn.on('close', () => { connections.delete(conn); })
});

server.listen(443);

function updateResults(state, results) {
    const jsonState = JSON.stringify(state), jsonResults = JSON.stringify(results);
    fs.writeFileSync(stateFilename, jsonState);

    [...connections].forEach(conn => { try { conn.send(jsonResults); } catch (e) { } });
}

module.exports = { updateResults };