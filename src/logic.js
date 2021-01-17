const { adminChatId, messages, buttons, questions, minQuestionsResult } = require('./settings');

function getUserPoint(answers) {
    let x = 0, xMax = 0, y = 0, yMax = 0, count = 0;
    for (let i = 0; i < answers.length; i++) {
        if (answers[i] === null) { continue; }

        count++;
        x -= answers[i] * questions[i]["more equality than markets"];
        xMax += Math.abs(questions[i]["more equality than markets"]);
        y += answers[i] * questions[i]["more liberty than authority"];
        yMax += Math.abs(questions[i]["more liberty than authority"]);
    }

    return count < minQuestionsResult ? null : [xMax === 0 ? 0 : (1 + x / xMax) / 2, yMax === 0 ? 0 : (1 + y / yMax) / 2];
}

function getDivision(state, questionId) {
    const results = { "-1": 0, "-0.5": 0, "0": 0, "0.5": 0, "1": 0 };
    Object.values(state.answers)
        .map(answers => String(answers[questionId]))
        .filter(Boolean)
        .forEach(value => {
            if (value in results) {
                results[value]++;
            }
        });
    return results;
}

function getResults(state) {
    if (state.adminStatus === 'start') {
        return {};
    }

    if (state.adminStatus === 'end') {
        return {
            results: {
                users: Object.values(state.users).map(({ answers }) => answers).map(getUserPoint).filter(Boolean),
                admin: getUserPoint(state.answers[adminChatId])
            }
        };
    }

    const output = {};

    if (state.adminStatus > 0) {
        const division = getDivision(state, state.adminStatus - 1);
        output.smallQuestion = {
            "number": state.adminStatus,
            "text": questions[state.adminStatus - 1],
            "admin": String(state.users[adminChatId].answers[state.adminStatus - 1]),
            ...division
        };
    }

    if (state.adminStatus < questions.length - 1) {
        output.bigQuestion = {
            "number": state.adminStatus + 1,
            "text": questions[state.adminStatus]
        };
    }

    return output;
}

