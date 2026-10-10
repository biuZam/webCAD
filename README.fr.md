# LeatherDraft

[English](README.md) · [简体中文](README.zh-CN.md) · [繁體中文](README.zh-TW.md) · [Deutsch](README.de.md) · **Français** · [Español](README.es.md) · [Italiano](README.it.md) · [Português](README.pt.md) · [日本語](README.ja.md) · [한국어](README.ko.md)

Un outil de CAO 2D dans le navigateur pour dessiner des **patrons de cuir en millimètres**, et les imprimer ou les découper à **l'échelle réelle 1:1**.

Il fonctionne entièrement dans le navigateur : pas de compte, pas de serveur, et vos fichiers ne quittent jamais votre appareil. Il s'installe comme une application et fonctionne hors ligne ; une application de bureau est aussi disponible pour Windows, macOS et Linux.

![LeatherDraft : dessin d'un porte-cartes, arrondi des angles, ajout d'une ligne de couture liée et de trous au ciseau, redimensionnement et export](docs/media/demo.gif)

> **Statut : pré-1.0.** Les fonctions de dessin, de travail du cuir et d'export sont implémentées et testées. Restent à faire avant la sortie : une vérification physique de la précision d'impression sur de vraies imprimantes, des tests de compatibilité avec Inkscape, Illustrator et LightBurn, et quelques points mineurs (voir [`docs/TASKS.md`](docs/TASKS.md)).

## Guide d'utilisation

Instructions pas à pas pour chaque outil, l'impression à taille réelle, les raccourcis et un exemple complet :

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

## Fonctionnalités

**Dessin**

