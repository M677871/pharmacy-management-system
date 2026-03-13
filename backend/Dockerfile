FROM node:20-bookworm-slim AS deps
WORKDIR /app

COPY package*.json ./
RUN npm ci

FROM deps AS build
WORKDIR /app

COPY . .
RUN npm run build

FROM node:20-bookworm-slim AS runtime
WORKDIR /app

ENV NODE_ENV=production

COPY package*.json ./
RUN npm ci --omit=dev

COPY --from=build /app/dist ./dist

EXPOSE 3000

CMD ["npm", "run", "start:prod"]
