FROM node:alpine

RUN apk add --no-cache bash curl


WORKDIR /app
COPY . /app

RUN npm install 

ENTRYPOINT [ "/bin/bash", "-c", "sleep infinity" ]
