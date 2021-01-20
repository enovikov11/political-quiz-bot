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

if (typeof module !== "undefined") {
    module.exports = { makeResultsSvg };
}