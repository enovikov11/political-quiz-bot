const { messages, buttons, questions, adminUsername } = require('./settings');
// publicUrlBase, minQuestionsResult

// function calcUserPoint(answers) {
//     let x = 0, xMax = 0, y = 0, yMax = 0, count = 0;
//     for (let i = 0; i < answers.length; i++) {
//         if (answers[i] === null) { continue; }

//         count++;
//         x -= answers[i] * questions[i]["more equality than markets"];
//         xMax += Math.abs(questions[i]["more equality than markets"]);
//         y += answers[i] * questions[i]["more liberty than authority"];
//         yMax += Math.abs(questions[i]["more liberty than authority"]);
//     }

//     return count < minQuestionsResult ? null : [xMax === 0 ? 0 : (1 + x / xMax) / 2, yMax === 0 ? 0 : (1 + y / yMax) / 2];
// }

// function calcPoints(state) {
//     const result = { users: [] }
//     for (let key in state.answers) {
//         const point = calcUserPoint(state.answers[key]);
//         if (!point) { continue; }

//         if (key === 'admin') {
//             result.admin = point;
//         } else {
//             result.users.push(point);
//         }
//     }
//     return result;
// }

// function getDivision(state, questionId) {
//     const results = { "-1": 0, "-0.5": 0, "0": 0, "0.5": 0, "1": 0 };
//     Object.values(state.answers).map(answers => String(answers[questionId])).filter(Boolean).forEach(value => {
//         results[value]++;
//     });
//     return results;
// }

// function calc(state) {
//     if (state.maxAvailableQuestionId === questions.length) {
//         return calcPoints(state);
//     } else {
//         const result = { questions: {} };

//         if (state.maxAvailableQuestionId > 0) {
//             result.questions.last = questions[state.maxAvailableQuestionId - 1].question;
//             result.questions.lastAnswers = getDivision(state, state.maxAvailableQuestionId - 1);
//         }
//         result.questions.current = questions[state.maxAvailableQuestionId].question;

//         return result;
//     }
// }

















function getChatId(state, update) { return (update?.message || update?.callback_query?.message)?.chat?.id; }

function getIsAdmin(state, update) { return (update?.message || update?.callback_query?.message)?.chat?.username === adminUsername; }

function getUserState(state, update) {
    const id = getIsAdmin(state, update) ? 'admin' : getChatId(state, update);

    if (!state.answers[id]) {
        state.answers[id] = new Array(questions.length).fill(null);
    }

    return state.answers[id];
}

function getActiveQuestionId(state, update, chatId) {
    const answers = state.answers[chatId];

    for (let i = 0; i < answers.length; i++) {
        if (answers[i] === null) {
            return i;
        }
    }

    return null;
}

function getQuestionMessage(state, update, questionId) {
    const chatId = getChatId(state, update), answer = state.answers[chatId];
    return {
        text: `${messages.question} ${questionId + 1} из ${questions.length}: ${questions[questionId].question}` +
            (answer === null ? '' : `\n\n${messages.yourAnswer}: ${messages[answer]}`),
        reply_markup: {
            inline_keyboard: [
                ['-1', '-0.5', '0', '0.5', '1'].map(effect => ({ text: buttons[effect], callback_data: `answer${questionId}|${effect}` }))
            ]
        }
    };
}







function doAnswerCallback(state, update, calls) {
    if (update?.callback_query?.id) {
        calls.push([chatId, 'answerCallbackQuery', { callback_query_id: update?.callback_query?.id }]);
    }
}

function doWelcome(state, update, calls) {
    if (update?.message?.text === '/start') {
        const chatId = getChatId(state, update);
        calls.push([chatId, 'sendMessage', { chat_id: chatId, text: messages.welcome }]);
    }
}

