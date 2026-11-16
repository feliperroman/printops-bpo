# **06 — Arquitectura Cloud, Docker Multi-Stage, CI/CD y Terraform (Bloque 4)**

Especificación técnica de arquitectura e infraestructura para **PrintOps BPO**. Este documento traslada los requerimientos funcionales (`RF-01` a `RF-07`) y no funcionales (`RNF-01` a `RNF-05`) a un diseño de software e infraestructura reproducible en la nube, optimizado bajo la **estrategia \$0 con emulación local (D-005)** y alineado con los estándares del programa **Estud-IA 2026 (Capa 2: Nube e Infraestructura)**.

---

# **1. Principios de Diseño y Separación de Capas**

La arquitectura de PrintOps BPO sigue una separación estricta de responsabilidades (*Separation of Concerns*) para garantizar alta concurrencia, latencias predecibles y protección financiera contra el consumo desmedido de tokens:

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                            CLIENTES Y CONSUMIDORES                          │
│               Portal Web / Formulario 3D / Clientes BPO / Webhooks          │
└──────────────────────────────────────┬──────────────────────────────────────┘
                                       │ HTTP POST / JSON
                                       ▼
┌─────────────────────────────────────────────────────────────────────────────┐
│                   CAPA 1: PUERTA DE ENTRADA (GATEWAY & SECURITY)            │
│  • Fastify HTTP Engine (< 10 ms overhead)                                   │
│  • Rate Limiting en memoria / IP Guard                                      │
│  • Validador Estricto de Esquema (Zod / JSON Schema) — RNF-01 (< 200 ms)    │
│  • Zero-Waste Filter (Rechazo inmediato INCOMPLETE_REJECTED_TIER_1)        │
└──────────────────────┬───────────────────────────────────────┬──────────────┘
                       │ Pasa Filtro Inicial                   │ Incompleto
                       ▼                                       ▼
┌──────────────────────────────────────────────┐ ┌────────────────────────────┐
│      CAPA 2: MOTOR DE REGLAS DETERMINISTAS   │ │ RESPUESTA INMEDIATA HTTP 400│
│  • Perfiles de Máquina (Gran Formato vs Std) │ │ 0 Tokens de IA consumidos  │
│  • Clasificación Dimensional: Verde/Amar./Rojo│ └────────────────────────────┘
│  • Matriz Térmica & Material Swap (PLA->PETG)│
│  • Costeo Determinista (Aislamiento Inyección)│
└──────────────┬───────────────────────────────┘
               │
       ┌───────┴───────────────────────────────┐
       │                                       │
       ▼ (Requiere IA / Diagnóstico)           ▼ (Escala a Humano / Borde)
┌───────────────────────────────┐ ┌───────────────────────────────────────────┐
│ CAPA 3: AGENTE IA (TIER 1)    │ │ CAPA 4: ENRUTAMIENTO BPO & CONCURRENCIA   │
│ • Google Gemini Flash API     │ │ • Redis 7 / Dragonfly (En memoria)        │
│ • Diagnóstico Fallos Semántico│ │ • Colas de Prioridad Atómica (P1 > P2 > P3)│
│ • Circuit Breaker / Timeout 10s││ • Locks de Concurrencia & TTL 30 min      │
│ • Fallback Determinista Local │ │ • Máquina a MAINTENANCE_LOCKED ante P1    │
└──────────────┬────────────────┘ └─────────────────────┬─────────────────────┘
               │                                        │
               └───────────────────┬────────────────────┘
                                   ▼
