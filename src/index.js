const fs = require('fs'), lodash = require('lodash'),
    { stateFilename, adminChatId } = require('./settings'), { apiRaw, apiEnqueue } = require('./api'),
    { initialState, processUpdates, getQuestionMessage, getStatus, getResults, getIndivisualResults } = require('./logic'),
    { updateResults } = require('./results'), { results2buffer } = require('./pm-results');

let state = initialState();

try {
    state = JSON.parse(fs.readFileSync(stateFilename, 'utf-8'));
} catch (e) { }

function adminBroadcast() {
    state.adminStatus = getStatus(state, adminChatId);

    if (state.adminStatus !== "end") {
        for (let chatId in state.users) {
            // логику этого блока и в целом поля isActive я не понял :(
            if (!state.users[chatId].isActive) { continue; }
            state.users[chatId].isActive = false;

            const { text, reply_markup } = getQuestionMessage(state, chatId, state.adminStatus);
            apiEnqueue([chatId, 'sendMessage', { chat_id: +chatId, text, reply_markup }]);
        }
    }

    doUpdateResult();
}

function doUpdateResult() {
    updateResults(state, getResults(state));
}

const adminBroadcastDebounced = lodash.debounce(adminBroadcast, 10000, { maxWait: 10000, trailing: true }),
    doUpdateResultDebounced = lodash.debounce(doUpdateResult, 60000, { maxWait: 60000, trailing: true });

(async () => {
    doUpdateResult();
    while (true) {
        const updates = await apiRaw('getUpdates', {
            offset: state.lastUpdateId + 1, timeout: '30', allowed_updates: ['message', 'callback_query']
        }, 30000);

        // лучше calls создавать внутри processUpdates и возвращать оттуда
        // т.е. будет const calls = processUpdates(state, updates, calls);
        // и это нам явно говорит, что calls после processUpdates read only
        let calls = [];
        processUpdates(state, updates, calls);
        // также структуру calls лучше поменять и внутри хранить object, а не массив
        // вроде {chatId: XXX, method: XXX, params: XXX}

        // и также лучше lodash.forEach(calls, processCall)
        for (let i = 0; i < calls.length; i++) {
            // тогда тут будет if (call.chatId !== ''), что более информативно
            if (calls[i][0] !== '') {
                if (calls[i][1] === 'sendPhoto') {
                    try {
                        // это, скорее всего, тяжелая операция и её стоит
                        // вынести в какой-то отдельный процесс, который в идеале
                        // еще может параллелиться.
                        // например, отдавать не картинку сразу в телеграм, а ссылку на
                        // картинку, телеграм превью фетчер будет её дергать и показывать.
                        // а в телеграм отправить инструкцию "сейчас я пришлю вам ссылку, она может не сразу открыться, подождите"
                        // правда тут нужно будет очень аккуратно делать реализацию + кеширование, чтобы по несколько раз
                        // не рендерить. ну и не так удобно

                        // более сложный, но удобный вариант — отправлять также в телеграм фоткой, но сам процесс
                        // генерации вынести из этого cpu process. варианты реализации разные, от отдельного
                        // потока обработки (если честно не знаю что у node.js с асинхронностью и тредами, но
                        // наверное они есть), до какого-то внешнего сервиса очередей (rabbit mq, например)
                        // и обработчика.
                        results2buffer(getIndivisualResults(state, calls[i][2].chat_id), calls[i][2].chat_id).then(() => apiEnqueue(calls[i]))
                    } catch (e) {
                        console.error(e)
                    }

                } else {
                    apiEnqueue(calls[i])
                }
            } else if (calls[i][1] === "adminBroadcast") {
                // if (state.adminStatus === 'start') {
                //     adminBroadcast();
                // } else {
                //     adminBroadcastDebounced();
                // }
            }
        }
        if (updates.ok && updates?.result?.length > 0) {
            doUpdateResultDebounced();
        }
    }
    process.exit(0);
})().catch(console.error);
