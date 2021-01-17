const fs = require('fs'), { results2buffer } = require('../src/pm-results'), resultsData = require('./static-data.json');

(async () => {
    for (let key in resultsData) {
        const state = resultsData[key];
        if (!state.results) { continue; }
        const buffer = await results2buffer(state.results);
        fs.writeFileSync(`./tests/pm-demo/${key}.png`, buffer);
    }
})().catch(console.error);