┌─────────────────────────────────────────────────────────────────────────────┐
│                     CAPA 5: PERSISTENCIA Y TRAZABILIDAD (AUDITORÍA)         │
│  • PostgreSQL 16: Trazabilidad de Tickets, Eventos de Cambio de Estado y SLAs│
│  • LocalStack / AWS Cloud Infrastructure:                                   │
│      - S3 Bucket: Archivos STL, mallas 3D y resúmenes ejecutivos             │
│      - SQS FIFO: Desacople de eventos de escalamiento                       │
│      - CloudWatch: Monitoreo de latencia y alarma SLA_BREACH_RISK           │
└─────────────────────────────────────────────────────────────────────────────┘
```

### **1.1 Justificación Técnica de Componentes (No por moda, sino por RNF)**
1. **Fastify en lugar de Express:** Reduce la sobrecarga de routing y serialización de JSON a menos de $10\text{ ms}$, permitiendo cumplir el **RNF-01** ($< 200\text{ ms}$ en la puerta de entrada).
2. **TypeScript Estricto (`strict: true`):** Garantiza que las magnitudes físicas (dimensiones, gramos, horas, tarifas) sean verificadas en tiempo de compilación, eliminando fallos en tiempo de ejecución.
3. **Redis para Estados y Colas (RNF-02):** La asignación concurrente de tickets $P1$ requiere operaciones atómicas (`ZPOPMAX` / transacciones `MULTI/EXEC`) para evitar que dos operadores tomen el mismo caso crítico en paralelo. Los TTLs nativos controlan el cierre automático de sesión de operadores tras 30 minutos sin heartbeat.
4. **PostgreSQL Relacional (RNF-04):** Garantiza auditoría transaccional con integridad referencial (tickets, historiales de transición, snapshots de cotización y métricas de SLA).
5. **Aislamiento Determinista contra Prompt Injection:** El LLM (Gemini) jamás computa tarifas ni clasifica zonas dimensionales. El precio se computa en TypeScript con la fórmula `(Gramos * Tarifa) + (Horas * $3.000) + $9.000 COP`.

---

# **2. Diseño de Contenedores: Docker Multi-Stage**

Para garantizar portabilidad, superficie de ataque mínima y despliegue ligero sin herramientas de compilación en producción (**RNF-05**), se define un `Dockerfile` multi-etapa:

### **2.1 Estructura del `Dockerfile` Multi-Stage**

```dockerfile
# ==============================================================================
# ETAPA 1: Dependencias y Compilación (Builder Stage)
# ==============================================================================
FROM node:20-alpine AS builder

WORKDIR /usr/src/app

# Instalar herramientas para compilar dependencias nativas si se requieren
RUN apk add --no-cache libc6-compat

# Copiar manifiestos de dependencias
COPY package*.json tsconfig.json ./

# Instalación limpia de dependencias (incluyendo devDependencies para compilar)
RUN npm ci

# Copiar código fuente
COPY src/ ./src/

# Compilación TypeScript a JavaScript optimizado (dist/)
RUN npm run build

# Podar dependencias de desarrollo para dejar solo las de producción
RUN npm prune --production

# ==============================================================================
# ETAPA 2: Entorno de Ejecución Seguro (Production Runner Stage)
# ==============================================================================
FROM node:20-alpine AS runner

WORKDIR /usr/src/app

# Configurar entorno de producción
ENV NODE_ENV=production
ENV PORT=3000

# Añadir usuario no-root para seguridad estricta (Principle of Least Privilege)
RUN addgroup --system --gid 1001 nodejs && \
    adduser --system --uid 1001 printops -G nodejs

# Copiar dependencias de producción ya podadas
COPY --from=builder --chown=printops:nodejs /usr/src/app/node_modules ./node_modules

# Copiar artefactos compilados
COPY --from=builder --chown=printops:nodejs /usr/src/app/dist ./dist
COPY --chown=printops:nodejs package.json ./

# Cambiar a usuario sin privilegios
USER printops

# Exponer puerto de servicio
EXPOSE 3000

# Verificación de salud nativa del contenedor (Healthcheck)
HEALTHCHECK --interval=30s --timeout=5s --start-period=5s --retries=3 \
  CMD wget --no-verbose --tries=1 --spider http://localhost:3000/health || exit 1

# Comando de arranque del servidor compilado
CMD ["node", "dist/server.js"]
```

### **2.2 Orquestación Local con `docker-compose.yml`**

Permite ejecutar todo el ecosistema de producción en local de forma autónoma (\$0 Cloud):

```yaml
version: '3.8'

