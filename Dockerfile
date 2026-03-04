FROM node:20-slim

# Instalar Chromium para generación de PDFs con Puppeteer
RUN apt-get update -qq && \
    apt-get install -y --no-install-recommends \
      chromium \
      ca-certificates \
      fonts-liberation \
      libnss3 \
      libatk-bridge2.0-0 \
      libgtk-3-0 \
    && rm -rf /var/lib/apt/lists/*

ENV PUPPETEER_SKIP_CHROMIUM_DOWNLOAD=true
ENV PUPPETEER_EXECUTABLE_PATH=/usr/bin/chromium
ENV NODE_ENV=production

WORKDIR /app

# Instalar dependencias primero (aprovecha cache de Docker)
COPY backend/package*.json ./
RUN npm ci

# Copiar código fuente del backend
COPY backend/ ./

# Generar cliente Prisma y compilar TypeScript
RUN npx prisma generate && npm run build

EXPOSE 3000

# Correr migraciones y levantar la app
CMD ["sh", "-c", "npx prisma migrate deploy && node dist/main"]
