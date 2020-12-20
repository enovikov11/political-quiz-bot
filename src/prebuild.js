// (async () => {
//     const puppeteer = require('puppeteer'), browser = await puppeteer.launch({ args: ['--no-sanbox'] }), page = await browser.newPage();
//     await page.goto(process.env.QUIZBOT_BASE_URL);
//     await page.evaluate(() => {
//         [...document.body.children].filter(tag => tag.tagName !== 'svg').forEach(item => item.remove())
//     });
//     await page.setViewport({ width: 1920, height: 1080 });


//     for (let x = 0; x < 30; x++) {
//         for (let y = 0; y < 30; y++) {
//             await page.evaluate((x, y) => {
//                 document.querySelector('mask#quizresults').innerHTML = `<circle cx="${(x - 0.5) * 600}" cy="${(y - 0.5) * 600}" r="${0.05 * 600}" fill="white" />`
//             }, x / 30, y / 30);
//             await page.screenshot({ path: `./res/static/${x}-${y}.png`, clip: { x: 400, y: 0, width: 1120, height: 1080 } });
//         }
//     }

//     await browser.close();
// })();