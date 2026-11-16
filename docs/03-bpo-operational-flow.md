# **03 \- Flujo Operativo BPO: Ciclo de Vida, Estados y SLAs (Fase 3\)**

Documento que define la lógica de operación del centro de atención y manufactura en **PrintOps BPO**, detallando cómo transitan los tickets entre el Agente Virtual Tier 1 y los Especialistas Humanos Tier 2, el control de disponibilidad en tiempo real y el manejo de colas cuando no hay operadores libres. Todos los tiempos objetivo y umbrales llevan etiqueta `[H]` (Hipótesis declarada) o `[S]` (Simulado).

# **1\. Máquina de Estados del Ticket (Ciclo de Vida)**

Cada solicitud que entra al sistema pasa por estados deterministas y auditables:

* **`NEW_RECEIVED` (Recibido):** El ticket acaba de ingresar por el API Gateway.  
* **`INCOMPLETE_REJECTED_TIER_1` (Rechazado por Datos Incompletos):** El Agente Tier 1 detecta que falta alguno de los 4 campos obligatorios (dimensiones X/Y/Z \> 1 mm, material, entorno de uso o tipo de solicitud). Se cierra el ciclo inicial devolviendo al usuario la lista exacta de datos faltantes.  
* **`EVALUATING_TIER_1` (En Evaluación Automática):** La solicitud está completa y el Agente Tier 1 ejecuta las reglas de física 3D (perfil de máquina y compatibilidad térmica/mecánica de material) o diagnóstico de fallos.  
* **`RESOLVED_TIER_1` (Resuelto en Primer Nivel):** Caso estándar exitoso (cotización en Zona Verde o guía de calibración por *stringing*, *warping* o humedad). El usuario recibe respuesta inmediata sin intervención humana.  
* **`RESOLVED_WITH_MATERIAL_SWAP_TIER_1` (Resuelto con Cambio de Material):** El Agente Tier 1 bloquea un material riesgoso (ej. PLA para exterior al sol) y entrega automáticamente la cotización corregida en el material adecuado (PETG).  
* **`QUEUED_TIER_2` (En Cola de Espera Nivel 2):** El caso requiere un humano (pieza en Zona Amarilla/Roja \> 380 mm, corte CAD en Onshape o mantenimiento por atasco severo de boquilla), pero todos los operadores están ocupados en ese instante.  
* **`ASSIGNED_TIER_2` (Asignado a Especialista Humano):** Un operador con el rol requerido estaba `AVAILABLE` (o acaba de liberarse) y recibe el ticket junto con el **Resumen Ejecutivo Técnico** generado por el Agente Tier 1\.  
* **`RESOLVED_TIER_2` (Cerrado por Especialista):** El humano completó el corte CAD, aprobó la orientación en el laminador o destapó el *hotend*, dejando registro de la solución.

# **2\. Estados de Disponibilidad en Tiempo Real (Operadores e Impresoras)**

Para que el enrutamiento BPO funcione como un sistema de producción real (y justifique el uso de almacenamiento en memoria de baja latencia en la fase de arquitectura), se separan los estados de los humanos y del hardware:

## **Estados del Operador Humano (Especialista Tier 2\)**

* **`AVAILABLE` (Disponible):** Conectado y libre para recibir un ticket escalado de inmediato (máximo 1 ticket activo a la vez en modo foco, o hasta 2 tickets simultáneos como tope configurable `[H]`).  
* **`BUSY_CAD_DESIGN` (Ocupado en CAD / Laminado):** Trabajando en Onshape o ajustando parámetros complejos en OrcaSlicer/Creality Print. No recibe asignaciones nuevas salvo urgencia crítica.  
* **`BUSY_MAINTENANCE` (Ocupado en Mantenimiento Físico):** Interviniendo físicamente una máquina (cambio de boquilla, limpieza de extrusor o nivelación).  
* **`OFFLINE` (Fuera de Turno / Desconectado):** Sin sesión activa (controlado por expiración automática / TTL de sesión de `30 minutos` sin actividad `[H]`).

## **Estados del Perfil de Máquina (Impresoras 3D)**

* **`IDLE_READY` (Lista para Imprimir):** Cama limpia y boquilla operativa.  
* **`PRINTING` (Imprimiendo):** Ocupada con un trabajo activo y tiempo restante estimado.  
* **`MAINTENANCE_LOCKED` (Bloqueada por Fallo):** Cuando entra un ticket de fallo severo (`ESCALATED_TIER_2_MAINTENANCE`), la máquina asociada pasa automáticamente a estado bloqueado hasta que el operador cierre el ticket.

