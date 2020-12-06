const fs = require('fs');
const YAML = require('yaml');

const queues = {};
const { questions, messages, buttons } = YAML.parse(fs.readFileSync('./res/quiz.yaml', 'utf8'));

function run(queue, task) {
    if (!queues[queue]) {
        queues[queue] = Promise.resolve();
    }
    queues[queue] = queues[queue].then(task).catch(() => { });
}

function getConfig() {

    return data;
}

module.exports = { run, questions: questions.filter(q => q['more equality than markets'] !== 0 || q["more liberty than authority"] !== 0), messages, buttons };