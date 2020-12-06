const fs = require('fs');
const fetch = require('node-fetch');

const apiBase = process.env.QUIZBOT_API_BASE || "https://api.telegram.org/"; // https://core.telegram.org/bots/api
const apiKey = process.env.QUIZBOT_API_KEY;
const fd = fs.openSync('./api.log', 'a');

async function api(method, data, retries = 1) {
    const reqId = Math.random();
    fs.appendFile(fd, JSON.stringify({ reqId, time: Date.now(), req: [method, data] }) + "\n", () => { });

    let result;

    try {
        result = await fetch(apiBase + 'bot' + apiKey + '/' + method, {
            method: 'POST',
            body: JSON.stringify(data),
            headers: { 'Content-Type': 'application/json' }
        }).then(res => res.json());

        fs.appendFile(fd, JSON.stringify({ reqId, time: Date.now(), res: result }) + "\n", () => { });

        if (!result.ok) {
            throw new Error('not ok');
        }

        return result.result;
    } catch (e) {
        if (retries > 0) {
            return await api(method, data, retries - 1);
        }
    }
}

module.exports = { api };