const fs = require('fs');
const YAML = require('yaml');

const { messages, buttons, questions } = YAML.parse(fs.readFileSync('./res/settings.yaml', 'utf8'));

const debugShrink = true;

module.exports = {
    apiBase: process.env.QUIZBOT_API_BASE || "https://api.telegram.org/", // https://core.telegram.org/bots/api
    apiKey: process.env.QUIZBOT_API_KEY,
    publicUrlBase: process.env.QUIZBOT_PUBLIC_URL_BASE,

    listenPort: 8080,

    UPDATE_POLLING_INTERVAL_S: '60',
    UPDATE_POLLING_TIMEOUT_MS: 120000,
    REBUILD_RESULTS_INTERVAL_MS: 30000,
    SYNC_INTERVAL_MS: 10000,

    adminUsername: 'Xdgfhj',

    messages: messages.ru,
    buttons: buttons.ru,
    questions: debugShrink ?
        questions.map(q => { q.question = q.question.ru; return q; }).splice(48) :
        questions.map(q => { q.question = q.question.ru; return q; }),
    minQuestionsResult: debugShrink ? 2 : 30
};