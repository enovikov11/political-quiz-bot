const { stateFilename, prefix } = require('./settings'),
    express = require('express'), https = require('https'), ws = require('ws'), fs = require('fs'),
    app = express(), server = https.createServer({
        key: fs.readFileSync('./certs/privkey.pem', 'utf-8'),
        cert: fs.readFileSync('./certs/cert.pem', 'utf-8')
    }, app),
    wss = new ws.Server({ server }), connections = new Set();

let jsonResults = '{}';

app.use(`/${prefix}`, express.static('./static'));
app.use(`/${prefix}-img-data`, express.static('./img-data'));

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

    // комментарий по поводу results, когда state.adminStatus == "end":

    // не помню как было на стриме, но если вдруг доступ к этой страничке с websocket
    // есть у любого пользователя, а ты туда отдаешь по факту данные всех пользователей —
    // некошерно

    // если доступ только у админов, и данные всех пользователей нужны для отрисовки какой-то
    // красивой статистики по всем — то ок

    // возможно стоит подумать о том, чтобы агрегацию по пользователям считать на бекенде
    // и на фронт отправлять уже результат агрегации, чтобы не гонять данные всех пользователей каждый раз
    // если пользователей будет много — текущее решение, скорее всего, будет тормозить

    [...connections].forEach(conn => { try { conn.send(jsonResults); } catch (e) { } });
}

server.listen(443);

module.exports = { updateResults };