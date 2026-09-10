FROM node:20-alpine AS builder

WORKDIR /app

COPY package*.json ./
RUN npm ci

COPY tsconfig.json .
COPY src ./src
RUN npm run build

FROM node:20-alpine

WORKDIR /app

COPY package*.json ./
RUN npm ci --only=production

COPY --from=builder /app/dist ./dist
COPY --from=builder /app/src/config ./dist/config

EXPOSE 3000

CMD ["sh", "-c", "node dist/config/applySchema.js || echo 'Schema migration warning (may already exist)' && node dist/index.js"]
