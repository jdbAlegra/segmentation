# Instrucciones adicionales
🎯 Objetivo de la visual

Construir una visual auto-explicativa que muestre cómo el valor (revenue) se concentra de forma no lineal en una base de clientes, sin requerir explicación oral.

La visual debe permitir entender en 5 segundos que:

Los clientes no aportan valor de forma uniforme

Una minoría explica una fracción desproporcionada del revenue

El promedio no representa al negocio

El corte “Lite / Core” es una aproximación gruesa

📊 Visual principal: Curva de concentración de riqueza (tipo Lorenz)
Concepto (qué representa)

Una curva que responde visualmente a esta pregunta:

“Si ordeno todos los clientes desde el que menos factura al que más factura, ¿qué porcentaje del revenue total se ha acumulado cuando llevo X% de clientes?”

🧠 Semántica (esto es clave, no negociable)
Eje X

Qué es: porcentaje de clientes

Cómo: clientes ordenados de menor a mayor facturación

Rango: 0% → 100%

Label obligatorio (legible):

% de clientes (ordenados de menor a mayor facturación)

Eje Y

Qué es: porcentaje acumulado del revenue total

Rango: 0% → 100%

Label obligatorio (legible):

% acumulado del revenue total

🧮 Cómo construir los datos (paso a paso)

Tomar la lista de clientes activos

Para cada cliente, calcular su revenue en el período definido (ej: MRR promedio últimos 3 meses)

Ordenar clientes por revenue ascendente

Calcular:

porcentaje acumulado de clientes

porcentaje acumulado de revenue

Generar pares (x, y) donde:

x = (clientes acumulados / total clientes) * 100

y = (revenue acumulado / revenue total) * 100

📐 Elementos visuales obligatorios
1. Curva principal

Tipo: línea o área suave

Representa la acumulación real de revenue

Debe verse claramente convexa (no diagonal)

2. Línea de igualdad (baseline)

Diagonal punteada de (0,0) a (100,100)

Representa el mundo ficticio donde todos los clientes aportan igual

Sirve como referencia visual inmediata

3. Línea vertical de referencia (Lite)

Línea vertical punteada en X = 60%

Representa el corte interno actual de “Lite”

No decir “Lite” en el gráfico, solo marcar el porcentaje

🧠 Lectura guiada implícita (sin texto largo)

El gráfico debe permitir que alguien entienda esto solo mirando:

Si en X = 60%, Y ≈ 20–40% →
👉 “La mayoría aporta poco; el valor está concentrado arriba”

Si la curva se despega mucho de la diagonal →
👉 “El mercado no es normal ni uniforme”

🧼 Estilo visual (muy importante)

Estética limpia, fondo claro u oscuro consistente con el sistema

Sin colores chillones

Sin números decimales innecesarios

Grid suave o mínimo

Nada de tooltips verbosos (solo % clientes, % revenue)

Esto no es analytics, es storytelling para decisión.

❌ Antipatrones (explícitamente prohibidos)

❌ Ejes sin labels

❌ Usar términos técnicos tipo “Lorenz” o “Gini”

❌ Mostrar revenue absoluto ($)

❌ Mostrar promedios

❌ Mostrar “Lite vs Core” como categorías

❌ Hacerlo interactivo (sliders, toggles, etc.)

✅ Criterio de éxito

La visual es correcta si:

Un director puede decir en 10 segundos:

“Ok, ahora entiendo por qué el promedio no sirve”

No necesita explicación oral

Soporta la tesis: segmentar por etapa, no por etiqueta

# Contexto
Quiero proponer en mi empresa una nueva segmetnación que sea acorde a la distribución lognormal de usuarios actualmente para ello necesito un storytelling basado en algo particular y quiero armar una interfaz interactiva donde se vaya contando la historia
# datos clave
Lite es el 60% del total de usuarios con 40% de revenue
Core es el 40% del total de usuarios con el 60% de revenue
