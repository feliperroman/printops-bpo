# **02 \- Reglas de Negocio, Física 3D y Casos Base (Fase 2\)**

Documento que define el "cerebro" determinista del Agente Virtual Tier 1 en **PrintOps BPO**. Todo parámetro numérico o tarifa lleva la etiqueta explícita \[H\] (Hipótesis declarada) o \[S\] (Simulado), conforme a la decisión D-007.

# **1\. Regla de Puerta de Entrada: Validación de Solicitud Completa (D-009)**

Antes de evaluar física 3D o calcular costos, el Agente Tier 1 verifica que el ticket contenga los 4 campos obligatorios:

* **Dimensiones de la pieza (mm):** Largo (X), Ancho (Y) y Alto (Z) mayores a `1 mm`.  
* **Material solicitado:** Polímero explícito (`PLA`, `PETG` o `TPU`).  
* **Entorno y uso esperado:** Categoría clara (`Decorativo interior`, `Exterior / Sol / Agua`, `Esfuerzo mecánico / Soporte de carga`, o `Flexible / Amortiguación`).  
* **Tipo de solicitud:** `Cotización de pieza` o `Soporte por fallo de impresión`.

**Acción del Agente Tier 1:** Si falta cualquiera de estos datos o son contradictorios (ej. medidas en cero o texto vacío), el ticket cambia a estado `INCOMPLETE_REJECTED_TIER_1` y devuelve automáticamente la lista exacta de datos faltantes sin pasar a un operador humano.

# **2\. Perfiles de Máquina Configurables y Límites Dimensionales (D-004)**

El volumen de impresión no se fija en código; se evalúa contra el perfil de máquina activo:

# **Perfil A — Gran Formato (Referencia Creality Ender 5 Max: 400×400×400 mm)**

* **Zona Verde (Aprobación Automática Tier 1):** Piezas hasta `380 × 380 × 380 mm` `[H]`. Se deja un margen de seguridad de `20 mm` en cama para líneas de purga, *skirt/brim* de adherencia y sujeciones.  
* **Zona Amarilla (Borde Crítico — Escala a Tier 2):** Piezas con alguna dimensión entre `381 mm` y `400 mm` `[H]`. Requiere que un humano valide la orientación en el laminador (OrcaSlicer / Creality Print) y desactive faldas que salgan del área.  
* **Zona Roja (Exceso Dimensional — Escala a Tier 2 para Corte CAD):** Piezas que superen `400 mm` en cualquier eje. El Agente Tier 1 informa que no cabe en una sola pieza y escala al Especialista CAD (Tier 2\) para evaluar corte con encastres en Onshape.

# **Perfil B — Formato Estándar de Laboratorio (250×220×250 mm)**

* **Zona Verde (Tier 1):** Hasta `235 × 205 × 240 mm` `[H]`.  
* **Zona Amarilla / Roja (Tier 2):** Cualquier pieza que supere `235 mm` en X o `205 mm` en Y pasa a evaluación de reorientación o a la cola del Perfil A (Gran Formato).

# **3\. Matriz de Compatibilidad Física de Materiales (PLA, PETG, TPU)**

El Agente Tier 1 cruza el **Material solicitado** contra el **Uso esperado** usando estas reglas físicas reales:

# **PLA (Ácido Poliláctico — Impresión a 200–220 °C, cama 60 °C)**

* **Permitido en Tier 1:** Piezas decorativas de interior, macetas sin exposición solar directa intensa, prototipos visuales y organizadores de escritorio.  
* **Bloqueo / Advertencia Física:** Se deforma por calor a partir de `55–60 °C` (temperatura de transición vítrea). Si el usuario pide **PLA para uso en exterior al sol, dentro de un vehículo o soporte mecánico bajo tensión constante**, el Agente Tier 1 rechaza la combinación y recomienda **PETG**.

# **PETG (Glicol de Tereftalato de Polietileno — Impresión a 230–250 °C, cama 70–80 °C)**

* **Permitido en Tier 1:** Piezas funcionales, soportes mecánicos, macetas de autorriego, accesorios de acuario (inerte al agua) y piezas expuestas a humedad o exterior.  
* **Consideración Técnica:** Mayor propensión a *stringing* (hilos) y fuerte adherencia a la cama; requiere ajuste de retracción (`0.8–2.0 mm`) y verificación de *Z-offset*.

