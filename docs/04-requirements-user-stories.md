# **04 \- Requerimientos del Sistema e Historias de Usuario BDD (Fase 4\)**

Documento de especificación formal de **PrintOps BPO**. Cada requerimiento funcional (RF), no funcional (RNF) e historia de usuario tiene trazabilidad directa hacia las decisiones de producto (`D-001` a `D-009`) y las reglas de física 3D y operación BPO definidas en las Fases 2 y 3\.

# **1\. Requerimientos Funcionales (RF) — El "Qué" hace el sistema**

* **RF-01 — Validación Estricta de Completitud en Puerta de Entrada (Trazabilidad: D-009, Fase 2 §1):**  
  El sistema debe validar síncronamente que toda solicitud entrante incluya dimensiones numéricas (`X, Y, Z > 1 mm`), polímero explícito (`PLA`, `PETG`, `TPU`), categoría de entorno de uso y tipo de solicitud. Si falta algún campo, debe rechazar el ticket con estado `INCOMPLETE_REJECTED_TIER_1` detallando los campos faltantes sin invocar modelos de IA ni colas humanas.  
* **RF-02 — Evaluación Dimensional contra Perfiles de Máquina Configurables (Trazabilidad: D-004, Fase 2 §2):**  
  El sistema debe comparar las dimensiones `(X, Y, Z)` del pedido contra el perfil de volumen activo (ej. Perfil A Gran Formato `400×400×400 mm` o Perfil B Estándar `250×220×250 mm`), clasificando la pieza en **Zona Verde** (`<= 380 mm` `[H]`, aprobación Tier 1), **Zona Amarilla** (`381–400 mm` `[H]`, escalamiento P2 a Tier 2 por borde crítico) o **Zona Roja** (`> 400 mm`, escalamiento P3 a Tier 2 para corte CAD en Onshape).  
* **RF-03 — Verificación de Compatibilidad Física y Térmica de Materiales (Trazabilidad: Fase 2 §3):**  
  El Agente Tier 1 debe cruzar el material solicitado con el entorno de uso declarado. Debe bloquear combinaciones físicamente riesgosas (ej. `PLA` para sol directo/exterior `> 55 °C` o `TPU` para soporte estructural rígido), explicar la causa física al usuario y proponer/cotizar automáticamente el polímero alternativo viable (`PETG`) bajo el estado `RESOLVED_WITH_MATERIAL_SWAP_TIER_1`.  
* **RF-04 — Motor de Cálculo de Cotización Base Transparente (Trazabilidad: D-007, Fase 2 §5):**  
  Para toda solicitud viable en Tier 1, el sistema debe calcular y desglosar el presupuesto estimado aplicando la fórmula: `(Gramos × Tarifa Material [H]) + (Horas × $3.000 COP [H]) + $9.000 COP de Alistamiento [H]`, usando `$250/g` para PLA, `$280/g` para PETG y `$320/g` para TPU `[H]`.  
* **RF-05 — Diagnóstico Automatizado de Fallos de Impresión Tier 1 vs Tier 2 (Trazabilidad: Fase 2 §4):**  
  Ante solicitudes de soporte técnico, el Agente Tier 1 debe distinguir entre fallos de calibración/laminado estándar (*stringing*, *warping*, humedad) —entregando parámetros de corrección inmediatos (`RESOLVED_TIER_1`)— y fallos críticos de hardware (atasco severo de boquilla / *nozzle clog* tras purga fallida), escalando estos últimos como prioridad máxima (`P1_HARDWARE_MAINTENANCE`) y bloqueando preventivamente el estado de la impresora (`MAINTENANCE_LOCKED`).  
* **RF-06 — Gestión de Estados de Disponibilidad y Cola Priorizada BPO (Trazabilidad: D-003, Fase 3 §2–§4):**  
  El sistema debe mantener en tiempo real el estado de los operadores humanos (`AVAILABLE`, `BUSY_CAD_DESIGN`, `BUSY_MAINTENANCE`, `OFFLINE`) y de las impresoras. Si entra un ticket Tier 2 y hay un especialista `AVAILABLE`, debe asignarlo de inmediato (`ASSIGNED_TIER_2`); si todos están ocupados, debe encolarlo en `QUEUED_TIER_2` ordenado estrictamente por prioridad (`P1 > P2 > P3`) y antigüedad (FIFO), asignándolo automáticamente cuando un operador se libere.  
