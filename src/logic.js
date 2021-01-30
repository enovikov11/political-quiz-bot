const { adminChatId, messages, buttons, questions, minQuestionsResult, publicUrlBase, prefix } = require('./settings');

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
    Object.values(state.users).map(({ answers }) => answers)
        .map(answers => String(answers[questionId]))
        .filter(Boolean)
        .forEach(value => {
            if (value in results) {
                results[value]++;
            }
        });
    return results;
}

// опечатка, indivi`S`ual
function getIndivisualResults(state, chatId) {
    return {
        users: Object.values(state.users).map(({ answers }) => answers).map(getUserPoint).filter(Boolean),
        admin: state.users[adminChatId].answers ? getUserPoint(state.users[adminChatId].answers) : undefined,
        you: state.users[chatId].answers ? getUserPoint(state.users[chatId].answers) : undefined
    };
}

function getResults(state) {
    if (state.adminStatus === 'start') {
        return {};
    }

    if (state.adminStatus === 'end') {
        return {
            results: {
                // вычисление результата пользователей несколько раз используется, например здесь и в
                // getIndivisualResults — возможно стоит вынести в отдельную fn
                users: Object.values(state.users).map(({ answers }) => answers).map(getUserPoint).filter(Boolean),
                admin: getUserPoint(state.users[adminChatId].answers)
            }
        };
    }

    const output = {};

    // Если я правильно разобрался в коде, то:
    // - smallQuestion это на самом деле lastAnsweredQuestion — последний вопрос, на который ответил админ
    // - bigQuestion это на самом деле nextQuestionToAnswer / currentQuestion — следующий за ним вопрос (текущий вопрос)
    // Если так, то названия small / big не информативны и надо заменить на что-то более
    // понятное, например варианты которые я выше написал
    // С названиями small / big было трудно понять, в чем разница

    if (state.adminStatus > 0) {
        // я бы хранил в state.adminStatus "нормальный" id, начиная с 0
        // а при выводе номера вопроса добавлял к нему +1 (у тебя наоборот)

        // это облегчит код, тут как со временем — всегда внутри лучше все операции
        // проводить с UTC+0 (и хранить данные также), а перед непосредственно
        // выводом пользователю приводить к нужной локали

        // также так тестировать будет проще

        // Кстати, с small / big vs lastAnswered / next по сути такая же история —
        // лучше в коде / названиях / данных хранить саму суть данных,
        // а если при выводе на экран нужно показать next большим шрифтом, а lastAnswered маленьким —
        // эту логику стоит прописывать уже в view слое, максимально близко к показу данных (в index.html)
        const division = getDivision(state, state.adminStatus - 1);
        output.smallQuestion = {
            "number": state.adminStatus,
            "text": questions[state.adminStatus - 1].question,
            "admin": String(state.users[adminChatId].answers[state.adminStatus - 1]),
            ...division
        };
    }

    // Не смог сходу сообразить, почему в bigQuestion state.adminStatus + 1 — получается,
    // это не следующий после последнего отвеченного вопроса, а послеследующий?
    // Если так, то, соответственно, надо другое название придумать :)
    output.bigQuestion = {
        "number": state.adminStatus + 1,
        "text": questions[state.adminStatus].question
    };

    return output;
}

function getQuestionMessage(state, chatId, questionId) {
    const answer = state.users[chatId].answers[questionId];
    return {
        text: `${messages.question} ${questionId + 1} из ${questions.length}: ${questions[questionId].question}` +
            (answer === null ? '' : `\n\n${messages.yourAnswer}: ${messages[answer]}`),
        reply_markup: {
            // если я правильно понял, то inline_keyboard нужен только в случае, если answer === null
            // зачем его показывать, если вопрос уже отвечен?
            inline_keyboard: [
                ['-1', '-0.5', '0', '0.5', '1'].map(effect => ({ text: buttons[effect], callback_data: `answer${questionId}|${effect}` }))
            ]
        }
    };
}

function getStatus(state, chatId) {
    // через lodash вариант:
    // const firstNullIndex = lodash.indexOf(state.users[chatId].answers, null);
    // return firstNullIndex < 0 ? "end" : firstNullIndex;

    for (let i = 0; i < state.users[chatId].answers.length; i++) {
        if (state.users[chatId].answers[i] === null) {
            return i;
        }
    }

    return "end";
}

function doAnswerCallback(chatId, update, calls) {
    // можно вынести update?.callback_query?.id в переменную
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
    // лучше эту проверку в отдельную fn вынести, чтобы было понятно, что это валидация
    // данных
    // + возможно где-то еще пригодится
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
            // текст захардкожен, а не в settings.messages
            calls.push([chatId, 'sendMessage', { chat_id: chatId, text: "Стрим еще не начался, подожди пожалуйста" }]);
        }
    }

    else if (status === "end") {
        const point = getUserPoint(state.users[chatId].answers), x = Math.round(point[0] * 100), y = Math.round(point[1] * 100);
        calls.push([chatId, 'sendMessage', { chat_id: chatId, text: messages.description, parse_mode: 'HTML' }]);
        // текст захардкожен, а не в settings.messages
        calls.push([chatId, 'sendMessage', { chat_id: chatId, text: `Твой результат на <b>${100 - x}%</b> за <b>Равенство</b> и на <b>${x}%</b> за <b>Рынки</b>, на <b>${100 - y}%</b> за <b>Власть</b> и на <b>${y}%</b> за <b>Свободу</b>`, parse_mode: 'HTML' }]);
        calls.push([chatId, 'sendPhoto', { chat_id: chatId, photo: `${publicUrlBase}${prefix}-img-data/${chatId}.png` }]);
    }

    // тут во всех ветках в конце идет вызов calls.push(
    // я бы его вынес из условий, а определение, какой текст показать — в отдельную fn

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

    // // lodash.forEach(updates, processUpdate) вместо for + счетчик (i)
    // // processUpdate — fn(update), вынести туда все внутренности цикла

    for (let i = 0; i < updates.result.length; i++) {
        const update = updates.result[i], chatId = update?.message?.chat?.id || update?.callback_query?.message?.chat?.id;
        state.lastUpdateId = Math.max(state.lastUpdateId, update.update_id);

        if (!chatId || chatId < 0) { continue; }

        // изначальное состояние для пользователя я бы вынес в отдельную константу вне этой fn
        // const INITIAL_USER_STATE = {...}, что-то такое

        // и лучше явно написать
        // if (!(chatId in state.users)) { state.users[chatId] = INITIAL_USER_STATE; }
        // сейчас ты каждый раз перезаписываешь state пользователя на точно такой же,
        // это и лишняя операция и смущает с точки зрения логики — непонятно, зачем
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

            // getStatus(state, adminChatId) !== state.adminStatus
            // не понял логику этого условия
            // если admin ответил на вопрос (= у него поменялся adminStatus?)
            if (chatId === adminChatId && getStatus(state, adminChatId) !== state.adminStatus) {
                calls.push(['', 'adminBroadcast']);
            }
        } catch (e) {
            console.error(JSON.stringify(e));
            doSendError(chatId, calls);
        }
    }
}

module.exports = { initialState, processUpdates, getQuestionMessage, getStatus, getResults, getIndivisualResults, getUserPoint };
