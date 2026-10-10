# LeatherDraft

[English](README.md) · [简体中文](README.zh-CN.md) · [繁體中文](README.zh-TW.md) · [Deutsch](README.de.md) · [Français](README.fr.md) · **Español** · [Italiano](README.it.md) · [Português](README.pt.md) · [日本語](README.ja.md) · [한국어](README.ko.md)

Herramienta CAD 2D en el navegador para dibujar **patrones de cuero en milímetros** e imprimirlos o cortarlos a **escala real 1:1**.

Funciona íntegramente en el navegador: sin cuenta, sin servidor, y sus archivos nunca salen de su dispositivo. Se instala como aplicación y funciona sin conexión; también hay una aplicación de escritorio para Windows, macOS y Linux.

![LeatherDraft: dibujo de una cartera de tarjetas, redondeo de esquinas, adición de una línea de costura vinculada y agujeros de punzón, cambio de tamaño y exportación](docs/media/demo.gif)

> **Estado: previo a la 1.0.** Las funciones de dibujo, trabajo en cuero y exportación están implementadas y probadas. Antes de la publicación quedan pendientes: una comprobación física de la precisión de impresión en impresoras reales, pruebas de compatibilidad con Inkscape, Illustrator y LightBurn, y algunos puntos menores (véase [`docs/TASKS.md`](docs/TASKS.md)).

## Manual de usuario

Instrucciones paso a paso para cada herramienta, impresión a escala real, atajos y un ejemplo completo:

- [English](docs/USER_GUIDE.md)
- [简体中文](docs/USER_GUIDE.zh-CN.md)
- [繁體中文](docs/USER_GUIDE.zh-TW.md)
- [Deutsch](docs/USER_GUIDE.de.md)
- [Français](docs/USER_GUIDE.fr.md)
- [Español](docs/USER_GUIDE.es.md)
- [Italiano](docs/USER_GUIDE.it.md)
- [Português](docs/USER_GUIDE.pt.md)
- [日本語](docs/USER_GUIDE.ja.md)
- [한국어](docs/USER_GUIDE.ko.md)

## Qué hace

**Dibujo**

- Líneas (cada segmento es un objeto independiente, como en CAD) y polilíneas, rectángulos y cuadrados (con radio de esquina), círculos (centro + radio, 3 puntos, elipse), pluma Bézier, arcos de 3 puntos
- Líneas de eje (utilizables como ejes de simetría) y perpendiculares
- Etiquetas: texto (nombre de la pieza, «cortar 2»…) y flechas de dirección de la flor, en la capa Notas
- Mover, girar, escalar y reflejar (cada uno opcionalmente como copia), voltear en su sitio; matrices lineales y circulares
- Desfase, redondeo y chaflán; paralelas; recortar, extender y dividir; unir trayectorias; unión y diferencia de formas
- Editar puntos y manejadores Bézier directamente; cambiar puntos entre suave y esquina; añadir y eliminar puntos; arrastrar las formas seleccionadas para moverlas
- Ajuste a objetos: extremo, punto medio, centro, cuadrante, intersección, perpendicular, tangente, más cercano, cuadrícula; rastreo polar y de objetos
- Restricciones: paralela, perpendicular, tangente, coincidente, distancia y radio, resueltas de modo que el primer objeto permanezca fijo y el segundo se mueva
- Valores exactos: escriba coordenadas, longitudes, ángulos y radios mientras dibuja; edite los números en el panel de propiedades
- Capas (corte, costura, referencia, notas) con visibilidad, bloqueo y color; visualización en mm, cm o pulgadas

**Específico del cuero**

- **Líneas de costura** a un margen definido de un contorno, vinculadas a él: si edita el contorno, la línea de costura lo sigue
- **Agujeros de costura** con pasos de punzón de rombo (2,7, 3,38, 3,85, 4,0, 5,0 mm o personalizado), redondos o en ranura inclinada. Con «agujero en cada esquina», el espaciado se reparte por borde para que un agujero caiga exactamente en cada esquina, como al pasar el punzón.
- Los agujeros siguen su línea de costura, que sigue su contorno, todo en un solo paso de deshacer
- **Número de agujeros por borde**, y una comprobación de que dos bordes que se van a coser tienen el mismo número (Medir → Número de agujeros)
- **Agujeros de punzón y ranuras** para remaches, broches a presión y hebillas, con los diámetros de punzón habituales
- **Muescas**: marcas de alineación simples o dobles en cualquier borde, como cortes o muescas en V

**Salida**

- **SVG** a 1:1 (1 unidad = 1 mm), una capa por grupo, con la opción de convertir las curvas en líneas rectas cortas para software láser
- **PDF** para impresoras domésticas: dividido en A4, Letter o A3 con solapamiento, marcas de corte y etiquetas de hoja, más una página de montaje con un **cuadrado de calibración de 50 mm**. O una sola página ajustada al patrón, para impresoras de gran formato.
- **DXF** (mm) para software láser y CNC, y una imagen **PNG** para compartir
- **Marca de agua** opcional en las exportaciones (se repite en cada página del PDF)
- **Importar SVG o DXF** a tamaño real en la capa de referencia, para calcar un patrón existente
- Guardar y abrir archivos de proyecto `.json`. El trabajo se guarda automáticamente en el navegador y se restaura al recargar.

