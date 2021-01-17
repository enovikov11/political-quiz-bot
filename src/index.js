const fs = require('fs'), lodash = require('lodash'),
    { stateFilename, adminChatId } = require('./settings'), { apiRaw, apiEnqueue } = require('./api'),
    { initialState, processUpdates, getQuestionMessage, getStatus } = require('./logic');

let state = initialState();

try {
    state = JSON.parse(fs.readFileSync(stateFilename, 'utf-8'));
} catch (e) { }

function adminBroadcast() {
    state.adminStatus = getStatus(state, adminChatId);

    for (let chatId in state.users) {
        if (!state.users[chatId].isActive) { continue; }
        state.users[chatId].isActive = false;

        const { text, reply_markup } = getQuestionMessage(state, chatId, state.adminStatus);
        apiEnqueue([chatId, 'sendMessage', { chat_id: +chatId, text, reply_markup }]);
    }
}

const adminBroadcastThrottled = lodash.debounce(adminBroadcast, 10000, { maxWait: 10000, trailing: true });

(async () => {
    while (true) {
        const updates = await apiRaw('getUpdates', {
            offset: state.lastUpdateId + 1, timeout: '30', allowed_updates: ['message', 'callback_query']
        }, 30000);

        let calls = [];
        processUpdates(state, updates, calls);
        for (let i = 0; i < calls.length; i++) {
            if (calls[i][0] !== '') {
                apiEnqueue(calls[i]);
            } else if (calls[i][1] === "adminBroadcast") {
                if (state.adminStatus === 'start') {
                    adminBroadcast();
                } else {
                    adminBroadcastThrottled();
                }
            }
        }

    }
})().catch(console.error);

