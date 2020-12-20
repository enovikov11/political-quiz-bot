FROM node:14.15.3-buster
RUN apt update
RUN apt install -y libnss3 libatk1.0-0 libatk-bridge2.0-0 libcups2 libgbm1 libasound2 libpangocairo-1.0-0 libxss1 libgtk-3-0 libx11-xcb1
WORKDIR /app
COPY ./package.json /app
COPY ./package-lock.json /app
RUN mkdir /app/results
RUN npm i
COPY . /app
CMD npm start