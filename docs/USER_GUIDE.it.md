# Manuale utente di LeatherDraft

[English](USER_GUIDE.md) · [简体中文](USER_GUIDE.zh-CN.md) · [繁體中文](USER_GUIDE.zh-TW.md) · [Deutsch](USER_GUIDE.de.md) · [Français](USER_GUIDE.fr.md) · [Español](USER_GUIDE.es.md) · **Italiano** · [Português](USER_GUIDE.pt.md) · [日本語](USER_GUIDE.ja.md) · [한국어](USER_GUIDE.ko.md)

LeatherDraft è uno strumento di disegno 2D per modelli di pelletteria. Si disegna in millimetri e si stampa o si taglia in scala reale 1:1. Funziona nel browser (o come app desktop), non richiede un account e i file restano sul proprio dispositivo.

## Indice

1. [La schermata](#1-la-schermata)
2. [Nozioni di base: selezione, inserimento di valori, aggancio, vista](#2-nozioni-di-base)
3. [Strumenti di disegno](#3-strumenti-di-disegno)
4. [Modificare le forme](#4-modificare-le-forme)
5. [Strumenti per la pelle](#5-strumenti-per-la-pelle)
6. [Vincoli](#6-vincoli)
7. [Misurare](#7-misurare)
8. [Livelli e proprietà](#8-livelli-e-proprietà)
9. [File: salvataggio, apertura, importazione, salvataggio automatico](#9-file)
10. [Esportazione e stampa in scala reale](#10-esportazione-e-stampa)
11. [Scorciatoie da tastiera](#11-scorciatoie-da-tastiera)
12. [Esempio pratico: un portacarte](#12-esempio-pratico-un-portacarte)
13. [Risoluzione dei problemi](#13-risoluzione-dei-problemi)

---

## 1. La schermata

| Area | Contenuto |
| --- | --- |
| **Barra degli strumenti** (in alto) | Nome del progetto, Nuovo, Apri…, Salva, Importa…, Esporta…, Annulla / Ripeti, Scorciatoie…, Lingua |
| **Barra degli strumenti laterale** (a sinistra) | Tutti gli strumenti, raggruppati. Una casella con un piccolo triangolo nell'angolo contiene altri strumenti: **clic destro** su di essa (o pressione prolungata, o → quando ha il focus) per sceglierne un altro. La casella ricorda l'ultimo usato. |
| **Area di disegno** (al centro) | Il piano in millimetri, con griglia. Qui compaiono il suggerimento dello strumento e la **barra di input** per i valori digitati. |
| **Pannello laterale** (a destra) | **Livelli** e **Proprietà**. Si richiude con la freccia in alto. |
| **Barra di stato** (in basso) | Posizione X/Y del cursore, zoom, passo della griglia, numero di oggetti e di oggetti selezionati, unità di visualizzazione e il menu **Agganci**. |

Ogni strumento mostra una riga che indica cosa cliccare o digitare dopo. Leggetela se avete dubbi.

## 2. Nozioni di base

### Selezionare

Con **Seleziona** (V):

- Cliccate su un oggetto per selezionarlo; **Maiusc+clic** aggiunge o toglie.
- Trascinate un riquadro **da sinistra a destra** per selezionare gli oggetti completamente contenuti; **da destra a sinistra** per selezionare tutto ciò che tocca.
- **Trascinate** un oggetto selezionato per spostarlo; tenete premuto **Alt** mentre trascinate per spostare una copia.
- **Canc** elimina la selezione. **⌘/Ctrl+A** seleziona tutto. **Esc** deseleziona.

**Modificare i punti.** Con una forma selezionata compaiono i suoi punti e le maniglie di Bézier:

- Trascinate un punto o una maniglia per spostarlo.
- **Doppio clic su un punto** per passare da liscio ad angolo e viceversa.
- **Doppio clic sul contorno** per aggiungere un punto.
- Cliccate su un punto e premete **Canc** per rimuoverlo.

### Inserire valori esatti

Tutti gli strumenti di disegno e modifica accettano numeri. **Iniziate a digitare un numero**: finisce nella barra di input.

- **Tab** passa al campo successivo (per esempio Lunghezza → Angolo, o X → Y).
- **Invio** applica, **Esc** cancella.
- Le lunghezze sono nell'unità scelta nella barra di stato (mm, cm o in). Gli angoli sono in gradi, in senso antiorario a partire dalla direzione +X.

Tenete premuto **Maiusc** durante il disegno per bloccare gli angoli a passi di 15°.

### Agganci

Il cursore si aggancia alla geometria esistente. Aprite **Agganci** nella barra di stato per attivare o disattivare ciascun tipo:

Estremità · Punto medio · Centro · Quadrante · Intersezione · Perpendicolare · Tangente · Più vicino · Griglia · Tracciamento polare (45°) · Tracciamento oggetto

Il contrassegno sul cursore indica quale aggancio è attivo.

### Muoversi nella vista

- **Rotella del mouse** o pizzico sul trackpad: zoom sulla posizione del cursore.
- **Spazio + trascina** o **trascina con il pulsante centrale**: sposta la vista.
- Il livello di zoom è nella barra di stato; al 100 %, 1 mm è disegnato come 96/25,4 pixel CSS (dimensione reale nominale).

### Annulla

**⌘/Ctrl+Z** annulla, **⇧⌘Z / Ctrl+Maiusc+Z** (o Ctrl+Y) ripete. Ogni azione è esattamente un passo di annullamento, incluse le linee di cucitura e i fori collegati che aggiorna. Gli annullamenti sono illimitati all'interno di una sessione.

## 3. Strumenti di disegno

Le nuove forme vanno sul **livello attivo** (vedi [Livelli](#8-livelli-e-proprietà)). La maggior parte degli strumenti conclude una forma con **Invio, doppio clic o clic destro**, e **Backspace** rimuove l'ultimo punto.

| Strumento | Tasto | Uso |
| --- | --- | --- |
| **Linea** | L | Cliccate i punti, o digitate lunghezza e angolo. Ogni segmento è un oggetto separato, come in CAD. Cliccate sul primo punto per chiudere. |
| **Polilinea** | (gruppo Linea) | Come Linea, ma tutti i segmenti formano un unico percorso. Si passa con il campo *Modalità* dello strumento Linea. |
| **Rettangolo** | R | Cliccate due angoli, o digitate larghezza e altezza. Tenete premuto **Alt** al primo clic per disegnare dal centro. Impostate *Raggio d'angolo* per angoli arrotondati. |
| **Quadrato** | (gruppo Rettangolo) | Rettangolo con un unico valore di *Lato*. |
| **Cerchio** | C | Cliccate il centro, poi un punto sulla circonferenza, o digitate il raggio. |
| **Cerchio per 3 punti** | (gruppo Cerchio) | Cliccate tre punti per cui passa il cerchio. |
| **Ellisse** | (gruppo Cerchio) | Cliccate il centro, l'estremità del primo asse, poi impostate l'altro raggio. |
| **Penna (curve)** | P | Clic per un punto d'angolo, **trascinate** per un punto di curva liscia. Digitate lunghezza e angolo per un bordo dritto. Cliccate sul primo punto per chiudere. |
| **Arco (3 punti)** | A | Cliccate inizio, fine e un punto per cui passa l'arco. |
| **Linea di mezzeria** | X | Cliccate una forma per tracciare una linea di mezzeria verticale od orizzontale al centro, o disegnatene una con due punti. Le linee di mezzeria fungono da assi di simmetria. |
| **Perpendicolare** | T | Cliccate un bordo dritto, poi posizionate una linea ad angolo retto (o digitate la distanza lungo il bordo e la lunghezza). |
| **Parallela** | G | Cliccate un bordo dritto, poi il lato e la distanza, o digitate la distanza. |
| **Etichetta** | N | Modalità *Testo*: cliccate dove inizia il testo, digitate (ad es. «Davanti · taglia 2»), Invio. Modalità *Freccia della venatura*: cliccate i due estremi. Le etichette vanno sul livello Note. |

## 4. Modificare le forme

### Trasformare

**Sposta, Ruota, Scala, Specchio** e **Matrice** agiscono sulla selezione. Se non c'è nulla di selezionato, lo strumento chiede prima di selezionare oggetti; premete **Invio** o cliccate con il tasto destro quando avete finito. Spuntate **Mantieni originale (copia)** per trasformare una copia.

| Strumento | Tasto | Passaggi |
| --- | --- | --- |
| **Sposta** | M | Punto base → destinazione, oppure digitate ΔX e ΔY. |
| **Ruota** | O | Centro → cliccate l'angolo, o digitatelo. Maiusc arrotonda a 15°. |
| **Scala** | S | Punto base (resta fermo) → digitate un fattore, oppure cliccate un punto di riferimento e dove deve andare. |
| **Specchio** | I | Cliccate una linea di mezzeria per specchiare rispetto ad essa, oppure cliccate due punti di un asse (o un punto e digitate l'angolo). |
| **Matrice** | Q | *Lineare*: punto base → dove va la copia successiva; *Numero* include l'originale. *Circolare*: centro → Invio; 360° distribuisce le copie in modo uniforme, un arco inferiore le distribuisce dalla prima all'ultima. |
| **Specchia orizzontale / verticale** | Maiusc+H / Maiusc+V | Specchia la selezione sul posto, istantaneamente. |

### Modificare

| Strumento | Tasto | Passaggi |
| --- | --- | --- |
| **Offset** | E | Cliccate un percorso, un cerchio o una linea di mezzeria, poi cliccate il lato. La distanza segue il cursore, oppure digitatela. *Angoli*: vivi, arrotondati o smussati. Cliccate di nuovo per altri offset; Esc per scegliere un'altra sorgente. |
| **Raccordo** | F | Passate sopra un angolo tra due bordi dritti e cliccate per arrotondarlo. **Maiusc+clic** arrotonda tutti gli angoli della forma. Digitate un raggio per cambiarlo; se è troppo grande, il suggerimento indica il massimo possibile. |
| **Smusso** | B | Come Raccordo, ma taglia l'angolo in linea retta. Digitate due distanze, oppure una distanza e un angolo. |
| **Taglia / estendi / dividi** | W | *Taglia*: cliccate il tratto di linea da rimuovere, fino agli incroci più vicini. *Estendi*: cliccate vicino a un'estremità della linea per allungarla fino alla successiva. *Dividi*: cliccate una linea per spezzarla in quel punto. Maiusc+clic scambia taglia ed estendi. |
| **Unisci percorsi** | Maiusc+J | Unisce i percorsi aperti selezionati che si incontrano testa a testa; un unico percorso le cui estremità coincidono viene chiuso. |
| **Esplodi** | Maiusc+X | Scompone i rettangoli, le polilinee o i contorni selezionati in segmenti separati. |
| **Unione** | Maiusc+U | Unisce due o più forme chiuse selezionate in un unico contorno. |
| **Differenza** | Maiusc+D | Ritaglia dalla più grande le altre forme chiuse selezionate. |

## 5. Strumenti per la pelle

È ciò che distingue LeatherDraft da un programma CAD generico. I risultati **restano collegati**: se modificate un contorno, la sua linea di cucitura lo segue; i fori seguono la linea di cucitura. Tutto si aggiorna nello stesso passo di annullamento.

### Linea di cucitura (K)

1. Cliccate un contorno.
2. Cliccate dentro o fuori per scegliere il lato. Il margine proviene dalle impostazioni del progetto (vedi sotto), oppure digitatene un altro.

La linea di cucitura viene disegnata sul livello Cucitura e da quel momento segue il suo contorno. Per interrompere il collegamento, selezionatela e premete **Scollega** nelle Proprietà.

### Fori di cucitura (H)

1. Impostate le opzioni nella barra di input:
   - **Passo** della punzonatrice a rombo: 2,7, 3,38, 3,85, 4,0 o 5,0 mm, oppure **Personalizzato**.
   - **Dimensione del foro** e **Forma**: *Tondo* o *Asola inclinata* (come una punzonatrice a rombo).
   - **Foro su ogni angolo**: la spaziatura viene ripartita lato per lato in modo che un foro cada esattamente su ogni angolo, come si fa passando la punzonatrice.
2. Passate sopra una linea di cucitura (o qualsiasi linea) per visualizzare in anteprima i fori e il loro numero.
3. Cliccate per aggiungerli.

Potete cambiare passo, dimensione o forma in seguito nelle Proprietà; l'elenco **Per lato** mostra il numero di fori su ciascun lato.

### Valori predefiniti del progetto

Senza selezione, la sezione **Progetto** delle Proprietà imposta i valori predefiniti per le nuove linee di cucitura e i nuovi fori: **Margine di cucitura** (3,5 mm), **Passo** (3,85 mm) e **Dimensione del foro** (1,2 mm); i predefiniti sono tra parentesi.

### Margine di cucitura (Y)

1. Cliccate un contorno chiuso.
2. Digitate un valore per tutti i bordi, oppure cliccate i bordi (Maiusc+clic per più di uno) e digitate un valore solo per quelli.
3. Premete **Invio** senza digitare nulla per aggiungere il contorno.

### Foro per ribattino / asola (U)

Per ribattini, bottoni a pressione, perni a vite e linguette di fibbia. Scegliete *Foro tondo* o *Asola*, selezionate un diametro di **Punzone** comune o **Personalizzato**, poi cliccate per posizionare (si aggancia a centri e punti) oppure digitate X/Y e Invio. Per un'asola, *Lunghezza* è da estremità a estremità e *Larghezza* è il diametro del punzone.

### Tacca (J)

Segni di allineamento per l'assemblaggio. Scegliete *Singola* o *Doppia*, e *Taglio (linea)* o *Tacca a V*, impostate la profondità (e la distanza / larghezza), poi cliccate un bordo. Le tacche puntano verso l'interno del pezzo; sulle linee aperte verso il lato del cursore.

### Stili di linea

Nelle Proprietà, impostate lo **Stile linea** di un percorso: *Continua (taglio)*, *Tratteggiata (piega / cordonatura)*, *Puntinata (riferimento)* o *Tratto-punto (mezzeria)*. **Tratto (esportazione)** imposta lo spessore di linea usato nei file esportati.

## 6. Vincoli

Lo strumento **Vincolo** (Z) rende esatte le relazioni tra forme. In ogni caso, il **primo** elemento cliccato resta fermo e il **secondo** si sposta.

| Tipo | Cliccate |
| --- | --- |
| **Parallelo** / **Perpendicolare** | Due bordi dritti. |
| **Tangente** | Un bordo dritto o un cerchio, poi il cerchio (o il bordo) da rendere tangente. |
| **Coincidente** | Due punti. |
| **Distanza** | Due punti, poi digitate la distanza e premete Invio (Invio da solo mantiene quella attuale). |
| **Raggio** | Un cerchio, poi digitate il raggio e premete Invio. |

Se un nuovo vincolo è in conflitto con quelli esistenti, nulla cambia e il suggerimento lo segnala.

Gli oggetti selezionati elencano i propri vincoli nella sezione **Vincoli** delle Proprietà. Un vincolo contrassegnato come *Non soddisfatto* indica che la geometria è stata spostata dopo la risoluzione; premete **Risolvi** per ripristinarla. *Interrotto* significa che qualcosa a cui fa riferimento è cambiato o è stato eliminato; eliminatelo con il pulsante ×.

## 7. Misurare

**Misura** (D) ha quattro modalità:

- **Distanza**: cliccate due punti.
- **Angolo**: cliccate un punto, il vertice, poi un altro punto.
- **Lunghezza**: passate sopra una forma per vederne la lunghezza.
- **Numero di fori**: cliccate un bordo di un insieme di fori, poi il bordo a cui verrà cucito. Il suggerimento indica se i numeri coincidono o di quanti fori differiscono, così potete regolare il passo o le lunghezze dei bordi prima del taglio.

## 8. Livelli e proprietà

### Livelli

Ogni disegno ha quattro livelli:

| Livello | Uso |
| --- | --- |
| **Taglio** | Contorni da tagliare. |
| **Cucitura** | Linee di cucitura e fori. |
| **Riferimento** | Linee di costruzione e disegni importati. |
| **Note** | Etichette e frecce della venatura. |

Per ciascun livello potete **mostrare / nascondere** (casella), cambiarne il **colore** (campione), **bloccare / sbloccare** (lucchetto) e cliccare sul nome per **disegnarvi sopra**. Non si può disegnare su un livello bloccato o nascosto.

### Proprietà

Selezionate oggetti per vedere e modificare i loro valori: posizione, larghezza e altezza, lunghezza, raggio o diametro, rotazione, livello, stile di linea, testo, passo, ecc. Digitate un valore e premete Invio. Con più oggetti selezionati, i valori diversi appaiono come «—»; digitarne uno li imposta tutti.

### Unità

Scegliete **mm**, **cm** o **in** nella barra di stato. Cambia solo ciò che viene visualizzato e digitato; il disegno è sempre memorizzato in millimetri.

## 9. File

- **Salva** (⌘/Ctrl+S) scrive un file di progetto `.json`. **⌘/Ctrl+Maiusc+S** salva con un nuovo nome.
- **Apri…** (⌘/Ctrl+O) apre un progetto `.json`.
- **Nuovo** avvia un progetto vuoto (chiede prima conferma se ci sono modifiche non salvate).
- Il nome del progetto è nella barra degli strumenti; un punto nel titolo della scheda del browser indica modifiche non salvate.
- **Importa…** porta un file **SVG o DXF** in scala reale sul livello Riferimento, selezionato, così potete ricalcare un modello esistente.
- **Salvataggio automatico**: il lavoro viene conservato nel browser mezzo secondo dopo ogni modifica e ripristinato alla successiva apertura di LeatherDraft. Il salvataggio automatico è una rete di sicurezza, non un sostituto del salvataggio del file: cancellare i dati del browser lo elimina.

**App desktop**: Salva, Apri ed Esporta usano le finestre di dialogo di sistema, e Salva continua a scrivere sullo stesso file.

**Offline**: una volta caricata, l'app web funziona offline («Pronto per lavorare offline»). Quando è disponibile una nuova versione, un avviso propone **Ricarica**.

## 10. Esportazione e stampa

**Esporta…** apre la finestra di esportazione.

| Formato | Uso | Opzioni |
| --- | --- | --- |
| **PDF** | Stampa a 1:1 | Carta (A4, Letter, A3, oppure **Una pagina, dimensionata sul modello** per plotter di grande formato), orientamento (*Meno pagine*, verticale, orizzontale), sovrapposizione tra i fogli |
| **SVG** | Taglierine laser, plotter da taglio, Inkscape, Illustrator | Curve convertite in brevi segmenti rettilinei (per software laser che non leggono le curve) |
| **DXF** | Software laser e CNC, in mm | Solo forme: le etichette vengono omesse |
| **PNG** | Condividere un'immagine | Risoluzione: 96, 150 o 300 dpi. Non serve per realizzare il modello. |

Opzioni comuni: **Solo livelli di taglio (laser)**, **Includi etichette**, **Spessore linea** e una **Filigrana** (testo e opacità; nei PDF si ripete su ogni pagina).

Se il disegno contiene oggetti creati dall'IA (tramite il server MCP) che nessuno ha ancora verificato, la finestra vi avvisa. Selezionateli dalla barra di stato e premete **Segna come verificato** nelle Proprietà dopo averli controllati.

### Stampa in scala reale

Un PDF suddiviso in fogli inizia con una **pagina di assemblaggio**: una mappa dei fogli e un **quadrato di calibrazione da 50 mm**. Ogni foglio ha segni di taglio e un'etichetta (A1, A2, B1…).

1. Stampate al **100 % / «Dimensione effettiva»**. Mai «Adatta alla pagina» né «Riduci le pagine sovradimensionate».
2. **Misurate il quadrato da 50 mm.** Se non misura esattamente 50 mm, correggete la scala della stampante e stampate di nuovo.
3. Tagliate lungo la linea tratteggiata o sovrapponete i fogli, allineando i segni d'angolo e le etichette dei fogli, poi incollateli con del nastro.

## 11. Scorciatoie da tastiera

### Strumenti e azioni

| Tasto | Strumento | Tasto | Strumento |
| --- | --- | --- | --- |
| V | Seleziona | M | Sposta |
| L | Linea / polilinea | O | Ruota |
| R | Rettangolo / quadrato | S | Scala |
| C | Cerchio / 3 punti / ellisse | I | Specchio |
| P | Penna (curve) | Q | Matrice |
| A | Arco (3 punti) | W | Taglia / estendi / dividi |
| X | Linea di mezzeria | E | Offset |
| T | Perpendicolare | Y | Margine di cucitura |
| G | Parallela | F | Raccordo |
| N | Etichetta / freccia della venatura | B | Smusso |
| D | Misura | K | Linea di cucitura |
| Z | Vincolo | H | Fori di cucitura |
| U | Foro per ribattino / asola | J | Tacca |
| Maiusc+H / Maiusc+V | Specchia orizzontale / verticale | Maiusc+J | Unisci percorsi |
| Maiusc+X | Esplodi | Maiusc+U / Maiusc+D | Unione / differenza |

Potete modificare ciascuna di queste scorciatoie in **Scorciatoie…** nella barra degli strumenti. Sono tasti lettera, con o senza Maiusc, riconosciuti dalla posizione sulla tastiera, quindi funzionano con qualsiasi layout e metodo di input. Sono salvate per browser; **Ripristina tutto** riporta i valori predefiniti.

### Generali

| Tasto | Azione |
| --- | --- |
| ⌘/Ctrl+Z, ⇧⌘Z / Ctrl+Y | Annulla, ripeti |
| ⌘/Ctrl+S, ⌘/Ctrl+Maiusc+S | Salva, salva con nome |
| ⌘/Ctrl+O | Apri |
| ⌘/Ctrl+A | Seleziona tutto |
| Canc | Elimina la selezione o il punto selezionato |
| Esc | Annulla / deseleziona |
| Invio, doppio clic, clic destro | Termina una forma / conferma |
| Backspace | Rimuovi l'ultimo punto durante il disegno |
| Maiusc (tenuto premuto) | Blocca l'angolo a passi di 15° |
| Alt (tenuto premuto) | Rettangolo dal centro; copia trascinando |
| Tasti numerici | Inizia a digitare un valore |
| Tab | Campo di input successivo |
| Spazio + trascina, trascina con il pulsante centrale | Sposta la vista |
| Rotella, pizzico | Zoom |

## 12. Esempio pratico: un portacarte

1. **Rettangolo** (R): cliccate una volta, digitate `95`, Tab, `65`, Invio. Avete un pezzo di 95 × 65 mm sul livello Taglio.
2. **Raccordo** (F): digitate `5`, poi **Maiusc+clic** su un angolo per arrotondarli tutti e quattro.
3. **Linea di cucitura** (K): cliccate il contorno, poi cliccate all'interno. Con il margine predefinito otterrete una linea di cucitura a 3,5 mm dal bordo.
4. **Fori di cucitura** (H): scegliete il passo **3,85**, spuntate **Foro su ogni angolo**, passate sulla linea di cucitura e cliccate.
5. **Etichetta** (N): cliccate dentro il pezzo, digitate `Portacarte · taglia 2`, Invio.
6. Provate a modificare il contorno: selezionate il rettangolo e impostate **L** a `100` nelle Proprietà. La linea di cucitura e i fori lo seguono.
7. **Salva** (⌘/Ctrl+S), poi **Esporta…** → PDF → A4 → stampate al 100 % e misurate il quadrato da 50 mm.

## 13. Risoluzione dei problemi

| Problema | Soluzione |
| --- | --- |
| Non si disegna nulla / «Il livello attivo è bloccato o nascosto» | Sbloccate o mostrate il livello, oppure sceglietene un altro nei Livelli. |
| La stampa risulta un po' più piccola o più grande | Il PDF è stato scalato. Stampate al 100 % / Dimensione effettiva e ricontrollate il quadrato da 50 mm. |
| Il raccordo dice «troppo grande per questo angolo» | Usate il raggio massimo indicato nel suggerimento, oppure allungate i bordi. |
| I numeri di fori non coincidono su due bordi da cucire | Usate Misura → Numero di fori, poi regolate il passo o la lunghezza di un bordo. |
| Vincolo «conflitto» | Il nuovo vincolo contraddice quelli esistenti. Eliminatene uno in Proprietà → Vincoli. |
| Il software laser mostra curve interrotte | Esportate in SVG con **Curve convertite in brevi segmenti rettilinei**, oppure usate DXF. |
| Una scorciatoia di strumento non risponde | Potrebbe avere il focus un campo di testo: cliccate prima sul disegno. Controllate in **Scorciatoie…** che il tasto non sia stato riassegnato. |
