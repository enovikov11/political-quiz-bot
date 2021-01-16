const sharp = require('sharp'), express = require('express'), fs = require('fs'), cases = require('./demo-cases.json'),
 { state2buffer } = require('./image'), app = express();

app.use('/', async (req, res) => {
    const name = req.path.slice(1);
    if(name in cases) {
        let buffer = await state2buffer(cases[name]);

        buffer = await sharp('./demo-background.png').composite([{ input: buffer, blend: 'over' }]).toBuffer();

        res.set('Content-Type', 'image/png');
        res.send(buffer);
    } else {
        res.status(404);
        res.send();
    }
});

app.listen(80);