FROM node:alpine

# Used to associate the image with a source repository outside GHA
LABEL org.opencontainers.image.source=https://github.com/slaclab/coactui

WORKDIR /app
COPY . /app

RUN npm install react-scripts \
  && npm install  \
  && npm run build \
  && npm install -g serve

ENTRYPOINT [ "serve", "-s", "build" ]
