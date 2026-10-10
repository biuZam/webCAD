# Manual de usuario de LeatherDraft

[English](USER_GUIDE.md) · [简体中文](USER_GUIDE.zh-CN.md) · [繁體中文](USER_GUIDE.zh-TW.md) · [Deutsch](USER_GUIDE.de.md) · [Français](USER_GUIDE.fr.md) · **Español** · [Italiano](USER_GUIDE.it.md) · [Português](USER_GUIDE.pt.md) · [日本語](USER_GUIDE.ja.md) · [한국어](USER_GUIDE.ko.md)

LeatherDraft es una herramienta de dibujo 2D para patrones de marroquinería. Dibuja en milímetros e imprime o corta a escala real 1:1. Funciona en el navegador (o como aplicación de escritorio), no requiere cuenta y sus archivos permanecen en su dispositivo.

## Índice

1. [La pantalla](#1-la-pantalla)
2. [Conceptos básicos: selección, introducción de valores, ajustes, vista](#2-conceptos-básicos)
3. [Herramientas de dibujo](#3-herramientas-de-dibujo)
4. [Modificar formas](#4-modificar-formas)
5. [Herramientas de cuero](#5-herramientas-de-cuero)
6. [Restricciones](#6-restricciones)
7. [Medir](#7-medir)
8. [Capas y propiedades](#8-capas-y-propiedades)
9. [Archivos: guardar, abrir, importar, autoguardado](#9-archivos)
10. [Exportar e imprimir a escala real](#10-exportar-e-imprimir)
11. [Atajos de teclado](#11-atajos-de-teclado)
12. [Ejemplo práctico: una cartera de tarjetas](#12-ejemplo-práctico-una-cartera-de-tarjetas)
13. [Solución de problemas](#13-solución-de-problemas)

---

## 1. La pantalla

| Zona | Contenido |
| --- | --- |
| **Barra de herramientas** (arriba) | Nombre del proyecto, Nuevo, Abrir…, Guardar, Importar…, Exportar…, Deshacer / Rehacer, Atajos…, Idioma |
| **Paleta de herramientas** (izquierda) | Todas las herramientas, agrupadas. Una casilla con un pequeño triángulo en la esquina contiene más herramientas: **clic derecho** sobre ella (o pulsación larga, o → si tiene el foco) para elegir otra. La casilla recuerda la última que usó. |
| **Área de dibujo** (centro) | El lienzo en milímetros, con cuadrícula. Aquí aparecen el aviso de la herramienta y la **barra de entrada** para valores escritos. |
| **Panel lateral** (derecha) | **Capas** y **Propiedades**. Se pliega con la flecha de la parte superior. |
| **Barra de estado** (abajo) | Coordenadas X/Y del cursor, zoom, separación de la cuadrícula, número de objetos y de objetos seleccionados, unidades de visualización y el menú **Ajustes**. |

Cada herramienta muestra una línea que indica qué debe hacer a continuación: qué pulsar o qué escribir. Léala si no está seguro.

## 2. Conceptos básicos

### Seleccionar

Con **Seleccionar** (V):

- Haga clic en un objeto para seleccionarlo; **Mayús+clic** añade o quita.
- Arrastre un recuadro **de izquierda a derecha** para seleccionar los objetos que queden totalmente dentro; **de derecha a izquierda** para seleccionar todo lo que toque.
- **Arrastre** un objeto seleccionado para moverlo; mantenga **Alt** mientras arrastra para mover una copia.
- **Supr** elimina la selección. **⌘/Ctrl+A** selecciona todo. **Esc** anula la selección.

**Editar puntos.** Con una forma seleccionada aparecen sus puntos y manejadores de Bézier:

- Arrastre un punto o manejador para moverlo.
- **Doble clic en un punto** para cambiarlo entre suave y esquina.
- **Doble clic en el contorno** para añadir un punto.
- Haga clic en un punto y pulse **Supr** para eliminarlo.

### Introducir valores exactos

Todas las herramientas de dibujo y edición aceptan números. **Empiece a escribir un número**: irá a la barra de entrada.

- **Tab** pasa al siguiente campo (por ejemplo, Longitud → Ángulo, o X → Y).
- **Intro** aplica, **Esc** borra.
- Las longitudes están en las unidades elegidas en la barra de estado (mm, cm o in). Los ángulos están en grados, en sentido antihorario desde la dirección +X.

Mantenga **Mayús** mientras dibuja para bloquear los ángulos en incrementos de 15°.

### Ajustes

El cursor se ajusta a la geometría existente. Abra **Ajustes** en la barra de estado para activar o desactivar cada tipo:

Extremo · Punto medio · Centro · Cuadrante · Intersección · Perpendicular · Tangente · Más cercano · Cuadrícula · Rastreo polar (45°) · Rastreo de objetos

La marca en el cursor muestra qué ajuste está activo.

### Moverse por la vista

- **Rueda del ratón** o pellizco en el touchpad: zoom en la posición del cursor.
- **Espacio + arrastrar** o **arrastrar con el botón central**: desplazar.
- El nivel de zoom aparece en la barra de estado; al 100 %, 1 mm se dibuja como 96/25,4 píxeles CSS (tamaño real nominal).

### Deshacer

**⌘/Ctrl+Z** deshace, **⇧⌘Z / Ctrl+Mayús+Z** (o Ctrl+Y) rehace. Cada acción es exactamente un paso de deshacer, incluidas las líneas de costura y los agujeros enlazados que actualiza. Deshacer no tiene límite dentro de una sesión.

## 3. Herramientas de dibujo

Las formas nuevas se colocan en la **capa activa** (véase [Capas](#8-capas-y-propiedades)). La mayoría de herramientas terminan una forma con **Intro, doble clic o clic derecho**, y **Retroceso** elimina el último punto.

| Herramienta | Tecla | Uso |
| --- | --- | --- |
| **Línea** | L | Haga clic en los puntos o escriba longitud y ángulo. Cada segmento es un objeto independiente, como en CAD. Haga clic en el primer punto para cerrar. |
| **Polilínea** | (grupo Línea) | Igual que Línea, pero todos los segmentos forman una sola trayectoria. Cámbiela con el campo *Modo* de la herramienta Línea. |
| **Rectángulo** | R | Haga clic en dos esquinas o escriba ancho y alto. Mantenga **Alt** en el primer clic para dibujar desde el centro. Use *Radio de esquina* para esquinas redondeadas. |
| **Cuadrado** | (grupo Rectángulo) | Rectángulo con un solo valor de *Lado*. |
| **Círculo** | C | Haga clic en el centro y luego en un punto de la circunferencia, o escriba el radio. |
| **Círculo de 3 puntos** | (grupo Círculo) | Haga clic en tres puntos por los que pasa el círculo. |
| **Elipse** | (grupo Círculo) | Haga clic en el centro, en el extremo del primer eje y luego defina el otro radio. |
| **Pluma (curvas)** | P | Clic para un punto de esquina, **arrastrar** para un punto de curva suave. Escriba longitud y ángulo para un borde recto. Haga clic en el primer punto para cerrar. |
| **Arco (3 puntos)** | A | Haga clic en el inicio, el final y un punto por el que pasa el arco. |
| **Línea de eje** | X | Haga clic en una forma para trazar un eje vertical u horizontal por su centro, o dibuje uno con dos puntos. Las líneas de eje sirven como ejes de simetría. |
| **Perpendicular** | T | Haga clic en un borde recto y luego coloque una línea en ángulo recto (o escriba la distancia a lo largo del borde y la longitud). |
| **Paralela** | G | Haga clic en un borde recto y luego en el lado y la distancia, o escriba la distancia. |
| **Etiqueta** | N | Modo *Texto*: haga clic donde empieza el texto, escriba (p. ej. «Frente · cortar 2»), Intro. Modo *Flecha de dirección de la flor*: haga clic en los dos extremos. Las etiquetas van en la capa Notas. |

## 4. Modificar formas

### Transformar

**Mover, Girar, Escalar, Simetría** y **Matriz** actúan sobre la selección. Si no hay nada seleccionado, la herramienta le pide primero seleccionar objetos; pulse **Intro** o clic derecho al terminar. Marque **Conservar original (copia)** para transformar una copia.

| Herramienta | Tecla | Pasos |
| --- | --- | --- |
| **Mover** | M | Punto base → destino, o escriba ΔX y ΔY. |
| **Girar** | O | Centro → haga clic en el ángulo, o escríbalo. Mayús ajusta a 15°. |
| **Escalar** | S | Punto base (se mantiene fijo) → escriba un factor, o haga clic en un punto de referencia y luego en donde debe ir. |
| **Simetría** | I | Haga clic en una línea de eje para reflejar respecto a ella, o en dos puntos de un eje (o un punto y escriba el ángulo). |
| **Matriz** | Q | *Lineal*: punto base → dónde va la siguiente copia; *Número* incluye el original. *Circular*: centro → Intro; 360° reparte las copias uniformemente, menos grados las reparte de la primera a la última. |
| **Voltear horizontal / vertical** | Mayús+H / Mayús+V | Voltea la selección en su sitio, al instante. |

### Editar

| Herramienta | Tecla | Pasos |
| --- | --- | --- |
| **Desfase** | E | Haga clic en una trayectoria, un círculo o una línea de eje, luego en el lado. La distancia sigue al cursor, o escríbala. *Esquinas*: vivas, redondeadas o biseladas. Haga clic de nuevo para más desfases; Esc para elegir otro origen. |
| **Redondeo** | F | Sitúe el cursor sobre una esquina entre dos bordes rectos y haga clic para redondearla. **Mayús+clic** redondea todas las esquinas de la forma. Escriba un radio para cambiarlo; si es demasiado grande, el aviso indica el mayor que cabe. |
| **Chaflán** | B | Como Redondeo, pero corta la esquina en línea recta. Escriba dos distancias, o una distancia y un ángulo. |
| **Recortar / extender / dividir** | W | *Recortar*: haga clic en el tramo de línea que quiere eliminar, hasta los cruces más cercanos. *Extender*: haga clic cerca del extremo de una línea para alargarla hasta la siguiente. *Dividir*: haga clic en una línea para partirla en ese punto. Mayús+clic intercambia recortar y extender. |
| **Unir trayectorias** | Mayús+J | Une las trayectorias abiertas seleccionadas que se encuentran extremo con extremo; una sola trayectoria cuyos extremos coinciden se cierra. |
| **Descomponer** | Mayús+X | Separa los rectángulos, polilíneas o contornos seleccionados en segmentos individuales. |
| **Unión** | Mayús+U | Fusiona dos o más formas cerradas seleccionadas en un único contorno. |
| **Diferencia** | Mayús+D | Recorta de la mayor las otras formas cerradas seleccionadas. |

## 5. Herramientas de cuero

Esto es lo que diferencia a LeatherDraft de un programa de CAD general. Sus resultados **permanecen enlazados**: si edita un contorno, su línea de costura lo sigue; los agujeros siguen a la línea de costura. Todo se actualiza en el mismo paso de deshacer.

### Línea de costura (K)

1. Haga clic en un contorno.
2. Haga clic dentro o fuera para elegir el lado. El margen procede de los ajustes del proyecto (véase más abajo), o escriba otro valor.

La línea de costura se dibuja en la capa Costura y, desde entonces, sigue a su contorno. Para romper el enlace, seleccione la línea y pulse **Desvincular** en Propiedades.

### Agujeros de costura (H)

1. Ajuste las opciones en la barra de entrada:
   - **Paso** del punzón de rombo: 2,7, 3,38, 3,85, 4,0 o 5,0 mm, o **Personalizado**.
   - **Tamaño del agujero** y **Forma**: *Redondo* o *Ranura inclinada* (como un punzón de rombo).
   - **Agujero en cada esquina**: el espaciado se reparte por borde para que caiga un agujero exactamente en cada esquina, como se haría al pasar el punzón.
2. Pase el cursor sobre una línea de costura (o cualquier línea) para previsualizar los agujeros y su número.
3. Haga clic para añadirlos.

Puede cambiar el paso, el tamaño o la forma después en Propiedades; la lista **Por borde** muestra el número de agujeros de cada borde.

### Valores predeterminados del proyecto

Sin nada seleccionado, la sección **Proyecto** de Propiedades define los valores predeterminados para nuevas líneas de costura y agujeros: **Margen de costura** (3,5 mm), **Paso** (3,85 mm) y **Tamaño del agujero** (1,2 mm); los valores predeterminados aparecen entre corchetes.

### Margen de costura (Y)

1. Haga clic en un contorno cerrado.
2. Escriba un valor para todos los bordes, o haga clic en bordes (Mayús+clic para varios) y escriba un valor solo para ellos.
3. Pulse **Intro** sin escribir nada para añadir el contorno.

### Agujero de remache / ranura (U)

Para remaches, broches a presión, postes de tornillo y lengüetas de hebilla. Elija *Agujero redondo* o *Ranura*, seleccione un diámetro de **Punzón** habitual o **Personalizado**, y haga clic para colocarlo (se ajusta a centros y puntos) o escriba X/Y y pulse Intro. En una ranura, *Longitud* es de extremo a extremo y *Anchura* es el diámetro del punzón.

### Muesca (J)

Marcas de alineación para el montaje. Elija *Simple* o *Doble*, y *Corte (línea)* o *Muesca en V*, ajuste la profundidad (y la separación / anchura) y haga clic en un borde. Las muescas apuntan hacia el interior de la pieza; en líneas abiertas, hacia el lado del cursor.

### Estilos de línea

En Propiedades, ajuste el **Estilo de línea** de una trayectoria: *Sólida (corte)*, *Discontinua (doblez / rayado)*, *Punteada (referencia)* o *Trazo y punto (eje)*. **Trazo (exportación)** define el grosor de línea usado en los archivos exportados.

## 6. Restricciones

La herramienta **Restricción** (Z) hace exactas las relaciones entre formas. En cada caso, lo **primero** que haga clic se mantiene fijo y lo **segundo** se mueve.

| Tipo | Haga clic en |
| --- | --- |
| **Paralela** / **Perpendicular** | Dos bordes rectos. |
| **Tangente** | Un borde recto o un círculo, y luego el círculo (o borde) que debe ser tangente. |
| **Coincidente** | Dos puntos. |
| **Distancia** | Dos puntos, luego escriba la distancia y pulse Intro (Intro sola mantiene la actual). |
| **Radio** | Un círculo, luego escriba el radio y pulse Intro. |

Si una restricción nueva entra en conflicto con las existentes, no cambia nada y el aviso lo indica.

Los objetos seleccionados enumeran sus restricciones en la sección **Restricciones** de Propiedades. Una restricción marcada como *No satisfecha* indica que la geometría se movió después de resolverla; pulse **Resolver** para restablecerla. *Rota* significa que algo a lo que hace referencia cambió o se eliminó; elimínela con su botón ×.

## 7. Medir

**Medir** (D) tiene cuatro modos:

- **Distancia**: haga clic en dos puntos.
- **Ángulo**: haga clic en un punto, en el vértice y luego en otro punto.
- **Longitud**: pase el cursor sobre una forma para ver su longitud.
- **Número de agujeros**: haga clic en un borde de un conjunto de agujeros y luego en el borde al que se coserá. El aviso indica si los números coinciden o cuántos agujeros de diferencia hay, para que ajuste el paso o las longitudes de los bordes antes de cortar.

## 8. Capas y propiedades

### Capas

Cada dibujo tiene cuatro capas:

| Capa | Uso |
| --- | --- |
| **Corte** | Contornos a cortar. |
| **Costura** | Líneas de costura y agujeros. |
| **Referencia** | Líneas de construcción y dibujos importados. |
| **Notas** | Etiquetas y flechas de dirección de la flor. |

En cada capa puede **mostrar / ocultar** (casilla), cambiar su **color** (muestra), **bloquear / desbloquear** (candado) y hacer clic en su nombre para **dibujar en ella**. No se puede dibujar en una capa bloqueada u oculta.

### Propiedades

Seleccione objetos para ver y editar sus valores: posición, ancho y alto, longitud, radio o diámetro, rotación, capa, estilo de línea, texto, paso, etc. Escriba un valor y pulse Intro. Con varios objetos seleccionados, los valores distintos aparecen como «—»; escribir uno los establece a todos.

### Unidades

Elija **mm**, **cm** o **in** en la barra de estado. Esto solo cambia lo que se muestra y se escribe; el dibujo siempre se guarda en milímetros.

## 9. Archivos

- **Guardar** (⌘/Ctrl+S) escribe un archivo de proyecto `.json`. **⌘/Ctrl+Mayús+S** guarda con un nombre nuevo.
- **Abrir…** (⌘/Ctrl+O) abre un proyecto `.json`.
- **Nuevo** inicia un proyecto vacío (pregunta antes si hay cambios sin guardar).
- El nombre del proyecto está en la barra de herramientas; un punto en el título de la pestaña del navegador indica cambios sin guardar.
- **Importar…** trae un archivo **SVG o DXF** a escala real a la capa Referencia, seleccionado, para que pueda calcar un patrón existente.
- **Autoguardado**: su trabajo se guarda en el navegador medio segundo después de cada cambio y se restaura la próxima vez que abra LeatherDraft. El autoguardado es una red de seguridad, no un sustituto de guardar el archivo: borrar los datos del navegador lo elimina.

**Aplicación de escritorio**: Guardar, Abrir y Exportar usan los diálogos de archivo del sistema, y Guardar sigue escribiendo en el mismo archivo.

**Sin conexión**: una vez cargada, la aplicación web funciona sin conexión («Listo para trabajar sin conexión»). Cuando hay una nueva versión, un aviso ofrece **Recargar**.

## 10. Exportar e imprimir

**Exportar…** abre el diálogo de exportación.

| Formato | Uso | Opciones |
| --- | --- | --- |
| **PDF** | Impresión a 1:1 | Papel (A4, Letter, A3, o **Una página, ajustada al patrón** para impresoras de gran formato), orientación (*Menos páginas*, vertical, horizontal), solapamiento entre hojas |
| **SVG** | Cortadoras láser, plotters de corte, Inkscape, Illustrator | Curvas convertidas en líneas rectas cortas (para software láser que no lee curvas) |
| **DXF** | Software láser y CNC, en mm | Solo formas: las etiquetas se omiten |
| **PNG** | Compartir una imagen | Resolución: 96, 150 o 300 dpi. No sirve para hacer el patrón. |

Opciones habituales: **Solo capas de corte (láser)**, **Incluir etiquetas**, **Grosor de línea** y una **Marca de agua** (texto y opacidad; en los PDF se repite en cada página).

Si el dibujo contiene objetos creados por IA (mediante el servidor MCP) que nadie ha revisado, el diálogo le avisa. Selecciónelos desde la barra de estado y pulse **Marcar como revisado** en Propiedades cuando los haya comprobado.

### Impresión a escala real

Un PDF por hojas empieza con una **página de montaje**: un mapa de las hojas y un **cuadrado de calibración de 50 mm**. Cada hoja tiene marcas de corte y una etiqueta (A1, A2, B1…).

1. Imprima al **100 % / «Tamaño real»**. Nunca «Ajustar a la página» ni «Reducir páginas grandes».
2. **Mida el cuadrado de 50 mm.** Si no mide exactamente 50 mm, corrija la escala en la impresora e imprima de nuevo.
3. Recorte por la línea discontinua o solape las hojas, alineando las marcas de esquina y las etiquetas de hoja, y péguelas con cinta.

## 11. Atajos de teclado

### Herramientas y acciones

| Tecla | Herramienta | Tecla | Herramienta |
| --- | --- | --- | --- |
| V | Seleccionar | M | Mover |
| L | Línea / polilínea | O | Girar |
| R | Rectángulo / cuadrado | S | Escalar |
| C | Círculo / 3 puntos / elipse | I | Simetría |
| P | Pluma (curvas) | Q | Matriz |
| A | Arco (3 puntos) | W | Recortar / extender / dividir |
| X | Línea de eje | E | Desfase |
| T | Perpendicular | Y | Margen de costura |
| G | Paralela | F | Redondeo |
| N | Etiqueta / flecha de dirección de la flor | B | Chaflán |
| D | Medir | K | Línea de costura |
| Z | Restricción | H | Agujeros de costura |
| U | Agujero de remache / ranura | J | Muesca |
| Mayús+H / Mayús+V | Voltear horizontal / vertical | Mayús+J | Unir trayectorias |
| Mayús+X | Descomponer | Mayús+U / Mayús+D | Unión / diferencia |

Puede cambiar cualquiera de estos atajos en **Atajos…** de la barra de herramientas. Son teclas de letra, con o sin Mayús, que se reconocen por su posición en el teclado, así que funcionan con cualquier distribución de teclado o método de entrada. Se guardan por navegador; **Restablecer todo** devuelve los valores predeterminados.

### General

| Tecla | Acción |
| --- | --- |
| ⌘/Ctrl+Z, ⇧⌘Z / Ctrl+Y | Deshacer, rehacer |
| ⌘/Ctrl+S, ⌘/Ctrl+Mayús+S | Guardar, guardar como |
| ⌘/Ctrl+O | Abrir |
| ⌘/Ctrl+A | Seleccionar todo |
| Supr | Eliminar la selección o el punto seleccionado |
| Esc | Cancelar / anular selección |
| Intro, doble clic, clic derecho | Terminar una forma / confirmar |
| Retroceso | Eliminar el último punto mientras dibuja |
| Mayús (mantenida) | Bloquear el ángulo en incrementos de 15° |
| Alt (mantenida) | Rectángulo desde el centro; copiar al arrastrar |
| Teclas numéricas | Empezar a escribir un valor |
| Tab | Siguiente campo de entrada |
| Espacio + arrastrar, arrastrar con el botón central | Desplazar |
| Rueda, pellizco | Zoom |

## 12. Ejemplo práctico: una cartera de tarjetas

1. **Rectángulo** (R): haga clic una vez, escriba `95`, Tab, `65`, Intro. Tiene una pieza de 95 × 65 mm en la capa Corte.
2. **Redondeo** (F): escriba `5`, luego **Mayús+clic** en una esquina para redondear las cuatro.
3. **Línea de costura** (K): haga clic en el contorno y luego dentro. Con el margen predeterminado obtendrá una línea de costura a 3,5 mm del borde.
4. **Agujeros de costura** (H): elija el paso **3,85**, marque **Agujero en cada esquina**, pase el cursor sobre la línea de costura y haga clic.
5. **Etiqueta** (N): haga clic dentro de la pieza, escriba `Cartera de tarjetas · cortar 2`, Intro.
6. Pruebe a cambiar el contorno: seleccione el rectángulo y ponga **A** en `100` en Propiedades. La línea de costura y los agujeros lo siguen.
7. **Guardar** (⌘/Ctrl+S), luego **Exportar…** → PDF → A4 → imprima al 100 % y mida el cuadrado de 50 mm.

## 13. Solución de problemas

| Problema | Solución |
| --- | --- |
| No se dibuja nada / «La capa activa está bloqueada u oculta» | Desbloquee o muestre la capa, o elija otra en Capas. |
| La impresión sale un poco más pequeña o más grande | El PDF se escaló. Imprima al 100 % / Tamaño real y vuelva a comprobar el cuadrado de 50 mm. |
| Redondeo dice «demasiado grande para esta esquina» | Use el mayor radio que muestra el aviso, o alargue los bordes. |
| Los números de agujeros no coinciden en dos bordes a coser | Use Medir → Número de agujeros, y luego ajuste el paso o la longitud de un borde. |
| Restricción «conflicto» | La nueva restricción contradice las existentes. Elimine una en Propiedades → Restricciones. |
| El software láser muestra curvas rotas | Exporte SVG con **Curvas convertidas en líneas rectas cortas**, o use DXF. |
| Un atajo de herramienta no responde | Puede que un campo de texto tenga el foco: haga clic primero en el lienzo. Revise **Atajos…** por si la tecla se reasignó. |
