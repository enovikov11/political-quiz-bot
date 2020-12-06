const fs = require('fs');
const YAML = require('yaml');

const { questions, messages, buttons, baseUrl } = require('./lib');
const locale = 'ru';
const { calc } = require('./results');

function send_welcome(calls, id) {
    calls.push(['sendMessage', { chat_id: id, text: messages[locale].welcome }]);
}

function make_question_text(state, number, answer) {
    const text = `${messages[locale].question} ${number + 1} ${messages[locale]['question from']} ${questions.length}: ${questions[state.random_mapper[number]].question[locale]}`;
    return answer === undefined ? text : text + `\n\n${messages[locale]['your answer']}: ${messages[locale][String(answer)]}`;
}

function send_current_question(calls, id, state, { show_restart_button = false } = {}) {
    if (state.current_question === questions.length) {
        const result = calc(state);
        calls.push(['sendMessage',
            { chat_id: id, text: messages[locale].description, parse_mode: 'HTML' }
        ]);
        if (result) {
            calls.push(['sendMessage',
                { chat_id: id, text: `Твой результат на <b>${Math.round((1 - result[0]) * 100)}%</b> за <b>Равенство</b> и на <b>${Math.round(result[0] * 100)}%</b> за <b>Рынки</b>, на <b>${Math.round((1 - result[1]) * 100)}%</b> за <b>Власть</b> и на <b>${Math.round(result[1] * 100)}%</b> за <b>Свободу</b>`, parse_mode: 'HTML' }
            ]);
            calls.push(['sendPhoto',
                { chat_id: id, photo: baseUrl + "static/" + Math.floor(result[0] * 30) + "-" + Math.floor(result[1] * 30) + ".png" }
            ]);
        }
    } else {
        calls.push(['sendMessage', {
            chat_id: id,
            text: make_question_text(state, state.current_question),
            reply_markup: {
                inline_keyboard: [
                    ['-1', '-0.5', '0', '0.5', '1'].map(effect => ({ text: buttons[locale][effect], callback_data: state.current_question + "|" + effect })),
                    show_restart_button && [{ text: buttons[locale].restart, callback_data: 'restart' }]
                ].filter(Boolean)
            }
        }
        ]);
    }
}

async function confirm_callback(calls, id) {
    calls.push(['answerCallbackQuery', { callback_query_id: id }]);
}

async function edit_question(calls, id, state, message_id, number, answer) {
    calls.push(['editMessageText', {
        chat_id: id,
        text: make_question_text(state, number, answer),
        message_id,
        reply_markup: {
            inline_keyboard: [
                ['-1', '-0.5', '0', '0.5', '1'].map(effect => ({ text: buttons[locale][effect], callback_data: number + "|" + effect })),
            ].filter(Boolean)
        }
    }]);
}

function process(update, state) {
    const calls = [], id = update?.message?.chat?.id || update?.callback_query?.message?.chat?.id;

    if (update?.message?.chat?.username === 'Maxkatz') {
        state.is_katz = true;
    }

    try {
        if (typeof state.current_question === 'undefined' || update?.message?.text === '/start') {
            state.current_question = 0;
            state.answers = new Array(questions.length).fill(0);
            state.random_mapper = new Array(questions.length).fill().map((_, i) => ({ random: Math.random(), i }))
                .sort((a, b) => a.random > b.random ? 1 : -1).map(({ i }) => i);

            send_welcome(calls, id);
            send_current_question(calls, id, state);
        }

        else if (update?.message?.text) {
            send_current_question(calls, id, state, { show_restart_button: true });
        }

        else if (update?.callback_query?.data === 'restart') {
            state.current_question = 0;
            confirm_callback(calls, update?.callback_query?.id);
            send_welcome(calls, id);
            send_current_question(calls, id, state);
        }

        else if (/^\d+\|(-1|-0\.5|0|0\.5|1)$/.test(update?.callback_query?.data || "")) {
            const [number, answer] = update?.callback_query?.data.split('|', 2).map(n => +n);

            confirm_callback(calls, update?.callback_query?.id);
            edit_question(calls, id, state, update?.callback_query?.message?.message_id, number, answer);
            state.answers[number] = answer;

            if (number === state.current_question) {
                state.current_question++;
                send_current_question(calls, id, state);
            }
        }
    } catch (e) {
        console.error(e);
        calls.push(['sendMessage', { chat_id: id, text: messages[locale].error }]);
    }

    return calls;
}

module.exports = { process };