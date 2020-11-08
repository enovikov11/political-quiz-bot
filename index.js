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

async function on_update({ message, callback_query }) {
    const chat_id = message?.chat?.id || callback_query?.message?.chat?.id;
    if (!chat_id) {
        throw new Error("no chat id");
    }
    if (!global_state.chats[chat_id]) {
        global_state.chats[chat_id] = {
            step: 'new',
            questions_sent: 0,
            answers: new Array(questions.length).fill(null),
            random_mapper: new Array(questions.length).fill().map((_, i) => ({ random: Math.random(), i }))
                .sort((a, b) => a.random > b.random ? 1 : -1).map(({ i }) => i),
            is_our_audience: ''
        };
        global_state.users_count++;
    }

    try {
        const state = global_state.chats[chat_id];
        const is_first_message = state.step === 'new' || message?.text === '/start' || callback_query?.data === 'to begenning';
        if (is_first_message) {
            state.step = 'quiz_active';
            state.questions_sent = 0;
            await fetch_api('sendMessage', {
                chat_id, text: messages[locale].welcome,
                reply_markup: {
                    inline_keyboard: [
                        [{ text: buttons[locale]['is our audience'], callback_data: 'is our audience' }],
                        [{ text: buttons[locale]['is not our audience'], callback_data: 'is not our audience' }]
                    ]
                }
            });
        }

        if (callback_query?.data && (callback_query?.data === 'is our audience' || callback_query?.data === 'is not our audience')) {
            await fetch_api('answerCallbackQuery', { callback_query_id: callback_query.id, text: messages[locale].thanks });
        } else if (callback_query?.data) {
            await fetch_api('answerCallbackQuery', { callback_query_id: callback_query.id });
        }

        if (callback_query?.data === 'is our audience') {
            state.is_our_audience = 'yes'
        } else if (callback_query?.data === 'is not our audience') {
            state.is_our_audience = 'no'
        } else if (callback_query?.data === 'results') {
            state.step = 'results';

            await fetch_api('sendMessage', {
                chat_id,
                text: JSON.stringify(state.answers)
            });
        }
        else if (state.step === 'quiz_active') {
            const action_question_number = typeof callback_query?.data === 'string' ? +callback_query?.data.split('|', 2)[0] : NaN;
            const action_answer = typeof callback_query?.data === 'string' ? +callback_query?.data.split('|', 2)[1] : NaN;

            if (!isNaN(action_question_number) && !isNaN(action_answer) && action_question_number >= 0 &&
                action_question_number < questions.length && [-1, -0.5, 0, 0.5, 1].includes(action_answer)) {

                state.answers[action_question_number] = action_answer;

                const question_number = action_question_number;
                const question_pre_text = messages[locale].question + ' ' + (question_number + 1) + ' ' + messages[locale]['question from'] + ' ' + questions.length + ': ';
                const question_text = questions[state.random_mapper[question_number]].question[locale];
                const question_post_text = '\n\n' + messages[locale]['your answer'] + ': ' + messages[locale][String(action_answer)];

                await fetch_api('editMessageText', {
                    chat_id,
                    text: question_pre_text + question_text + question_post_text,
                    message_id: callback_query?.message?.message_id,
                    reply_markup: {
                        inline_keyboard: [
                            ['-1', '-0.5', '0', '0.5', '1'].map(effect => ({ text: buttons[locale][effect], callback_data: question_number + "|" + effect })),
                        ]
                    }
                });
            }

            if (message?.text || action_question_number + 1 === state.questions_sent) {
                const question_number = state.questions_sent;
                const question_pre_text = messages[locale].question + ' ' + (question_number + 1) + ' ' + messages[locale]['question from'] + ' ' + questions.length + ': ';
                const question_text = questions[state.random_mapper[question_number]].question[locale];

                await fetch_api('sendMessage', {
                    chat_id,
                    text: question_pre_text + question_text,
                    reply_markup: {
                        inline_keyboard: [
                            ['-1', '-0.5', '0', '0.5', '1'].map(effect => ({ text: buttons[locale][effect], callback_data: question_number + "|" + effect })),
                            !is_first_message && [{ text: buttons[locale].results, callback_data: 'results' }],
                            (!is_first_message && !!message?.text) && [{ text: buttons[locale]['to beginning'], callback_data: 'to beginning' }]
                        ].filter(Boolean)
                    }
                });

                state.questions_sent++;
                if (state.questions_sent === questions.length) {
                    state.step = 'end';
                }
            }
        }
    } catch (e) {
        console.error(e);
        await fetch_api('sendMessage', { chat_id, text: messages[locale].error });
        return;
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
                }

                chats_chains[chat_id].then(() => update).then(on_update).catch(console.error);
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