function getQuestionMessage(state, chatId, questionId) {
    const answer = state.users[chatId].answers[questionId];
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

function getStatus(state, chatId) {
    for (let i = 0; i < state.users[chatId].answers.length; i++) {
        if (state.users[chatId].answers[i] === null) {
            return i;
        }
    }

    return "end";
}

function doAnswerCallback(chatId, update, calls) {
    if (update?.callback_query?.id) {
        calls.push([chatId, 'answerCallbackQuery', { callback_query_id: update?.callback_query?.id }]);
    }
}

function doWelcome(chatId, update, calls) {
    if (update?.message?.text === '/start') {
        calls.push([chatId, 'sendMessage', { chat_id: chatId, text: messages.welcome }]);
        calls.push([chatId, 'wait', {}]);
    }
}

function doProcessAnswer(state, chatId, update, calls) {
    if (!/^answer\d+\|(-1|-0\.5|0|0\.5|1)$/.test(update?.callback_query?.data || '')) { return; }
    const [questionId, answerValue] = update?.callback_query?.data.replace('answer', '').split('|').map(n => +n);
    state.users[chatId].answers[questionId] = String(answerValue);
    state.users[chatId].cachedPoint = null;

    const { text, reply_markup } = getQuestionMessage(state, chatId, questionId);
    calls.push([chatId, 'editMessageText', {
        chat_id: chatId,
        message_id: update?.callback_query?.message?.message_id,
        text,
        reply_markup
    }]);
}

function doSendNext(state, chatId, calls) {
    const status = getStatus(state, chatId);

    if (state.adminStatus === 'start') {
        if (chatId !== adminChatId) {
            calls.push([chatId, 'sendMessage', { chat_id: chatId, text: "Стрим еще не начался, подожди пожалуйста" }]);
        }

    }

    else if (status === "end") {
        const point = getUserPoint(state.users[chatId].answers), x = Math.round(point[0] * 100), y = Math.round(point[1] * 100);
        calls.push([chatId, 'sendMessage', { chat_id: chatId, text: messages.description, parse_mode: 'HTML' }]);
        calls.push([chatId, 'sendMessage', { chat_id: chatId, text: `Твой результат на <b>${100 - x}%</b> за <b>Равенство</b> и на <b>${x}%</b> за <b>Рынки</b>, на <b>${100 - y}%</b> за <b>Власть</b> и на <b>${y}%</b> за <b>Свободу</b>`, parse_mode: 'HTML' }]);
        // calls.push([chatId, 'sendPhoto', { chat_id: chatId, photo: `${userResultBaseUrl}results/${x}-${y}.png` }]);
    }

    else if (state.adminStatus === 'end') {
        const { text, reply_markup } = getQuestionMessage(state, chatId, status);
        calls.push([chatId, 'sendMessage', { chat_id: chatId, text, reply_markup }]);
    }

    else if (status > state.adminStatus) {
        calls.push([chatId, 'sendMessage', { chat_id: chatId, text: messages.wait }]);
    }

    else if (state.users[chatId].answers[state.adminStatus] === null) {
        const { text, reply_markup } = getQuestionMessage(state, chatId, state.adminStatus);
        calls.push([chatId, 'sendMessage', { chat_id: chatId, text, reply_markup }]);
    }

    else {
        const { text, reply_markup } = getQuestionMessage(state, chatId, status);
        calls.push([chatId, 'sendMessage', { chat_id: chatId, text, reply_markup }]);
    }
}

function doSendError(chatId, calls) {
    calls.push([chatId, 'sendMessage', { chat_id: chatId, text: messages.error }]);
}

function initialState() {
    return {
        lastUpdateId: 0,
        users: {},
        adminStatus: "start"
    };
}

function processUpdates(state, updates, calls) {
    if (!updates.ok) { return; }

    for (let i = 0; i < updates.result.length; i++) {
        const update = updates.result[i], chatId = update?.message?.chat?.id || update?.callback_query?.message?.chat?.id;
        state.lastUpdateId = Math.max(state.lastUpdateId, update.update_id);

        if (!chatId || chatId < 0) { continue; }
        state.users[chatId] = state.users[chatId] || {
            answers: new Array(questions.length).fill(null),
            cachedPoint: null,
            isActive: true
        };

        try {
            state.users[chatId].isActive = true;
            doAnswerCallback(chatId, update, calls);
            doWelcome(chatId, update, calls);
            doProcessAnswer(state, chatId, update, calls);
            doSendNext(state, chatId, calls);

            if (chatId === adminChatId && getStatus(state, adminChatId) !== state.adminStatus) {
                calls.push(['', 'adminBroadcast']);
            }
        } catch (e) {
            console.error(JSON.stringify(e));
            doSendError(chatId, calls);
        }
    }
}

function processRebuild(state, calls) {
    // state.nextAvailableUpdateAt = null;
    // const adminQuestionId = getActiveQuestionId(state, adminChatId);

    // if (state.maxAvailableQuestionId !== adminQuestionId) {
    //     state.maxAvailableQuestionId = adminQuestionId;

    //     if (state.maxAvailableQuestionId !== questions.length) {
    //         for (let chatId in state.users) {
    //             if (state.users[chatId].answers[state.maxAvailableQuestionId - 1] !== null) {
    //                 const { text, reply_markup } = getQuestionMessage(state, chatId, state.maxAvailableQuestionId);
    //                 calls.push([chatId, 'sendMessage', { chat_id: chatId, text, reply_markup }]);
    //             }
    //         }
    //     } else {
    //         state.nextAvailableUpdateAt = Date.now() + 30000;
    //     }
    // }
}

module.exports = { initialState, processUpdates, getQuestionMessage, getStatus };
