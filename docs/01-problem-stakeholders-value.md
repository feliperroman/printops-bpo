# **01 \- Problem Statement, Stakeholders & Value Proposition (Fase 1 Cerrada)**

# **1\. Definición del Problema (Problem Statement)**

Los laboratorios de fabricación universitarios y estudios de diseño reciben continuamente solicitudes de impresión 3D carentes de la información técnica básica necesaria para su procesamiento. En la actualidad, cada solicitud exige una revisión manual repetitiva para resolver interrogantes operativas primarias:

* **Completitud de la solicitud (D-009):** ¿El usuario entregó la información mínima obligatoria (dimensiones, material, uso esperado) o envió un pedido incompleto?  
* **Viabilidad dimensional (D-004):** ¿Cabe la geometría dentro del volumen máximo de impresión disponible según los perfiles configurables de la máquina?  
* **Selección de material:** ¿Qué polímero (PLA, PETG, ABS, TPU) requiere la pieza según su entorno de uso térmico y mecánico?  
* **Estimación de costos:** ¿Cuál es la cotización base según el volumen, tiempo y parámetros solicitados?

Este flujo genera un desperdicio recurrente de capacidad técnica especializada, respondiendo consultas de soporte básicas en lugar de atender tareas de mayor valor. Asimismo, los casos que sí requieren intervención humana especializada —como el rediseño CAD en Onshape, la división o corte de piezas complejas y el mantenimiento de hardware— se mezclan con solicitudes triviales. Esta saturación ocurre sin colas de prioridad estructuradas, sin control de disponibilidad operativa y sin acuerdos de nivel de servicio (SLAs) definidos.

# **2\. Mapa de Actores y Flujo de Interacción**

## **Flujo Operativo del Sistema**

El modelo intercala la atención automatizada y la humana para maximizar la eficiencia operativa:

```
[Cliente / Estudiante] 
       │
       ▼
[Agente Virtual Tier 1] ──(Casos estándar)──► [Resolución Automática]
       │
 (Casos complejos / Escalados)
       │
       ▼
[Especialista CAD / Operador Tier 2] ◄──(Configuración & Supervisión)── [Administrador del Lab]
```

## **Matriz de Actores**

| Actor | Qué necesita | Dolor actual / Hipótesis a validar |
| :---- | :---- | :---- |
| **Cliente / Estudiante** | Saber de manera rápida si su pieza es viable para manufactura, qué material utilizar y el costo estimado. | Experimenta tiempos de espera de días solo para descubrir que la pieza excede el volumen de impresión o que eligió un material inadecuado. |
| **Agente Virtual Tier 1** | Reglas físicas y de negocio explícitas y estructuradas para ejecutar decisiones de triaje y cotización sin ambigüedad. | Al ser el sistema autogestionado, carece de criterio sin reglas predefinidas y estructuradas para clasificar piezas o calcular presupuestos. |
| **Especialista CAD / Operador Tier 2** | Recibir únicamente solicitudes que requieran criterio humano, acompanadas de un resumen técnico estructurado. | Consume horas operativas en responder preguntas repetitivas y filtrar casos mal clasificados o incompletos. |
| **Administrador del Lab** | Visibilidad completa sobre la carga operativa, tiempos de respuesta, demanda por máquina y cuellos de botella. | Carece de métricas claras sobre el tiempo invertido en triaje manual y los puntos críticos del flujo de trabajo. |

# **3\. Doble Contexto de Aplicación (Enfoque Honesto y Verificable)**

Para garantizar la aplicabilidad del sistema, se adopta una arquitectura de validación dividida en dos entornos complementarios:

## **Escenario A: Laboratorio Universitario Genérico (Simulación de Demanda)**

* **Función:** Escenario autónomo y simulado de alta demanda \[H\] para validar el comportamiento del sistema ante un flujo constante de solicitudes.  
* **Características:** Alto volumen simulado de solicitudes provenientes de usuarios novatos con conocimiento limitado en diseño para manufactura aditiva (DfAM).  
* **Costo Operativo:** Absorbido por monitores y encargados de laboratorio que revisan manualmente cada archivo subido.  
* **Valor Entregado:** Reducción drástica del tiempo de revisión simulado por solicitud, liberando la capacidad operativa para atender casos de ingeniería y rediseño de alta complejidad.

## **Contexto B: Abracadabra Labs**

* **Función:** Banco de Pruebas con Piezas y Pruebas Físicas Reales.  
* **Estado Actual:** Estudio en etapa pre-comercial (sin historial masivo de ventas), que cuenta con un catálogo real de modelos STL propios (maceteros, componentes funcionales) e impresiones ejecutadas en hardware dedicado (Creality Ender 5 Max, volumen útil \$400 \\times 400 \\times 400\\text{ mm}\$).  
* **Rol Operativo:** Sus modelos STL reales e impresiones físicas en la Creality Ender 5 Max (perfil de volumen útil 400x400x400 mm) forman un dataset sintético de 30 tickets de prueba (12 cotizaciones viables, 6 no viables, 6 fallos de impresión, 4 casos Tier 2 de CAD/mantenimiento y 2 solicitudes incompletas o ambiguas) para calibrar y evaluar las reglas del Agente Tier 1\.

# **4\. Propuesta de Valor**

* **Evaluación Inmediata:** Respuesta sobre viabilidad dimensional, compatibilidad de material y cotización base calculada en minutos en lugar de días.  
* **Resolución Automática de Fallos Comunes (Tier 1):** Diagnóstico y guía autónoma para problemas recurrentes de impresión (*warping*, *stringing*, falta de adherencia en cama, degradación por humedad en filamento) sin intervención humana.  
* **Escalamiento Técnico Estructurado (Tier 2):** Derivación limpia de casos complejos hacia el especialista humano, incluyendo un resumen de parámetros técnicos, priorización por tipo de problema y cumplimiento de SLAs.

# **5\. Fuera de Alcance (Out of Scope \- MVP)**

Las siguientes funcionalidades quedan expresamente excluidas del alcance de la versión inicial (MVP):

* **Pasarela de pagos transaccionales:** No se procesarán cobros en línea ni integraciones bancarias.  
* **Gestión de inventario físico:** No se realizará seguimiento automatizado del stock de rollos de filamento en bodega.  
* **Slicing cloud automático:** No se generará código G (*G-code*) mediante laminación remota en la nube.

# **6\. Escenarios Simulados del Modelo (Supuestos \[H\] y Salidas \[S\])**

Los volúmenes, tiempos y porcentajes son escenarios simulados \[S\] con supuestos declarados \[H\].

1. **Escenario Bajo:** 40 solicitudes/sem \[H\], 10 min revisión \[H\], 30% Tier 1 \[H\], 20% reducción Tier 2 \[H\]. Pasa de 6,7 h manuales a 3,7 h con PrintOps (44% ahorro simulado \[S\]).  
2. **Escenario Base:** 80 solicitudes/sem \[H\], 20 min revisión \[H\], 50% Tier 1 \[H\], 30% reducción Tier 2 \[H\]. Pasa de 26,7 h manuales a 9,3 h con PrintOps (65% ahorro simulado \[S\]).  
3. **Escenario Alto / Pico de semestre:** 150 solicitudes/sem \[H\], 30 min revisión \[H\], 70% Tier 1 \[H\], 40% reducción Tier 2 \[H\]. Pasa de 75,0 h manuales a 13,5 h con PrintOps (82% ahorro simulado \[S\]).

