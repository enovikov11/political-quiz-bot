/*
- много сообщений
- пригласили в группу
- пришло некорректное обновление
- два сообщения почти сразу
- пересланное сообщение
- что-то зависло
- сеть потеряна
- сеть флапает
- пустой текст
- Одно сообщение упало а другое нет
*/

const fs = require('fs');
const YAML = require('yaml');
const fetch = require('node-fetch');
const puppeteer = require('puppeteer');
const clusterPlot = require('cluster-plot');

const { questions, messages, buttons } = YAML.parse(fs.readFileSync('./quiz.yaml', 'utf8'));
const html = fs.readFileSync('./results.html', 'utf-8');
const messages_log_fd = fs.openSync('./messages.json.log', 'a');

const base_dir = "/var/www/html/";
const api_base = process.env.QUIZBOT_API_BASE || "https://api.telegram.org/"; // https://core.telegram.org/bots/api
const api_key = process.env.QUIZBOT_API_KEY;
const locale = 'ru';
const UPDATE_ERROR_WAIT = 100;
const UPDATE_MAX_ERRORS = 100;
const UPDATE_POLLING_INTERVAL = '60';
const REBUILD_RESULTS_INTERVAL = 1000;

let offset = 0;
let update_errors_count = 0;
let chats_chains = {};
let messages_chain = Promise.resolve();

let global_state = {
    users_count: 0,
    chats: {}
}

function log_message(object) {
    messages_chain.then(new Promise(res => {
        fs.appendFile(messages_log_fd, JSON.stringify(object) + '\n', res);
    }));
}

async function fetch_api(method, data) {
    log_message({ out: [method, data] });

    try {
        const result = await fetch(api_base + 'bot' + api_key + '/' + method, {
            method: 'POST',
            body: JSON.stringify(data),
            headers: { 'Content-Type': 'application/json' }
        }).then(res => res.json());

        if (!result.ok) {
            throw new Error('not ok');
        }

        return result;
    } catch (e) {
        const result = await fetch(api_base + 'bot' + api_key + '/' + method, {
            method: 'POST',
            body: JSON.stringify(data),
            headers: { 'Content-Type': 'application/json' }
        }).then(res => res.json());

        if (result.ok) {
            return result;
        }
    }
}

function chat_state(chat_id) {
    return {
        chat_id,
        is_first_message: true,
        current_question: 0,
        answers: new Array(questions.length).fill(0),
        random_mapper: new Array(questions.length).fill().map((_, i) => ({ random: Math.random(), i }))
            .sort((a, b) => a.random > b.random ? 1 : -1).map(({ i }) => i),
    };
}

async function on_update(state, { message, callback_query }) {
    async function send_welcome() {
        await fetch_api('sendMessage', {
            chat_id: state.chat_id,
            text: messages[locale].welcome
        });
    }

    async function confirm_callback(text) {
        await fetch_api('answerCallbackQuery', { callback_query_id: callback_query.id, text });
    }

    function make_question_text(number, answer) {
        const text = `${messages[locale].question} ${number + 1} ${messages[locale]['question from']} ${questions.length}: ${questions[state.random_mapper[number]].question[locale]}`;
        return answer === undefined ? text : text + `\n\n${messages[locale]['your answer']}: ${messages[locale][String(answer)]}`;
    }

    async function send_current_question_or_results({ show_restart_button = false } = {}) {
        if (state.current_question === questions.length) {
            await fetch_api('sendMessage', {
                chat_id: state.chat_id,
                text: "Тест пройден, спасибо"
            });
            return;
        }

        await fetch_api('sendMessage', {
            chat_id: state.chat_id,
            text: make_question_text(state.current_question),
            reply_markup: {
                inline_keyboard: [
                    ['-1', '-0.5', '0', '0.5', '1'].map(effect => ({ text: buttons[locale][effect], callback_data: state.current_question + "|" + effect })),
                    show_restart_button && [{ text: buttons[locale].restart, callback_data: 'restart' }]
                ].filter(Boolean)
            }
        });
    }

    async function edit_question(number, answer) {
        await fetch_api('editMessageText', {
            chat_id: state.chat_id,
            text: make_question_text(number, answer),
            message_id: callback_query?.message?.message_id,
            reply_markup: {
                inline_keyboard: [
                    ['-1', '-0.5', '0', '0.5', '1'].map(effect => ({ text: buttons[locale][effect], callback_data: number + "|" + effect })),
                ].filter(Boolean)
            }
        });
    }

    try {
        if (state.is_first_message || message?.text === '/start') {
            state.is_first_message = false;
            state.current_question = 0;
            await send_welcome(state);
            await send_current_question_or_results();
        }

        else if (message?.text) {
            await send_current_question_or_results({ show_restart_button: true });
        }

        else if (callback_query?.data === 'restart') {
            state.current_question = 0;
            await confirm_callback();
            await send_welcome(state);
            await send_current_question_or_results();
        }

        else if (/^\d+\|(-1|-0\.5|0|0\.5|1)$/.test(callback_query?.data || "")) {
            const [number, answer] = callback_query?.data.split('|', 2).map(n => +n);

            await confirm_callback();
            await edit_question(number, answer);
            state.answers[number] = answer;

            if (number === state.current_question) {
                state.current_question++;
                await send_current_question_or_results();
            }
        }
    } catch (e) {
        console.error(e);
        await fetch_api('sendMessage', { chat_id: state.chat_id, text: messages[locale].error });
    }
}