* **RF-07 — Generación de Resumen Ejecutivo Técnico para Handoff (Trazabilidad: Fase 3 §6):**  
  Todo ticket escalado a Tier 2 debe incluir un resumen estructurado generado por el Agente Tier 1 con: motivo técnico exacto del escalamiento, pre-cálculo de peso/costo base y una instrucción de acción directa de una línea para el especialista humano.

# **2\. Requerimientos No Funcionales (RNF) — Por qué la Arquitectura importa**

Cada RNF justifica directamente las decisiones de infraestructura que se implementarán en el Bloque 4 (evitando tecnología por moda):

* **RNF-01 — Latencia de Respuesta y Cumplimiento de SLA en Tier 1 (Justifica validación en API Gateway \+ Caché en memoria):**  
  El rechazo de solicitudes incompletas debe responder en `< 5 segundos` `[H]` (idealmente `< 200 ms` a nivel de validación de esquema) y la evaluación completa del Agente Tier 1 con cotización en `< 15 segundos` `[H]`.  
* **RNF-02 — Baja Latencia y Expiración Automática (TTL) en Estados BPO (Justifica el uso de Redis):**  
  Los cambios de estado de operadores (`AVAILABLE`/`BUSY`), las colas de prioridad (`P1/P2/P3`) y la expiración automática de sesiones inactivas tras `30 minutos` `[H]` deben manejarse en una capa de almacenamiento en memoria con soporte nativo de TTLs y operaciones atómicas para evitar condiciones de carrera (*race conditions*) al asignar tickets simultáneos.  
* **RNF-03 — Protección de Consumo y Costos del Modelo de IA (Justifica Rate Limiting):**  
  El punto de entrada debe aplicar límite de peticiones por usuario/IP (*Rate Limiting*) y validar esquemas antes de llamar al LLM, garantizando que solicitudes malformadas o ráfagas de tráfico no agoten la cuota de tokens de la API de IA.  
* **RNF-04 — Trazabilidad y Auditoría Persistente (Justifica PostgreSQL):**  
  Todo cambio de estado del ticket, cotización calculada, tiempos de SLA y consumo de tokens debe quedar registrado en una base de datos relacional con integridad referencial para auditoría del Administrador del Lab.  
* **RNF-05 — Portabilidad, Seguridad de Contenedores y Reproducibilidad \$0 (Justifica Docker Multi-stage, GitHub Actions y Terraform \+ LocalStack — D-005):**  
  El sistema debe empaquetarse en contenedores ligeros ejecutados con usuario sin privilegios (`non-root`), contar con un endpoint `/health` verificable, validarse automáticamente mediante un pipeline CI/CD en cada *push* y declarar su infraestructura cloud mediante código (IaC) 100% emulable localmente sin costos de nube.

# **3\. Historias de Usuario con Criterios de Aceptación (Formato BDD: Given / When / Then)**

## **HU-01: Rechazo Temprano de Solicitud Incompleta (Cubre RF-01 / D-009)**

* **Como** Agente Virtual Tier 1,  
* **Quiero** detener en la puerta de entrada cualquier pedido que omita medidas, material o uso esperado,  
* **Para** no desperdiciar cómputo de IA ni tiempo de los especialistas humanos en solicitudes ambiguas.  
* **Criterio de Aceptación (Gherkin):**  
  * **Given (Dado)** que un usuario envía un ticket solicitando cotizar una pieza pero omite la dimensión del eje Z o deja el campo de entorno de uso vacío,  
  * **When (Cuando)** el ticket ingresa al endpoint de recepción del sistema,  
  * **Then (Entonces)** el sistema responde en menos de `5 segundos` `[H]` con estado `INCOMPLETE_REJECTED_TIER_1`, indica exactamente qué campos faltan y no invoca al motor de IA ni encola el ticket en Tier 2\.

## **HU-02: Cotización Automática de Pieza Viable en Zona Verde (Cubre RF-02, RF-04 / Caso \#01)**

