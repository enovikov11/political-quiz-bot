// https://core.telegram.org/bots/api
// https://www.npmjs.com/package/node-fetch

/*
Корнер кейсы:
- много сообщений
- пригласили в группу
- пришло некорректное обновление
- два сообщения почти сразу
- пересланное сообщение
- что-то зависло
- сеть потеряна
- сеть флапает
- пустой текст

getCommands
*/

const fs = require('fs');
const YAML = require('yaml');
const fetch = require('node-fetch');

const { questions, messages, buttons } = YAML.parse(fs.readFileSync('./quiz.yaml', 'utf8'))
const api_base = process.env.QUIZBOT_API_BASE || "https://api.telegram.org/";
const api_key = process.env.QUIZBOT_API_KEY;
const locale = 'ru';
const UPDATE_ERROR_WAIT = 100;
const UPDATE_MAX_ERRORS = 100;
const UPDATE_POLLING_INTERVAL = '60';

let offset = 0;
let update_errors_count = 0;
let chats_chains = {};
let chats_states = {};
let global_stats = {
    value: { "more equality than markets": 0, "more liberty than authority": 0, "more progress than tradition": 0, "more world than nation": 0 },
    max: { "more equality than markets": 0, "more liberty than authority": 0, "more progress than tradition": 0, "more world than nation": 0 },
    count: 0
}
let users_count = 0

function apply_answer(stats, question_id, old_answer, new_answer) {
    const question = questions[question_id];
    if (!question || isNaN(+new_answer)) {
        console.error(stats, question_id, old_answer, new_answer)
        throw new Error('bad data to apply');
    }

    if (isNaN(+old_answer)) {
        stats.count++;
    } else {
        stats.value["more equality than markets"] -= (+old_answer * question["more equality than markets"]);
        stats.value["more liberty than authority"] -= (+old_answer * question["more liberty than authority"]);
        stats.value["more progress than tradition"] -= (+old_answer * question["more progress than tradition"]);
        stats.value["more world than nation"] -= (+old_answer * question["more world than nation"]);

        stats.max["more equality than markets"] -= Math.abs(+old_answer * question["more equality than markets"]);
        stats.max["more liberty than authority"] -= Math.abs(+old_answer * question["more liberty than authority"]);
        stats.max["more progress than tradition"] -= Math.abs(+old_answer * question["more progress than tradition"]);
        stats.max["more world than nation"] -= Math.abs(+old_answer * question["more world than nation"]);
    }

    stats.value["more equality than markets"] += (+new_answer * question["more equality than markets"]);
    stats.value["more liberty than authority"] += (+new_answer * question["more liberty than authority"]);
    stats.value["more progress than tradition"] += (+new_answer * question["more progress than tradition"]);
    stats.value["more world than nation"] += (+new_answer * question["more world than nation"]);

    stats.max["more equality than markets"] += Math.abs(+new_answer * question["more equality than markets"]);
    stats.max["more liberty than authority"] += Math.abs(+new_answer * question["more liberty than authority"]);
    stats.max["more progress than tradition"] += Math.abs(+new_answer * question["more progress than tradition"]);
    stats.max["more world than nation"] += Math.abs(+new_answer * question["more world than nation"]);
}

function fetch_api(method, data) {
    return fetch(api_base + 'bot' + api_key + '/' + method, {
        method: 'POST',
        body: JSON.stringify(data),
        headers: { 'Content-Type': 'application/json' }
    }).then(res => res.json());
}

async function on_message({ chat, text }) {
    let message = { text: messages[locale]['not recognized'] };

    try {
        if (!chats_states[chat.id]) {
            chats_states[chat.id] = {
                step: 'new_chat',
                current_answer_id: 0,
                answers: new Array(questions.length).fill().map((_, i) => ({ random: Math.random(), question_id: i }))
                    .sort((a, b) => a.random > b.random ? 1 : -1).map(({ question_id }) => ({ question_id })),
                stats: {
                    value: { "more equality than markets": 0, "more liberty than authority": 0, "more progress than tradition": 0, "more world than nation": 0 },
                    max: { "more equality than markets": 0, "more liberty than authority": 0, "more progress than tradition": 0, "more world than nation": 0 },
                    count: 0
                }
            };
            users_count++;
        }
        const state = chats_states[chat.id];
        const [button_pressed] = Object.keys(buttons[locale]).filter(button => buttons[locale][button] === text);

        if (state.step === 'quiz_active' && !isNaN(+button_pressed)) {
            apply_answer(global_stats, state.answers[state.current_answer_id].question_id, state.answers[state.current_answer_id].value, +button_pressed);
            apply_answer(state.stats, state.answers[state.current_answer_id].question_id, state.answers[state.current_answer_id].value, +button_pressed);
            state.answers[state.current_answer_id].value = +button_pressed;

            if (state.current_answer_id < state.answers.length) {
                state.current_answer_id++;
            } else {
                state.step = 'results';
            }
        } else if (state.step === 'quiz_active' && button_pressed === 'back' && state.current_answer_id > 0) {
            state.current_answer_id--;
        } else if (state.step === 'quiz_active' && button_pressed === 'forward' && state.current_answer_id < state.answers.length && state.answers[state.current_answer_id].value !== undefined) {
            state.current_answer_id++;
        } else if (state.step === 'quiz_active' && button_pressed === 'results') {
            state.step = 'results';
        }

        if (state.step === 'new_chat') {
            await fetch_api('sendMessage', {
                chat_id: chat.id, text: messages[locale].welcome
            });

            state.step = 'quiz_active';
        }

        if (state.step === 'quiz_active') {
            message = {
                text: questions[state.answers[state.current_answer_id].question_id].question[locale],
                reply_markup: {
                    keyboard: [
                        [
                            { text: buttons[locale]['-1'] },
                            { text: buttons[locale]['-0.5'] },
                            { text: buttons[locale]['0'] },
                            { text: buttons[locale]['0.5'] },
                            { text: buttons[locale]['1'] }
                        ], [
                            state.current_answer_id > 0 && buttons[locale].back, buttons[locale].results,
                            state.current_answer_id < state.answers.length && state.answers[state.current_answer_id].value !== undefined && buttons[locale].forward
                        ].filter(Boolean)
                    ], resize_keyboard: true
                }
            };
        } else if (state.step === 'results') {
            message = {
                text: JSON.stringify(state.stats),
                reply_markup: { remove_keyboard: true }
            }
        }
    } catch (e) {
        console.error(e);
        message = { text: messages[locale].error };
    }

    const result = await fetch_api('sendMessage', { chat_id: chat.id, ...message });

    if (!result.ok) {
        throw new Error(JSON.stringify(result));
    }
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
                offset, timeout: UPDATE_POLLING_INTERVAL, allowed_updates: ['message']
            });

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