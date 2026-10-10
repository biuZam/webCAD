# LeatherDraft

[English](README.md) · [简体中文](README.zh-CN.md) · [繁體中文](README.zh-TW.md) · [Deutsch](README.de.md) · [Français](README.fr.md) · [Español](README.es.md) · **Italiano** · [Português](README.pt.md) · [日本語](README.ja.md) · [한국어](README.ko.md)

Uno strumento CAD 2D nel browser per disegnare **modelli di pelle in millimetri** e stamparli o tagliarli a **scala reale 1:1**.

Funziona interamente nel browser: nessun account, nessun server, e i file non lasciano mai il dispositivo. Si installa come app e funziona offline; è disponibile anche un'app desktop per Windows, macOS e Linux.

![LeatherDraft: disegno di un portacarte, arrotondamento degli angoli, aggiunta di una linea di cucitura collegata e di fori con punzone, ridimensionamento ed esportazione](docs/media/demo.gif)

> **Stato: pre-1.0.** Le funzioni di disegno, lavorazione della pelle ed esportazione sono implementate e testate. Restano da completare prima del rilascio: una verifica fisica della precisione di stampa su stampanti reali, controlli di compatibilità con Inkscape, Illustrator e LightBurn, e alcune voci minori (vedi [`docs/TASKS.md`](docs/TASKS.md)).

## Download

Gli installer desktop sono nella **[pagina Releases](https://github.com/biuZam/webCAD/releases/latest)**:

- Windows: `LeatherDraft_<versione>_x64-setup.exe`
- macOS (Apple Silicon e Intel): `LeatherDraft_<versione>_universal.dmg`

Gli installer non sono ancora firmati. Su Windows, in SmartScreen fai clic su **Ulteriori informazioni → Esegui comunque**; su macOS, la prima volta fai clic destro sull'app e scegli **Apri**. Linux: compila dai sorgenti (vedi l'app desktop più sotto).

## Manuale utente

Istruzioni passo passo per ogni strumento, stampa a dimensione reale, scorciatoie ed esempio completo:

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

## Cosa fa

**Disegno**