services:
  app:
    build:
      context: .
      target: runner
    container_name: printops-bpo-api
    ports:
      - "3000:3000"
    environment:
      - NODE_ENV=production
      - PORT=3000
      - DATABASE_URL=postgresql://printops_user:printops_secret@postgres:5432/printops_bpo?schema=public
      - REDIS_URL=redis://redis:6379
      - AWS_ENDPOINT=http://localstack:4566
      - AWS_REGION=us-east-1
      - AWS_ACCESS_KEY_ID=test
      - AWS_SECRET_ACCESS_KEY=test
      - S3_BUCKET_NAME=printops-stl-artifacts-dev
      - GEMINI_API_KEY=${GEMINI_API_KEY:-mock-dev-key}
    depends_on:
      postgres:
        condition: service_healthy
      redis:
        condition: service_healthy
      localstack:
        condition: service_started
    networks:
      - printops-net

  postgres:
    image: postgres:16-alpine
    container_name: printops-postgres
    ports:
      - "5432:5432"
    environment:
      - POSTGRES_USER=printops_user
      - POSTGRES_PASSWORD=printops_secret
      - POSTGRES_DB=printops_bpo
    volumes:
      - postgres_data:/var/lib/postgresql/data
    healthcheck:
      test: ["CMD-SHELL", "pg_isready -U printops_user -d printops_bpo"]
      interval: 5s
      timeout: 5s
      retries: 5
    networks:
      - printops-net

  redis:
    image: redis:7-alpine
    container_name: printops-redis
    ports:
      - "6379:6379"
    command: ["redis-server", "--appendonly", "yes"]
    volumes:
      - redis_data:/data
    healthcheck:
      test: ["CMD", "redis-cli", "ping"]
      interval: 5s
      timeout: 5s
      retries: 5
    networks:
      - printops-net

  localstack:
    image: localstack/localstack:3.0
    container_name: printops-localstack
    ports:
      - "4566:4566"
    environment:
      - SERVICES=s3,sqs,cloudwatch
      - AWS_DEFAULT_REGION=us-east-1
    volumes:
      - localstack_data:/var/lib/localstack
    networks:
      - printops-net

volumes:
  postgres_data:
  redis_data:
  localstack_data:

networks:
  printops-net:
    driver: bridge
```

---

# **3. Pipeline de Integración y Entrega Continua (GitHub Actions CI/CD)**

Ubicado en [`.github/workflows/ci.yml`](file:///c:/Users/USUARIO/Desktop/printops-bpo/.github/workflows/ci.yml), el pipeline implementa 4 compuertas de calidad obligatorias que se ejecutan en cada *pull request* y *push* a la rama `main`:

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                       GITHUB ACTIONS CI/CD WORKFLOW                         │
└──────────────────────────────────────┬──────────────────────────────────────┘
                                       │ Push / PR en main
                                       ▼
┌─────────────────────────────────────────────────────────────────────────────┐
│ COMPUERTA 1: LINT & TYPECHECK                                               │
│ • ESLint para estándares de código y seguridad                              │
│ • TypeScript Compiler (tsc --noEmit) para verificación estricta de tipos    │
└──────────────────────────────────────┬──────────────────────────────────────┘
                                       │ Pasa
                                       ▼
┌─────────────────────────────────────────────────────────────────────────────┐
│ COMPUERTA 2: TEST SUITE & VALIDACIÓN MATEMÁTICA DE LOS 5 KPIS              │
│ • Ejecución de Vitest/Jest con servicios en background (Postgres & Redis)  │
│ • Test de Integración contra `docs/evidence/seed-tickets-30.json`           │
│   - KPI-01: Deflexión Tier 1 >= 66.7% (23/30 comprobado)                    │
│   - KPI-02: Precisión de reglas físicas y swaps térmicos = 100%             │
│   - KPI-03: Latencia Gateway en TCK-029 < 200 ms                            │
│   - KPI-04: Consumo de tokens en incompletos = 0 tokens                     │
│   - KPI-05: Despacho atómico en cola P1 < 2 s                               │
└──────────────────────────────────────┬──────────────────────────────────────┘
                                       │ Pasa
                                       ▼
┌─────────────────────────────────────────────────────────────────────────────┐
│ COMPUERTA 3: DOCKER MULTI-STAGE BUILD & HEALTHCHECK TEST                   │
│ • Build de la imagen Docker de producción (target: runner)                  │
│ • Inspección de tamaño de imagen (< 150 MB meta) y usuario no-root          │
│ • Verificación de /health en contenedor efímero                             │
└──────────────────────────────────────┬──────────────────────────────────────┘
                                       │ Pasa
                                       ▼
┌─────────────────────────────────────────────────────────────────────────────┐
│ COMPUERTA 4: TERRAFORM IAC VALIDATION & LOCALSTACK DEPLOY                  │
│ • terraform fmt -check & terraform validate                                 │
│ • Despliegue emulado en LocalStack (S3, SQS, CloudWatch)                     │
│ • Verificación de creación de recursos e idoneidad de alarmas               │
└─────────────────────────────────────────────────────────────────────────────┘
```

