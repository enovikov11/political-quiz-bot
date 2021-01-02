const fs = require('fs');
const YAML = require('yaml');

const { messages, buttons, questions } = YAML.parse(fs.readFileSync('./src/settings.yaml', 'utf8'));
const { apiKey, publicUrlBase, adminUsername, keyFilename, certFilename } = require('../secret');

const listenMode = 'https';

const listenConfig = listenMode === 'https' ?
    {
        port: 443,
        type: 'https',
        options: {
            key: fs.readFileSync(keyFilename, 'utf-8'),
            cert: fs.readFileSync(certFilename, 'utf-8')
        }
    } :
    {
        port: 80,
        type: 'http'
    };

module.exports = {
    apiBase: "https://api.telegram.org/", // https://core.telegram.org/bots/api
    UPDATE_POLLING_INTERVAL_S: '60',
    UPDATE_POLLING_TIMEOUT_MS: 120000,
    REBUILD_RESULTS_INTERVAL_MS: 30000,
    SYNC_INTERVAL_MS: 10000,

    apiLogFilename: './data/api.json.log',
    stateLogFilename: './data/state.json.log',
    stateFilename: './data/state.json',

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
const debugShrink = true;
if (debugShrink) {
    module.exports.questions = module.exports.questions.splice(48)
    module.exports.minQuestionsResult = 2;
}