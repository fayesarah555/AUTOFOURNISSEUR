FROM node:20-alpine AS base

WORKDIR /app

# Install dependencies separately to leverage Docker cache
COPY package*.json ./
RUN npm ci --omit=dev

# Copy application source
COPY . .

# Ensure runtime folders exist for uploads/documents
RUN mkdir -p public/tariffs tmp/uploads

ENV NODE_ENV=production \
    PORT=8080

EXPOSE 8080

CMD ["node", "index.js"]
