const sqlite = require('sqlite'), sqlite3 = require('sqlite3');
let db;

async function initStorage() {
    db = await sqlite.open({
        filename: './db.sqlite',
        driver: sqlite3.Database
    })
    await db.migrate({});
}

async function read(id) {
    const data = await db.get('SELECT json FROM Jsons WHERE id = ?', String(id));
    try {
        return JSON.parse(data.json);
    } catch (e) {
        return {};
    }
}

async function write(id, json) {
    const data = await db.get('SELECT json FROM Jsons WHERE id = ?', String(id));
    if (data) {
        await db.run('UPDATE Jsons SET json = ? WHERE id = ?', JSON.stringify(json), String(id));
    } else {
        await db.run('INSERT INTO Jsons (id, json) VALUES(?, ?)', String(id), JSON.stringify(json));
    }
}

async function dump() {
    const lines = await db.all('SELECT json FROM Jsons'), output = [];
    for (let i = 0; i < lines.length; i++) {
        try {
            output.push(JSON.parse(lines[i].json));
        } catch (e) { }
    }
    return output;
}

module.exports = { initStorage, read, write, dump };