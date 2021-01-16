
(async () => {
    const express = require('express'), https = require('https'), puppeteer = require('puppeteer'), fs = require('fs'),
        app = express(), server = https.createServer({
            key: fs.readFileSync('/letsencrypt/privkey.pem', 'utf-8'),
            cert: fs.readFileSync('/letsencrypt/cert.pem', 'utf-8')
        }, app),
        browser = await puppeteer.launch({ args: ['--no-sandbox'] }), page = await browser.newPage(),
        queue = Promise.resolve();


    app.get('/results/*', async (req, res, next) => {
        const result = req.path.match(/\/results\/(\d+)-(\d+)\.png/);
        if (!result) { next(); return; }
        const x = +result[1], y = +result[2];
        if (x < 0 || x > 100 || y < 0 || y > 100) { next(); return; }

        queue.then(async () => {
            await page.setContent(getHtml(x, y));
            await page.setViewport({ width: 1080, height: 1080 });
            await page.screenshot({ path: `./results/${x}-${y}.png`, omitBackground: true });
            next();
        }).catch(console.error);
    });

    app.use('/results', express.static('./results'));

    server.listen(443);
})().catch(console.error);