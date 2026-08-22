FROM node:22-alpine

WORKDIR /app
COPY package*.json ./
RUN npm ci --omit=dev
COPY src ./src
COPY database ./database

ENV NODE_ENV=production
EXPOSE 5001
CMD ["node", "src/index.js"]
