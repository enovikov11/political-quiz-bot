# 8values
Based on https://github.com/8values/8values.github.io https://github.com/8values-ru/8values-ru.github.io

<code>
apt update<br/>
apt upgrade<br/>
apt install -y docker.io git<br/>
snap install --classic certbot<br/>
certbot certonly --standalone<br/>
git clone https://github.com/enovikov11/political-quiz-bot.git<br/>

docker build -t user-result --file user-result.Dockerfile .<br/>

docker run -dit --rm -p 443:443 -v /etc/letsencrypt/live/somedomain:/letsencrypt:ro -v /root/political-quiz-bot/data:/app/data --name political-quiz-bot political-quiz-bot

</code>




