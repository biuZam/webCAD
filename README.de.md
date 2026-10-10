# LeatherDraft

[English](README.md) · [简体中文](README.zh-CN.md) · [繁體中文](README.zh-TW.md) · **Deutsch** · [Français](README.fr.md) · [Español](README.es.md) · [Italiano](README.it.md) · [Português](README.pt.md) · [日本語](README.ja.md) · [한국어](README.ko.md)

Ein browserbasiertes 2D-CAD-Werkzeug zum Zeichnen von **Lederschnittmustern in Millimetern**, die Sie im **originalgetreuen Maßstab 1:1** drucken oder schneiden.

Es läuft vollständig im Browser: kein Konto, kein Server, und Ihre Dateien verlassen Ihr Gerät nie. Es lässt sich als App installieren und funktioniert offline. Außerdem gibt es eine Desktop-App für Windows, macOS und Linux.

![LeatherDraft: Ein Kartenetui wird gezeichnet, die Ecken werden gerundet, eine verknüpfte Stichlinie und Rautenlöcher hinzugefügt, die Form angepasst und exportiert](docs/media/demo.gif)

> **Status: vor 1.0.** Die Funktionen für Zeichnen, Leder und Export sind umgesetzt und getestet. Vor der Veröffentlichung stehen noch offen: eine physische Druckgenauigkeitsprüfung auf echten Druckern, Kompatibilitätsprüfungen mit Inkscape, Illustrator und LightBurn sowie einige kleinere Punkte (siehe [`docs/TASKS.md`](docs/TASKS.md)).

## Benutzerhandbuch

Schritt-für-Schritt-Anleitungen zu jedem Werkzeug, zum Drucken im Originalmaß, zu Tastenkürzeln und ein durchgearbeitetes Beispiel:

- [Benutzerhandbuch (Deutsch)](docs/USER_GUIDE.de.md)
- [Benutzerhandbuch (English)](docs/USER_GUIDE.md)

## Funktionsumfang

**Zeichnen**

- Linien (jedes Segment ein eigenes Objekt, wie im CAD) und Polylinien, Rechtecke und Quadrate (mit Eckradius), Kreise (Mittelpunkt + Radius, 3 Punkte, Ellipse), Bézier-Feder, Bögen durch 3 Punkte
- Mittellinien (als Spiegelachsen verwendbar) und Senkrechte
- Beschriftungen: Text (Teilname, „2× zuschneiden“ …) und Narbenrichtungspfeile, auf der Ebene Notizen
- Verschieben, Drehen, Skalieren und Spiegeln (jeweils wahlweise als Kopie), Umdrehen an Ort und Stelle; lineare und kreisförmige Arrays
- Versatz, Verrundung und Fase; Parallelen; Trimmen, Verlängern und Teilen; Pfade verbinden; Vereinigung und Differenz von Formen
- Punkte und Bézier-Griffe direkt bearbeiten; Punkte zwischen glatt und Ecke umschalten; Punkte hinzufügen und löschen; ausgewählte Formen ziehen, um sie zu verschieben
- Objektfang: Endpunkt, Mittelpunkt, Zentrum, Quadrant, Schnittpunkt, Lot, Tangente, nächster Punkt, Raster; Polar- und Objektverfolgung
- Zwangsbedingungen: parallel, senkrecht, tangential, koinzident, Abstand und Radius, gelöst so, dass das erste Objekt stehen bleibt und das zweite sich bewegt
- Genaue Werte: Koordinaten, Längen, Winkel und Radien während des Zeichnens eingeben; Zahlen im Eigenschaftenbereich bearbeiten
- Ebenen (Schnitt, Stiche, Referenz, Notizen) mit Sichtbarkeit, Sperre und Farbe; Anzeige in mm, cm oder Zoll

**Lederspezifisch**

