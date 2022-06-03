FROM node:16-alpine AS build
WORKDIR /app

COPY package.json ./
RUN yarn install

COPY . .
RUN yarn build

FROM node:16-alpine as prod
ARG BUILD_VERSION
WORKDIR /app

RUN apk add dumb-init
COPY ./package.json ./

RUN yarn install --production --ignore-optional

COPY --from=build /app/dist .

ENV NODE_ENV production
ENV NODE_PATH /app
ENV VERSION $BUILD_VERSION

ENTRYPOINT dumb-init node index.js