### **3.1 Especificación del Archivo `.github/workflows/ci.yml`**

```yaml
name: PrintOps BPO - CI/CD Pipeline

on:
  push:
    branches: [ main, develop ]
  pull_request:
    branches: [ main ]

jobs:
  code-quality:
    name: 1. Lint & Typecheck
    runs-on: ubuntu-latest
    steps:
      - name: Checkout Code
        uses: actions/checkout@v4

      - name: Setup Node.js
        uses: actions/setup-node@v4
        with:
          node-version: 20
          cache: 'npm'

      - name: Install Dependencies
        run: npm ci

      - name: TypeScript Static Typecheck
        run: npx tsc --noEmit

  kpi-verification:
    name: 2. KPI Mathematical Validation (30 Tickets)
    needs: code-quality
    runs-on: ubuntu-latest
    services:
      postgres:
        image: postgres:16-alpine
        env:
          POSTGRES_USER: printops_user
          POSTGRES_PASSWORD: printops_secret
          POSTGRES_DB: printops_test
        ports:
          - 5432:5432
        options: >-
          --health-cmd pg_isready
          --health-interval 5s
          --health-timeout 5s
          --health-retries 5
      redis:
        image: redis:7-alpine
        ports:
          - 6379:6379
        options: >-
          --health-cmd "redis-cli ping"
          --health-interval 5s
          --health-timeout 5s
          --health-retries 5

    steps:
      - name: Checkout Code
        uses: actions/checkout@v4

      - name: Setup Node.js
        uses: actions/setup-node@v4
        with:
          node-version: 20
          cache: 'npm'

      - name: Install Dependencies
        run: npm ci

      - name: Run Test Suite against seed-tickets-30.json
        env:
          DATABASE_URL: postgresql://printops_user:printops_secret@localhost:5432/printops_test
          REDIS_URL: redis://localhost:6379
          SEED_FILE_PATH: docs/evidence/seed-tickets-30.json
        run: npm test -- --coverage

  docker-build:
    name: 3. Docker Multi-Stage Build & Security
    needs: kpi-verification
    runs-on: ubuntu-latest
    steps:
      - name: Checkout Code
        uses: actions/checkout@v4

      - name: Set up Docker Buildx
        uses: docker/setup-buildx-action@v3

      - name: Build Production Image
        uses: docker/build-push-action@v5
        with:
          context: .
          target: runner
          load: true
          tags: printops-bpo:ci

      - name: Test Container Healthcheck
        run: |
          docker run -d --name test-app -p 3000:3000 \
            -e DATABASE_URL=postgresql://mock:mock@mock:5432/mock \
            -e REDIS_URL=redis://mock:6379 \
            printops-bpo:ci
          sleep 5
          docker inspect --format='{{json .State.Health.Status}}' test-app || true

  terraform-localstack:
    name: 4. Terraform IaC Validation
    needs: code-quality
    runs-on: ubuntu-latest
    services:
      localstack:
        image: localstack/localstack:3.0
        ports:
          - 4566:4566
        env:
          SERVICES: s3,sqs,cloudwatch

    steps:
      - name: Checkout Code
        uses: actions/checkout@v4

      - name: Setup Terraform
        uses: hashicorp/setup-terraform@v3
        with:
          terraform_version: 1.7.0

      - name: Terraform Format Check
        run: terraform -chdir=terraform fmt -check

      - name: Terraform Init
        run: terraform -chdir=terraform init

      - name: Terraform Validate
        run: terraform -chdir=terraform validate

      - name: Terraform Apply against LocalStack
        env:
          AWS_ACCESS_KEY_ID: mock_key
          AWS_SECRET_ACCESS_KEY: mock_secret
          AWS_DEFAULT_REGION: us-east-1
        run: terraform -chdir=terraform apply -auto-approve
```

---

# **4. Infraestructura como Código (IaC con Terraform — D-005)**

La infraestructura Cloud se declara de forma declarativa y reproducible en el directorio `terraform/`. Se configuran los servicios para soportar tanto emulación \$0 con LocalStack como despliegue real en AWS.

### **4.1 Estructura del Módulo Terraform**

