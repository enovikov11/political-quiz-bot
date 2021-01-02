# 8values
Based on https://github.com/8values/8values.github.io https://github.com/8values-ru/8values-ru.github.io

<code>
apt update<br/>
apt upgrade<br/>
apt install -y docker.io git<br/>
snap install --classic certbot<br/>
certbot certonly --standalone<br/>
git clone https://github.com/enovikov11/political-quiz-bot.git<br/>
cd political-quiz-bot<br/>
<br/>
docker build -t user-result --file user-result.Dockerfile .<br/>
<br/>
docker run -dit --rm -p 443:443 -v /etc/letsencrypt/live/YOURDOMAIN/privkey.pem:/letsencrypt/privkey.pem:ro -v /etc/letsencrypt/live/YOURDOMAIN/cert.pem:/letsencrypt/cert.pem:ro user-result<br/>
<br/>
docker build -t political-quiz-bot --file bot.Dockerfile .<br/>
<br/>
docker run -it --rm -p 443:443 -v /etc/letsencrypt/live/YOURDOMAIN/privkey.pem:/letsencrypt/privkey.pem:ro -v /etc/letsencrypt/live/YOURDOMAIN/cert.pem:/letsencrypt/cert.pem:ro -v /root/data:/app/data -v /root/secret.json:/app/secret.json political-quiz-bot<br/>
</code>