- **Stichlinien** in einem festen Abstand zu einer Kontur, mit ihr verknüpft: Bearbeiten Sie die Kontur, folgt die Stichlinie
- **Stichlöcher** mit Rautenbeitel-Teilungen (2,7, 3,38, 3,85, 4,0, 5,0 mm oder benutzerdefiniert), rund oder als schräger Schlitz. Mit „Loch an jeder Ecke“ wird der Abstand je Kante so verteilt, dass genau an jeder Ecke ein Loch sitzt, wie beim Führen des Beitels.
- Löcher folgen ihrer Stichlinie, die ihrer Kontur folgt, alles in einem Rückgängig-Schritt
- **Lochanzahl je Kante** sowie eine Prüfung, ob zwei zu vernähende Kanten dieselbe Anzahl haben (Messen → Lochanzahl)
- **Stanzlöcher und Schlitze** für Nieten, Druckknöpfe und Schnallen, mit üblichen Stanzdurchmessern
- **Kerben**: einfache oder doppelte Passmarken an jeder Kante, als Einschnitt oder V-Kerbe

**Ausgabe**

- **SVG** im Maßstab 1:1 (1 Einheit = 1 mm), eine Ebene pro Gruppe, mit der Option, Kurven in kurze gerade Linien umzuwandeln, für Lasersoftware
- **PDF** für Heimdrucker: auf A4, Letter oder A3 mit Überlappung, Schnittmarken und Bogenbeschriftung, dazu eine Montageseite mit einem **50-mm-Kalibrierquadrat**. Oder eine einzelne Seite in Schnittmustergröße, für Großformatdrucker.
- **DXF** (mm) für Laser- und CNC-Software, und ein **PNG**-Bild zum Teilen
- Optionales **Wasserzeichen** auf Exporten (auf jeder PDF-Seite wiederholt)
- **SVG oder DXF importieren** im Originalmaß auf die Referenzebene, um ein bestehendes Muster nachzuzeichnen
- Projektdateien (`.json`) speichern und öffnen. Die Arbeit wird im Browser automatisch gesichert und beim Neuladen wiederhergestellt.

### Drucken im Originalmaß

Drucken Sie das PDF mit **100 % / „Tatsächliche Größe“**, niemals „An Seite anpassen“, und messen Sie dann das 50-mm-Quadrat auf der ersten Seite. Ist es nicht 50 mm, prüfen Sie die Skalierungseinstellungen Ihres Druckers.

## Tastenkürzel

| Taste | Werkzeug | Taste | Werkzeug |
| --- | --- | --- | --- |
| V | Auswählen (und Punkte bearbeiten) | M | Verschieben |
| L | Linie / Polylinie | O | Drehen |
| R | Rechteck | S | Skalieren |
| C | Kreis / 3 Punkte / Ellipse | I | Spiegeln |
| P | Feder (Kurven) | Shift+H / Shift+V | Horizontal / vertikal spiegeln |
| A | Bogen (3 Punkte) | E | Versatz |
| X | Mittellinie | F | Verrundung |
| T | Senkrechte | B | Fase |
| D | Messen | K | Stichlinie |
| N | Beschriftung / Narbenrichtungspfeil | H | Stichlöcher |
| G | Parallele | W | Trimmen / Verlängern / Teilen |
| U | Stanzloch / Schlitz | Y | Nahtzugabe (je Kante) |
| Q | Array (linear / kreisförmig) | J | Kerbe |
| Shift+J | Pfade verbinden | Shift+U / Shift+D | Vereinigung / Differenz |
| Z | Zwangsbedingung | Shift+X | In Segmente auflösen |

Ähnliche Werkzeuge teilen sich einen Platz in der Palette, wie in Photoshop: **Rechtsklick** auf einen Platz mit Eckdreieck (oder langes Drücken, oder → darauf) wählt ein anderes Werkzeug. Gruppen sind Linie / Polylinie, Rechteck / Quadrat, Kreis / Dreipunktkreis / Ellipse, Feder / Bogen, Senkrechte / Parallele, Verrundung / Fase, Versatz / Nahtzugabe, Stanze / Kerbe, horizontal / vertikal spiegeln, Verbinden / Auflösen, Vereinigung / Differenz. Der Seitenbereich klappt mit dem Pfeil oben weg.

Jedes Werkzeug und jede Aktionstaste lässt sich unter **Tastenkürzel…** in der Werkzeugleiste ändern (pro Browser gespeichert).

Beim Zeichnen: **Eine Zahl tippen**, um sie in die Eingabezeile zu setzen; **Tab** wechselt zwischen Feldern, **Enter** übernimmt, **Esc** bricht ab, **Rücktaste** entfernt den letzten Punkt, **Shift** rastet Winkel auf 15°-Schritte ein. **Leertaste + Ziehen** oder mittlere Maustaste verschiebt, das Mausrad zoomt. **⌘/Strg+Z / ⇧⌘Z** macht rückgängig bzw. wiederholt, **⌘/Strg+S** speichert, **⌘/Strg+O** öffnet, **⌘/Strg+A** wählt alles aus.

