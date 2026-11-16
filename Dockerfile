# ==============================================================================
# ETAPA 1: Dependencias y Compilación (Builder Stage)
# ==============================================================================
FROM node:20-alpine AS builder

WORKDIR /usr/src/app

RUN apk add --no-cache libc6-compat

# Copiar manifiestos de dependencias
COPY package*.json tsconfig.json ./

# Instalación limpia de dependencias (incluye devDependencies para compilar)
RUN npm ci

# Copiar código fuente
COPY src/ ./src/

# Compilar TypeScript a JavaScript y copiar esquema SQL
RUN npm run build && \
    mkdir -p dist/infrastructure/db && \
    cp src/infrastructure/db/schema.sql dist/infrastructure/db/schema.sql

# Podar dependencias de desarrollo para producción
RUN npm prune --production

# ==============================================================================
# ETAPA 2: Entorno de Ejecución Seguro (Production Runner Stage)
# ==============================================================================
FROM node:20-alpine AS runner

WORKDIR /usr/src/app

ENV NODE_ENV=production
ENV PORT=3000
ENV HOST=0.0.0.0

# Usuario no-root por seguridad (Principle of Least Privilege - RNF-05)
RUN addgroup --system --gid 1001 nodejs && \
    adduser --system --uid 1001 printops -G nodejs

# Copiar dependencias de producción, artefactos compilados y frontend
COPY --from=builder --chown=printops:nodejs /usr/src/app/node_modules ./node_modules
COPY --from=builder --chown=printops:nodejs /usr/src/app/dist ./dist
COPY --chown=printops:nodejs public/ ./public/
COPY --chown=printops:nodejs package.json ./

USER printops

EXPOSE 3000

HEALTHCHECK --interval=10s --timeout=5s --start-period=5s --retries=3 \
  CMD wget --no-verbose --tries=1 --spider http://127.0.0.1:3000/health || exit 1

CMD ["node", "dist/server.js"]
