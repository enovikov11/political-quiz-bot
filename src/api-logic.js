const { adminUsername, messages, buttons, questions } = require('./settings');

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
    calls.push([chatId, 'sendMessage', { chat_id: chatId, text: 'Результаты(FIXME)' }]);
}

// calls.push(['sendMessage',
//     { chat_id: id, text: messages[locale].description, parse_mode: 'HTML' }
// ]);
// if (result) {
//     calls.push(['sendMessage',
//         { chat_id: id, text: `Твой результат на <b>${Math.round((1 - result[0]) * 100)}%</b> за <b>Равенство</b> и на <b>${Math.round(result[0] * 100)}%</b> за <b>Рынки</b>, на <b>${Math.round((1 - result[1]) * 100)}%</b> за <b>Власть</b> и на <b>${Math.round(result[1] * 100)}%</b> за <b>Свободу</b>`, parse_mode: 'HTML' }
//     ]);
//     calls.push(['sendPhoto',
//         { chat_id: id, photo: baseUrl + "static/" + Math.floor(result[0] * 30) + "-" + Math.floor(result[1] * 30) + ".png" }
//     ]);
// }

function processUpdate(update, state, calls) {
    const text = update?.message?.text, callbackData = update?.callback_query?.data, chatId = getChatId(update), isDirect = chatId > 0;
    if (!chatId || !isDirect) { return; }

    const isAdmin = getIsAdmin(update), userInternalId = isAdmin ? 'admin' : chatId, isNew = !state.answers[userInternalId];

    confirmCallback(update, calls, chatId);
    processAnswer(update, state, calls, userInternalId, chatId);

    if (isNew || text === '/start') {
        calls.push([chatId, 'sendMessage', { chat_id: chatId, text: isAdmin ? messages.adminWelcome : messages.welcome }]);
    } else if (isAdmin && callbackData === 'nextAll') {
        if (state.maxAvailableQuestionId === questions.length - 1) { return; }

        for (let userId in state.answers) {
            if (userId === 'admin') { continue; }
            if (state.answers[userId][state.maxAvailableQuestionId] !== null) {
                sendQuestion(calls, userId, state.maxAvailableQuestionId + 1);
            }
        }
        state.maxAvailableQuestionId++;
    }

    const answers = state.answers[userInternalId], activeQuestionId = getActiveQuestionId(answers);
    if (activeQuestionId === null) {
        sendResults(calls, chatId, answers);
    } else if (activeQuestionId <= state.maxAvailableQuestionId) {
        sendQuestion(calls, chatId, activeQuestionId);
    }
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
                calls.push([chatId, 'sendMessage', { chat_id: chatId, text: messages.error }]);
            }
        }
    }

    state.offset++;
}

module.exports = { process };