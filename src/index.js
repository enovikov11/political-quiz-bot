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

        let calls = [];
        processUpdates(state, updates, calls);
        for (let i = 0; i < calls.length; i++) {
            if (calls[i][0] !== '') {
                if (calls[i][1] === 'sendPhoto') {
                    try {
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
