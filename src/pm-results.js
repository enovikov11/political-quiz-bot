const sharp = require('sharp'), { makeResultsSvg } = require('../static/svg');

async function results2buffer(results, chatId) {
    const points = await sharp(Buffer.from(makeResultsSvg(results))).png().toBuffer(),
        admin = await sharp('./static/admin.png').resize({ width: 45, height: 45 }).toBuffer(),
        youName = !results.you ? 'you0.png' : (results.you[0] < 0.5 ? (results.you[1] < 0.5 ? 'you0.png' : 'you1.png') : (results.you[1] < 0.5 ? 'you2.png' : 'you3.png')),
        you = await sharp(`./static/${youName}`).resize({ width: 30, height: 30 }).toBuffer();

    await sharp('./static/results.png')
        .composite([
            { input: points, blend: 'over', top: 172, left: 176 },
            results?.admin && {
                input: admin,
                blend: 'over',
                left: 172 - 22 + Math.round(480 * results.admin[0]),
                top: 176 - 22 + Math.round(480 * results.admin[1])
            },
            results?.you && {
                input: you,
                blend: 'over',
                left: 172 - 15 + Math.round(480 * results.you[0]),
                top: 176 - 15 + Math.round(480 * results.you[1])
            }
        ].filter(Boolean)).png().toFile('./img-data/' + chatId + '-' + results.salt + '.png');
}

module.exports = { results2buffer };
