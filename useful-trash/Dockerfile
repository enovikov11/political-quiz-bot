FROM node:14.15.3-buster
WORKDIR /app
COPY ./package.json /app/package.json
RUN npm i
COPY ./Jost-SemiBold.ttf /usr/share/fonts/Jost-SemiBold.ttf
RUN chmod 644 /usr/share/fonts/Jost-SemiBold.ttf
COPY . /app
CMD npm start