FROM node:14.15.3-buster
WORKDIR /app
COPY ./package.json /app/package.json
RUN npm i
COPY . /app
CMD npm start