# **TPU 95A (Poliuretano Termoplástico Flexible — Impresión a 220–230 °C, velocidad reducida)**

* **Permitido en Tier 1:** Topes amortiguadores, empaques, fundas protectoras y piezas que requieran doblarse o absorber impacto.  
* **Bloqueo / Advertencia Física:** Si el usuario pide **TPU para una pieza estructural rígida o que soporte peso sin doblarse**, el Agente Tier 1 advierte la incompatibilidad y sugiere **PETG**. Si la pieza en TPU supera `200 mm` de altura o tiene voladizos extremos, escala a **Tier 2** por riesgo de atasco en el extrusor.

# **4\. Catálogo de Diagnóstico de Fallos de Impresión (Soporte Tier 1 vs Tier 2\)**

Cuando el ticket es de tipo `Soporte por fallo de impresión`, el Agente Tier 1 aplica esta tabla de triaje:

* **Fallo 1: Hilos finos entre partes de la pieza (*Stringing* / Pelos de ángel):**  
  * *Resolución Automática (Tier 1):* Común en PETG y PLA húmedo. El agente indica: 1\) Secar el filamento, 2\) Bajar temperatura de boquilla de `5 a 10 °C` (ej. de `245 °C` a `235 °C` en PETG), 3\) Ajustar distancia de retracción entre `1.0 y 2.0 mm` en OrcaSlicer/Creality Print.  
* **Fallo 2: La primera capa no pega o se despega en las esquinas (*Warping* / Falta de adherencia):**  
  * *Resolución Automática (Tier 1):* El agente indica: 1\) Limpiar la cama PEI con alcohol isopropílico o agua y jabón neutro, 2\) Ajustar el *Z-offset* (ej. entre `-0.025 mm` y `-0.050 mm` para mejorar el aplastamiento de la primera capa), 3\) Activar *Brim* (borde de `5–8 mm`) en piezas grandes y subir cama a `60 °C` (PLA) o `75–80 °C` (PETG).  
* **Fallo 3: Superficie rugosa, burbujas o chasquidos al extruir (Filamento húmedo):**  
  * *Resolución Automática (Tier 1):* Diagnóstico directo de absorción de humedad (muy frecuente en ambientes húmedos de montaña). Instrucción de secado por `4 a 6 horas` antes de reimprimir.  
* **Fallo 4: Boquilla taponada que no suelta material o golpe en el motor del extrusor (*Nozzle Clog* severo):**  
  * *Escalamiento Obligatorio a Tier 2 (Mantenimiento Hardware):* Si el usuario reporta que ya intentó purgar en caliente y el extrusor traquea o hay una bola de plástico fundido en el *hotend*, el Agente Tier 1 clasifica el ticket como `ESCALATED_TIER_2_MAINTENANCE` con prioridad **Alta** para intervención física de un operador.

# **5\. Fórmula de Cotización Base en Tier 1 (Supuestos Declarados `[H]`)**

Para las solicitudes que aprueban el filtro dimensional y de material en Tier 1, el sistema calcula un presupuesto estimado transparente:

* **Fórmula General:** `Costo Total Estimado = (Gramos Estimados × Tarifa por Gramo) + (Horas Estimadas × Tarifa Hora Máquina) + Costo Fijo de Alistamiento`

# **Tarifas Base Declaradas `[H]` (en COP)**

* **PLA (Estándar / Bicolor):** `$250 COP / gramo` `[H]`  
* **PETG (Funcional / Resistente):** `$280 COP / gramo` `[H]`  
* **TPU (Flexible):** `$320 COP / gramo` `[H]`  
* **Tarifa Hora de Máquina (Energía \+ Depreciación):** `$3.000 COP / hora` `[H]`  
* **Costo Fijo de Alistamiento (Limpieza de cama, carga de filamento y revisión inicial):** `$9.000 COP` por pedido `[H]`

# **6\. Primeros 5 Casos Ancla del Dataset de Prueba (Nombres Claros y Basados en Pruebas Reales)**