## Entwicklung

Voraussetzung sind **Node ≥ 20.19** und **pnpm 10** (`corepack enable` übernimmt die Version aus `package.json`).

```bash
pnpm install
pnpm dev                     # http://localhost:5173
```

Nützliche URLs in der Entwicklung:

- `?fixture=acceptance`: die Abnahmezeichnung aus dem PRD (100-mm-Quadrat, 50-mm-Kreis, 3,85-mm-Stichlöcher)
- `?fixture=perf`: 2.000 Elemente für Leistungsprüfungen

Fixture-Sitzungen werden nie automatisch gespeichert und können daher Ihre eigene Arbeit nicht überschreiben.

| Befehl | Was er tut |
| --- | --- |
| `pnpm test` | Unit- und Komponententests (Vitest); `pnpm test <Datei>` oder `pnpm test -t "<Name>"` für einzelne Tests |
| `pnpm check` | Typprüfung, Lint, Tests und Übersetzungsbericht |
| `pnpm verify` | Alles, was die CI ausführt: das Obige plus Formatierung, Produktionsbuild und Bundle-Budget |
| `pnpm build` / `pnpm preview` | Produktionsbuild (mit Service Worker) und lokale Vorschau davon |
| `pnpm i18n:check` | Schlüssel, die in nicht-englischen Sprachen fehlen |
| `pnpm bundle:check` | Der initiale Download muss unter 600 KB gzip bleiben |
| `BENCH=1 pnpm test perf.bench` | Leistungsmessung mit 2.000 Elementen |

Wenn Paketinstallationen bei Ihnen langsam sind, probieren Sie einen Registry-Spiegel, z. B. `pnpm install --registry=https://registry.npmmirror.com`.

### Desktop-App (Tauri)

