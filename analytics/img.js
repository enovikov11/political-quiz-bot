const state = require('/Users/enovikov11/Desktop/state.json'), { getUserPoint } = require('../src/logic'),
    sharp = require('sharp'),
    tgUids = [/* admins uids */],
    points = Object.values(state.users).map(({ answers }) => answers).map(getUserPoint).filter(Boolean);

function color(x, y) {
    return x < 0.5 ? (y < 0.5 ? '#FF2A31' : '#00DF4B') : (y < 0.5 ? '#0BD2DF' : '#DD2FFD');
}

function makeResultsSvg(points, svgSize = 1000, { pointSize, opacity } = {}) {
    const content = points.map(([x, y]) =>
        `<circle cx="${svgSize * x}" cy="${svgSize * y}" r="${pointSize}" fill="${color(x, y)}" fill-opacity="${opacity || 1}"/>`);

    return `<svg width="${svgSize}" height="${svgSize}" viewBox="0 0 ${svgSize} ${svgSize}">
    <rect x="0" y="0" width="${svgSize}" height="${svgSize}"></rect>
    ${content}</svg>`;
}

(async () => {
    const buffer = Buffer.from(makeResultsSvg(points, 600, { pointSize: 0.003 * 600, opacity: 0.16 }));
    await sharp(buffer).png().toFile(`./analytics/out.png`);
})().catch(console.error);