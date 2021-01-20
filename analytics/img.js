const state = require('/path/to/state.json'), { getUserPoint } = require('../src/logic'),
    sharp = require('sharp'), { makeResultsSvg } = require('./svg'),
    tgUids = [/* admins uids */],
    points = Object.values(state.users).map(({ answers }) => answers).map(getUserPoint).filter(Boolean);

function makeSequence(stepsCount, maxValue, minValue) {
    return new Array(stepsCount).fill().map((_, i) => maxValue / (maxValue / minValue) ** (i / (stepsCount - 1)));
}

const sizesSequence = makeSequence(10, 40, 1), opacitySequence = makeSequence(10, 1, 1 / 256);

(async () => {
    for (let i = 0; i < 10; i++) {
        for (let j = 0; j < 10; j++) {
            const buffer = Buffer.from(makeResultsSvg(points, 600, { pointSize: sizesSequence[i], opacity: opacitySequence[j] }));
            await sharp(buffer).png().toFile(`./analytics/out-${i}-${j}.png`);
        }
    }
})().catch(console.error);
