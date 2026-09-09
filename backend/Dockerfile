FROM node:20-alpine AS base

# Instalar FFmpeg y dependencias del sistema
RUN apk add --no-cache \
    ffmpeg \
    python3 \
    make \
    g++ \
    && rm -rf /var/cache/apk/*

WORKDIR /app

# ====================================
# DEPENDENCIAS
# ====================================
FROM base AS deps
COPY package.json ./
RUN npm install --omit=dev && npm cache clean --force

# ====================================
# PRODUCCIÓN
# ====================================
FROM base AS production

WORKDIR /app

COPY --from=deps /app/node_modules ./node_modules
COPY . .

# Generar cliente Prisma
RUN npx prisma generate

# Crear directorios necesarios
RUN mkdir -p uploads streams posters logs && \
    chmod 755 uploads streams posters logs

# Usuario no-root para seguridad
RUN addgroup -g 1001 -S nodejs && \
    adduser -S mjmovies -u 1001 -G nodejs && \
    chown -R mjmovies:nodejs /app

USER mjmovies

EXPOSE 5000

HEALTHCHECK --interval=30s --timeout=10s --start-period=40s --retries=3 \
    CMD wget -qO- http://localhost:5000/api/health || exit 1

CMD ["node", "src/server.js"]