```
terraform/
├── main.tf          # Configuración del Provider AWS y endpoints de LocalStack
├── variables.tf     # Variables de parametrización (entorno, prefijos, puertos)
├── s3.tf            # Almacenamiento seguro de modelos STL, G-Codes y resúmenes
├── sqs.tf           # Colas de desacople y escalamiento Tier 2 (FIFO y DLQ)
├── cloudwatch.tf    # Métricas y alarma SLA_BREACH_RISK para tickets P1
└── outputs.tf       # Exportación de ARNs, URLs de colas y nombres de buckets
```

### **4.2 Especificación de Recursos Clave**

#### **Provider con Switch Transparente LocalStack / AWS (`terraform/main.tf`):**
```hcl
terraform {
  required_version = ">= 1.5.0"
  required_providers {
    aws = {
      source  = "hashicorp/aws"
      version = "~> 5.0"
    }
  }
}

provider "aws" {
  region                      = var.aws_region
  access_key                  = var.use_localstack ? "mock_key" : null
  secret_key                  = var.use_localstack ? "mock_secret" : null
  skip_credentials_validation = var.use_localstack
  skip_metadata_api_check     = var.use_localstack
  skip_requesting_account_id  = var.use_localstack

  endpoints {
    s3         = var.use_localstack ? var.localstack_endpoint : null
    sqs        = var.use_localstack ? var.localstack_endpoint : null
    cloudwatch = var.use_localstack ? var.localstack_endpoint : null
  }
}
```

#### **Bucket S3 para Mallas 3D y Artefactos (`terraform/s3.tf`):**
* Bucket: `printops-stl-artifacts-${var.environment}`
* Encriptación obligatoria en reposo (`AES256`).
* Regla de ciclo de vida: eliminación automática de archivos temporales/caché de análisis tras 30 días para ahorro de almacenamiento.

#### **Colas SQS FIFO para Desacople y Escalamiento (`terraform/sqs.tf`):**
* Cola Principal: `printops-tier2-escalations.fifo` (con entrega en orden exacto y deduplicación por `ticket_id`).
* Cola de Letras Muertas (DLQ): `printops-tier2-dlq.fifo` tras 3 reintentos fallidos de asignación.

#### **Alarma CloudWatch para `SLA_BREACH_RISK` (`terraform/cloudwatch.tf`):**
* Monitorea la métrica de tiempo en cola de tickets con prioridad `P1_HARDWARE_MAINTENANCE`.
* Condición de activación: si un ticket $P1$ permanece $> 30\text{ minutos}$ en estado `QUEUED_TIER_2`, o si la profundidad acumulada de la cola supera los 10 tickets, emite la alerta `SLA_BREACH_RISK`.

---

# **5. Matriz de Trazabilidad: Requerimientos vs Arquitectura**

| Requerimiento (RF/RNF) | Decisión de Arquitectura | Componente / Archivo Responsable |
| :--- | :--- | :--- |
| **RF-01 / RNF-01** (Filtro $< 200\text{ ms}$, 0 tokens) | Validador de Esquema en Fastify antes de llamar LLM | `src/gateway/schemaValidator.ts` |
| **RF-02 / RF-04** (Reglas dimensionales & Costeo) | Motor TypeScript determinista puro | `src/domain/rules/rulesEngine.ts` |
| **RF-03** (Swap térmico PLA $\to$ PETG) | Matriz de compatibilidad física | `src/domain/rules/materialCompatibility.ts` |
| **RF-05** (Diagnóstico soporte vs Atasco P1) | Agente Gemini Flash + Fallback local | `src/ai/geminiTriageAgent.ts` |
| **RF-06 / RNF-02** (Colas atómicas & TTL 30 min) | Redis Sorted Sets (`ZADD`, `ZPOPMAX`) + TTL | `src/infrastructure/redisQueueManager.ts` |
| **RF-07** (Handoff técnico Tier 1 $\to$ Tier 2) | Generador de Resumen Técnico Estructurado | `src/domain/handoff/executiveSummary.ts` |
| **RNF-04** (Auditoría e Integridad) | PostgreSQL con snapshots de estados | `src/infrastructure/db/schema.sql` |
| **RNF-05 / D-005** (Portabilidad & \$0 Cloud) | Docker Multi-Stage + LocalStack + Terraform | `Dockerfile`, `docker-compose.yml`, `terraform/` |
