# LeatherDraft Benutzerhandbuch

[English](USER_GUIDE.md) · [简体中文](USER_GUIDE.zh-CN.md) · [繁體中文](USER_GUIDE.zh-TW.md) · **Deutsch** · [Français](USER_GUIDE.fr.md) · [Español](USER_GUIDE.es.md) · [Italiano](USER_GUIDE.it.md) · [Português](USER_GUIDE.pt.md) · [日本語](USER_GUIDE.ja.md) · [한국어](USER_GUIDE.ko.md)

LeatherDraft ist ein 2D-Konstruktionswerkzeug für Lederschnittmuster. Sie zeichnen in Millimetern und drucken oder schneiden im originalgetreuen Maßstab 1:1. Es läuft im Browser (oder als Desktop-App), benötigt kein Konto, und Ihre Dateien bleiben auf Ihrem Gerät.

## Inhalt

1. [Der Bildschirm](#1-der-bildschirm)
2. [Grundlagen: Auswählen, Werte eingeben, Fangen, Ansicht](#2-grundlagen)
3. [Zeichenwerkzeuge](#3-zeichenwerkzeuge)
4. [Formen ändern](#4-formen-ändern)
5. [Lederspezifische Werkzeuge](#5-lederspezifische-werkzeuge)
6. [Zwangsbedingungen](#6-zwangsbedingungen)
7. [Messen](#7-messen)
8. [Ebenen und Eigenschaften](#8-ebenen-und-eigenschaften)
9. [Dateien: Speichern, Öffnen, Importieren, Automatisches Speichern](#9-dateien)
10. [Export und Drucken im Originalmaß](#10-export-und-drucken)
11. [Tastenkürzel](#11-tastenkürzel)
12. [Praxisbeispiel: ein Kartenetui](#12-praxisbeispiel-ein-kartenetui)
13. [Fehlerbehebung](#13-fehlerbehebung)

---

## 1. Der Bildschirm

| Bereich | Inhalt |
| --- | --- |
| **Werkzeugleiste** (oben) | Projektname, Neu, Öffnen…, Speichern, Importieren…, Exportieren…, Rückgängig / Wiederholen, Tastenkürzel…, Sprache |
| **Werkzeugpalette** (links) | Alle Werkzeuge, nach Gruppen geordnet. Ein Feld mit kleinem Eckdreieck enthält weitere Werkzeuge: **Rechtsklick** darauf (oder langer Druck, oder → bei Fokus), um ein anderes zu wählen. Das Feld merkt sich das zuletzt verwendete Werkzeug. |
| **Zeichenfläche** (Mitte) | Die Arbeitsfläche in Millimetern mit Raster. Die Werkzeughinweise und die **Eingabezeile** für Zahlenwerte erscheinen hier. |
| **Seitenleiste** (rechts) | **Ebenen** und **Eigenschaften**. Mit dem Pfeil oben einklappbar. |
| **Statusleiste** (unten) | Cursor-Position X/Y, Zoom, Rasterabstand, Anzahl der Objekte und der ausgewählten Objekte, Anzeigeeinheiten sowie das Menü **Fang**. |

Jedes Werkzeug zeigt eine Zeile mit dem nächsten Schritt an, also was Sie anklicken oder eingeben sollen. Lesen Sie sie, wenn Sie unsicher sind.

## 2. Grundlagen

### Auswählen

Mit **Auswählen** (V):

- Klicken Sie auf ein Objekt, um es auszuwählen; mit **Umschalt-Klick** fügen Sie hinzu oder entfernen.
- Ziehen Sie einen Rahmen **von links nach rechts**, um Objekte auszuwählen, die vollständig darin liegen; **von rechts nach links**, um alles auszuwählen, was er berührt.
- **Ziehen** Sie ein ausgewähltes Objekt, um es zu verschieben; halten Sie **Alt** beim Ziehen, um eine Kopie zu verschieben.
- **Entf** löscht die Auswahl. **⌘/Strg+A** wählt alles aus. **Esc** hebt die Auswahl auf.

**Punkte bearbeiten.** Wenn eine Form ausgewählt ist, erscheinen ihre Punkte und Bézier-Griffe:

- Ziehen Sie einen Punkt oder Griff, um ihn zu verschieben.
- **Doppelklick auf einen Punkt**, um zwischen Glatt und Ecke umzuschalten.
- **Doppelklick auf die Kontur**, um einen Punkt hinzuzufügen.
- Klicken Sie auf einen Punkt und drücken Sie **Entf**, um ihn zu entfernen.

### Genaue Werte eingeben

Alle Zeichen- und Bearbeitungswerkzeuge nehmen Zahlen an. **Einfach eine Zahl tippen**: Sie landet in der Eingabezeile.

- **Tab** springt zum nächsten Feld (zum Beispiel Länge → Winkel oder X → Y).
- **Eingabe** übernimmt, **Esc** leert das Feld.
- Längen werden in der in der Statusleiste gewählten Anzeigeeinheit angegeben (mm, cm oder in). Winkel in Grad, gegen den Uhrzeigersinn ab der +X-Richtung.

Halten Sie beim Zeichnen **Umschalt** gedrückt, um Winkel auf Schritte von 15° einzurasten.

### Fangen

Der Cursor rastet auf vorhandene Geometrie ein. Öffnen Sie **Fang** in der Statusleiste, um jede Art einzeln ein- oder auszuschalten:

Endpunkt · Mittelpunkt · Zentrum · Quadrant · Schnittpunkt · Lot · Tangente · Nächster Punkt · Raster · Polarverfolgung (45°) · Objektverfolgung

Die Markierung am Cursor zeigt an, welcher Fang aktiv ist.

### In der Ansicht navigieren

- **Mausrad** oder Trackpad-Pinch: Zoomen am Cursor.
- **Leertaste + Ziehen** oder **Ziehen mit mittlerer Maustaste**: Verschieben.
- Der Zoomfaktor steht in der Statusleiste; bei 100 % wird 1 mm als 96/25,4 CSS-Pixel dargestellt (nominelle Originalgröße).

### Rückgängig

**⌘/Strg+Z** macht rückgängig, **⇧⌘Z / Strg+Umschalt+Z** (oder Strg+Y) wiederholt. Jede Aktion ist genau ein Rückgängig-Schritt, einschließlich der verknüpften Stichlinien und Löcher, die sie aktualisiert. Rückgängig ist innerhalb einer Sitzung unbegrenzt.

## 3. Zeichenwerkzeuge

Neue Formen landen auf der **aktiven Ebene** (siehe [Ebenen](#8-ebenen-und-eigenschaften)). Die meisten Werkzeuge beenden eine Form mit **Eingabe, Doppelklick oder Rechtsklick**, und **Rücktaste** entfernt den letzten Punkt.

| Werkzeug | Taste | Verwendung |
| --- | --- | --- |
| **Linie** | L | Punkte anklicken oder Länge und Winkel eingeben. Jedes Segment ist, wie im CAD, ein eigenes Objekt. Den ersten Punkt anklicken, um zu schließen. |
| **Polylinie** | (Liniengruppe) | Wie Linie, aber alle Segmente bilden einen Pfad. Umschalten im Feld *Modus* des Linienwerkzeugs. |
| **Rechteck** | R | Zwei Ecken anklicken oder Breite und Höhe eingeben. Beim ersten Klick **Alt** halten, um vom Mittelpunkt aus zu zeichnen. Feld *Eckradius* für abgerundete Ecken. |
| **Quadrat** | (Rechteckgruppe) | Rechteck mit einem Wert *Seite*. |
| **Kreis** | C | Mittelpunkt anklicken, dann einen Punkt auf dem Kreis oder den Radius eingeben. |
| **Kreis durch 3 Punkte** | (Kreisgruppe) | Drei Punkte anklicken, durch die der Kreis verläuft. |
| **Ellipse** | (Kreisgruppe) | Mittelpunkt anklicken, dann das Ende der ersten Achse, danach den anderen Radius festlegen. |
| **Feder (Kurven)** | P | Klick für einen Eckpunkt, **Ziehen** für einen glatten Kurvenpunkt. Länge und Winkel eingeben für eine gerade Kante. Den ersten Punkt anklicken, um zu schließen. |
| **Bogen (3 Punkte)** | A | Start, Ende und einen Punkt anklicken, durch den der Bogen verläuft. |
| **Mittellinie** | X | Eine Form anklicken, um eine vertikale oder horizontale Mittellinie durch ihre Mitte zu legen, oder eine aus zwei Punkten zeichnen. Mittellinien dienen als Spiegelachsen. |
| **Senkrechte** | T | Eine gerade Kante anklicken, dann eine Linie im rechten Winkel dazu setzen (oder Abstand entlang der Kante und Länge eingeben). |
| **Parallele** | G | Eine gerade Kante anklicken, dann die Seite und den Abstand angeben oder den Abstand eingeben. |
| **Beschriftung** | N | Modus *Text*: Startpunkt anklicken, Text eingeben (z. B. „Vorderteil · 2× zuschneiden“), Eingabe. Modus *Narbenrichtungspfeil*: beide Enden anklicken. Beschriftungen liegen auf der Ebene Notizen. |

## 4. Formen ändern

### Transformieren

**Verschieben, Drehen, Skalieren, Spiegeln** und **Array** wirken auf die Auswahl. Ist nichts ausgewählt, bittet das Werkzeug zuerst um die Auswahl; drücken Sie **Eingabe** oder Rechtsklick, wenn Sie fertig sind. Setzen Sie den Haken bei **Original behalten (Kopie)**, um eine Kopie zu transformieren.

| Werkzeug | Taste | Schritte |
| --- | --- | --- |
| **Verschieben** | M | Bezugspunkt → Ziel, oder ΔX und ΔY eingeben. |
| **Drehen** | O | Mittelpunkt → Winkel anklicken oder eingeben. Umschalt rundet auf 15°. |
| **Skalieren** | S | Bezugspunkt (bleibt fest) → Faktor eingeben, oder einen Referenzpunkt und seinen Zielpunkt anklicken. |
| **Spiegeln** | I | Eine Mittellinie anklicken, um daran zu spiegeln, oder zwei Punkte einer Achse anklicken (oder einen Punkt und den Winkel eingeben). |
| **Array** | Q | *Linear*: Bezugspunkt → Position der nächsten Kopie; *Anzahl* zählt das Original mit. *Kreisförmig*: Mittelpunkt → Eingabe; 360° verteilt die Kopien gleichmäßig, kleinere Winkel vom ersten bis zum letzten. |
| **Horizontal / vertikal spiegeln** | Umschalt+H / Umschalt+V | Spiegelt die Auswahl sofort an Ort und Stelle. |

### Bearbeiten

| Werkzeug | Taste | Schritte |
| --- | --- | --- |
| **Versatz** | E | Einen Pfad, Kreis oder eine Mittellinie anklicken, dann die Seite. Der Abstand folgt dem Cursor oder wird eingegeben. *Ecken*: scharf, rund oder abgeschrägt. Erneut klicken für weitere Versätze; Esc, um eine andere Vorlage zu wählen. |
| **Verrundung** | F | Über einer Ecke zwischen zwei geraden Kanten schweben und klicken, um sie zu runden. **Umschalt-Klick** rundet alle Ecken der Form. Einen Radius eingeben, um ihn zu ändern; ist er zu groß, nennt der Hinweis den größtmöglichen Wert. |
| **Fase** | B | Wie Verrundung, schneidet die Ecke aber gerade ab. Zwei Abstände oder einen Abstand und einen Winkel eingeben. |
| **Trimmen / Verlängern / Teilen** | W | *Trimmen*: das zu entfernende Linienstück anklicken, bis zu den nächsten Schnittpunkten. *Verlängern*: nahe einem Linienende klicken, um es bis zur nächsten Linie zu verlängern. *Teilen*: eine Linie anklicken, um sie an dieser Stelle zu trennen. Umschalt-Klick tauscht Trimmen und Verlängern. |
| **Pfade verbinden** | Umschalt+J | Verbindet die ausgewählten offenen Pfade, die Ende an Ende zusammentreffen; ein einzelner Pfad, dessen Enden sich treffen, wird geschlossen. |
| **Auflösen** | Umschalt+X | Zerlegt die ausgewählten Rechtecke, Polylinien oder Konturen in einzelne Segmente. |
| **Vereinigen** | Umschalt+U | Führt zwei oder mehr ausgewählte geschlossene Formen zu einer Kontur zusammen. |
| **Differenz** | Umschalt+D | Schneidet die anderen ausgewählten geschlossenen Formen aus der größten heraus. |

## 5. Lederspezifische Werkzeuge

Hier unterscheidet sich LeatherDraft von einem allgemeinen CAD-Programm. Die Ergebnisse **bleiben verknüpft**: Wenn Sie eine Kontur bearbeiten, folgt ihre Stichlinie; die Löcher folgen der Stichlinie. Alles wird im selben Rückgängig-Schritt aktualisiert.

### Stichlinie (K)

1. Klicken Sie auf eine Kontur.
2. Klicken Sie innen oder außen, um die Seite zu wählen. Der Abstand kommt aus den Projekteinstellungen (siehe unten) oder Sie geben einen anderen Wert ein.

Die Stichlinie wird auf der Ebene Stiche gezeichnet und folgt danach ihrer Kontur. Um die Verknüpfung zu lösen, wählen Sie sie aus und drücken Sie in den Eigenschaften auf **Lösen**.

### Stichlöcher (H)

1. Stellen Sie die Optionen in der Eingabezeile ein:
   - **Teilung** des Rautenbeitels: 2,7, 3,38, 3,85, 4,0 oder 5,0 mm, oder **Benutzerdefiniert**.
   - **Lochgröße** und **Form**: *Rund* oder *Schräger Schlitz* (wie ein Rautenbeitel).
   - **Loch an jeder Ecke**: Der Abstand wird je Kante so verteilt, dass genau an jeder Ecke ein Loch sitzt, so wie man den Beitel führt.
2. Fahren Sie über eine Stichlinie (oder eine beliebige Linie), um die Löcher und ihre Anzahl vorab zu sehen.
3. Klicken Sie, um sie hinzuzufügen.

Teilung, Größe oder Form können Sie später in den Eigenschaften ändern; die Liste **Pro Kante** zeigt die Lochanzahl jeder Kante.

### Projektvorgaben

Ist nichts ausgewählt, legt der Bereich **Projekt** in den Eigenschaften die Vorgaben für neue Stichlinien und Löcher fest: **Stichabstand zum Rand** (3,5 mm), **Teilung** (3,85 mm) und **Lochgröße** (1,2 mm); die Vorgaben stehen in Klammern.

### Nahtzugabe (Y)

1. Klicken Sie auf eine geschlossene Kontur.
2. Geben Sie einen Wert für alle Kanten ein, oder klicken Sie Kanten an (Umschalt-Klick für mehrere) und geben Sie nur für diese einen Wert ein.
3. Drücken Sie **Eingabe**, ohne etwas einzugeben, um die Kontur hinzuzufügen.

### Niet- / Schlitzloch (U)

Für Nieten, Druckknöpfe, Schraubenbolzen und Schnallenzungen. Wählen Sie *Rundloch* oder *Schlitz*, wählen Sie einen gängigen **Stanz**-Durchmesser oder **Benutzerdefiniert**, dann klicken Sie zum Setzen (es rastet auf Mittelpunkte und Punkte ein) oder geben X/Y ein und drücken Eingabe. Bei einem Schlitz ist *Länge* das Maß von Ende zu Ende und *Breite* der Stanzdurchmesser.

### Kerbe (J)

Markierungen für die Montage. Wählen Sie *Einfach* oder *Doppelt*, und *Schnitt (Linie)* oder *V-Kerbe*, legen Sie die Tiefe fest (und Abstand / Breite), dann klicken Sie auf eine Kante. Kerben zeigen ins Werkstück; bei offenen Linien auf die Seite des Cursors.

### Linienarten

Stellen Sie in den Eigenschaften die **Linienart** eines Pfads ein: *Durchgezogen (Schnitt)*, *Gestrichelt (Falz/Rillung)*, *Gepunktet (Referenz)* oder *Strichpunkt (Mittellinie)*. **Strichstärke (Export)** legt die Linienbreite in exportierten Dateien fest.

## 6. Zwangsbedingungen

Mit dem Werkzeug **Zwangsbedingung** (Z) werden Beziehungen zwischen Formen exakt. In jedem Fall bleibt das **erste** angeklickte Element an seinem Platz, das **zweite** bewegt sich.

| Typ | Anklicken |
| --- | --- |
| **Parallel** / **Senkrecht** | Zwei gerade Kanten. |
| **Tangential** | Eine gerade Kante oder ein Kreis, dann der Kreis (oder die Kante), der tangential werden soll. |
| **Koinzident** | Zwei Punkte. |
| **Abstand** | Zwei Punkte, dann den Abstand eingeben und Eingabe drücken (Eingabe allein behält den aktuellen Wert). |
| **Radius** | Ein Kreis, dann den Radius eingeben und Eingabe drücken. |

Steht eine neue Zwangsbedingung im Widerspruch zu bestehenden, ändert sich nichts, und der Hinweis sagt es Ihnen.

Ausgewählte Objekte listen ihre Zwangsbedingungen im Bereich **Zwangsbedingungen** der Eigenschaften auf. Eine als *Nicht erfüllt* markierte Zwangsbedingung bedeutet, dass die Geometrie nach dem Lösen verschoben wurde; drücken Sie **Lösen**, um sie wiederherzustellen. *Ungültig* bedeutet, dass sich etwas, worauf sie sich bezieht, geändert hat oder gelöscht wurde; löschen Sie sie mit der Schaltfläche ×.

## 7. Messen

**Messen** (D) hat vier Modi:

- **Abstand**: zwei Punkte anklicken.
- **Winkel**: einen Punkt, die Ecke, dann einen weiteren Punkt anklicken.
- **Länge**: über eine Form fahren, um ihre Länge zu sehen.
- **Lochanzahl**: eine Kante eines Lochsatzes anklicken, dann die Kante, an die er genäht wird. Der Hinweis sagt, ob die Anzahlen übereinstimmen oder um wie viele Löcher sie abweichen, damit Sie Teilung oder Kantenlängen vor dem Zuschneiden anpassen können.

## 8. Ebenen und Eigenschaften

### Ebenen

Jede Zeichnung hat vier Ebenen:

| Ebene | Verwendung |
| --- | --- |
| **Schnitt** | Konturen zum Schneiden. |
| **Stiche** | Stichlinien und Löcher. |
| **Referenz** | Konstruktionslinien und importierte Zeichnungen. |
| **Notizen** | Beschriftungen und Narbenrichtungspfeile. |

Pro Ebene können Sie sie **ein- / ausblenden** (Kontrollkästchen), ihre **Farbe** ändern (Farbfeld), **sperren / entsperren** (Vorhängeschloss) und durch Klick auf ihren Namen **darauf zeichnen**. Auf einer gesperrten oder ausgeblendeten Ebene können Sie nicht zeichnen.

### Eigenschaften

Wählen Sie Objekte aus, um deren Werte zu sehen und zu bearbeiten: Position, Breite und Höhe, Länge, Radius oder Durchmesser, Drehung, Ebene, Linienart, Text, Teilung und mehr. Geben Sie einen Wert ein und drücken Sie Eingabe. Bei mehreren ausgewählten Objekten werden abweichende Werte als „—“ angezeigt; wenn Sie einen Wert eingeben, gilt er für alle.

### Einheiten

Wählen Sie **mm**, **cm** oder **in** in der Statusleiste. Das ändert nur die Anzeige und die Eingabe; die Zeichnung wird immer in Millimetern gespeichert.

## 9. Dateien

- **Speichern** (⌘/Strg+S) schreibt eine `.json`-Projektdatei. **⌘/Strg+Umschalt+S** speichert unter neuem Namen.
- **Öffnen…** (⌘/Strg+O) öffnet ein `.json`-Projekt.
- **Neu** beginnt ein leeres Projekt (fragt vorher nach, wenn es ungespeicherte Änderungen gibt).
- Der Projektname steht in der Werkzeugleiste; ein Punkt im Titel des Browser-Tabs bedeutet ungespeicherte Änderungen.
- **Importieren…** holt eine **SVG- oder DXF-Datei** im Originalmaß auf die Ebene Referenz, ausgewählt, damit Sie ein bestehendes Muster nachzeichnen können.
- **Automatisches Speichern**: Ihre Arbeit wird eine halbe Sekunde nach jeder Änderung im Browser gesichert und beim nächsten Öffnen von LeatherDraft wiederhergestellt. Das automatische Speichern ist ein Sicherheitsnetz, kein Ersatz für das Speichern einer Datei: Wenn Sie die Browserdaten löschen, ist es weg.

**Desktop-App**: Speichern, Öffnen und Exportieren nutzen die Dateidialoge des Systems, und Speichern schreibt weiterhin in dieselbe Datei.

**Offline**: Nach dem Laden funktioniert die Web-App offline („Bereit zum Offline-Arbeiten“). Wenn eine neue Version verfügbar ist, bietet ein Hinweis **Neu laden** an.

## 10. Export und Drucken

**Exportieren…** öffnet den Exportdialog.

| Format | Verwendung | Optionen |
| --- | --- | --- |
| **PDF** | Druck im Maßstab 1:1 | Papier (A4, Letter, A3 oder **Eine Seite, passend zum Muster** für Großformatdrucker), Ausrichtung (*Wenigste Seiten*, Hochformat, Querformat), Überlappung zwischen den Bögen |
| **SVG** | Lasercutter, Schneideplotter, Inkscape, Illustrator | Kurven als kurze gerade Linien (für Lasersoftware, die keine Kurven liest) |
| **DXF** | Laser- und CNC-Software, in mm | Nur Formen: Beschriftungen werden weggelassen |
| **PNG** | Bild teilen | Auflösung: 96, 150 oder 300 dpi. Nicht zum Erstellen des Musters geeignet. |

Übliche Optionen: **Nur Schnittebenen (Laser)**, **Beschriftungen einschließen**, **Linienbreite** und ein **Wasserzeichen** (Text und Deckkraft; in PDFs wiederholt es sich auf jeder Seite).

Enthält die Zeichnung von KI erstellte Objekte (über den MCP-Server), die noch niemand geprüft hat, warnt Sie der Dialog. Wählen Sie sie über die Statusleiste aus und drücken Sie nach der Prüfung **Als geprüft markieren** in den Eigenschaften.

### Drucken im Originalmaß

Ein gekacheltes PDF beginnt mit einer **Montageseite**: einer Übersicht der Bögen und einem **Kalibrierquadrat von 50 mm**. Jeder Bogen hat Schnittmarken und eine Beschriftung (A1, A2, B1 …).

1. Drucken Sie mit **100 % / „Tatsächliche Größe“**. Niemals „An Seite anpassen“ oder „Übergroße Seiten verkleinern“.
2. **Messen Sie das Quadrat von 50 mm.** Ist es nicht genau 50 mm, korrigieren Sie die Skalierung im Drucker und drucken erneut.
3. Schneiden Sie entlang einer gestrichelten Linie oder überlappen Sie die Bögen, passen Sie die Eckmarken und Bogenbeschriftungen an und kleben Sie sie zusammen.

## 11. Tastenkürzel

### Werkzeuge und Aktionen

| Taste | Werkzeug | Taste | Werkzeug |
| --- | --- | --- | --- |
| V | Auswählen | M | Verschieben |
| L | Linie / Polylinie | O | Drehen |
| R | Rechteck / Quadrat | S | Skalieren |
| C | Kreis / 3 Punkte / Ellipse | I | Spiegeln |
| P | Feder (Kurven) | Q | Array |
| A | Bogen (3 Punkte) | W | Trimmen / Verlängern / Teilen |
| X | Mittellinie | E | Versatz |
| T | Senkrechte | Y | Nahtzugabe |
| G | Parallele | F | Verrundung |
| N | Beschriftung / Narbenrichtungspfeil | B | Fase |
| D | Messen | K | Stichlinie |
| Z | Zwangsbedingung | H | Stichlöcher |
| U | Niet- / Schlitzloch | J | Kerbe |
| Umschalt+H / Umschalt+V | Horizontal / vertikal spiegeln | Umschalt+J | Pfade verbinden |
| Umschalt+X | Auflösen | Umschalt+U / Umschalt+D | Vereinigen / Differenz |

Sie können jede dieser Tasten unter **Tastenkürzel…** in der Werkzeugleiste ändern. Es sind Buchstabentasten, mit oder ohne Umschalt, und sie werden nach ihrer Position auf der Tastatur erkannt, sodass sie mit jedem Tastaturlayout und jeder Eingabemethode funktionieren. Die Einstellungen werden pro Browser gespeichert; **Alle zurücksetzen** stellt die Standardwerte wieder her.

### Allgemein

| Taste | Aktion |
| --- | --- |
| ⌘/Strg+Z, ⇧⌘Z / Strg+Y | Rückgängig, wiederholen |
| ⌘/Strg+S, ⌘/Strg+Umschalt+S | Speichern, Speichern unter |
| ⌘/Strg+O | Öffnen |
| ⌘/Strg+A | Alles auswählen |
| Entf | Auswahl oder ausgewählten Punkt löschen |
| Esc | Abbrechen / Auswahl aufheben |
| Eingabe, Doppelklick, Rechtsklick | Form beenden / bestätigen |
| Rücktaste | Beim Zeichnen letzten Punkt entfernen |
| Umschalt (gehalten) | Winkel auf Schritte von 15° einrasten |
| Alt (gehalten) | Rechteck vom Mittelpunkt; beim Ziehen kopieren |
| Zifferntasten | Wert eingeben beginnen |
| Tab | Nächstes Eingabefeld |
| Leertaste + Ziehen, mittlere Taste ziehen | Verschieben |
| Mausrad, Pinch | Zoomen |

## 12. Praxisbeispiel: ein Kartenetui

1. **Rechteck** (R): einmal klicken, `95` eingeben, Tab, `65`, Eingabe. Sie haben ein Teil von 95 × 65 mm auf der Ebene Schnitt.
2. **Verrundung** (F): `5` eingeben, dann **Umschalt-Klick** auf eine Ecke, um alle vier zu runden.
3. **Stichlinie** (K): auf die Kontur klicken, dann innen klicken. Mit dem Standardabstand erhalten Sie eine Stichlinie 3,5 mm nach innen.
4. **Stichlöcher** (H): Teilung **3,85** wählen, **Loch an jeder Ecke** ankreuzen, über die Stichlinie fahren und klicken.
5. **Beschriftung** (N): innerhalb des Teils klicken, `Kartenetui · 2× zuschneiden` eingeben, Eingabe.
6. Probieren Sie eine Änderung der Kontur: Wählen Sie das Rechteck aus und setzen Sie in den Eigenschaften **B** auf `100`. Stichlinie und Löcher folgen.
7. **Speichern** (⌘/Strg+S), dann **Exportieren…** → PDF → A4 → mit 100 % drucken und das Quadrat von 50 mm messen.

## 13. Fehlerbehebung

| Problem | Lösung |
| --- | --- |
| Es wird nichts gezeichnet / „Die aktive Ebene ist gesperrt oder ausgeblendet“ | Ebene entsperren oder einblenden, oder in den Ebenen eine andere wählen. |
| Der Ausdruck ist etwas zu klein oder zu groß | Das PDF wurde skaliert. Mit 100 % / Tatsächliche Größe drucken und das Quadrat von 50 mm erneut prüfen. |
| Verrundung meldet „zu groß für diese Ecke“ | Den größten Radius aus dem Hinweis verwenden oder die Kanten verlängern. |
| Lochanzahlen zweier zu nähender Kanten stimmen nicht | Messen → Lochanzahl verwenden, dann Teilung oder die Länge einer Kante anpassen. |
| Zwangsbedingung „Konflikt“ | Die neue Zwangsbedingung widerspricht bestehenden. Eine davon in Eigenschaften → Zwangsbedingungen löschen. |
| Lasersoftware zeigt zerbrochene Kurven | SVG mit **Kurven als kurze gerade Linien** exportieren oder DXF verwenden. |
| Ein Werkzeug-Tastenkürzel reagiert nicht | Möglicherweise hat ein Textfeld den Fokus: zuerst auf die Zeichenfläche klicken. Unter **Tastenkürzel…** prüfen, ob die Taste neu belegt wurde. |
