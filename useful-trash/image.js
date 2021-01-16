const sharp = require('sharp'), fs = require('fs');

async function state2buffer(state) {
    return await sharp('./questions-background.png')
        .composite([{
            input: Buffer.from(`<svg width="1920" height="1080" viewBox="0 0 1920 1080">
                    <text x="50" y="430" font-family="Jost SemiBold" font-size="20">1234</text>
                </svg>`),
            blend: 'over'
        }])
        .toBuffer();
}

//        buffer = await sharp('./demo-background.png').composite([{ input: buffer, blend: 'over' }]).toBuffer();

module.exports = { state2buffer };
