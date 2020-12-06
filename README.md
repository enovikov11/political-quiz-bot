# 8values
Based on https://github.com/8values/8values.github.io https://github.com/8values-ru/8values-ru.github.io

FIXME: make docker


apt update
apt upgrade
curl -o- https://raw.githubusercontent.com/nvm-sh/nvm/v0.37.0/install.sh | bash
nvm install 15.0.0
nvm use 15.0.0
apt install -y nginx tmux git libvips-dev build-essential g++ make
apt install -y libpangocairo-1.0-0 libx11-xcb1 libxcomposite1 libxcursor1 libxdamage1 libxi6 libxtst6 libnss3 libcups2 libxss1 libxrandr2 libasound2 libatk1.0-0 libgtk-3-0

apt install -y gconf-service libasound2 libatk1.0-0 libatk-bridge2.0-0 libc6 libcairo2 libcups2 libdbus-1-3 libexpat1 libfontconfig1 libgcc1 libgconf-2-4 libgdk-pixbuf2.0-0 libglib2.0-0 libgtk-3-0 libnspr4 libpango-1.0-0 libpangocairo-1.0-0 libstdc++6 libx11-6 libx11-xcb1 libxcb1 libxcomposite1 libxcursor1 libxdamage1 libxext6 libxfixes3 libxi6 libxrandr2 libxrender1 libxss1 libxtst6 ca-certificates fonts-liberation libappindicator1 libnss3 lsb-release xdg-utils wget

apt-get install libgbm1

reboot now

git clone git@github.com:enovikov11/political-quiz-bot.git