### Impresión a escala real

Imprima el PDF al **100 % / «Tamaño real»**, nunca «Ajustar a la página», y luego mida el cuadrado de 50 mm de la primera página. Si no mide 50 mm, revise la configuración de escala de su impresora.

## Atajos de teclado

| Tecla | Herramienta | Tecla | Herramienta |
| --- | --- | --- | --- |
| V | Seleccionar (y editar puntos) | M | Mover |
| L | Línea / polilínea | O | Girar |
| R | Rectángulo | S | Escalar |
| C | Círculo / 3 puntos / elipse | I | Simetría |
| P | Pluma (curvas) | Shift+H / Shift+V | Voltear horizontal / vertical |
| A | Arco (3 puntos) | E | Desfase |
| X | Línea de eje | F | Redondeo |
| T | Perpendicular | B | Chaflán |
| D | Medir | K | Línea de costura |
| N | Etiqueta / flecha de dirección de la flor | H | Agujeros de costura |
| G | Paralela | W | Recortar / extender / dividir |
| U | Agujero de punzón / ranura | Y | Margen de costura (por borde) |
| Q | Matriz (lineal / circular) | J | Muesca |
| Shift+J | Unir trayectorias | Shift+U / Shift+D | Unión / diferencia |
| Z | Restricción | Shift+X | Descomponer en segmentos |

Las herramientas similares comparten una casilla de la paleta, como en Photoshop: **clic derecho** sobre una casilla con triángulo en la esquina (o pulsación larga, o → sobre ella) para elegir otra. Los grupos son: línea / polilínea, rectángulo / cuadrado, círculo / círculo de 3 puntos / elipse, pluma / arco, perpendicular / paralela, redondeo / chaflán, desfase / margen de costura, punzón / muesca, voltear horizontal / vertical, unir / descomponer, unión / diferencia. El panel lateral se pliega con la flecha de la parte superior.

Cada herramienta y cada tecla de acción se puede cambiar en **Atajos…** de la barra de herramientas (se guarda por navegador).

Mientras dibuja: **empiece a escribir un número** para introducirlo en la barra de entrada, **Tab** cambia de campo, **Intro** aplica, **Esc** cancela, **Retroceso** elimina el último punto, **Mayús** bloquea los ángulos en pasos de 15°. **Espacio + arrastrar** o arrastrar con el botón central desplaza la vista; la rueda hace zoom. **⌘/Ctrl+Z / ⇧⌘Z** deshacen y rehacen, **⌘/Ctrl+S** guarda, **⌘/Ctrl+O** abre, **⌘/Ctrl+A** selecciona todo.

## Desarrollo

Requiere **Node ≥ 20.19** y **pnpm 10** (`corepack enable` toma la versión de `package.json`).

```bash
pnpm install
pnpm dev                     # http://localhost:5173
```

URLs útiles en desarrollo:

- `?fixture=acceptance`: el dibujo de aceptación del PRD (cuadrado de 100 mm, círculo de 50 mm, agujeros de costura de 3,85 mm)
- `?fixture=perf`: 2.000 entidades para comprobaciones de rendimiento

Las sesiones con fixture nunca se guardan automáticamente, así que no pueden sobrescribir su trabajo.

| Comando | Qué hace |
| --- | --- |
| `pnpm test` | Pruebas unitarias y de componentes (Vitest); `pnpm test <archivo>` o `pnpm test -t "<nombre>"` para una sola |
| `pnpm check` | Comprobación de tipos, lint, pruebas e informe de traducciones |
| `pnpm verify` | Todo lo que ejecuta la CI: lo anterior más formato, compilación de producción y presupuesto del paquete |
| `pnpm build` / `pnpm preview` | Compilación de producción (con service worker) y vista previa local |
| `pnpm i18n:check` | Claves que faltan en los idiomas distintos del inglés |
| `pnpm bundle:check` | La descarga inicial debe quedar por debajo de 600 KB gzip |
| `BENCH=1 pnpm test perf.bench` | Medición de rendimiento con 2.000 entidades |

Si las instalaciones de paquetes van lentas donde está, pruebe un espejo del registro, p. ej. `pnpm install --registry=https://registry.npmmirror.com`.

### Aplicación de escritorio (Tauri)

