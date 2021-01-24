const state = require('./data/state.json'), fs = require('fs');

const answers = Object.values(state.users).map(({ answers }) => answers),
    sortedAnswers = answers.map(answers => JSON.stringify(answers)).sort((a, b) => a > b ? 1 : -1)
        .map(json => JSON.parse(json));

fs.writeFileSync('./analytics/local/anonymized-sorted-answers_DATE.json', JSON.stringify(sortedAnswers));

const csv = ['user-id,question-number,answer']

for (let i = 0; i < sortedAnswers.length; i++) {
    const answers = sortedAnswers[i];
    for (let j = 0; j < answers.length; j++) {
        csv.push(`${i + 1},${j + 1},${answers[j]}`);
    }
}

fs.writeFileSync('./analytics/local/anonymized-sorted-answers_DATE.csv', csv.join('\n'));

const points = Object.values(state.users).map(({ answers }) => answers).map(getUserPoint).filter(Boolean);
fs.writeFileSync('./analytics/local/data.js', `const data = ${JSON.stringify(points)}`);
