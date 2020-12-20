const { adminUsername, messages, buttons, questions, publicUrlBase, minQuestionsResult } = require('./settings');

function calcUserPoint(answers) {
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

function calcPoints(state) {
    const result = { users: [] }
    for (let key in state.answers) {
        const point = calcUserPoint(state.answers[key]);
        if (!point) { continue; }

        if (key === 'admin') {
            result.admin = point;
        } else {
            result.users.push(point);
        }
    }
    return result;
}

function getDivision(state, questionId) {
    const results = { "-1": 0, "-0.5": 0, "0": 0, "0.5": 0, "1": 0 };
    Object.values(state.answers).map(answers => String(answers[questionId])).filter(Boolean).forEach(value => {
        results[value]++;
    });
    return results;
}

function calc(state) {
    if (state.maxAvailableQuestionId === questions.length) {
        return calcPoints(state);
    } else {
        const result = { questions: {} };

        if (state.maxAvailableQuestionId > 0) {
            result.questions.last = questions[state.maxAvailableQuestionId - 1].question;
            result.questions.lastAnswers = getDivision(state, state.maxAvailableQuestionId - 1);
        }
        result.questions.current = questions[state.maxAvailableQuestionId].question;

        return result;
    }
}

function getChatId(update) { return (update?.message || update?.callback_query?.message)?.chat?.id; }

function getIsAdmin(update) { return (update?.message || update?.callback_query?.message)?.chat?.username === adminUsername; }

function confirmCallback(update, calls, chatId) {
    if (update?.callback_query?.id) {
        calls.push([chatId, 'answerCallbackQuery', { callback_query_id: update?.callback_query?.id }]);
    }
}

function makeQuestionMarkup(questionId, isAdmin = false) {
    return {
        inline_keyboard: [
            ['-1', '-0.5', '0', '0.5', '1'].map(effect => ({ text: buttons[effect], callback_data: `answer${questionId}|${effect}` })),
            isAdmin && [{ text: buttons.nextAll, callback_data: 'nextAll' }]
        ].filter(Boolean)
    };
}

function makeQuestionText(questionId, answerValue) {
    return `${messages.question} ${questionId + 1} из ${questions.length}: ${questions[questionId].question}` +
        (typeof answerValue === 'undefined' ? '' : `\n\n${messages.yourAnswer}: ${messages[answerValue]}`);
}

function sendQuestion(calls, chatId, questionId) {
    calls.push([chatId, 'sendMessage', { chat_id: chatId, text: makeQuestionText(questionId), reply_markup: makeQuestionMarkup(questionId) }]);
}

function updateQuestion(calls, chatId, messageId, questionId, answerValue, isAdmin) {
    calls.push([chatId, 'editMessageText', {
        chat_id: chatId,
        message_id: messageId,
        text: makeQuestionText(questionId, answerValue),
        reply_markup: makeQuestionMarkup(questionId, isAdmin)
    }]);
}

function processAnswer(update, state, calls, userInternalId, chatId) {
    if (!state.answers[userInternalId]) {
        state.answers[userInternalId] = new Array(questions.length).fill(null);
    }

    if (/^answer\d+\|(-1|-0\.5|0|0\.5|1)$/.test(update?.callback_query?.data || '')) {
        const [questionId, answerValue] = update?.callback_query?.data.replace('answer', '').split('|', 2).map(n => +n),
            isAdmin = getIsAdmin(update);
        state.answers[userInternalId][questionId] = answerValue;
        updateQuestion(calls, chatId, update?.callback_query?.message?.message_id, questionId, answerValue, isAdmin);
    }
}

function getActiveQuestionId(answers) {
    for (let i = 0; i < answers.length; i++) {
        if (answers[i] === null) {
            return i;
        }
    }

    return null;
}

function sendResults(calls, chatId, answers) {
    const point = calcUserPoint(answers);
    calls.push([chatId, 'sendMessage', { chat_id: chatId, text: messages.description, parse_mode: 'HTML' }]);
    calls.push([chatId, 'sendMessage', { chat_id: chatId, text: `Твой результат на <b>${Math.round((1 - point[0]) * 100)}%</b> за <b>Равенство</b> и на <b>${Math.round(point[0] * 100)}%</b> за <b>Рынки</b>, на <b>${Math.round((1 - point[1]) * 100)}%</b> за <b>Власть</b> и на <b>${Math.round(point[1] * 100)}%</b> за <b>Свободу</b>`, parse_mode: 'HTML' }]);
    calls.push([chatId, 'sendPhoto', { chat_id: chatId, photo: `${publicUrlBase}results/${Math.round(point[0] * 100)}-${Math.round(point[1] * 100)}.png` }]);
}

function processUpdate(update, state, calls) {
    const text = update?.message?.text, callbackData = update?.callback_query?.data, chatId = getChatId(update), isDirect = chatId > 0;
    if (!chatId || !isDirect) { return; }

    const isAdmin = getIsAdmin(update), userInternalId = isAdmin ? 'admin' : chatId, isNew = !state.answers[userInternalId];

    confirmCallback(update, calls, chatId);
    processAnswer(update, state, calls, userInternalId, chatId);

    if (isNew || text === '/start') {
        calls.push([chatId, 'sendMessage', { chat_id: chatId, text: isAdmin ? messages.adminWelcome : messages.welcome }]);
    } else if (isAdmin && callbackData === 'nextAll') {
        if (state.maxAvailableQuestionId === questions.length) { return; }

        for (let userId in state.answers) {
            if (userId === 'admin') { continue; }
            if (state.answers[userId][state.maxAvailableQuestionId] !== null) {
                sendQuestion(calls, userId, state.maxAvailableQuestionId + 1);
            }
        }
        state.maxAvailableQuestionId++;
        state.nextSyncAt = 0;
    }

    const answers = state.answers[userInternalId], activeQuestionId = getActiveQuestionId(answers);
    if (activeQuestionId === null) {
        sendResults(calls, chatId, answers);
    } else if (activeQuestionId <= state.maxAvailableQuestionId) {
        sendQuestion(calls, chatId, activeQuestionId);
    }
}

function processUpdates(updates, state, calls) {
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
                calls.push([chatId, 'sendMessage', { chat_id: chatId, text: messages.error }]);
            }
        }
    }

    state.offset++;
}

function getInitialState() {
    return { offset: 0, nextSyncAt: 0, maxAvailableQuestionId: 0, answers: {} };
}

module.exports = { processUpdates, calc, getInitialState };