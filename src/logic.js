const fs = require('fs');
const YAML = require('yaml');

const { questions, messages, buttons } = YAML.parse(fs.readFileSync('./res/quiz.yaml', 'utf8'));
const locale = 'ru';

function send_welcome(calls, id) {
    calls.push(['sendMessage', { chat_id: id, text: messages[locale].welcome }]);
}

function make_question_text(state, number, answer) {
    const text = `${messages[locale].question} ${number + 1} ${messages[locale]['question from']} ${questions.length}: ${questions[state.random_mapper[number]].question[locale]}`;
    return answer === undefined ? text : text + `\n\n${messages[locale]['your answer']}: ${messages[locale][String(answer)]}`;
}

function send_current_question(calls, id, state, { show_restart_button = false } = {}) {
    calls.push(['sendMessage', state.current_question === questions.length ?
        { chat_id: id, text: messages[locale].complete } :
        {
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

async function confirm_callback(calls, id) {
    calls.push(['answerCallbackQuery', { callback_query_id: id, text: "" }]);
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
            confirm_callback(calls, id);
            send_welcome(calls, id);
            send_current_question(calls, id, state);
        }

        else if (/^\d+\|(-1|-0\.5|0|0\.5|1)$/.test(update?.callback_query?.data || "")) {
            const [number, answer] = update?.callback_query?.data.split('|', 2).map(n => +n);

            confirm_callback(calls, id);
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