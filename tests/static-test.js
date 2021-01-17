(async () => {
    const puppeteer = require('puppeteer'), sharp = require('sharp'), fs = require('fs');
    browser = await puppeteer.launch({ args: ['--no-sandbox'] }), page = await browser.newPage(),
        resultsData = require('./static-data.json');

    await page.goto('http://localhost:5000/static/');
    await page.setViewport({ width: 1920, height: 1080 });

    for (let key in resultsData) {
        const state = resultsData[key];
        await page.evaluate((state) => { show(state) }, state);
        await page.screenshot({ path: `./tests/temp-${key}.png`, omitBackground: true });
        await sharp('./tests/demo-background.png').composite([{ input: `./tests/temp-${key}.png`, blend: 'over' }]).png()
            .toFile('./tests/demo/' + key + '.png');
        fs.unlinkSync(`./tests/temp-${key}.png`);
    }

    await browser.close();
})().catch(console.error);