- Linee (ogni segmento è un oggetto a sé, come in CAD) e polilinee, rettangoli e quadrati (con raggio d'angolo), cerchi (centro + raggio, 3 punti, ellisse), penna Bézier, archi a 3 punti
- Linee di mezzeria (utilizzabili come assi di simmetria) e perpendicolari
- Etichette: testo (nome del pezzo, «taglia 2»…) e frecce della venatura, sul livello Note
- Sposta, ruota, scala e specchia (ciascuno anche come copia), capovolgi sul posto; matrici lineari e circolari
- Offset, raccordo e smusso; parallele; taglia, estendi e dividi; unisci percorsi; unione e differenza di forme
- Modifica diretta dei punti e delle maniglie Bézier; passaggio dei punti da liscio ad angolo; aggiunta ed eliminazione di punti; trascinamento delle forme selezionate per spostarle
- Aggancio agli oggetti: estremità, punto medio, centro, quadrante, intersezione, perpendicolare, tangente, più vicino, griglia; tracciamento polare e di oggetto
- Vincoli: parallelo, perpendicolare, tangente, coincidente, distanza e raggio, risolti in modo che il primo oggetto resti fermo e il secondo si sposti
- Valori esatti: digitate coordinate, lunghezze, angoli e raggi mentre disegnate; modificate i numeri nel pannello delle proprietà
- Livelli (taglio, cucitura, riferimento, note) con visibilità, blocco e colore; visualizzazione in mm, cm o pollici

**Specifico per la pelle**

- **Linee di cucitura** a un margine impostato da un contorno, collegate ad esso: modificate il contorno e la linea di cucitura lo segue
- **Fori di cucitura** con passi di punzone a rombo (2,7, 3,38, 3,85, 4,0, 5,0 mm o personalizzato), tondi o ad asola inclinata. Con «foro su ogni angolo», la spaziatura viene ripartita lato per lato in modo che un foro cada esattamente su ogni angolo, come quando si passa il punzone.
- I fori seguono la loro linea di cucitura, che segue il contorno, tutto in un unico passo di annullamento
- **Numero di fori per lato**, e un controllo che due lati da cucire insieme abbiano lo stesso numero (Misura → Numero di fori)
- **Fori per ribattini e asole** per ribattini, bottoni a pressione e fibbie, con i diametri di punzone più comuni
- **Tacche**: segni di allineamento singoli o doppi su qualsiasi lato, a taglio o a V

**Output**

- **SVG** a 1:1 (1 unità = 1 mm), un livello per gruppo, con l'opzione di convertire le curve in brevi segmenti rettilinei per il software laser
- **PDF** per stampanti domestiche: suddiviso su A4, Letter o A3 con sovrapposizione, segni di taglio ed etichette dei fogli, più una pagina di assemblaggio con un **quadrato di calibrazione da 50 mm**. Oppure una singola pagina dimensionata sul modello, per stampanti di grande formato.
- **DXF** (mm) per software laser e CNC, e un'immagine **PNG** da condividere
- **Filigrana** opzionale sulle esportazioni (ripetuta su ogni pagina del PDF)
- **Importa SVG o DXF** a dimensione reale sul livello di riferimento, per ricalcare un modello esistente
- Salvataggio e apertura di file di progetto `.json`. Il lavoro viene salvato automaticamente nel browser e ripristinato al ricaricamento.

### Stampa a dimensione reale

Stampate il PDF al **100 % / «Dimensione effettiva»**, mai «Adatta alla pagina», quindi misurate il quadrato da 50 mm nella prima pagina. Se non misura 50 mm, controllate le impostazioni di scala della stampante.

## Scorciatoie da tastiera

| Tasto | Strumento | Tasto | Strumento |
| --- | --- | --- | --- |
| V | Seleziona (e modifica punti) | M | Sposta |
| L | Linea / polilinea | O | Ruota |
| R | Rettangolo | S | Scala |
| C | Cerchio / 3 punti / ellisse | I | Specchio |
| P | Penna (curve) | Shift+H / Shift+V | Specchia orizzontale / verticale |
| A | Arco (3 punti) | E | Offset |
| X | Linea di mezzeria | F | Raccordo |
| T | Perpendicolare | B | Smusso |
| D | Misura | K | Linea di cucitura |
| N | Etichetta / freccia della venatura | H | Fori di cucitura |
| G | Parallela | W | Taglia / estendi / dividi |
| U | Foro per punzone / asola | Y | Margine di cucitura (per lato) |
| Q | Matrice (lineare / circolare) | J | Tacca |
| Shift+J | Unisci percorsi | Shift+U / Shift+D | Unione / differenza |
| Z | Vincolo | Shift+X | Esplodi in segmenti |

Gli strumenti simili condividono una casella della tavolozza, come in Photoshop: **clic destro** su una casella con triangolo nell'angolo (o pressione prolungata, o → su di essa) per sceglierne un altro. I gruppi sono: linea / polilinea, rettangolo / quadrato, cerchio / cerchio a 3 punti / ellisse, penna / arco, perpendicolare / parallela, raccordo / smusso, offset / margine di cucitura, punzone / tacca, specchia orizzontale / verticale, unisci / esplodi, unione / differenza. Il pannello laterale si richiude con la freccia in alto.

Ogni strumento e ogni tasto azione si può modificare in **Scorciatoie…** nella barra degli strumenti (salvate per browser).

Durante il disegno: **iniziate a digitare un numero** per inserirlo nella barra di input, **Tab** passa da un campo all'altro, **Invio** applica, **Esc** annulla, **Backspace** elimina l'ultimo punto, **Maiusc** blocca gli angoli a passi di 15°. **Spazio + trascina** o trascinamento con il pulsante centrale sposta la vista; la rotella fa lo zoom. **⌘/Ctrl+Z / ⇧⌘Z** annullano e ripetono, **⌘/Ctrl+S** salva, **⌘/Ctrl+O** apre, **⌘/Ctrl+A** seleziona tutto.

## Sviluppo

Richiede **Node ≥ 20.19** e **pnpm 10** (`corepack enable` prende la versione da `package.json`).

```bash
pnpm install
pnpm dev                     # http://localhost:5173
```

URL utili in sviluppo:

- `?fixture=acceptance`: il disegno di collaudo del PRD (quadrato da 100 mm, cerchio da 50 mm, fori di cucitura da 3,85 mm)
- `?fixture=perf`: 2.000 entità per i controlli di prestazioni

Le sessioni con fixture non vengono mai salvate automaticamente, quindi non possono sovrascrivere il vostro lavoro.

| Comando | Cosa fa |
| --- | --- |
| `pnpm test` | Test unitari e di componente (Vitest); `pnpm test <file>` o `pnpm test -t "<nome>"` per uno solo |
| `pnpm check` | Controllo dei tipi, lint, test e rapporto sulle traduzioni |
| `pnpm verify` | Tutto ciò che esegue la CI: quanto sopra più formattazione, build di produzione e budget del bundle |
| `pnpm build` / `pnpm preview` | Build di produzione (con service worker) e anteprima locale |
| `pnpm i18n:check` | Chiavi mancanti nelle lingue diverse dall'inglese |
| `pnpm bundle:check` | Il download iniziale deve restare sotto i 600 KB gzip |
| `BENCH=1 pnpm test perf.bench` | Misura delle prestazioni su 2.000 entità |

Se le installazioni dei pacchetti sono lente dove vi trovate, provate un mirror del registro, ad es. `pnpm install --registry=https://registry.npmmirror.com`.

### App desktop (Tauri)

`src-tauri/` avvolge la stessa build di Vite in una finestra nativa (Windows, macOS, Linux). Servono una toolchain Rust e gli strumenti di build della piattaforma ([prerequisiti Tauri](https://v2.tauri.app/start/prerequisites/)).

```bash
pnpm desktop:dev             # finestra nativa sul server di sviluppo Vite (hot reload)
pnpm desktop:build           # installer per questo sistema in src-tauri/target/release/bundle/
pnpm tauri build --bundles app   # macOS: solo LeatherDraft.app, senza .dmg
```

Differenze rispetto all'app web: Salva, Apri ed Esporta usano le finestre di dialogo native (Salva continua a scrivere nello stesso file fino alla chiusura), e non c'è un service worker; l'app si aggiorna installando una nuova versione. Il salvataggio automatico funziona come nel browser. Tauri non può compilare in modalità cross, quindi gli installer di Windows arrivano dalla CI: eseguite il flusso di lavoro **Desktop** (`.github/workflows/desktop.yml`) o inviate un tag `desktop-v*`; produce un `.exe` per Windows (NSIS) e un `.dmg` universale per macOS come artefatti del flusso. Le icone in `src-tauri/icons` sono generate da `public/icon.svg` con `pnpm tauri icon public/icon.svg -o src-tauri/icons`.

### Tecnologie

React 19 + TypeScript + Vite · [Paper.js](http://paperjs.org) per geometria e rendering · Zustand + Immer (store del documento, annulla/ripeti come patch) · [paperjs-offset](https://github.com/glenzli/paperjs-offset) con Clipper come ripiego per gli offset · jsPDF + svg2pdf.js per il PDF (caricati su richiesta) · i18next · vite-plugin-pwa · Vitest.

### Come funziona nel complesso

- **Il disegno è JSON semplice in millimetri**, conservato in uno store. Ogni modifica è un comando, il che permette di annullare senza limiti e ha file di salvataggio semplici.
- **Paper.js** disegna lo schermo ed esegue i calcoli geometrici, ma non possiede i dati.
- **Le entità collegate vengono rigenerate nello stesso comando** che modifica la loro sorgente, così linee e fori di cucitura non sono mai obsoleti.
- **Il PDF è generato dallo stesso SVG** che l'app esporta, quindi schermo, SVG e stampa non possono divergere.

Per approfondire:

- [`docs/ARCHITECTURE.md`](docs/ARCHITECTURE.md): scelte di progettazione, livelli, modello dei dati, note su prestazioni e accessibilità
- [`docs/USER_GUIDE.it.md`](docs/USER_GUIDE.it.md) e altre lingue: manuale utente (vedi la sezione Lingue)
- [`docs/MCP.md`](docs/MCP.md): server MCP senza interfaccia, perché i client IA possano disegnare, modificare, cucire ed esportare modelli
- [`docs/TASKS.md`](docs/TASKS.md): elenco delle attività e avanzamento per milestone
- [`PRD — Leather Pattern CAD (Web).md`](<PRD — Leather Pattern CAD (Web).md>): requisiti del prodotto
- [`CLAUDE.md`](CLAUDE.md): convenzioni per lavorare sul codice

### Criteri di qualità

- **Precisione.** Gli offset restano entro 0,02 mm dalla distanza richiesta, e gli archi di raccordo entro 0,001 mm da un vero cerchio. La scala del PDF viene verificata nei test rileggendo i comandi di disegno del PDF come millimetri di pagina.
- **Prestazioni.** 2.000 entità (17.600 fori di cucitura) si ridisegnano in circa 12 ms.
- **Accessibilità.** I contrasti di colore WCAG 2.2 AA sono verificati in CI per i temi chiaro e scuro, e un audit axe-core non segnala violazioni.

## Lingue

L'interfaccia è disponibile in inglese, 简体中文, 繁體中文, Deutsch, Français, Español, Italiano, Português, 日本語 e 한국어; si cambia con l'icona del globo nella barra degli strumenti. Il testo delle pagine PDF segue la lingua dell'interfaccia, e il testo cinese nei PDF (testo delle pagine, etichette, nomi) viene stampato con un carattere Noto Sans SC incorporato.

Il manuale utente è disponibile in [inglese](docs/USER_GUIDE.md), [italiano](docs/USER_GUIDE.it.md) e nelle altre lingue in `docs/`. Questo README esiste nelle stesse lingue nella radice del progetto.

## Licenza

LeatherDraft è **a codice disponibile** sotto la [PolyForm Noncommercial License 1.0.0](LICENSE):

- **Gratuito** per uso personale, hobbistico, di studio e ricerca, e per scuole, associazioni di beneficenza e altre organizzazioni senza scopo di lucro. Potete modificare il codice e condividere le modifiche per scopi non commerciali.
- **I vostri modelli e prodotti sono vostri.** Disegni, file esportati e articoli in pelle realizzati con essi non hanno restrizioni; potete venderli.
- **L'uso commerciale del software in sé** (venderlo, o vendere una versione modificata, offrirlo come servizio, integrarlo in un prodotto commerciale) richiede una licenza commerciale. Le versioni modificate non possono essere usate commercialmente. Vedi [COMMERCIAL.md](COMMERCIAL.md).
- I contributi sono benvenuti; i collaboratori firmano una volta un [CLA](CLA.md). Vedi [CONTRIBUTING.md](CONTRIBUTING.md).

«LeatherDraft» e il suo logo non sono coperti dalla licenza. Le versioni fino al commit `ca93653` / `7db180a` (10 ottobre 2026) sono state rilasciate sotto Apache-2.0.
