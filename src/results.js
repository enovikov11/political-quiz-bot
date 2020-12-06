const fs = require('fs');
const clusterPlot = require('cluster-plot');
const YAML = require('yaml');
const { dump } = require('./storage');

const { questions } = require('./lib');
const base_dir = process.env.QUIZBOT_BASE_DIR || './res/'; // "/var/www/html/"

function calc(user) {
    let x = 0, xMax = 0, y = 0, yMax = 0;
    const count = Math.min(questions.length, user.current_question);
    if (count < 30) {
        return null;
    }

    for (let i = 0; i < count; i++) {
        const question = questions[user.random_mapper[i]];
        const answer = user.answers[i];

        x -= answer * question["more equality than markets"];
        xMax += Math.abs(question["more equality than markets"]);
        y += answer * question["more liberty than authority"];
        yMax += Math.abs(question["more liberty than authority"]);

    }

    return [xMax === 0 ? 0 : (1 + x / xMax) / 2, yMax === 0 ? 0 : (1 + y / yMax) / 2];
}

async function update() {
    const users = await dump(), points = [], katz = null;
    for (let user of users) {
        const result = calc(user);
        if (result) {
            if (user.is_katz) {
                katz = { x: result[0], y: result[1] }
            } else {
                points.push(result);
            }
        }
    }

    const clusters = clusterPlot(points), output = { clusters };
    if (katz) {
        output.katz = katz;
    }

    fs.writeFile(base_dir + 'clusters.json', JSON.stringify(output), () => { });
}

module.exports = { update, calc };