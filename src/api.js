const fetch = require('node-fetch'), queues = {}, { apiBase, apiKey } = require('./settings');

async function apiRaw(method, data, timeout = 2000, retries = 1) {
    const result = await fetch(`${apiBase}bot${apiKey}/${method}`, {
        method: 'POST', body: JSON.stringify(data), headers: { 'Content-Type': 'application/json' }, timeout, redirect: 'error'
    }).then(res => res.json()).catch(() => ({ ok: false }));

    if (result.ok) {
        return result;
    } else if (retries > 0) {
        await new Promise(res => setTimeout(res, 4000));
        return await apiRaw(method, data, retries - 1);
    } else {
        return { ok: false };
    }
}

function apiEnqueue(queue, method, data) {
    if (!queues[queue]) { queues[queue] = Promise.resolve(); }
    queues[queue].then(async () => {
        await apiRaw(method, data);
    });
}

module.exports = { apiRaw, apiEnqueue };