# **00 \- Registro de Decisiones de Producto y Arquitectura (ADR / Decision Log)**

Registro vivo de decisiones tomadas durante el diseño de **PrintOps BPO**, garantizando que cada componente técnico responda a un requisito de negocio verificable bajo supuestos explícitos.

## **Decisiones Confirmadas y Revisadas**

* **D-001 — Documentación antes de código (Confirmada):** El problema de negocio, los supuestos y las reglas operativas definen la arquitectura técnica antes de escribir código.  
* **D-002 — Dominio: Impresión 3D autónoma (Confirmada):** Se modela un escenario de manufactura aditiva basado en conocimiento práctico de primera mano y piezas propias, sin depender de datos ni permisos de terceros.  
* **D-003 — Modelo BPO Tier 1 (automático) / Tier 2 (humano) (Confirmada):** Núcleo del flujo operativo BPO y de la narrativa Forward Deployed Engineer (FDE).  
* **D-004 — Volumen de impresión como perfil de máquina configurable (Confirmada):** En lugar de quemar un único tamaño en código, el volumen máximo se maneja como perfil configurable (ej. 400×400×400 mm como perfil gran formato tipo Ender 5 Max, o perfiles compactos de 250×150×150 mm).  
* **D-005 — Cloud: Estrategia \$0 con emulación local / LocalStack (Confirmada):** Permite declarar y validar infraestructura en código (Terraform) y pipelines CI/CD sin requerir cuentas pagas.  
* **D-006 — Sin integración con APIs ni datos de terceros (Confirmada):** Proyecto 100% autónomo; se descartan integraciones con APIs externas de universidades o entidades públicas para mantener el foco en la lógica BPO y el pipeline Cloud.  
* **D-007 — Todo número es Hipótesis \[H\] o Simulado \[S\] (Revisada):** Ningún dato operativo se presenta como medición real de un tercero. Todo volumen, tiempo o porcentaje lleva etiqueta explícita \[H\] (hipótesis declarada) o \[S\] (resultado de simulación del modelo).  
* **D-008 — Escenario genérico "Laboratorio Universitario" \+ Banco de pruebas Abracadabra Labs (Revisada):** Se utiliza un laboratorio universitario genérico como escenario de simulación de demanda y el catálogo propio de STLs y pruebas físicas de Abracadabra Labs para construir el dataset sintético de 30 tickets.  
* **D-010 — Arquitectura Modular Fastify/TypeScript con validación temprana de esquemas (Confirmada):** El servidor HTTP utiliza Fastify por su baja sobrecarga (< 10 ms) y validadores de esquema deterministas antes de invocar modelos de IA, garantizando latencias < 200 ms y 0 tokens gastados en entradas inválidas.
* **D-011 — Docker Multi-Stage y Seguridad de Contenedores (Confirmada):** El empaquetamiento se divide en dos fases (builder y runner) sobre Node 20 Alpine, ejecutando la aplicación con un usuario no-root (`printops:nodejs`) y healthchecks nativos.
* **D-012 — Concurrencia BPO y Colas de Prioridad en Redis (Confirmada):** El enrutamiento de tickets P1 > P2 > P3 y la expiración de sesiones de operadores (TTL 30 min) se gestionan mediante operaciones atómicas en memoria (`ZADD`, `ZPOPMAX`) para evitar condiciones de carrera.
* **D-013 — Infraestructura como Código (IaC) con Terraform y LocalStack (Confirmada):** Se declara la infraestructura de almacenamiento (S3), mensajería (SQS FIFO) y alarmas (CloudWatch) con Terraform, usando un switch de variables para ejecutar 100% sobre LocalStack en desarrollo y CI/CD a costo $0.

# **Confirmación del Stack Tecnológico (Cierre de Bloque 4)**

El stack provisional queda formalmente ratificado como la arquitectura oficial de PrintOps BPO:
* **Lenguaje y Runtime:** Node.js 20 LTS / TypeScript (strict mode)
* **Framework Web:** Fastify
* **Base de Datos Relacional:** PostgreSQL 16 (Auditoría de tickets, eventos y SLAs)
* **Caché y Colas en Memoria:** Redis 7 (Colas de prioridad P1/P2/P3, bloqueos atómicos y TTLs)
* **IA Semántica (Tier 1):** Google Gemini 1.5 Flash (con timeout de 10s y fallback determinista)
* **Contenedores:** Docker Multi-stage + Docker Compose
* **CI/CD:** GitHub Actions (Lint, Typecheck, Test Suite contra 30 tickets, Docker Build, LocalStack Deploy)
* **Infraestructura Cloud:** Terraform + LocalStack / AWS (S3, SQS FIFO, CloudWatch)