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

(async () => {
    const puppeteer = require('puppeteer'), fs = require('fs'),
        browser = await puppeteer.launch({ args: ['--no-sandbox'] }), page = await browser.newPage();

    await page.setContent(fs.readFileSync('./static/index.html', 'utf-8'), { waitUntil: 'domcontentloaded' });
    await page.setViewport({ width: 1080, height: 1080 });

    app.use(express.static('./static'));

    app.get('/results/*', async (req, res, next) => {
        const result = req.path.match(/\/results\/(\d+)-(\d+)\.png/);
        if (!result) { next(); return; }
        const x = +result[1], y = +result[2];
        if (x < 0 || x > 100 || y < 0 || y > 100) { next(); return; }

        await page.evaluate((x, y) => { setOne(x, y) }, x, y);
        await page.screenshot({ path: `./results/${x}-${y}.png`, omitBackground: true });
        next();
    });

    app.use('/results', express.static('./results'));

    server.listen(listenConfig.port);
})().catch(console.error);

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