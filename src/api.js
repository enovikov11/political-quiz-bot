const fetch = require('node-fetch'), queues = {}, { apiBase, apiKey, apiLogFilename } = require('./settings'),
    fs = require('fs'), fd = fs.openSync(apiLogFilename, 'a');

async function apiRaw(method, data, timeout = 2000, retries = 1) {
    if (method === 'wait') {
        await new Promise(res => setTimeout(res, 300));
        return {};
    }

    const reqId = Date.now() + Math.random();

    fs.appendFile(fd, JSON.stringify({ reqId, requestMethod: method, requestData: data }) + '\n', () => { });

    const response = await fetch(`${apiBase}bot${apiKey}/${method}`, {
        method: 'POST', body: JSON.stringify(data), headers: { 'Content-Type': 'application/json' }, timeout, redirect: 'error'
    }).then(res => res.json()).catch(() => ({ ok: false }));

    fs.appendFile(fd, JSON.stringify({ reqId, response }) + '\n', () => { });

    if (response.ok) {
        return response;
    } else if (retries > 0) {
        await new Promise(res => setTimeout(res, 4000));
        return await apiRaw(method, data, timeout, retries - 1);
    } else {
        return { ok: false };
    }
}

function apiEnqueue([queue, method, data]) {
    if (!queues[queue]) { queues[queue] = Promise.resolve(); }
    queues[queue] = queues[queue].then(async () => {
        await apiRaw(method, data);
    });
}

module.exports = { apiRaw, apiEnqueue };