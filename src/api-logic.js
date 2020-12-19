const { katzUsername, messages, buttons, questions } = require('./settings');

function getChatId(update) { return (update?.message || update?.callback_query?.message)?.chat?.id }

function getIsFromKatz(update) { return (update?.message || update?.callback_query?.message)?.chat?.username === katzUsername; }

function makeUserState(state, userId) {
    if (!state.users[userId]) {
        state.users[userId] = {
            isNew: true,
            answers: new Array(questions.length).fill(0),
            answeredCount: 0,
            startedAt: state.katzAnsweredCount
        };
    }

    return state.users[userId];
}

function answerCallbackQuery(update, calls, chatId) {
    if (update?.callback_query?.id) {
        calls.push([chatId, 'answerCallbackQuery', { callback_query_id: update?.callback_query?.id }]);
    }
}

function sendMessage(chatId, calls, text, reply_markup) {
    calls.push([chatId, 'sendMessage', { chat_id: chatId, text, reply_markup }]);
}

function getAnswer(update) {
    const data = update?.callback_query?.data || "";
    if (/^answer\d+\|(-1|-0\.5|0|0\.5|1)$/.test(data)) {
        return update?.callback_query?.data.split('|', 2).map(n => +n)
    }
}

function makeAnswerMarkup(questionId) {
    return {
        inline_keyboard: [
            ['-1', '-0.5', '0', '0.5', '1'].map(effect => ({ text: buttons[effect], callback_data: `answer${questionId}|${effect}` }))
        ]
    };
}

function makeQuestionText(questionId, answerValue) {
    return `${messages.question} ${questionId + 1} из ${questions.length}: ${questions[questionId].question}`
}

function sendQuestion(chatId, calls, questionId) {
    sendMessage(chatId, calls, makeQuestionText(questionId), makeAnswerMarkup(questionId));
}

function updateQuestion() {

}

function processUpdate(update, state, calls) {
    const chatId = getChatId(update), isDirect = chatId > 0;
    if (!chatId || !isDirect) { return; }
    const isKatz = getIsFromKatz(update), text = update?.message?.text, userState = makeUserState(state, isKatz ? 'katz' : chatId);

    answerCallbackQuery(update, calls, chatId);

    if (userState.isNew || text === '/start') {
        userState.isNew = false;
        sendMessage(chatId, calls, messages.welcome);
    }

    sendQuestion(chatId, calls, 0);
}

function process(updates, state, calls) {
    if (!updates.ok) { return; }

    for (let i = 0; i < updates.result.length; i++) {
        const update = updates.result[i];
        state.offset = Math.max(state.offset, update.update_id);

        try {
            processUpdate(update, state, calls);
        } catch (e) {
            console.log(e);
            const chatId = getChatId(update);
            if (chatId) {
                sendMessage(chatId, calls, messages.error);
            }
        }
    }

    state.offset++;
}

module.exports = { process };




// function make_question_text(state, number, answer) {
//     const text = `${messages[locale].question} ${number + 1} ${messages[locale]['question from']} ${questions.length}: ${questions[state.random_mapper[number]].question[locale]}`;
//     return answer === undefined ? text : text + `\n\n${messages[locale]['your answer']}: ${messages[locale][String(answer)]}`;
// }

// function send_current_question(calls, id, state, { show_restart_button = false } = {}) {
//     if (state.current_question === questions.length) {
//         const result = calc(state);
//         calls.push(['sendMessage',
//             { chat_id: id, text: messages[locale].description, parse_mode: 'HTML' }
//         ]);
//         if (result) {
//             calls.push(['sendMessage',
//                 { chat_id: id, text: `Твой результат на <b>${Math.round((1 - result[0]) * 100)}%</b> за <b>Равенство</b> и на <b>${Math.round(result[0] * 100)}%</b> за <b>Рынки</b>, на <b>${Math.round((1 - result[1]) * 100)}%</b> за <b>Власть</b> и на <b>${Math.round(result[1] * 100)}%</b> за <b>Свободу</b>`, parse_mode: 'HTML' }
//             ]);
//             calls.push(['sendPhoto',
//                 { chat_id: id, photo: baseUrl + "static/" + Math.floor(result[0] * 30) + "-" + Math.floor(result[1] * 30) + ".png" }
//             ]);
//         }
//     } else {
//         calls.push(['sendMessage', {
//             chat_id: id,
//             text: make_question_text(state, state.current_question),
//             reply_markup: {
//                 inline_keyboard: [
//                     ['-1', '-0.5', '0', '0.5', '1'].map(effect => ({ text: buttons[locale][effect], callback_data: state.current_question + "|" + effect })),
//                     show_restart_button && [{ text: buttons[locale].restart, callback_data: 'restart' }]
//                 ].filter(Boolean)
//             }
//         }
//         ]);
//     }
// }


// async function edit_question(calls, id, state, message_id, number, answer) {
//     calls.push(['editMessageText', {
//         chat_id: id,
//         text: make_question_text(state, number, answer),
//         message_id,
//         reply_markup: {
//             inline_keyboard: [
//                 ['-1', '-0.5', '0', '0.5', '1'].map(effect => ({ text: buttons[locale][effect], callback_data: number + "|" + effect })),
//             ].filter(Boolean)
//         }
//     }]);
// }



