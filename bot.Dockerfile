FROM node:14.15.3-buster
COPY ./bot /app
WORKDIR /app
RUN npm i
CMD npm start