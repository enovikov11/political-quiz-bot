const { stateFilename, prefix } = require('./settings'),
    express = require('express'), https = require('https'), ws = require('ws'), fs = require('fs'),
    app = express(), server = https.createServer({
        // DELETE AFTER DEBUG
        key: fs.readFileSync('./certs/privkey.pem', 'utf-8'),
        cert: fs.readFileSync('./certs/cert.pem', 'utf-8')
        // key: fs.readFileSync('/letsencrypt/privkey.pem', 'utf-8'),
        // cert: fs.readFileSync('/letsencrypt/cert.pem', 'utf-8')
    }, app),
    wss = new ws.Server({ server }), connections = new Set();

let jsonResults = '{}';

app.use(`/${prefix}`, express.static('./static'));

wss.on('connection', (conn, req) => {
    if (req.url !== `/${prefix}/`) {
        try { conn.close() } catch (e) { }
        return;
    }

    connections.add(conn);
    try { conn.send(jsonResults) } catch (e) { }
    conn.on('close', () => { connections.delete(conn); })
});

function updateResults(state, results) {
    const jsonState = JSON.stringify(state);
    jsonResults = JSON.stringify(results);
    fs.writeFileSync(stateFilename, jsonState);

    [...connections].forEach(conn => { try { conn.send(jsonResults); } catch (e) { } });
}

server.listen(443);

module.exports = { updateResults };