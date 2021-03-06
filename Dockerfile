# Build Stage
FROM node:12.16.1 AS build

# Environment
WORKDIR /app

# Dependencies
RUN apt-get update && apt-get install -y \
    build-essential \
    libgl1-mesa-dri \
    libglapi-mesa \
    libosmesa6 \
    mesa-utils \
    xvfb \
    && apt-get clean

ADD https://github.com/Yelp/dumb-init/releases/download/v1.2.2/dumb-init_1.2.2_amd64 /usr/bin/dumb-init
RUN chmod 0777 /usr/bin/dumb-init

COPY package*.json ./
COPY tsconfig*.json ./
COPY nest*.json ./
COPY src/ ./

RUN npm i
RUN npm install --only=dev

# Build
RUN npm run build

# Prod Stage
FROM build AS prod

WORKDIR /app

ARG NODE_ENV=development
ENV NODE_ENV=${NODE_ENV}

USER node

CMD xvfb-run -s "-ac -screen 0 400x400x24" node dist/main.js
