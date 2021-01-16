const sharp = require('sharp'), { makeResultsSvg } = require('../static/svg');

(async () => {

    const input = await sharp(Buffer.from(makeResultsSvg(input))).png().toBuffer()

    await sharp('./static/results.png')
        .composite([{
            input,
            blend: 'over',
            top: 172,
            left: 176
        }])
        .png().toFile('temp.png');
})();