* **Como** cliente o estudiante,  
* **Quiero** recibir al instante la viabilidad y el precio estimado de una pieza que cabe en la impresora y usa el material correcto,  
* **Para** decidir si apruebo la impresión sin esperar días por una respuesta manual.  
* **Criterio de Aceptación (Gherkin):**  
  * **Given (Dado)** que el perfil activo es Gran Formato (`400×400×400 mm`) y el usuario solicita una "Maceta Decorativa Mediana" de `150×150×140 mm` en `PLA` para `Decorativo interior` (peso estimado `180 g`, tiempo `4.5 h` `[S]`),  
  * **When (Cuando)** el Agente Tier 1 evalúa las reglas físicas y de costeo,  
  * **Then (Entonces)** clasifica la pieza en Zona Verde (`<= 380 mm`), aprueba el uso de PLA, calcula un total de `$67.500 COP` `[S]` (`180g × $250 + 4.5h × $3.000 + $9.000`) y cambia el estado a `RESOLVED_TIER_1`.

## **HU-03: Corrección Automática por Incompatibilidad Térmica de Material (Cubre RF-03 / Caso \#03)**

* **Como** cliente sin experiencia técnica en polímeros,  
* **Quiero** que el sistema me advierta si elegí un material que se va a derretir o deformar con el sol y me cotice el material correcto,  
* **Para** evitar perder mi dinero en una pieza defectuosa.  
* **Criterio de Aceptación (Gherkin):**  
  * **Given (Dado)** que un usuario solicita imprimir un soporte de `120×80×60 mm` en `PLA` indicando como entorno de uso `Exterior expuesto al sol directo`,  
  * **When (Cuando)** el Agente Tier 1 cruza el polímero contra la matriz térmica (`PLA` se deforma a `> 55 °C`),  
  * **Then (Entonces)** bloquea la cotización en PLA, explica el riesgo físico de deformación térmica, recalcula automáticamente la cotización en `PETG` (`$280/g` `[H]`) y cierra el ticket como `RESOLVED_WITH_MATERIAL_SWAP_TIER_1`.

## **HU-04: Escalamiento a Tier 2 CAD por Exceso Dimensional con Operadores Ocupados (Cubre RF-02, RF-06, RF-07 / Caso \#04)**

* **Como** Especialista CAD Tier 2,  
* **Quiero** que las piezas que superan los `400 mm` se encolen con prioridad normal (`P3`) y traigan un resumen técnico listo cuando yo me desocupe,  
* **Para** ir directo a cortar la pieza en Onshape sin perder tiempo adivinando qué necesita el cliente.  
* **Criterio de Aceptación (Gherkin):**  
  * **Given (Dado)** que todos los especialistas Tier 2 están en estado `BUSY_CAD_DESIGN` y entra un pedido de un "Jarrón de Piso Gigante" de `220×220×460 mm` en `PLA`,  
  * **When (Cuando)** el Agente Tier 1 detecta que el eje Z (`460 mm`) supera el límite máximo de `400 mm` (Zona Roja),  
  * **Then (Entonces)** etiqueta el ticket con prioridad `P3_CAD_SPLIT_REDESIGN`, genera el Resumen Ejecutivo Técnico sugiriendo corte en Onshape, coloca el ticket en la cola `QUEUED_TIER_2` e informa al usuario su posición en la fila.

## **HU-05: Priorización Crítica y Despacho Automático por Atasco de Hardware (Cubre RF-05, RF-06)**

* **Como** Administrador del Laboratorio,  
* **Quiero** que un reporte de atasco severo de boquilla salte al primer lugar de la cola (`P1`) y bloquee el estado de la impresora afectada,  
* **Para** recuperar la capacidad productiva de la máquina en menos de `30 minutos` `[H]`.  
* **Criterio de Aceptación (Gherkin):**  
  * **Given (Dado)** que en la cola `QUEUED_TIER_2` ya esperan 2 tickets de diseño CAD (`P3`) y entra un reporte de soporte indicando que la boquilla tiene un taponamiento severo (*nozzle clog*) que no purga en caliente,  
  * **When (Cuando)** el Agente Tier 1 procesa el ticket y un operador cambia su estado a `AVAILABLE`,  
  * **Then (Entonces)** el sistema marca la impresora como `MAINTENANCE_LOCKED`, posiciona el ticket de mantenimiento de primero en la cola como `P1_HARDWARE_MAINTENANCE` y se lo asigna inmediatamente al operador recién liberado antes que los tickets `P3`.

