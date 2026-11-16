# **PrintOps BPO — Smart 3D Manufacturing Triage & Quoting Engine**

Motor inteligente de triage, cotización base y soporte técnico operativo (Tier 1 / Tier 2\) para laboratorios de manufactura aditiva e impresión 3D.

---

# **1\. Resumen Ejecutivo**

**PrintOps BPO** es una solución de infraestructura y software desarrollada en el marco del programa **Estud-IA 2026**, una iniciativa conjunta entre la **Universidad EAFIT**, **Nodo** y la **Alcaldía de Medellín**. El proyecto se enmarca dentro de la **Capa 2: Nube e Infraestructura**, enfocándose en la automatización de procesos operativos mediante sistemas BPO (*Business Process Outsourcing*) inteligentes.

El objetivo principal de la plataforma es resolver la ineficiencia operativa y la alta carga de soporte en los laboratorios de manufactura aditiva local. PrintOps BPO opera como una capa intermedia automatizada entre el cliente y el centro de producción, integrando:

* **Triage Técnico Inteligente:** Validación de geometría 3D, imprimibilidad y física de materiales en tiempo real.  
* **Cotización Base Automatizada:** Cálculo dinámico de costos operativos, material, volumen y tiempo estimado de impresión.  
* **Flujo Operativo BPO Multinivel:**  
  * **Tier 1 (Automático):** Resolución de dudas técnicas recurrentes, preprocesamiento de archivos STL/OBJ y cotización instantánea mediante IA y reglas de negocio.  
  * **Tier 2 (Humano):** Escalamiento asistido a ingenieros del laboratorio para geometrías complejas, fallas de topología o solicitudes especiales.

### **Declaración de Supuestos y Simulación**

Los volúmenes, tiempos y porcentajes de este proyecto son escenarios simulados \[S\] con supuestos declarados \[H\]. El objetivo es demostrar la lógica de triage BPO y la infraestructura Cloud, no medir una operación real.

## **Contextos de Validación Activos**

La plataforma está siendo validada operativamente y alimentada con datos del entorno real en dos centros de manufactura:

1. **Laboratorio Universitario Genérico (Simulación \[H\]/\[S\]):** Escenario autónomo de alto volumen y picos de demanda semestral para someter a prueba las colas y el filtro de solicitudes incompletas.  
2. **Abracadabra Labs:** Banco de pruebas comercial basado en un dataset sintético de 30 tickets construido a partir de modelos STL propietarios reales e impresiones físicas en la Creality Ender 5 Max (perfil de volumen configurable de 400x400x400 mm).

---

# **2\. Estructura del Repositorio**

A continuación se detalla la organización de archivos y la arquitectura documental del proyecto:

