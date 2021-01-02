const fs = require('fs');
const YAML = require('yaml');

const { messages, buttons, questions } = YAML.parse(fs.readFileSync('./src/settings.yaml', 'utf8'));
const { apiKey, adminChatId, userResultBaseUrl } = require('../secret.json');

module.exports = {
    RESYNC_INTERVAL: 30000,

    apiLogFilename: './data/api.json.log',
    stateFilename: './data/state.json',

    apiBase: "https://api.telegram.org/", // https://core.telegram.org/bots/api
    apiKey,
    adminChatId,
    userResultBaseUrl,

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