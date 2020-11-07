const fs = require('fs');
const YAML = require('yaml');

const { questions } = YAML.parse(fs.readFileSync('./quiz.yaml', 'utf8'))
const api_base = process.env.QUIZBOT_API_BASE || "https://api.telegram.org/";
const locale = 'ru';
const UPDATE_ERROR_WAIT = 100;
const UPDATE_MAX_ERRORS = 100;


let offset = '0';
let update_errors_count = 0;

async function main() {
    while (true) {
        update_errors_count = 0;
        try {


        } catch (e) {
            console.error(e);
            update_errors_count++;
            if (update_errors_count > UPDATE_MAX_ERRORS) {
                return;
            }
            await new Promise(res => setTimeout(res, UPDATE_ERROR_WAIT));
        }
    }
}

// main().catch(console.error)
//     // Immideatly exit if main loop is broken, throwing away background promises
//     .then(() => process.exit(1));

console.log(JSON.stringify(questions))

// async function runMethod(name, params) {
//     const fetch_result = await fetch('https://api.telegram.org/bot' + key + '/' + name, {
//         method: 'POST',
//         body: JSON.stringify(params),
//         headers: { 'Content-Type': 'application/json' }
//     }).then(res => res.json());
//     const { result, ok } = fetch_result;
//     if (!ok) {
//         throw new Error(JSON.stringify(fetch_result));
//     }
//     return result;
// }

// function makePermulation(length) {
//     return new Array(length).fill(0).map((_, i) => ({ value: Math.random(), i }))
//         .sort((a, b) => a.value > b.value ? 1 : -1).map(({ i }) => i);
// }

// async function main() {
//     while (true) {
//         try {
//             const messages = await runMethod('getUpdates', { offset, timeout: '60' });
//             for (let message of messages) {
//                 if (!message.message) {
//                     continue;
//                 }
//                 try {
//                     offset = Math.max(+offset, +message.update_id + 1);

//                     if (message.message.text && message.message.chat && message.message.chat.id) {
//                         await runMethod('sendMessage', {
//                             chat_id: message.message.chat.id,
//                             text: message.message.text,
//                             reply_markup: {
//                                 inline_keyboard: [[{ text: "1", callback_data: "1" }, { text: "2", callback_data: "2" }, { text: "3", callback_data: "3" }], [{ text: "4", callback_data: "4" }, { text: "5", callback_data: "5" }]],
//                                 // resize_keyboard: true
//                             }
//                         });
//                     }
//                 } catch (e) {
//                     console.error(e);
//                 }
//             }
//         } catch (e) {
//             console.error(e);
//         }
//     }
// }
