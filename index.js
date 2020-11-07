// https://core.telegram.org/bots/api

const fs = require('fs');
const YAML = require('yaml');
const fetch = require('node-fetch');

const { questions } = YAML.parse(fs.readFileSync('./quiz.yaml', 'utf8'))
const api_base = process.env.QUIZBOT_API_BASE || "https://api.telegram.org/";
const api_key = process.env.QUIZBOT_API_KEY;
const locale = 'ru';
const UPDATE_ERROR_WAIT = 100;
const UPDATE_MAX_ERRORS = 100;
const UPDATE_POLLING_INTERVAL = '60';

let offset = 0;
let update_errors_count = 0;
let chats_chains = {};
let stat_voted = { "more equality than markets": 0, "more liberty than authority": 0, "more progress than tradition": 0, "more world than nation": 0 };
let stat_max = { "more equality than markets": 0, "more liberty than authority": 0, "more progress than tradition": 0, "more world than nation": 0 };

function makePermulation(length) {
    return new Array(length).fill(0).map((_, i) => ({ value: Math.random(), i }))
        .sort((a, b) => a.value > b.value ? 1 : -1).map(({ i }) => i);
}

async function on_message({ chat, text }) {
    await fetch(api_base + 'bot' + api_key + '/sendMessage', {
        method: 'POST',
        body: JSON.stringify({
            chat_id: chat.id, text: text + text,

            reply_markup: {
                keyboard: [[{ text: "1" }, { text: "2" }, { text: "3" }, { text: "4" }, { text: "5" }]]
                // remove_keyboard: true
            }
        }),
        headers: { 'Content-Type': 'application/json' }
    }).then(res => res.json());
}

async function on_result({ message }) {
    if (!message.chat.id) {
        throw new Error('Bad chat id');
    }

    if (!chats_chains[message.chat.id]) {
        chats_chains[message.chat.id] = Promise.resolve();
    }

    chats_chains[message.chat.id].then(() => {
        on_message(message).catch(console.error);
    });
}

async function main() {
    while (true) {
        update_errors_count = 0;
        try {
            const updates_result = await fetch(api_base + 'bot' + api_key + '/getUpdates', {
                method: 'POST',
                body: JSON.stringify({ offset, timeout: UPDATE_POLLING_INTERVAL, allowed_updates: ['message'] }),
                headers: { 'Content-Type': 'application/json' }
            }).then(res => res.json());

            if (!updates_result.ok) {
                throw new Error(JSON.stringify(updates_result));
            }

            offset = Math.max(...updates_result.result.map(({ update_id }) => update_id)) + 1;

            for (let i = 0; i < updates_result.result.length; i++) {
                on_result(updates_result.result[i]).catch(console.error);
            }
        } catch (e) {
            console.error(e);
            update_errors_count++;
            if (update_errors_count > UPDATE_MAX_ERRORS) {
                return;
            }
            await new Promise(res => setTimeout(res, UPDATE_ERROR_WAIT));
        }
    }
}

main().catch(console.error)
    // Immideatly exit if main loop is broken, throwing away background promises
    .then(() => process.exit(1));