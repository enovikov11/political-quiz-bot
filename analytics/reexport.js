const state = require('/path/to/state.json'), { getUserPoint } = require('../src/logic'),
    points = Object.values(state.users).map(({ answers }) => answers).map(getUserPoint).filter(Boolean),
    fs = require('fs');

fs.writeFileSync('./analytics/local/data.js', `const data = ${JSON.stringify(points)}`);
