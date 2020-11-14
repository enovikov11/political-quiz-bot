/*
https://core.telegram.org/bots/api
https://www.npmjs.com/package/node-fetch
https://www.npmjs.com/package/puppeteer
lsyncd

sendPhoto chat_id photo caption
{"ok":false,"error_code":429,"description":"Too Many Requests: retry after 3","parameters":{"retry_after":3}}

добавить отправку результатов
сделать устойчивым к перезапуску

Протестировать корнер кейсы:
- много сообщений
- пригласили в группу
- пришло некорректное обновление
- два сообщения почти сразу
- пересланное сообщение
- что-то зависло
- сеть потеряна
- сеть флапает
- пустой текст
- Одно сообщение упало а другое нет
*/

const fs = require('fs');
const YAML = require('yaml');
const fetch = require('node-fetch');

const { questions, messages, buttons } = YAML.parse(fs.readFileSync('./quiz.yaml', 'utf8'));

const base_dir = "/var/www/html";
const api_base = process.env.QUIZBOT_API_BASE || "https://api.telegram.org/";
const api_key = process.env.QUIZBOT_API_KEY;
const locale = 'ru';
const UPDATE_ERROR_WAIT = 100;
const UPDATE_MAX_ERRORS = 100;
const UPDATE_POLLING_INTERVAL = '60';
const STATS_INACTIVE_WAIT = 5 * 60;

let offset = 0;
let update_errors_count = 0;
let chats_chains = {};

let global_state = {
    users_count: 0,
    chats: {}
}

// FIXME retry + throw error
function fetch_api(method, data) {
    return fetch(api_base + 'bot' + api_key + '/' + method, {
        method: 'POST',
        body: JSON.stringify(data),
        headers: { 'Content-Type': 'application/json' }
    }).then(res => res.json());
}

function chat_state(chat_id) {
    return {
        chat_id,
        is_first_message: true,
        is_our_audience: '',
        current_question: 0,
        answers: new Array(questions.length).fill(0),
        random_mapper: new Array(questions.length).fill().map((_, i) => ({ random: Math.random(), i }))
            .sort((a, b) => a.random > b.random ? 1 : -1).map(({ i }) => i),
    };
}

async function on_update(state, { message, callback_query }) {
    async function send_welcome() {
        await fetch_api('sendMessage', {
            chat_id: state.chat_id,
            text: messages[locale].welcome,
            reply_markup: {
                inline_keyboard: [
                    [{ text: buttons[locale]['is our audience'], callback_data: 'is our audience' }],
                    [{ text: buttons[locale]['is not our audience'], callback_data: 'is not our audience' }]
                ]
            }
        });
    }

    async function confirm_callback(text) {
        await fetch_api('answerCallbackQuery', { callback_query_id: callback_query.id, text });
    }

    async function send_results() {
        await fetch_api('sendMessage', {
            chat_id: state.chat_id,
            text: JSON.stringify(state.answers),
            inline_keyboard: [
                [{ text: buttons[locale].restart, callback_data: 'restart' }]
            ]
        });
    }

    function make_question_text(number, answer) {
        const text = `${messages[locale].question} ${number + 1} ${messages[locale]['question from']} ${questions.length}: ${questions[state.random_mapper[number]].question[locale]}`;
        return answer === undefined ? text : text + `\n\n${messages[locale]['your answer']}: ${messages[locale][String(answer)]}`;
    }

    async function send_current_question_or_results({ show_restart_button = false } = {}) {
        if (state.current_question === questions.length) {
            await send_results();
            return;
        }

        await fetch_api('sendMessage', {
            chat_id: state.chat_id,
            text: make_question_text(state.current_question),
            reply_markup: {
                inline_keyboard: [
                    ['-1', '-0.5', '0', '0.5', '1'].map(effect => ({ text: buttons[locale][effect], callback_data: state.current_question + "|" + effect })),
                    state.current_question > 0 && [{ text: buttons[locale].results, callback_data: 'results' }],
                    show_restart_button && [{ text: buttons[locale].restart, callback_data: 'restart' }]
                ].filter(Boolean)
            }
        });
    }

    async function edit_question(number, answer) {
        await fetch_api('editMessageText', {
            chat_id: state.chat_id,
            text: make_question_text(number, answer),
            message_id: callback_query?.message?.message_id,
            reply_markup: {
                inline_keyboard: [
                    ['-1', '-0.5', '0', '0.5', '1'].map(effect => ({ text: buttons[locale][effect], callback_data: number + "|" + effect })),
                    number > 0 && [{ text: buttons[locale].results, callback_data: 'results' }],
                ].filter(Boolean)
            }
        });
    }

    try {
        if (state.is_first_message || message?.text === '/start') {
            state.is_first_message = false;
            state.current_question = 0;
            await send_welcome(state);
            await send_current_question_or_results();
        }

        else if (message?.text) {
            await send_current_question_or_results({ show_restart_button: true });
        }

        else if (callback_query?.data === 'restart') {
            state.current_question = 0;
            await confirm_callback();
            await send_welcome(state);
            await send_current_question_or_results();
        }

        else if (callback_query?.data === 'is our audience') {
            state.is_our_audience = 'yes';
            await confirm_callback(messages[locale].thanks);
        }

        else if (callback_query?.data === 'is not our audience') {
            state.is_our_audience = 'no';
            await confirm_callback(messages[locale].thanks);
        }

        else if (callback_query?.data === 'results') {
            await confirm_callback();
            await send_results();
        }

        else if (/^\d+\|(-1|-0\.5|0|0\.5|1)$/.test(callback_query?.data || "")) {
            const [number, answer] = callback_query?.data.split('|', 2).map(n => +n);

            await confirm_callback();
            await edit_question(number, answer);
            state.answers[number] = answer;

            if (number === state.current_question) {
                state.current_question++;
                await send_current_question_or_results();
            }
        }
    } catch (e) {
        console.error(e);
        await fetch_api('sendMessage', { chat_id: state.chat_id, text: messages[locale].error });
    }
}

async function main() {
    if (questions.some(question => [
        "more equality than markets",
        "more liberty than authority",
        "more progress than tradition",
        "more world than nation"
    ].some(key => isNaN(question[key])))) {
        return;
    }

    while (true) {
        update_errors_count = 0;
        try {
            const updates_result = await fetch_api('getUpdates', {
                offset, timeout: UPDATE_POLLING_INTERVAL, allowed_updates: ['message', 'callback_query']
            });

            if (!updates_result.ok) {
                throw new Error(JSON.stringify(updates_result));
            }

            offset = Math.max(...updates_result.result.map(({ update_id }) => update_id)) + 1;

            for (let i = 0; i < updates_result.result.length; i++) {
                let update = updates_result.result[i];
                let chat_id = update?.message?.chat?.id || update?.callback_query?.message?.chat?.id;
                if (!chat_id) {
                    console.error(JSON.stringify({ error: "bad_update", update }));
                }

                if (!chats_chains[chat_id]) {
                    chats_chains[chat_id] = Promise.resolve();
                    global_state.chats[chat_id] = chat_state(chat_id);
                    global_state.users_count++;
                }

                chats_chains[chat_id].then(on_update(global_state.chats[chat_id], update)).catch(console.error);
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