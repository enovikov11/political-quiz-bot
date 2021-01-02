FROM node:14.15.3-buster
WORKDIR /app
COPY ./package.json /app
COPY ./package-lock.json /app
RUN mkdir /app/results
RUN npm i
COPY . /app
CMD npm start