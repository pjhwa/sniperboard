FROM node:20-alpine AS builder

ARG BACKEND_URL=http://localhost:5001
ENV BACKEND_URL=$BACKEND_URL

WORKDIR /app
COPY package*.json ./
RUN npm ci

COPY . .
RUN npm run build

FROM node:20-alpine
WORKDIR /app
COPY --from=builder /app ./
EXPOSE 3000
CMD ["npm", "start"]