const fs = require('fs');
const YAML = require('yaml');

const { messages, buttons, questions } = YAML.parse(fs.readFileSync('./res/settings.yaml', 'utf8'));

module.exports = {
    apiBase: process.env.QUIZBOT_API_BASE || "https://api.telegram.org/", // https://core.telegram.org/bots/api
    apiKey: process.env.QUIZBOT_API_KEY,
    publicUrl: process.env.QUIZBOT_PUBLIC_URL,

    UPDATE_POLLING_INTERVAL_S: '60',
    UPDATE_POLLING_TIMEOUT_MS: 120000,
    REBUILD_RESULTS_INTERVAL_MS: 30000,

    adminUsername: 'Xdgfhj',

    messages: messages.ru,
    buttons: buttons.ru,
    questions: questions.map(q => {
        q.question = q.question.ru
        return q;
    })
};