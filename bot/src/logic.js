const { adminChatId, userResultBaseUrl, messages, buttons, questions, minQuestionsResult } = require('./settings');

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
        .forEach(value => { results[value]++; });
    return results;
}

function getResults(state) {
    if (state.maxAvailableQuestionId === questions.length) {
        return {
            users: Object.values(state.answers)
                .map(getUserPoint)
                .filter(Boolean),
            admin: getUserPoint(state[adminChatId])
        }
    } else {
        const questions = {};

        if (state.maxAvailableQuestionId > 0) {
            questions.last = questions[state.maxAvailableQuestionId - 1].question;
            questions.lastAnswers = getDivision(state, state.maxAvailableQuestionId - 1);
        }
        questions.current = questions[state.maxAvailableQuestionId].question;

        return { questions };
    }
}

function getQuestionMessage(state, chatId, questionId) {
    return {
        text: `${messages.question} ${questionId + 1} из ${questions.length}: ${questions[questionId].question}` +
            state.answers[chatId] === null ? '' : `\n\n${messages.yourAnswer}: ${messages[state.answers[chatId][questionId]]}`,
        reply_markup: {
            inline_keyboard: [
                ['-1', '-0.5', '0', '0.5', '1'].map(effect => ({ text: buttons[effect], callback_data: `answer${questionId}|${effect}` }))
            ]
        }
    };
}

function getActiveQuestionId(state, chatId) {
    for (let i = 0; i < state.answers[chatId].length; i++) {
        if (state.answers[chatId][i] === null) {
            return i;
        }
    }
    return state[chatId].length;
}

function doAnswerCallback(chatId, update, calls) {
    if (update?.callback_query?.id) {
        calls.push([chatId, 'answerCallbackQuery', { callback_query_id: update?.callback_query?.id }]);
    }
}

function doWelcome(chatId, update, calls) {
    if (update?.message?.text === '/start') {
        calls.push([chatId, 'sendMessage', { chat_id: chatId, text: messages.welcome }]);
    }
}

function doProcessAnswer(state, chatId, update, calls) {
    if (!/^answer\d+\|(-1|-0\.5|0|0\.5|1)$/.test(update?.callback_query?.data || '')) { return; }
    const [questionId, answerValue] = update?.callback_query?.data.replace('answer', '').split('|').map(n => +n);
    state.answers[chatId] = answerValue;

    const { text, reply_markup } = getQuestionMessage(state, chatId, questionId);
    calls.push([chatId, 'editMessageText', {
        chat_id: chatId,
        message_id: update?.callback_query?.message?.message_id,
        text,
        reply_markup
    }]);

    if (chatId === adminChatId) {
        state.nextAvailableUpdateAt = Date.now() + 30000;
    }
}

function doSendNext(state, chatId, calls) {
    const activeQuestionId = getActiveQuestionId(state, chatId);
    if (activeQuestionId === questions.length) {
        const point = getUserPoint(), x = Math.round(point[0] * 100), y = Math.round(point[1] * 100);
        calls.push([chatId, 'sendMessage', { chat_id: chatId, text: messages.description, parse_mode: 'HTML' }]);
        calls.push([chatId, 'sendMessage', { chat_id: chatId, text: `Твой результат на <b>${100 - x}%</b> за <b>Равенство</b> и на <b>${x}</b> за <b>Рынки</b>, на <b>${100 - y}</b> за <b>Власть</b> и на <b>${y}</b> за <b>Свободу</b>`, parse_mode: 'HTML' }]);
        calls.push([chatId, 'sendPhoto', { chat_id: chatId, photo: `${userResultBaseUrl}results/${x}-${y}.png` }]);
    } else if (activeQuestionId <= state.maxAvailableQuestionId) {
        const { text, reply_markup } = getQuestionMessage(state, chatId, activeQuestionId);
        calls.push([chatId, 'sendMessage', { chat_id: chatId, text, reply_markup }]);
    } else {
        calls.push([chatId, 'sendMessage', { chat_id: chatId, text: messages.wait }]);
    }
}

function doSendError(chatId, calls) {
    calls.push([chatId, 'sendMessage', { chat_id: chatId, text: messages.error }]);
}

function initialState() {
    return {
        lastUpdateId: 0,
        answers: {},
        maxAvailableQuestionId: 0,
        nextAvailableUpdateAt: null
    };
}

function processUpdates(state, updates, calls) {
    if (!updates.ok) { return; }

    for (let i = 0; i < updates.result.length; i++) {
        const update = updates[i], chatId = update?.message?.chat?.id || update?.callback_query?.message?.chat?.id;
        state.lastUpdateId = Math.max(state.lastUpdateId, update.update_id);

        if (!chatId || chatId < 0) { continue; }
        state.answers[chatId] = state.answers[chatId] || new Array(questions.length).fill(null);

        try {
            doAnswerCallback(chatId, update, calls);
            doWelcome(chatId, update, calls);
            doProcessAnswer(state, chatId, update, calls);
            doSendNext(state, chatId, calls);
        } catch (e) {
            doSendError(chatId, calls);
        }
    }

    if (state.nextAvailableUpdateAt && state.nextAvailableUpdateAt < Date.now()) {
        state.nextAvailableUpdateAt = null;
        const adminQuestionId = getActiveQuestionId(state, adminChatId);
        if (state.maxAvailableQuestionId !== adminQuestionId && state.maxAvailableQuestionId !== questions.length) {
            state.maxAvailableQuestionId === adminQuestionId;

            for (let chatId in state.answers) {
                if (state.answers[chatId][state.maxAvailableQuestionId - 1] !== null) {
                    const { text, reply_markup } = getQuestionMessage(state, chatId, state.maxAvailableQuestionId);
                    calls.push([chatId, 'sendMessage', { chat_id: chatId, text, reply_markup }]);
                }
            }
        }
    }

    return getResults(state);
}

module.exports = { initialState, processUpdates };