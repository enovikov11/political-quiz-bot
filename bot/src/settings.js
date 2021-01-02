const fs = require('fs');
const YAML = require('yaml');

const { messages, buttons, questions } = YAML.parse(fs.readFileSync('./src/settings.yaml', 'utf8'));
const { apiKey, adminUsername, userResultBaseUrl } = require('./secret.json');

module.exports = {
    UPDATE_POLLING_INTERVAL_S: '60',
    UPDATE_POLLING_TIMEOUT_MS: 120000,
    REBUILD_RESULTS_INTERVAL_MS: 30000,
    SYNC_INTERVAL_MS: 10000,

    apiLogFilename: './data/api.json.log',
    stateLogFilename: './data/state.json.log',
    stateFilename: './data/state.json',

    apiBase: "https://api.telegram.org/", // https://core.telegram.org/bots/api
    apiKey,
    adminUsername,
    publicUrlBase,



    messages: messages.ru,
    buttons: buttons.ru,
    questions: questions.map(q => { q.question = q.question.ru; return q; }),
    minQuestionsResult: 30
};

// FIXME
const debugShrink = true;
if (debugShrink) {
    module.exports.questions = module.exports.questions.splice(48)
    module.exports.minQuestionsResult = 2;
}