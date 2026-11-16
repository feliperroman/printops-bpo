# **Catálogo Oficial del Dataset Sintético (30 Tickets de Prueba — `seed-tickets-30`)**

Este documento constituye la especificación tabular y descriptiva del dataset de prueba oficial de **PrintOps BPO**, almacenado como fixture ejecutable en [`docs/evidence/seed-tickets-30.json`](file:///c:/Users/USUARIO/Desktop/printops-bpo/docs/evidence/seed-tickets-30.json).

El dataset fue diseñado a partir de piezas STL reales de **Abracadabra Labs** (impresas físicamente en la Creality Ender 5 Max con cama de 400×400×400 mm) y solicitudes típicas del **Laboratorio Académico Universitario (EAFIT)**.

---

## **1. Matriz de Cobertura de KPIs con el Dataset (30 Tickets)**

| KPI | Métrica / Meta Matemática | Resultado Simulado sobre el Dataset `[S]` | Estado |
| :--- | :--- | :--- | :--- |
| **KPI-01 — Deflexión en Tier 1** | $\ge 66.7\%$ ($\ge 20$ de 30 tickets resueltos/filtrados sin operador humano) | **23 de 30 tickets (76.7%)** resueltos o rechazados en puerta de entrada de forma autónoma. | **Cumple (Supera meta $\ge 66.7\%$)** |
| **KPI-02 — Precisión de Triage** | $100\%$ en reglas físicas deterministas (dimensiones y límites térmicos) | **100% de coherencia** en clasificación de zonas (Verde/Amarilla/Roja) y swaps térmicos de PLA a PETG. | **Cumple (100%)** |
| **KPI-03 — Latencia en Puerta de Entrada** | $< 200\text{ ms}$ para solicitudes incompletas / malformadas | **`TCK-029`** es rechazado por validador de esquema JSON en servidor sin invocar IA ($< 200\text{ ms}$). | **Cumple** |
| **KPI-04 — Zero-Waste Token Ratio** | $0\text{ tokens}$ consumidos en pedidos incompletos | **0 tokens** consumidos en `TCK-029` (bloqueado antes de invocar la API de Gemini). | **Cumple ($0\text{ tokens}$)** |
| **KPI-05 — Cola de Despacho P1** | Enrutamiento atómico en $< 2\text{ s}$ ante disponibilidad de operador | **`TCK-025` y `TCK-026`** priorizados como `P1_HARDWARE_MAINTENANCE` al tope de cola. | **Cumple** |

---

## **2. Desglose Consolidado por Grupos**

| Grupo | Descripción | Rango Tickets | Destino / Estado | Cantidad | % Total |
| :---: | :--- | :---: | :--- | :---: | :---: |
| **1** | Cotizaciones Viables en Zona Verde ($X, Y, Z \le 380\text{ mm}$) | `TCK-001` al `TCK-012` | `RESOLVED_TIER_1` | 12 | 40.0% |
| **2** | Restricciones Físicas y Evaluaciones Dimensionales | `TCK-013` al `TCK-018` | 3 `RESOLVED_WITH_MATERIAL_SWAP_TIER_1`<br>1 `P2_BORDERLINE_SLICING`<br>2 `P3_CAD_SPLIT_REDESIGN` | 6 | 20.0% |
| **3** | Diagnósticos de Soporte Técnico Básico (Stringing, Warping, Humedad) | `TCK-019` al `TCK-024` | `RESOLVED_TIER_1` | 6 | 20.0% |
| **4** | Mantenimiento Complejo y Rediseño CAD en Onshape | `TCK-025` al `TCK-028` | 2 `P1_HARDWARE_MAINTENANCE`<br>2 `P3_CAD_SPLIT_REDESIGN` | 4 | 13.3% |
| **5** | Solicitudes Incompletas y Seguridad (Prompt Injection) | `TCK-029` y `TCK-030` | 1 `INCOMPLETE_REJECTED_TIER_1`<br>1 `RESOLVED_TIER_1` (Determinista) | 2 | 6.7% |
| **TOTAL** | **Dataset Completo de Validación** | `TCK-001` al `TCK-030` | **23 Tier 1 / 7 Tier 2** | **30** | **100%** |

---

## **3. Tabla Maestra de los 30 Tickets Sintéticos**

| ID | Pieza / Caso | Cliente | Dim. (mm) | Mat. | Uso / Entorno | Estado Esperado | Tier | Prioridad | Costo Estimado (COP) `[S]` |
| :---: | :--- | :---: | :---: | :---: | :--- | :--- | :---: | :---: | :---: |
| **TCK-001** | Maceta Decorativa Bruma | Abracadabra | 150×150×140 | PLA | Decorativo interior | `RESOLVED_TIER_1` | Tier 1 | NONE | \$67.500 |
| **TCK-002** | Tapa Protectora Acuario | Acuarios Med | 350×180×25 | PETG | Agua y humedad | `RESOLVED_TIER_1` | Tier 1 | NONE | \$94.200 |
| **TCK-003** | Maceta Eter Mini | Abracadabra | 100×100×95 | PLA | Decorativo interior | `RESOLVED_TIER_1` | Tier 1 | NONE | \$39.000 |
| **TCK-004** | Organizador Hexagonal | EAFIT Diseño | 180×160×110 | PLA | Decorativo interior | `RESOLVED_TIER_1` | Tier 1 | NONE | \$76.500 |
| **TCK-005** | Rejilla Desborde Sumidero | Acuarios Med | 280×140×20 | PETG | Agua y salinidad | `RESOLVED_TIER_1` | Tier 1 | NONE | \$74.200 |
| **TCK-006** | Plato Drenaje Maceta | Abracadabra | 160×160×30 | PETG | Agua constante | `RESOLVED_TIER_1` | Tier 1 | NONE | \$47.300 |
| **TCK-007** | Patas Antivibración | EAFIT Mecatrónica | 50×50×45 | TPU | Amortiguación | `RESOLVED_TIER_1` | Tier 1 | NONE | \$34.200 |
| **TCK-008** | Funda Calibre Mitutoyo | EAFIT Taller | 160×40×25 | TPU | Amortiguación | `RESOLVED_TIER_1` | Tier 1 | NONE | \$40.500 |
| **TCK-009** | Soporte Diadema Gamer | EAFIT Sistemas | 130×90×220 | PLA | Decorativo interior | `RESOLVED_TIER_1` | Tier 1 | NONE | \$82.000 |
| **TCK-010** | Caja Estanca ESP32 | EAFIT IoT | 120×80×45 | PETG | Mecánico / Impacto | `RESOLVED_TIER_1` | Tier 1 | NONE | \$54.400 |
| **TCK-011** | Tobera Ventilación 5015 | Maker Med | 65×50×40 | PETG | Térmico hotend | `RESOLVED_TIER_1` | Tier 1 | NONE | \$26.100 |
| **TCK-012** | Tope Puerta Triangular | Abracadabra | 80×30×30 | TPU | Amortiguación | `RESOLVED_TIER_1` | Tier 1 | NONE | \$29.500 |
| **TCK-013** | Soporte Cámara Exterior | Cliente Envigado | 120×80×60 | PLA $\to$ **PETG** | Sol directo / Lluvia | `RESOLVED_WITH_MATERIAL_SWAP_TIER_1` | Tier 1 | NONE | \$61.500 |
| **TCK-014** | Soporte Celular Parabrisas | EAFIT Docente | 90×70×80 | PLA $\to$ **PETG** | Vehículo al sol | `RESOLVED_WITH_MATERIAL_SWAP_TIER_1` | Tier 1 | NONE | \$38.800 |
| **TCK-015** | Boquilla Riego Invernadero | Vivero La Ceja | 110×45×45 | PLA $\to$ **PETG** | Sol / Humedad alta | `RESOLVED_WITH_MATERIAL_SWAP_TIER_1` | Tier 1 | NONE | \$41.600 |
| **TCK-016** | Panel Celosía Muro (390 mm) | Arq Medellín | 390×180×15 | PLA | Decorativo interior | `QUEUED_TIER_2` (Amarilla) | Tier 2 | P2 | \$110.500 |
| **TCK-017** | Jarrón de Piso Gigante (460 mm) | Decoraciones Poblado | 220×220×460 | PLA | Decorativo interior | `QUEUED_TIER_2` (Roja) | Tier 2 | P3 | \$225.500 |
| **TCK-018** | Mástil Guía Banner (430 mm) | EAFIT Eventos | 430×90×60 | PETG | Esfuerzo mecánico | `QUEUED_TIER_2` (Roja) | Tier 2 | P3 | \$159.600 |
| **TCK-019** | Soporte Stringing en PETG | Maker Med | 100×60×40 | PETG | Soporte Técnico | `RESOLVED_TIER_1` | Tier 1 | NONE | N/A (Guía IA) |
| **TCK-020** | Soporte Warping Primera Capa | EAFIT Arq | 200×150×80 | PLA | Soporte Técnico | `RESOLVED_TIER_1` | Tier 1 | NONE | N/A (Guía IA) |
| **TCK-021** | Soporte Humedad en Filamento | Cliente Bello | 80×80×120 | PLA | Soporte Técnico | `RESOLVED_TIER_1` | Tier 1 | NONE | N/A (Guía IA) |
| **TCK-022** | Soporte Sobre-Adhesión PEI | EAFIT Lab 3D | 150×120×10 | PETG | Soporte Técnico | `RESOLVED_TIER_1` | Tier 1 | NONE | N/A (Guía IA) |
| **TCK-023** | Soporte Subextrusión por Velocidad | Taller Itagüí | 110×110×90 | PLA | Soporte Técnico | `RESOLVED_TIER_1` | Tier 1 | NONE | N/A (Guía IA) |
| **TCK-024** | Soporte Encordado TPU | EAFIT Robótica | 140×70×30 | TPU | Soporte Técnico | `RESOLVED_TIER_1` | Tier 1 | NONE | N/A (Guía IA) |
| **TCK-025** | Falla Atasco Nozzle Severo | Monitor Lab EAFIT | 100×100×100 | PETG | Mantenimiento Hardware | `ASSIGNED_TIER_2` | Tier 2 | **P1** | N/A (Físico) |
| **TCK-026** | Falla Térmica Runaway E1 | Granja Abracadabra | 50×50×50 | PLA | Mantenimiento Hardware | `ASSIGNED_TIER_2` | Tier 2 | **P1** | N/A (Físico) |
| **TCK-027** | Bloqueo Engranajes Tolerancia | EAFIT Mecánica | 120×120×60 | PETG | Rediseño CAD Onshape | `QUEUED_TIER_2` | Tier 2 | P3 | N/A (CAD) |
| **TCK-028** | Bisagra Print-in-Place Fusionada | Empaques Med | 140×100×45 | PLA | Rediseño CAD Onshape | `QUEUED_TIER_2` | Tier 2 | P3 | N/A (CAD) |
| **TCK-029** | Incompleto: Sin eje Z ni uso | Web Anónimo | 120×120×`null` | PLA | `null` | `INCOMPLETE_REJECTED_TIER_1` | Tier 1 | NONE | N/A (0 Tokens) |
| **TCK-030** | Prompt Injection: Override \$1 | Auditor Pentest | 350×350×350 | PLA | Decorativo interior | `RESOLVED_TIER_1` (Aislamiento) | Tier 1 | NONE | \$615.500 |

---

## **4. Fórmula de Cálculo de Costos Aplicada (Supuestos `[H]`)**

$$\text{Costo Total Estimado (COP)} = (\text{Gramos} \times \text{Tarifa Material}) + (\text{Horas} \times \$3.000) + \$9.000$$

* Tarifa PLA: $\$250\text{ COP/g}$
* Tarifa PETG: $\$280\text{ COP/g}$
* Tarifa TPU: $\$320\text{ COP/g}$
* Hora Máquina: $\$3.000\text{ COP/h}$
* Alistamiento Fijo: $\$9.000\text{ COP}$