- Lignes (chaque segment est un objet distinct, comme en CAO) et polylignes, rectangles et carrés (avec rayon d'angle), cercles (centre + rayon, 3 points, ellipse), plume de Bézier, arcs à 3 points
- Lignes d'axe (utilisables comme axes de symétrie) et perpendiculaires
- Étiquettes : texte (nom de la pièce, « couper 2 »…) et flèches de sens du grain, sur le calque Notes
- Déplacer, pivoter, mettre à l'échelle et symétriser (chacun en copie possible), retourner sur place ; réseaux linéaires et circulaires
- Décalage, congé et chanfrein ; parallèles ; couper, prolonger et scinder ; joindre les tracés ; union et différence de formes
- Modifier directement les points et les poignées de Bézier ; basculer les points entre lisse et angle ; ajouter et supprimer des points ; glisser les formes sélectionnées pour les déplacer
- Accrochage aux objets : extrémité, milieu, centre, quadrant, intersection, perpendiculaire, tangente, le plus proche, grille ; suivi polaire et suivi d'objet
- Contraintes : parallèle, perpendiculaire, tangente, coïncidence, distance et rayon, résolues de sorte que le premier objet reste en place et que le second se déplace
- Valeurs exactes : saisir coordonnées, longueurs, angles et rayons pendant le dessin ; modifier les nombres dans le panneau des propriétés
- Calques (coupe, couture, référence, notes) avec visibilité, verrouillage et couleur ; affichage en mm, cm ou pouces

**Spécifique au cuir**

- **Lignes de couture** à une marge définie d'un contour, liées à lui : modifiez le contour et la ligne de couture suit
- **Trous de couture** aux pas de ciseau (2,7, 3,38, 3,85, 4,0, 5,0 mm ou personnalisé), ronds ou en fente oblique. Avec « trou à chaque angle », l'espacement est réparti par côté pour qu'un trou tombe exactement sur chaque angle, comme lorsqu'on guide le ciseau.
- Les trous suivent leur ligne de couture, qui suit son contour, le tout en une seule étape d'annulation
- **Nombre de trous par côté**, et une vérification que deux côtés à coudre ensemble ont le même nombre (Mesurer → Nombre de trous)
- **Trous de poinçon et fentes** pour rivets, boutons-pression et boucles, avec les diamètres de poinçon courants
- **Crans** : repères d'assemblage simples ou doubles sur n'importe quel bord, en coupe ou en V

**Sortie**

- **SVG** à 1:1 (1 unité = 1 mm), un calque par groupe, avec l'option de convertir les courbes en courts segments droits pour les logiciels laser
- **PDF** pour imprimante domestique : découpé sur A4, Letter ou A3 avec chevauchement, repères de coupe et étiquettes de feuille, plus une page d'assemblage avec un **carré d'étalonnage de 50 mm**. Ou une seule page aux dimensions du patron, pour les imprimantes grand format.
- **DXF** (mm) pour les logiciels laser et CNC, et une image **PNG** pour le partage
- **Filigrane** facultatif sur les exports (répété sur chaque page PDF)
- **Import de SVG ou DXF** à taille réelle sur le calque Référence, pour calquer un patron existant
- Enregistrer et ouvrir des fichiers projet `.json`. Le travail est sauvegardé automatiquement dans le navigateur et restauré au rechargement.

### Impression à taille réelle

Imprimez le PDF à **100 % / « Taille réelle »**, jamais « Ajuster à la page », puis mesurez le carré de 50 mm sur la première page. S'il ne fait pas 50 mm, vérifiez les réglages de mise à l'échelle de votre imprimante.

## Raccourcis clavier

| Touche | Outil | Touche | Outil |
| --- | --- | --- | --- |
| V | Sélection (et édition des points) | M | Déplacer |
| L | Ligne / polyligne | O | Pivoter |
| R | Rectangle | S | Mettre à l'échelle |
| C | Cercle / 3 points / ellipse | I | Symétrie |
| P | Plume (courbes) | Shift+H / Shift+V | Miroir horizontal / vertical |
| A | Arc (3 points) | E | Décalage |
| X | Ligne d'axe | F | Congé |
| T | Perpendiculaire | B | Chanfrein |
| D | Mesurer | K | Ligne de couture |
| N | Étiquette / flèche de sens du grain | H | Trous de couture |
| G | Parallèle | W | Couper / prolonger / scinder |
| U | Trou de poinçon / fente | Y | Marge de couture (par côté) |
| Q | Réseau (linéaire / circulaire) | J | Cran |
| Shift+J | Joindre les tracés | Shift+U / Shift+D | Union / différence |
| Z | Contrainte | Shift+X | Éclater en segments |

Les outils similaires partagent une case de la palette, comme dans Photoshop : **clic droit** sur une case avec un triangle dans le coin (ou appui prolongé, ou → dessus) pour en choisir un autre. Les groupes sont : ligne / polyligne, rectangle / carré, cercle / cercle 3 points / ellipse, plume / arc, perpendiculaire / parallèle, congé / chanfrein, décalage / marge de couture, poinçon / cran, miroir horizontal / vertical, joindre / éclater, union / différence. Le panneau latéral se replie avec la flèche en haut.

Chaque outil et chaque touche d'action peut être modifié sous **Raccourcis…** dans la barre d'outils (conservé par navigateur).

Pendant le dessin : **commencez à taper un nombre** pour le saisir dans la barre de saisie, **Tab** passe d'un champ à l'autre, **Entrée** valide, **Échap** annule, **Retour arrière** supprime le dernier point, **Maj** verrouille les angles par pas de 15°. **Espace + glisser** ou glisser au bouton central déplace la vue, la molette zoome. **⌘/Ctrl+Z / ⇧⌘Z** annulent et rétablissent, **⌘/Ctrl+S** enregistre, **⌘/Ctrl+O** ouvre, **⌘/Ctrl+A** sélectionne tout.

## Développement

Nécessite **Node ≥ 20.19** et **pnpm 10** (`corepack enable` prend la version indiquée dans `package.json`).

```bash
pnpm install
pnpm dev                     # http://localhost:5173
```

URLs utiles en développement :

- `?fixture=acceptance` : le dessin de recette du PRD (carré de 100 mm, cercle de 50 mm, trous de couture de 3,85 mm)
- `?fixture=perf` : 2 000 entités pour les contrôles de performance

Les sessions de fixture ne sont jamais sauvegardées automatiquement, elles ne peuvent donc pas écraser votre travail.

| Commande | Ce qu'elle fait |
| --- | --- |
| `pnpm test` | Tests unitaires et de composants (Vitest) ; `pnpm test <fichier>` ou `pnpm test -t "<nom>"` pour un seul |
| `pnpm check` | Vérification des types, lint, tests et rapport de traduction |
| `pnpm verify` | Tout ce que lance la CI : ce qui précède plus le formatage, le build de production et le budget du bundle |
| `pnpm build` / `pnpm preview` | Build de production (avec service worker) et aperçu local |
| `pnpm i18n:check` | Clés manquantes dans les langues autres que l'anglais |
| `pnpm bundle:check` | Le téléchargement initial doit rester sous 600 Ko gzip |
| `BENCH=1 pnpm test perf.bench` | Mesure de performance sur 2 000 entités |

Si les installations de paquets sont lentes chez vous, essayez un miroir de registre, par ex. `pnpm install --registry=https://registry.npmmirror.com`.

### Application de bureau (Tauri)

`src-tauri/` enveloppe le même build Vite dans une fenêtre native (Windows, macOS, Linux). Il faut une chaîne d'outils Rust et les outils de compilation de la plateforme ([prérequis Tauri](https://v2.tauri.app/start/prerequisites/)).

```bash
pnpm desktop:dev             # fenêtre native sur le serveur de développement Vite (rechargement à chaud)
pnpm desktop:build           # installeur pour ce système dans src-tauri/target/release/bundle/
pnpm tauri build --bundles app   # macOS : seulement LeatherDraft.app, sans .dmg
```

Différences avec l'application web : Enregistrer, Ouvrir et Exporter utilisent les boîtes de dialogue natives (Enregistrer continue d'écrire dans le même fichier jusqu'à la fermeture), et il n'y a pas de service worker ; l'application se met à jour en installant une nouvelle version. La sauvegarde automatique fonctionne comme dans le navigateur. Tauri ne sait pas compiler en croisé, donc les installeurs Windows viennent de la CI : lancez le workflow **Desktop** (`.github/workflows/desktop.yml`) ou poussez un tag `desktop-v*` ; il produit un `.exe` Windows (NSIS) et un `.dmg` macOS universel comme artefacts du workflow. Les icônes de `src-tauri/icons` sont générées à partir de `public/icon.svg` avec `pnpm tauri icon public/icon.svg -o src-tauri/icons`.

### Technologies

React 19 + TypeScript + Vite · [Paper.js](http://paperjs.org) pour la géométrie et le rendu · Zustand + Immer (magasin de document, annulation/rétablissement par patchs) · [paperjs-offset](https://github.com/glenzli/paperjs-offset) avec Clipper en secours pour les décalages · jsPDF + svg2pdf.js pour le PDF (chargés à la demande) · i18next · vite-plugin-pwa · Vitest.

### Fonctionnement d'ensemble

- **Le dessin est du JSON simple en millimètres**, conservé dans un magasin. Chaque modification est une commande, ce qui permet une annulation illimitée et des fichiers de sauvegarde simples.
- **Paper.js** dessine l'écran et effectue les calculs géométriques, mais ne possède pas les données.
- **Les entités liées sont régénérées dans la même commande** que celle qui modifie leur source, si bien que les lignes et les trous de couture ne sont jamais périmés.
- **Le PDF est généré à partir du même SVG** que celui exporté par l'application, pour que l'écran, le SVG et l'impression ne puissent pas diverger.

Pour aller plus loin :

- [`docs/ARCHITECTURE.md`](docs/ARCHITECTURE.md) : choix de conception, calques, modèle de données, notes sur les performances et l'accessibilité
- [`docs/USER_GUIDE.fr.md`](docs/USER_GUIDE.fr.md) et les autres langues : guide d'utilisation (voir la section Langues)
- [`docs/MCP.md`](docs/MCP.md) : serveur MCP sans interface, pour que les clients d'IA puissent dessiner, modifier, coudre et exporter des patrons
- [`docs/TASKS.md`](docs/TASKS.md) : liste des tâches et avancement par jalon
- [`PRD — Leather Pattern CAD (Web).md`](<PRD — Leather Pattern CAD (Web).md>) : spécifications produit
- [`CLAUDE.md`](CLAUDE.md) : conventions pour travailler sur le code

### Critères de qualité

- **Précision.** Les décalages restent à moins de 0,02 mm de la distance demandée, et les arcs de congé à moins de 0,001 mm d'un vrai cercle. L'échelle du PDF est vérifiée dans les tests en relisant les commandes de dessin du PDF en millimètres de page.
- **Performance.** 2 000 entités (17 600 trous de couture) se redessinent en environ 12 ms.
- **Accessibilité.** Les contrastes de couleur WCAG 2.2 AA sont vérifiés en CI pour les thèmes clair et sombre, et un audit axe-core ne signale aucune violation.

## Langues

L'interface est disponible en anglais, 简体中文, 繁體中文, Deutsch, Français, Español, Italiano, Português, 日本語 et 한국어 ; changez de langue avec l'icône du globe dans la barre d'outils. Le texte des pages PDF suit la langue de l'interface, et le texte chinois des PDF (texte des pages, étiquettes, noms) est imprimé avec une police Noto Sans SC intégrée.

Le guide d'utilisation est disponible en [anglais](docs/USER_GUIDE.md), [français](docs/USER_GUIDE.fr.md) et dans les autres langues sous `docs/`. Ce README existe dans les mêmes langues à la racine du projet.

## Licence

LeatherDraft est **disponible en source** sous la [PolyForm Noncommercial License 1.0.0](LICENSE) :

- **Gratuit** pour un usage personnel, de loisir, d'étude et de recherche, ainsi que pour les écoles, associations caritatives et autres organisations à but non lucratif. Vous pouvez modifier le code et partager vos modifications à des fins non commerciales.
- **Vos patrons et produits vous appartiennent.** Les dessins, les fichiers exportés et les articles en cuir que vous fabriquez à partir d'eux ne sont soumis à aucune restriction ; vous pouvez les vendre.
- **L'usage commercial du logiciel lui-même** (le vendre, ou vendre une version modifiée, le proposer comme service, l'intégrer dans un produit commercial) nécessite une licence commerciale. Les versions modifiées ne peuvent pas être utilisées commercialement. Voir [COMMERCIAL.md](COMMERCIAL.md).
- Les contributions sont bienvenues ; les contributeurs signent une fois une [CLA](CLA.md). Voir [CONTRIBUTING.md](CONTRIBUTING.md).

« LeatherDraft » et son logo ne sont pas couverts par la licence. Les versions jusqu'au commit `ca93653` / `7db180a` (10 octobre 2026) ont été publiées sous Apache-2.0.