`src-tauri/` envuelve la misma compilación de Vite en una ventana nativa (Windows, macOS, Linux). Necesita una cadena de herramientas de Rust y las herramientas de compilación de la plataforma ([requisitos de Tauri](https://v2.tauri.app/start/prerequisites/)).

```bash
pnpm desktop:dev             # ventana nativa sobre el servidor de desarrollo de Vite (recarga en caliente)
pnpm desktop:build           # instalador para este sistema en src-tauri/target/release/bundle/
pnpm tauri build --bundles app   # macOS: solo LeatherDraft.app, sin .dmg
```

Diferencias con la aplicación web: Guardar, Abrir y Exportar usan los diálogos de archivo nativos (Guardar sigue escribiendo en el mismo archivo hasta que cierra la aplicación), y no hay service worker; la aplicación se actualiza instalando una nueva versión. El autoguardado funciona igual que en el navegador. Tauri no puede compilar de forma cruzada, así que los instaladores de Windows se generan en la CI: ejecute el flujo **Desktop** (`.github/workflows/desktop.yml`) o suba una etiqueta `desktop-v*`; genera un `.exe` de Windows (NSIS) y un `.dmg` universal de macOS como artefactos del flujo. Los iconos de `src-tauri/icons` se generan a partir de `public/icon.svg` con `pnpm tauri icon public/icon.svg -o src-tauri/icons`.

### Tecnologías

React 19 + TypeScript + Vite · [Paper.js](http://paperjs.org) para geometría y renderizado · Zustand + Immer (almacén del documento, deshacer/rehacer como parches) · [paperjs-offset](https://github.com/glenzli/paperjs-offset) con Clipper como alternativa para los desfases · jsPDF + svg2pdf.js para PDF (se cargan bajo demanda) · i18next · vite-plugin-pwa · Vitest.

### Cómo encaja todo

- **El dibujo es JSON sencillo en milímetros**, guardado en un almacén. Cada cambio es un comando, lo que permite deshacer sin límite y tener archivos de guardado simples.
- **Paper.js** dibuja la pantalla y hace los cálculos geométricos, pero no es dueño de los datos.
- **Las entidades vinculadas se regeneran dentro del mismo comando** que cambia su origen, así que las líneas y los agujeros de costura nunca quedan desactualizados.
- **El PDF se genera a partir del mismo SVG** que exporta la aplicación, de modo que la pantalla, el SVG y la impresión no pueden desviarse entre sí.

Más detalles:

- [`docs/ARCHITECTURE.md`](docs/ARCHITECTURE.md): decisiones de diseño, capas, modelo de datos, notas de rendimiento y accesibilidad
- [`docs/USER_GUIDE.es.md`](docs/USER_GUIDE.es.md) y otros idiomas: manual de usuario (véase la sección Idiomas)
- [`docs/MCP.md`](docs/MCP.md): servidor MCP sin interfaz, para que los clientes de IA puedan dibujar, editar, coser y exportar patrones
- [`docs/TASKS.md`](docs/TASKS.md): lista de tareas y progreso por hitos
- [`PRD — Leather Pattern CAD (Web).md`](<PRD — Leather Pattern CAD (Web).md>): requisitos del producto
- [`CLAUDE.md`](CLAUDE.md): convenciones para trabajar en el código

### Criterios de calidad

- **Precisión.** Los desfases se mantienen dentro de 0,02 mm de la distancia solicitada, y los arcos de redondeo dentro de 0,001 mm de un círculo verdadero. La escala del PDF se verifica en las pruebas leyendo de nuevo los comandos de dibujo del PDF como milímetros de página.
- **Rendimiento.** 2.000 entidades (17.600 agujeros de costura) se redibujan en unos 12 ms.
- **Accesibilidad.** Los contrastes de color WCAG 2.2 AA se verifican en la CI para los temas claro y oscuro, y una auditoría axe-core no informa de infracciones.

## Idiomas

La interfaz está disponible en inglés, 简体中文, 繁體中文, Deutsch, Français, Español, Italiano, Português, 日本語 y 한국어; cámbielo con el icono del globo en la barra de herramientas. El texto de las páginas PDF sigue el idioma de la interfaz, y el texto chino en los PDF (texto de páginas, etiquetas, nombres) se imprime con una fuente Noto Sans SC incrustada.

El manual de usuario está disponible en [inglés](docs/USER_GUIDE.md), [español](docs/USER_GUIDE.es.md) y en los demás idiomas dentro de `docs/`. Este README existe en los mismos idiomas en la raíz del proyecto.

## Licencia

LeatherDraft es de **código disponible** bajo la [PolyForm Noncommercial License 1.0.0](LICENSE):

- **Gratis** para uso personal, de afición, estudio e investigación, y para escuelas, organizaciones benéficas y otras organizaciones sin ánimo de lucro. Puede modificar el código y compartir sus cambios con fines no comerciales.
- **Sus patrones y productos son suyos.** Los dibujos, los archivos exportados y los artículos de cuero que fabrique con ellos no tienen restricciones; puede venderlos.
- **El uso comercial del propio software** (venderlo, o vender una versión modificada, ofrecerlo como servicio, integrarlo en un producto comercial) requiere una licencia comercial. Las versiones modificadas no pueden usarse comercialmente. Véase [COMMERCIAL.md](COMMERCIAL.md).
- Las contribuciones son bienvenidas; los colaboradores firman una vez un [CLA](CLA.md). Véase [CONTRIBUTING.md](CONTRIBUTING.md).

«LeatherDraft» y su logotipo no están cubiertos por la licencia. Las versiones hasta el commit `ca93653` / `7db180a` (10 de octubre de 2026) se publicaron bajo Apache-2.0.
