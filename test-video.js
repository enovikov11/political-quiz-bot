const base_dir = "/var/www/html/";

const sharp = require('sharp');
const fs = require('fs');

fs.writeFileSync(base_dir + 'index.html', `<!DOCTYPE html>
<html lang="en">

<head>
    <meta charset="utf-8" />
    <style>
        body {
            margin: 0
        }
    </style>
</head>

<body>
    <canvas></canvas>
    <script>
        const canvas = document.querySelector('canvas'), ctx = canvas.getContext('2d');;

        function draw() {
            const img = new Image();
            img.src = 'results.png?' + Math.random();
            img.onload = () => {
                canvas.width = img.width;
                canvas.height = img.height;
                ctx.drawImage(img, 0.5, 0.5);
            }
        }

        setInterval(draw, 5000);
        draw();
    </script>

</body>

</html>`);

const data = require('./test-data.json')
const points2svg = require('./lib');

async function main() {
    while (true) {
        for (let i = 0; i < data.length; i++) {
            await sharp(Buffer.from(points2svg(data[i]))).png().toFile(base_dir + 'results.png');
            await new Promise(res => setTimeout(res, 10000));
        }
    }
}

main().catch(console.error);