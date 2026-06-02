FROM node:22-alpine AS build

WORKDIR /app

COPY package.json tsconfig.json ./
RUN npm install

COPY src ./src
RUN npm run build && npm prune --omit=dev

FROM node:22-alpine

ENV NODE_ENV=production

RUN apk add --no-cache wget \
  && addgroup -S app \
  && adduser -S -G app app

WORKDIR /app

COPY --from=build /app/node_modules ./node_modules
COPY --from=build /app/dist ./dist
COPY package.json ./

USER app

EXPOSE 8080

CMD ["node", "dist/index.js"]

