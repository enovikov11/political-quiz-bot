# 8values
Based on https://github.com/8values/8values.github.io https://github.com/8values-ru/8values-ru.github.io

FIXME: make docker

apt update
apt upgrade
curl -o- https://raw.githubusercontent.com/nvm-sh/nvm/v0.37.0/install.sh | bash
nvm install 15.0.0
nvm use 15.0.0
apt install -y nginx tmux git build-essential g++ make
snap install core
snap refresh core
snap install --classic certbot
ln -s /snap/bin/certbot /usr/bin/certbot
certbot --nginx
reboot now
git clone https://github.com/enovikov11/political-quiz-bot.git
rm /var/www/html/index.nginx-debian.html
cp ./res/www-index.html /var/www/html/index.html
cp ./res/Jost-SemiBold.ttf /var/www/html/Jost-SemiBold.ttf

npm start

export QUIZBOT_API_KEY=""
export QUIZBOT_BASE_DIR="/var/www/html/"