Estos 5 casos (de los 30 del dataset sintético) están basados en piezas reales y pruebas físicas ejecutadas en la Creality Ender 5 Max, redactados con nombres claros para que cualquier jurado o reclutador los entienda al instante:

# **Caso \#01 — "Maceta Decorativa Mediana en PLA Bicolor" (Cotización Viable \-\> Resuelto en Tier 1\)**

* **Datos del pedido:** Medidas `150 × 150 × 140 mm` \| Material: `PLA` \| Uso: `Decorativo interior` \| Peso estimado: `180 g` \| Tiempo estimado: `4.5 horas` `[S]`.  
  **Decisión del Agente Tier 1:** Pasa validación de completitud, cabe holgadamente en Zona Verde (`< 380 mm`) y el PLA es ideal para interior. Calcula cotización automática: `(180g × $250) + (4.5h × $3.000) + $9.000 = $67.500 COP` `[S]`.  
* **Estado:** `RESOLVED_TIER_1`.

# **Caso \#02 — "Tapa Protectora de Acuario para Plantas Hidropónicas en PETG" (Cotización Viable \-\> Resuelto en Tier 1\)**

* **Datos del pedido:** Medidas `350 × 180 × 25 mm` \| Material: `PETG Blanco/Negro` \| Uso: `Contacto con agua y humedad constante` \| Peso estimado: `240 g` \| Tiempo estimado: `6 horas` `[S]`.  
* **Decisión del Agente Tier 1:** Cabe en el perfil Gran Formato (`350 mm <= 380 mm`), el PETG es resistente a la humedad e inerte para acuarios. Calcula cotización: `(240g × $280) + (6h × $3.000) + $9.000 = $94.200 COP` `[S]`.  
* **Estado:** `RESOLVED_TIER_1`.

# **Caso \#03 — "Soporte para Exteriores pedido por error en PLA" (Incompatibilidad de Material \-\> Corregido en Tier 1\)**

* **Datos del pedido:** Medidas `120 × 80 × 60 mm` \| Material solicitado: `PLA` \| Uso esperado: `Soporte expuesto al sol directo y lluvia en patio` `[S]`.  
* **Decisión del Agente Tier 1:** Detecta violación de regla térmica (el PLA se deforma al sol y pierde rigidez). Detiene el pedido en PLA, explica por qué fallaría físicamente y genera la cotización alternativa automáticamente en **PETG**.  
* **Estado:** `RESOLVED_WITH_MATERIAL_SWAP_TIER_1`.

# **Caso \#04 — "Jarrón de Piso Gigante de 460 mm de Altura" (Exceso Dimensional \-\> Escalado a Tier 2 CAD)**

* **Datos del pedido:** Medidas `220 × 220 × 460 mm` \| Material: `PLA` \| Uso: `Decorativo interior` `[S]`.  
* **Decisión del Agente Tier 1:** El eje Z (`460 mm`) supera el límite físico de `400 mm` incluso en la impresora más grande. No cotiza en automático; etiqueta como `ESCALATED_TIER_2_CAD_SPLIT` y adjunta resumen técnico para que el diseñador en Onshape divida la pieza en dos partes con rosca o encastre.  
* **Estado:** `ESCALATED_TIER_2_CAD_SPLIT`.

# **Caso \#05 — "Fallo de Hilos (Stringing) y Mala Primera Capa Imprimiendo PETG" (Soporte Técnico \-\> Resuelto en Tier 1\)**

* **Datos del pedido:** Tipo: `Soporte por fallo de impresión` \| Material: `PETG` \| Síntoma: *"La pieza sale llena de telarañas de plástico y la primera capa se levanta en una esquina"* `[S]`.  
* **Decisión del Agente Tier 1:** Reconoce un fallo estándar de calibración en PETG. Entrega la guía paso a paso (ajustar *Z-offset* entre `-0.025 y -0.050 mm`, subir cama a `75–80 °C`, configurar retracción de `1.5 mm` y temperatura en `235 °C` en OrcaSlicer/Creality Print) sin ocupar a un ingeniero humano.  
* **Estado:** `RESOLVED_TIER_1`.

