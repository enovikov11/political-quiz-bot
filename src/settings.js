const fs = require('fs');
const YAML = require('yaml');

const { messages, buttons, questions } = YAML.parse(fs.readFileSync('./res/messages.yaml', 'utf8'));

module.exports = {
    apiBase: process.env.QUIZBOT_API_BASE || "https://api.telegram.org/", // https://core.telegram.org/bots/api
    apiKey: process.env.QUIZBOT_API_KEY,
    apiLogFile: './api.log',
    messages,
    buttons,
    questions
};