function doProcessAnswer(state, update, calls) {
    const chatId = getChatId(state, update);
    if (/^answer\d+\|(-1|-0\.5|0|0\.5|1)$/.test(update?.callback_query?.data || '')) {
        const [questionId, answerValue] = update?.callback_query?.data.replace('answer', '').split('|', 2).map(n => +n);
        state.answers[chatId][questionId] = answerValue;

        const { text, reply_markup } = getQuestionMessage(state, update, questionId);

        calls.push([chatId, 'editMessageText', {
            chat_id: chatId,
            message_id: update?.callback_query?.message?.message_id,
            text,
            reply_markup
        }]);
    }
}

function doSendQuestionOrResults(state, update, calls) {
    const chatId = getChatId(state, update), activeQuestionId = getActiveQuestionId(state, update, chatId);
    if (activeQuestionId === null) {
        // const point = calcUserPoint(answers);
        calls.push([chatId, 'sendMessage', { chat_id: chatId, text: messages.description, parse_mode: 'HTML' }]);
        // calls.push([chatId, 'sendMessage', { chat_id: chatId, text: `Твой результат на <b>${Math.round((1 - point[0]) * 100)}%</b> за <b>Равенство</b> и на <b>${Math.round(point[0] * 100)}%</b> за <b>Рынки</b>, на <b>${Math.round((1 - point[1]) * 100)}%</b> за <b>Власть</b> и на <b>${Math.round(point[1] * 100)}%</b> за <b>Свободу</b>`, parse_mode: 'HTML' }]);
        // calls.push([chatId, 'sendPhoto', { chat_id: chatId, photo: `${publicUrlBase}results/${Math.round(point[0] * 100)}-${Math.round(point[1] * 100)}.png` }]);
    } else if (activeQuestionId <= state.limit.questionId) {
        const { text, reply_markup } = getQuestionMessage(state, update, activeQuestionId);
        calls.push([chatId, 'sendMessage', { chat_id: chatId, text, reply_markup }]);
    } else {
        calls.push([chatId, 'sendMessage', { chat_id: chatId, text: messages.wait }]);
    }
}

function doSendError(state, update, calls) {
    const chatId = getChatId(state, update);
    calls.push([chatId, 'sendMessage', { chat_id: chatId, text: messages.error }]);
}



function initialState() {
    return { lastUpdateId: 0, answers: {}, limit: { questionId: 0, nextQuestionId: 0, nextTime: null } };
}

function processUpdates(updates, state, calls) {
    if (!updates.ok) { return; }

    for (let i = 0; i < updates.result.length; i++) {
        const update = updates.result[i], chatId = getChatId(state, update);
        state.lastUpdateId = Math.max(state.lastUpdateId, update.update_id);
        if (!chatId || chatId < 0) { continue; }

        try {
            doAnswerCallback(state, update, calls);
            doWelcome(state, update, calls);
            doProcessAnswer(state, update, calls);
            doSendQuestionOrResults(state, update, calls);
        } catch (e) {
            doSendError(state, update, calls);
        }
    }
}

function processLimits() {
    //         if (state.maxAvailableQuestionId === questions.length) { return; }
    //         for (let userId in state.answers) {
    //             if (userId === 'admin') { continue; }
    //             if (state.answers[userId][state.maxAvailableQuestionId] !== null) {
    //                 sendQuestion(calls, userId, state.maxAvailableQuestionId + 1);
    //             }
    //         }
    //         state.maxAvailableQuestionId++;
    //         state.nextSyncAt = 0;
}

module.exports = { initialState, processUpdates };


// set({ users: new Array(count === 0 ? 0 : count - 1).fill().map(() => ([Math.random(), Math.random()])), admin: [Math.random(), Math.random()] });

// set({
//     questions: {
//         last: "Все люди — независимо от таких факторов, как культура или сексуальная ориентация— должны рассматриваться как равные?",
//         lastAnswers: { "-1": 10, "-0.5": 100, "0": 12, "0.5": 1342, "1": 2 },
//         current: "Все люди — независимо от таких факторов, как культура или сексуальная ориентация— должны рассматриваться как равные?",
//     }
// });

// set({
//     questions: {
//         current: "Все люди — независимо от таких факторов, как культура или сексуальная ориентация— должны рассматриваться как равные?",
//     }
// });