# **3\. Reglas de Enrutamiento y Colas de Prioridad (Qué pasa en Tier 2\)**

No todos los casos escalados a humanos tienen la misma urgencia. El Agente Tier 1 etiqueta cada escalamiento con un nivel de prioridad y especialidad:

* **Prioridad 1 — Crítica (`P1_HARDWARE_MAINTENANCE`):**  
  * **Caso:** Impresora detenida por boquilla taponada (*nozzle clog*), fallo térmico o golpe de extrusor.  
  * **Por qué es P1:** Una máquina parada frena toda la producción del laboratorio. Va al primer lugar de la cola.  
* **Prioridad 2 — Alta (`P2_BORDERLINE_SLICING`):**  
  * **Caso:** Piezas en Zona Amarilla (`381 mm a 400 mm` en Gran Formato) o TPU de más de `200 mm` de altura que solo requieren que un humano revise rápido en OrcaSlicer/Creality Print si entran sin *skirt* o con soportes especiales.  
* **Prioridad 3 — Normal (`P3_CAD_SPLIT_REDESIGN`):**  
  * **Caso:** Piezas en Zona Roja (`> 400 mm`, como el Jarrón de 460 mm) que requieren abrir Onshape, cortar la malla y diseñar pines o roscas de unión.

# **4\. Manejo de Desborde: ¿Qué pasa cuando NO hay Operadores Disponibles?**

Esta es una regla crítica de negocio para evitar que los tickets se pierdan cuando el laboratorio está lleno (ej. escenario pico de 150 solicitudes/semana \[H\]):

1. **Encolamiento con Prioridad (FIFO ponderado por Prioridad):** Si todos los especialistas están en estado `BUSY` u `OFFLINE`, el ticket entra en estado `QUEUED_TIER_2` ordenado por prioridad (`P1 > P2 > P3`) y luego por hora de llegada.  
2. **Respuesta Transparente al Usuario:** El usuario no se queda frente a una pantalla cargando; recibe confirmación inmediata del Agente Tier 1: *"Tu pieza supera el límite de 400 mm y requiere división en CAD. He preparado el resumen técnico y tu solicitud quedó en la posición \#X de la cola de especialistas (Tiempo estimado de respuesta: según SLA)"*.  
3. **Asignación Automática por Liberación (Push / Pull):** Apenas un operador cambia su estado a `AVAILABLE` (o cierra su ticket actual), el motor BPO toma el primer ticket de la cola (`P1` primero) y se lo asigna automáticamente.  
4. **Alerta de Cuello de Botella al Administrador:** Si un ticket `P1` lleva más de `30 minutos` `[H]` en cola sin asignación, o la cola `QUEUED_TIER_2` supera los `10 tickets` acumulados `[H]`, se dispara una bandera de alerta operativa (`SLA_BREACH_RISK`) para el Administrador del Lab.

# **5\. Acuerdos de Nivel de Servicio (SLAs Simulados `[H]`)**

Para medir el desempeño del sistema en las pruebas, se definen los siguientes tiempos objetivo:

* **SLA Validación de Completitud (Tier 1):** `< 5 segundos` `[H]` (rechazo inmediato de pedidos incompletos).  
* **SLA Cotización Estándar y Soporte Básico (Tier 1):** `< 15 segundos` `[H]` (incluyendo inferencia del Agente y cálculo matemático).  
* **SLA Primera Respuesta Humana en Prioridad 1 (Mantenimiento Hardware Tier 2):** `< 30 minutos` `[H]` en horario hábil simulado.  
* **SLA Primera Respuesta Humana en Prioridad 2 (Validación de Laminado Tier 2):** `< 2 horas` `[H]`.  
* **SLA Primera Respuesta Humana en Prioridad 3 (Corte/Rediseño CAD en Onshape Tier 2):** `< 24 horas` `[H]`.

# **6\. Estructura del "Resumen Ejecutivo Técnico" (Handoff Tier 1 \-\> Tier 2\)**

Para lograr la reducción simulada del `20% al 40%` en el tiempo de trabajo del especialista humano `[H]`, el Agente Tier 1 nunca pasa un ticket en crudo; entrega una ficha estructurada con:

* **Motivo exacto del escalamiento:** (`EXCESO_EJE_Z_460MM`, `ZONA_AMARILLA_390MM`, `ATASCO_HOTEND_PETG`).  
* **Pre-cálculo listo:** Peso y costo base preliminar de material por si el especialista aprueba el corte.  
* **Acción sugerida al humano:** Instrucción directa de una línea (ej. *"Abrir en Onshape, aplicar plano de corte a 230 mm en eje Z con conector macho/hembra y confirmar cotización"*).

