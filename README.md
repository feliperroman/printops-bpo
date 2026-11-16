# **PrintOps BPO — Smart 3D Manufacturing Triage & Quoting Engine**

Motor inteligente de triage, cotización base y soporte técnico operativo (Tier 1 / Tier 2) para laboratorios de manufactura aditiva e impresión 3D.

---

# **1. Resumen Ejecutivo**

**PrintOps BPO** es una solución de infraestructura y software desarrollada en el marco del programa **Estud-IA 2026**, una iniciativa conjunta entre la **Universidad EAFIT**, **Nodo** y la **Alcaldía de Medellín**. El proyecto se enmarca dentro de la **Capa 2: Nube e Infraestructura**, enfocándose en la automatización de procesos operativos mediante sistemas BPO (*Business Process Outsourcing*) inteligentes.

El objetivo principal de la plataforma es resolver la ineficiencia operativa y la alta carga de soporte en los laboratorios de manufactura aditiva local. PrintOps BPO opera como una capa intermedia automatizada entre el cliente y el centro de producción, integrando:

* **Triage Técnico Inteligente:** Validación de geometría 3D, imprimibilidad y física de materiales en tiempo real.  
* **Cotización Base Automatizada:** Cálculo dinámico de costos operativos, material, volumen y tiempo estimado de impresión.  
* **Flujo Operativo BPO Multinivel:**  
  * **Tier 1 (Automático):** Resolución de dudas técnicas recurrentes, preprocesamiento de solicitudes y cotización instantánea mediante IA y reglas de negocio.  
  * **Tier 2 (Humano):** Escalamiento asistido a ingenieros del laboratorio para geometrías complejas, fallas de hardware críticas o solicitudes especiales en Onshape.

### **Declaración de Supuestos y Simulación**

Los volúmenes, tiempos y porcentajes de este proyecto son escenarios simulados `[S]` con supuestos declarados `[H]`. El objetivo es demostrar la lógica de triage BPO y la infraestructura Cloud, no medir una operación real.

## **Contextos de Validación Activos**

La plataforma está siendo validada operativamente y alimentada con datos del entorno real en dos centros de manufactura:

1. **Laboratorio Universitario Genérico (Simulación `[H]`/`[S]`):** Escenario autónomo de alto volumen y picos de demanda semestral para someter a prueba las colas y el filtro de solicitudes incompletas.  
2. **Abracadabra Labs:** Banco de pruebas comercial basado en un dataset sintético de 30 tickets construido a partir de modelos STL propietarios reales e impresiones físicas en la Creality Ender 5 Max (perfil de volumen configurable de 400×400×400 mm).

---

# **2. Estructura del Repositorio**

```
printops-bpo/
├── README.md                          # Resumen general del proyecto y navegación principal
├── .gitignore                         # Exclusiones de Git para Node.js, Terraform y Docker
├── docs/
│   ├── 00-decision-log.md             # ADR: Registro de decisiones de producto y arquitectura (D-001 a D-013)
│   ├── 01-problem-stakeholders-value.md # Fase 1: Problema, actores, contextos validados y propuesta de valor
│   ├── 02-business-rules-physics.md   # Fase 2: Reglas de negocio y físicas 3D (Completado)
│   ├── 03-bpo-operational-flow.md     # Fase 3: Flujo operativo BPO Tier 1 / Tier 2 (Completado)
│   ├── 04-requirements-user-stories.md# Fase 4: Requerimientos (RF/RNF) e historias Given/When/Then (Completado)
│   ├── 05-kpis-edge-cases.md          # Fase 5: KPIs clave y gestión de casos borde (Completado)
│   ├── 06-cloud-architecture-ci-cd.md # Fase 6: Arquitectura Cloud, Docker Multi-Stage, CI/CD y Terraform (Completado)
│   └── evidence/
│       ├── seed-tickets-30.json       # Dataset sintético ejecutable (30 tickets oficiales)
│       └── seed-tickets-30.md         # Catálogo maestro y matriz de validación matemática de KPIs
```

## **Índice de Documentación Detallada**

* [**Docs 00 — Decision Log**](docs/00-decision-log.md): Decisiones clave del proyecto (D-001 a D-013), stack en la nube y confirmación técnica.  
* [**Docs 01 — Problema & Stakeholders**](docs/01-problem-stakeholders-value.md): Caracterización de laboratorios, pain points de clientes e ingenieros y propuesta de valor.  
* [**Docs 02 — Reglas de Negocio y Física 3D**](docs/02-business-rules-physics.md): Límites dimensionales, matriz térmica de polímeros y fórmula de cotización base.  
* [**Docs 03 — Flujo Operativo BPO**](docs/03-bpo-operational-flow.md): Diagrama de secuencia, ciclo de vida de tickets, estados BPO y SLAs.  
* [**Docs 04 — Requerimientos e Historias de Usuario**](docs/04-requirements-user-stories.md): Especificación técnica de RF, RNF y aceptación BDD (Given/When/Then).  
* [**Docs 05 — KPIs y Casos Borde**](docs/05-kpis-edge-cases.md): 5 KPIs matemáticos, catálogo de edge cases y mitigación de prompt injection.  
* [**Docs 06 — Arquitectura Cloud, Docker & CI/CD**](docs/06-cloud-architecture-ci-cd.md): Diseño en 5 capas, Dockerfile Multi-Stage, pipeline GitHub Actions y Terraform.
* [**Evidencia y Dataset Sintético**](docs/evidence/seed-tickets-30.md): Catálogo oficial del dataset sintético de 30 tickets ([`seed-tickets-30.json`](docs/evidence/seed-tickets-30.json)) y validación matemática de KPIs.

---

# **3. Hoja de Ruta (Calendario de 3 Semanas)**

## **Entregables por Bloque**

| Bloque / Entregable | Contenido Técnico y Salidas Esperadas | Estado / Cierre |
| :--- | :--- | :--- |
| **Bloque 1: Docs 00 & Docs 01** | Definición del problema, mapas de actores (EAFIT/Abracadabra), propuesta de valor y Registro de Decisiones de Arquitectura (D-001 a D-006). | **Cerrado** |
| **Bloque 2: Docs 02 & Docs 03** | Matriz de física 3D (volumen, voladizos, mesh repair), motor de cotización base y árbol de decisión de triage BPO (Tier 1 vs Tier 2). | **Cerrado** |
| **Bloque 3: Docs 04, 05 & Dataset** | Requerimientos funcionales/no funcionales, historias BDD, catálogo de 30 tickets sintéticos (`seed-tickets-30.json`) y KPIs. | **Cerrado** |
| **Bloque 4: Arquitectura, Docker & Cloud** | Diseño de Arquitectura (`06-cloud-architecture-ci-cd.md`), setup de Docker Multi-Stage, CI/CD en GitHub Actions e IaC Terraform (\$0 Cloud). | **En Implementación** |
