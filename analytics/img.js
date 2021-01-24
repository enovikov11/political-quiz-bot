const sharp = require('sharp'),
    state = require('./data/state.json'), { getUserPoint } = require('../src/logic'),
    points = Object.values(state.users).map(({ answers }) => answers).map(getUserPoint).filter(Boolean);

function color(x, y) { return x < 0.5 ? (y < 0.5 ? '#FF2A31' : '#00DF4B') : (y < 0.5 ? '#0BD2DF' : '#DD2FFD'); }

function makeResultsSvg(points, svgSize = 1000, { pointSize, opacity } = {}) {
    const content = points.map(([x, y]) =>
        `<circle cx="${svgSize * x}" cy="${svgSize * y}" r="${pointSize}" fill="${color(x, y)}" fill-opacity="${opacity || 1}"/>`);

    return `<svg width="${svgSize}" height="${svgSize}" viewBox="0 0 ${svgSize} ${svgSize}">
    <rect x="0" y="0" width="${svgSize}" height="${svgSize}"></rect>
    ${content}</svg>`;
}

const scaleSize = 0.06;

function svg(size) { return Buffer.from(makeResultsSvg(points, size, { pointSize: 0.003 * size, opacity: 0.16 })); }

async function user(uid, size) {
    const photo = await sharp(`./analytics/local/${uid}.png`).resize(Math.round(scaleSize * size)).toBuffer(),
        [x, y] = getUserPoint(state.users[String(uid)].answers);

    return {
        input: photo, blend: 'over',
        left: Math.round(-0.5 * scaleSize * size + x * size),
        top: Math.round(-0.5 * scaleSize * size + y * size)
    }
}

async function users(size) {
    const user77340994 = await user(77340994, size),
        user78279737 = await user(78279737, size),
        user221693 = await user(221693, size);

    return [user77340994, user78279737, user221693];
}

(async () => {
    const svg480 = svg(480),
        svg1280 = svg(1280),
        users480 = await users(480),
        users1280 = await users(1280),

        svg480full = await sharp(svg480).composite(users480).toBuffer(),
        svg1280full = await sharp(svg1280).composite(users1280).toBuffer();

    await sharp(svg480)
        .png().toFile(`./analytics/local/data-480.png`);

    await sharp(svg1280)
        .png().toFile(`./analytics/local/data-1280.png`);

    await sharp(svg480full)
        .png().toFile(`./analytics/local/data-avatar-480.png`);

    await sharp(svg1280full)
        .png().toFile(`./analytics/local/data-avatar-1280.png`);

    await sharp('./analytics/back.png')
        .composite([
            { input: svg480, blend: 'over', left: 176, top: 164 }
        ]).png().toFile(`./analytics/local/data-border.png`);

    await sharp('./analytics/back.png')
        .composite([
            { input: svg480full, blend: 'over', left: 176, top: 164 }
        ]).png().toFile(`./analytics/local/data-avatar-border.png`);

    console.log(points.length)

})().catch(console.error);
