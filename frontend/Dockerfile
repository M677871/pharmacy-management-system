FROM node:20-alpine AS build
WORKDIR /app

ARG VITE_API_URL
ARG VITE_SOCKET_URL
ARG VITE_RTC_ICE_SERVERS
ENV VITE_API_URL=$VITE_API_URL
ENV VITE_SOCKET_URL=$VITE_SOCKET_URL
ENV VITE_RTC_ICE_SERVERS=$VITE_RTC_ICE_SERVERS

COPY package*.json ./
RUN npm ci

COPY . .
RUN test -n "$VITE_API_URL" && npm run build

FROM nginx:1.27-alpine AS runtime

COPY nginx.conf /etc/nginx/conf.d/default.conf
COPY --from=build /app/dist /usr/share/nginx/html

EXPOSE 80
