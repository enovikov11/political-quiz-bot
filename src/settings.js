const fs = require('fs');
const YAML = require('yaml');

const { messages, buttons, questions } = YAML.parse(fs.readFileSync('./src/settings.yaml', 'utf8'));
const { apiKey, publicUrlBase, adminUsername } = require('../secret');

const listenMode = 'http';

const listenConfig = listenMode === 'https' ?
    {
        port: 4443,
        type: 'https',
        options: {
            key: fs.readFileSync('./secret/privkey.pem', 'utf-8'),
            cert: fs.readFileSync('./secret/cert.pem', 'utf-8')
        }
    } :
    {
        port: 8080,
        type: 'http'
    };

module.exports = {
    apiBase: "https://api.telegram.org/", // https://core.telegram.org/bots/api
    UPDATE_POLLING_INTERVAL_S: '60',
    UPDATE_POLLING_TIMEOUT_MS: 120000,
    REBUILD_RESULTS_INTERVAL_MS: 30000,
    SYNC_INTERVAL_MS: 10000,

    apiKey,
    publicUrlBase,
    adminUsername,

    listenConfig,

    messages: messages.ru,
    buttons: buttons.ru,
    questions: questions.map(q => { q.question = q.question.ru; return q; }),
    minQuestionsResult: 30
};

// FIXME
const debugShrink = false;
if (debugShrink) {
    module.exports.questions = module.exports.questions.splice(48)
    module.exports.minQuestionsResult = 2;
}