`src-tauri/` hüllt denselben Vite-Build in ein natives Fenster (Windows, macOS, Linux). Dafür braucht man eine Rust-Toolchain sowie die Build-Werkzeuge der Plattform ([Tauri-Voraussetzungen](https://v2.tauri.app/start/prerequisites/)).

```bash
pnpm desktop:dev             # natives Fenster auf dem Vite-Entwicklungsserver (Hot Reload)
pnpm desktop:build           # Installer für dieses Betriebssystem in src-tauri/target/release/bundle/
pnpm tauri build --bundles app   # macOS: nur LeatherDraft.app, ohne .dmg
```

Unterschiede zur Web-App: Speichern, Öffnen und Exportieren nutzen native Dateidialoge (Speichern schreibt bis zum Beenden weiter in dieselbe Datei), und es gibt keinen Service Worker; die App aktualisiert sich durch Installation einer neuen Version. Die automatische Sicherung funktioniert wie im Browser. Tauri kann nicht plattformübergreifend kompilieren, daher kommen Windows-Installer aus der CI: Starten Sie den Workflow **Desktop** (`.github/workflows/desktop.yml`) oder pushen Sie einen `desktop-v*`-Tag; er erstellt eine Windows-`.exe` (NSIS) und ein universelles macOS-`.dmg` als Workflow-Artefakte. App-Symbole in `src-tauri/icons` werden aus `public/icon.svg` erzeugt mit `pnpm tauri icon public/icon.svg -o src-tauri/icons`.

### Technologien

React 19 + TypeScript + Vite · [Paper.js](http://paperjs.org) für Geometrie und Darstellung · Zustand + Immer (Dokumentspeicher, Rückgängig/Wiederholen als Patches) · [paperjs-offset](https://github.com/glenzli/paperjs-offset) mit Clipper als Fallback für Versätze · jsPDF + svg2pdf.js für PDF (bei Bedarf geladen) · i18next · vite-plugin-pwa · Vitest.

### Zusammenspiel

- **Die Zeichnung ist einfaches JSON in Millimetern**, im Speicher gehalten. Jede Änderung ist ein Befehl, was unbegrenztes Rückgängigmachen und einfache Speicherdateien ermöglicht.
- **Paper.js** zeichnet den Bildschirm und übernimmt die Geometrierechnung, besitzt die Daten aber nicht.
- **Verknüpfte Elemente werden im selben Befehl neu erzeugt**, der ihre Quelle ändert, sodass Stichlinien und Löcher nie veraltet sind.
- **Das PDF wird aus demselben SVG erzeugt**, das die App exportiert, daher können Bildschirm, SVG und Druck nicht auseinanderlaufen.

Mehr Details:

- [`docs/ARCHITECTURE.md`](docs/ARCHITECTURE.md): Entwurfsentscheidungen, Ebenen, Datenmodell, Hinweise zu Leistung und Barrierefreiheit
- [`docs/USER_GUIDE.de.md`](docs/USER_GUIDE.de.md) und weitere Sprachen: Benutzerhandbuch (siehe Abschnitt Sprachen)
- [`docs/MCP.md`](docs/MCP.md): headless MCP-Server, damit KI-Clients Muster zeichnen, bearbeiten, mit Stichen versehen und exportieren können
- [`docs/TASKS.md`](docs/TASKS.md): Aufgabenliste und Fortschritt nach Meilensteinen
- [`PRD — Leather Pattern CAD (Web).md`](<PRD — Leather Pattern CAD (Web).md>): Produktanforderungen
- [`CLAUDE.md`](CLAUDE.md): Konventionen für die Arbeit am Code

### Qualitätsmaßstäbe

- **Genauigkeit.** Versätze bleiben innerhalb von 0,02 mm der gewünschten Distanz, Verrundungsbögen innerhalb von 0,001 mm eines echten Kreises. Die PDF-Skalierung wird in Tests geprüft, indem die Zeichenbefehle des PDFs als Seitenmillimeter zurückgelesen werden.
- **Leistung.** 2.000 Elemente (17.600 Stichlöcher) werden in etwa 12 ms neu gezeichnet.
- **Barrierefreiheit.** WCAG 2.2 AA-Farbkontraste werden in der CI für helles und dunkles Design erzwungen, und ein axe-core-Audit meldet keine Verstöße.

## Sprachen

Die Oberfläche ist auf Englisch, 简体中文, 繁體中文, Deutsch, Français, Español, Italiano, Português, 日本語 und 한국어 verfügbar; umschalten lässt sie sich mit dem Globus-Symbol in der Werkzeugleiste. Der Text auf PDF-Seiten folgt der Oberflächensprache; chinesischer Text in PDFs (Seitentext, Beschriftungen, Namen) wird mit einer eingebetteten Noto Sans SC-Schrift gedruckt.

Das Benutzerhandbuch gibt es auf [Englisch](docs/USER_GUIDE.md), [Deutsch](docs/USER_GUIDE.de.md) und in den weiteren Sprachen unter `docs/`. Die README gibt es in denselben Sprachen im Projektverzeichnis.

## Lizenz

LeatherDraft ist **quelloffen** unter der [PolyForm Noncommercial License 1.0.0](LICENSE):

- **Kostenlos** für persönliche, Hobby-, Lern- und Forschungszwecke sowie für Schulen, Wohltätigkeitsorganisationen und andere nichtkommerzielle Organisationen. Sie dürfen den Code ändern und Ihre Änderungen für nichtkommerzielle Zwecke weitergeben.
- **Ihre Muster und Produkte gehören Ihnen.** Zeichnungen, exportierte Dateien und die daraus gefertigten Lederwaren unterliegen keinen Einschränkungen; Sie dürfen sie verkaufen.
- **Kommerzielle Nutzung der Software selbst** (Verkauf der Software oder einer geänderten Version, Angebot als Dienst, Einbau in ein kommerzielles Produkt) erfordert eine kommerzielle Lizenz. Geänderte Versionen dürfen nicht kommerziell genutzt werden. Siehe [COMMERCIAL.md](COMMERCIAL.md).
- Beiträge sind willkommen; Mitwirkende unterzeichnen einmalig eine [CLA](CLA.md). Siehe [CONTRIBUTING.md](CONTRIBUTING.md).

„LeatherDraft“ und das Logo sind von der Lizenz nicht erfasst. Versionen bis zum Commit `ca93653` / `7db180a` (10. Oktober 2026) wurden unter Apache-2.0 veröffentlicht.
