function color(x, y) {
    return x < 0.5 ? (y < 0.5 ? '#FF2A31' : '#00DF4B') : (y < 0.5 ? '#0BD2DF' : '#DD2FFD');
}

function makeResultsSvg(results, svgSize = 480) {
    const count = results.users.length + 1, size = 1 / (35 + Math.log10(Math.min(1600, count)) * 10), quadrants = {},
        filteredUsers = count < 1600 ? results.users : results.users.filter(([x, y]) => {
            const id = 40 * Math.floor((40 - 1e-10) * x) + Math.floor((40 - 1e-10) * y);
            quadrants[id] = (quadrants[id] || 0) + 1;
            return quadrants[id] < 2;
        }),
        content = filteredUsers.map(([x, y]) =>
            `<circle cx="${1000 * x}" cy="${1000 * y}" r="${1000 * size}" fill="${color(x, y)}" stroke="white" stroke-width="2"/>`);

    return `<svg width="${svgSize}" height="${svgSize}" viewBox="0 0 1000 1000">${content}</svg>`;
}

if (typeof module !== "undefined") {
    module.exports = { makeResultsSvg };
}