function calc_user({ answers, random_mapper, current_question }) {
    const result = {
        "more equality than markets": { value: 0, max: 0 },
        "more liberty than authority": { value: 0, max: 0 },
        "more progress than tradition": { value: 0, max: 0 },
        "more world than nation": { value: 0, max: 0 }
    }, count = Math.min(questions.length, current_question);

    for (let i = 0; i < count; i++) {
        const question = questions[random_mapper[i]];
        const answer = answers[i];

        result["more equality than markets"].value += answer * question["more equality than markets"];
        result["more equality than markets"].max += Math.abs(question["more equality than markets"]);

        result["more liberty than authority"].value += answer * question["more liberty than authority"];
        result["more liberty than authority"].max += Math.abs(question["more liberty than authority"]);

        result["more progress than tradition"].value += answer * question["more progress than tradition"];
        result["more progress than tradition"].max += Math.abs(question["more progress than tradition"]);

        result["more world than nation"].value += answer * question["more world than nation"];
        result["more world than nation"].max += Math.abs(question["more world than nation"]);
    }

    return result;
}

async function update(browser, data) {
    const clusters = clusterPlot(data), page = await browser.newPage();

    await page.setViewport({ width: 1920, height: 1080 });
    await page.setContent(html);
    await page.setViewport({ width: 1920, height: 1080 });
    await page.evaluate(async (clusters) => {
        document.querySelector('mask#quizresults').innerHTML = clusters.map(({ x, y, r }) => `<circle cx="${(x - 0.5) * 600}" cy="${(y - 0.5) * 600}" r="${r * 600}" fill="white" />`).join('');

        const divs = clusters.map(({ count, r, x, y }) => {
            const div = document.createElement('div');

            div.style.position = 'fixed';
            div.style.left = '0px';
            div.style.top = '0px';
            div.style.fontSize = '300px';
            div.innerText = count;
            document.body.appendChild(div);
            return { count, r, x, y, div };
        });

        await new Promise(res => setTimeout(res, 100));

        divs.map(({ count, r, x, y, div }) => {
            const { width, height } = div.getBoundingClientRect(), realDiagonal = Math.sqrt(width ** 2 + height ** 2),
                needDiagonal = 1200 * r, scale = needDiagonal / realDiagonal;
            div.style.fontSize = (300 * scale) + "px";
            div.style.left = (966 + (x - 0.5) * 600 - width * scale / 2) + "px";
            div.style.top = (519 + (y - 0.5) * 600 - height * scale / 2) + "px";
        });
    }, clusters);
    await page.screenshot({ path: base_dir + 'results.png', omitBackground: true });
    await page.close();
}

async function main() {
    const browser = await puppeteer.launch();

    try {
        global_state = JSON.parse(fs.readFileSync('./state.json.log', 'utf-8'));
    } catch (e) {
        console.error(e);
    }

    setInterval(() => {
        fs.writeFileSync('./state.json.log', JSON.stringify(global_state));

        const data = Object.values(global_state.chats).map(calc_user).map(
            result => {
                if (result["more equality than markets"].max === 0 || result["more liberty than authority"].max === 0) {
                    return null;
                }

                return [
                    (1 + -1 * result["more equality than markets"].value / result["more equality than markets"].max) / 2,
                    (1 + -1 * result["more liberty than authority"].value / result["more liberty than authority"].max) / 2
                ];
            }
        ).filter(Boolean);

        update(browser, data)

        // fs.writeFileSync('debug.temp.json', JSON.stringify({ global_state, data, results: Object.values(global_state.chats).map(calc_user) }));
    }, REBUILD_RESULTS_INTERVAL);

    if (questions.some(question => [
        "more equality than markets",
        "more liberty than authority",
        "more progress than tradition",
        "more world than nation"
    ].some(key => isNaN(question[key])))) {
        return;
    }

    while (true) {
        update_errors_count = 0;
        try {
            const updates_result = await fetch_api('getUpdates', {
                offset, timeout: UPDATE_POLLING_INTERVAL, allowed_updates: ['message', 'callback_query']
            });

            if (!updates_result.ok) {
                throw new Error(JSON.stringify(updates_result));
            }

            offset = Math.max(...updates_result.result.map(({ update_id }) => update_id)) + 1;

            for (let i = 0; i < updates_result.result.length; i++) {
                let update = updates_result.result[i];

                log_message({ in: update });

                let chat_id = update?.message?.chat?.id || update?.callback_query?.message?.chat?.id;
                if (!chat_id) {
                    console.error(JSON.stringify({ error: "bad_update", update }));
                }

                if (!chats_chains[chat_id]) {
                    chats_chains[chat_id] = Promise.resolve();
                }

                if (!global_state.chats[chat_id]) {
                    global_state.chats[chat_id] = chat_state(chat_id);
                    global_state.users_count++;
                }

                chats_chains[chat_id].then(on_update(global_state.chats[chat_id], update)).catch(console.error);
            }
        } catch (e) {
            console.error(e);
            update_errors_count++;
            if (update_errors_count > UPDATE_MAX_ERRORS) {
                return;
            }
            await new Promise(res => setTimeout(res, UPDATE_ERROR_WAIT));
        }
    }

    await browser.close();
}

main().catch(console.error)
    // Immideatly exit if main loop is broken, throwing away background promises
    .then(() => process.exit(1));