```
printops-bpo/
├── README.md                          # Resumen general del proyecto y navegación principal
├── docs/
│   ├── 00-decision-log.md             # ADR: Decisiones de arquitectura y stack tecnológico (D-001 a D-013)
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

* [**Docs 00 — Decision Log**](00-decision-log.md): Contiene las decisiones clave del proyecto (D-001 a D-013), incluyendo elección de stack en la nube, motores de slicer headless, estrategias de triage y fallbacks.  
* [**Docs 01 — Problema & Stakeholders**](01-problem-stakeholders-value.md): Caracterización de los laboratorios objetivo, pain points de clientes e ingenieros, y la matriz de propuesta de valor.  
* [**Docs 02 — Reglas de Negocio y Física 3D**](02-business-rules-physics.md): Definición de parámetros físicos (volumen de pared mínimo, voladizos, manifolds) y fórmulas de cotización base.  
* [**Docs 03 — Flujo Operativo BPO**](03-bpo-operational-flow.md): Diagrama de secuencia y reglas de enrutamiento Tier 1 (Bot/IA) y Tier 2 (Operador humano).  
* [**Docs 04 — Requerimientos e Historias de Usuario**](04-requirements-user-stories.md): Especificación técnica de RF, RNF y aceptación en formato Gherkin (Given/When/Then).  
* [**Docs 05 — KPIs y Casos Borde**](05-kpis-edge-cases.md): Métricas de éxito operativo y protocolos ante archivos corruptos o modelos no imprimibles.  
* [**Docs 06 — Arquitectura Cloud, Docker & CI/CD**](06-cloud-architecture-ci-cd.md): Diseño de software modular en Fastify/TypeScript, Dockerfile Multi-Stage, pipeline GitHub Actions y Terraform.
* [**Evidencia y Dataset Sintético**](evidence/seed-tickets-30.md): Catálogo oficial del dataset sintético de 30 tickets (`seed-tickets-30.json`) y validación matemática de KPIs.

---

# **3\. Hoja de Ruta (Calendario de 3 Semanas)**

## **Entregables por Bloque**

| Bloque / Entregable | Contenido Técnico y Salidas Esperadas | Estado / Cierre |
| :---- | :---- | :---- |
| **Bloque 1: Docs 00 & Docs 01** | Definición del problema, mapas de actores (EAFIT/Abracadabra), propuesta de valor y Registro de Decisiones de Arquitectura (D-001 a D-006). | **Cerrado** |
| **Bloque 2: Docs 02 & Docs 03** | Matriz de física 3D (volumen, voladizos, mesh repair), motor de cotización base y árbol de decisión de triage BPO (Tier 1 vs Tier 2). | **Cerrado** |
| **Bloque 3: Docs 04, 05 & Dataset** | Requerimientos funcionales/no funcionales, historias BDD, catálogo de 30 tickets sintéticos (`seed-tickets-30.json`) y KPIs. | **Cerrado** |
| **Bloque 4: Arquitectura, Docker & Cloud** | Diseño de Arquitectura (`06-cloud-architecture-ci-cd.md`), setup de Docker Multi-Stage, CI/CD en GitHub Actions e IaC Terraform (\$0 Cloud). | **Diseño Cerrado / Listo para Implementar** |

## **Cronograma Semanal de Ejecución**

| Semana | Enfoque Principal | Hitos y Actividades Clave |
| :---- | :---- | :---- |
| **Semana 1** | **Fundamentación & Reglas Físicas** | • Finalización de `01-problem-stakeholders-value.md`.• Definición de parámetros técnicos en `02-business-rules-physics.md`.• Estructuración inicial de `03-bpo-operational-flow.md`.• Recolección de dataset inicial STL de Abracadabra Labs. |
| **Semana 2** | **Especificación & Pipeline Backend** | • Redacción de `04-requirements-user-stories.md` y `05-kpis-edge-cases.md`.• Setup de la infraestructura Cloud (Capa 2\) y entorno CI/CD.• Despliegue del motor de lectura y reparación de mallas 3D. |
| **Semana 3** | **Integración, IA & Cierre** | • Integración del motor de triage automático Tier 1.• Implementación de la consola de escalamiento Tier 2.• Pruebas de estrés con el banco de pruebas de EAFIT Lab.• Congelamiento de código y entrega de documentación final. |

## **Regla de Recorte (Trade-off Matrix)**

Para garantizar la entrega en tiempo y forma respetando la calidad del núcleo del proyecto, se establece la siguiente regla estricta de jerarquía de prioridades:**REGLA DE RECORTE INVIOLABLE:**  
Si durante la **Semana 2** se detecta un desfase o retraso en el cronograma mayor a 48 horas, se **sacrificarán progresivamente la interfaz visual avanzada (UI/Frontend) y las características accesorias de Inteligencia Artificial Generativa**.**Bajo ninguna circunstancia se recortará:**

1. La canalización e integración del pipeline CI/CD y la infraestructura Cloud.  
2. La precisión del motor de reglas físicas y cotización base.  
3. La documentación técnica completa del proyecto (`docs/00` a `docs/05`).

