# Guide d'utilisation de LeatherDraft

[English](USER_GUIDE.md) · [简体中文](USER_GUIDE.zh-CN.md) · [繁體中文](USER_GUIDE.zh-TW.md) · [Deutsch](USER_GUIDE.de.md) · **Français** · [Español](USER_GUIDE.es.md) · [Italiano](USER_GUIDE.it.md) · [Português](USER_GUIDE.pt.md) · [日本語](USER_GUIDE.ja.md) · [한국어](USER_GUIDE.ko.md)

LeatherDraft est un outil de dessin 2D pour patrons de maroquinerie. Vous dessinez en millimètres et imprimez ou découpez à l'échelle réelle 1:1. Il fonctionne dans le navigateur (ou en application de bureau), ne nécessite aucun compte, et vos fichiers restent sur votre appareil.

## Sommaire

1. [L'écran](#1-lécran)
2. [Bases : sélection, saisie de valeurs, accrochage, vue](#2-bases)
3. [Outils de dessin](#3-outils-de-dessin)
4. [Modifier les formes](#4-modifier-les-formes)
5. [Outils du cuir](#5-outils-du-cuir)
6. [Contraintes](#6-contraintes)
7. [Mesurer](#7-mesurer)
8. [Calques et propriétés](#8-calques-et-propriétés)
9. [Fichiers : enregistrer, ouvrir, importer, sauvegarde automatique](#9-fichiers)
10. [Export et impression à l'échelle réelle](#10-export-et-impression)
11. [Raccourcis clavier](#11-raccourcis-clavier)
12. [Exemple guidé avec un porte-cartes](#12-exemple-guidé-avec-un-porte-cartes)
13. [Dépannage](#13-dépannage)

---

## 1. L'écran

| Zone | Contenu |
| --- | --- |
| **Barre d'outils** (haut) | Nom du projet, Nouveau, Ouvrir…, Enregistrer, Importer…, Exporter…, Annuler / Rétablir, Raccourcis…, Langue |
| **Palette d'outils** (gauche) | Tous les outils, regroupés. Une case avec un petit triangle dans le coin contient d'autres outils : **clic droit** dessus (ou appui prolongé, ou → lorsqu'elle a le focus) pour en choisir un autre. La case retient le dernier outil utilisé. |
| **Zone de dessin** (centre) | Le plan en millimètres, avec une grille. L'invite de l'outil et la **barre de saisie** pour les valeurs tapées apparaissent ici. |
| **Panneau latéral** (droite) | **Calques** et **Propriétés**. Repliable avec la flèche en haut. |
| **Barre d'état** (bas) | Position du curseur X/Y, zoom, pas de la grille, nombre d'objets et d'objets sélectionnés, unités d'affichage, et le menu **Accrochages**. |

Chaque outil affiche une invite d'une ligne qui indique quoi cliquer ou taper ensuite. Lisez-la en cas de doute.

## 2. Bases

### Sélectionner

Avec **Sélection** (V) :

- Cliquez sur un objet pour le sélectionner ; **Maj-clic** ajoute ou retire.
- Tracez un cadre **de gauche à droite** pour sélectionner les objets entièrement compris dedans ; **de droite à gauche** pour sélectionner tout ce qu'il touche.
- **Glissez** un objet sélectionné pour le déplacer ; maintenez **Alt** en glissant pour déplacer une copie.
- **Suppr** supprime la sélection. **⌘/Ctrl+A** sélectionne tout. **Échap** désélectionne.

**Modifier les points.** Lorsqu'une forme est sélectionnée, ses points et poignées de Bézier apparaissent :

- Glissez un point ou une poignée pour le déplacer.
- **Double-cliquez sur un point** pour le passer de lisse à angle, et inversement.
- **Double-cliquez sur le contour** pour ajouter un point.
- Cliquez sur un point puis appuyez sur **Suppr** pour le supprimer.

### Saisir des valeurs exactes

Tous les outils de dessin et de modification acceptent des nombres. **Commencez simplement à taper un nombre** : il va dans la barre de saisie.

- **Tab** passe au champ suivant (par exemple Longueur → Angle, ou X → Y).
- **Entrée** valide, **Échap** efface.
- Les longueurs sont exprimées dans l'unité choisie dans la barre d'état (mm, cm ou in). Les angles sont en degrés, dans le sens antihoraire à partir de la direction +X.

Maintenez **Maj** pendant le dessin pour verrouiller les angles par pas de 15°.

### Accrochages

Le curseur s'accroche à la géométrie existante. Ouvrez **Accrochages** dans la barre d'état pour activer ou désactiver chaque type :

Extrémité · Milieu · Centre · Quadrant · Intersection · Perpendiculaire · Tangente · Le plus proche · Grille · Suivi polaire (45°) · Suivi d'objet

Le repère au curseur indique l'accrochage actif.

### Se déplacer dans la vue

- **Molette** ou pincement du pavé tactile : zoom au niveau du curseur.
- **Espace + glisser** ou **glisser avec le bouton central** : déplacer la vue.
- Le niveau de zoom est dans la barre d'état ; à 100 %, 1 mm est dessiné sur 96/25,4 pixels CSS (taille réelle nominale).

### Annuler

**⌘/Ctrl+Z** annule, **⇧⌘Z / Ctrl+Maj+Z** (ou Ctrl+Y) rétablit. Chaque action correspond à une seule étape d'annulation, y compris les lignes de couture et les trous liés qu'elle met à jour. L'annulation est illimitée pendant une session.

## 3. Outils de dessin

Les nouvelles formes vont sur le **calque actif** (voir [Calques](#8-calques-et-propriétés)). La plupart des outils terminent une forme avec **Entrée, double-clic ou clic droit**, et **Retour arrière** supprime le dernier point.

| Outil | Touche | Utilisation |
| --- | --- | --- |
| **Ligne** | L | Cliquez des points, ou tapez longueur et angle. Chaque segment est un objet distinct, comme en CAO. Cliquez sur le premier point pour fermer. |
| **Polyligne** | (groupe Ligne) | Comme Ligne, mais tous les segments forment un seul tracé. Basculez avec le champ *Mode* de l'outil Ligne. |
| **Rectangle** | R | Cliquez deux coins, ou tapez largeur et hauteur. Maintenez **Alt** au premier clic pour dessiner depuis le centre. Réglez *Rayon d'angle* pour des coins arrondis. |
| **Carré** | (groupe Rectangle) | Rectangle avec une seule valeur de *Côté*. |
| **Cercle** | C | Cliquez le centre, puis un point du cercle, ou tapez le rayon. |
| **Cercle par 3 points** | (groupe Cercle) | Cliquez trois points par lesquels passe le cercle. |
| **Ellipse** | (groupe Cercle) | Cliquez le centre, l'extrémité du premier axe, puis réglez l'autre rayon. |
| **Plume (courbes)** | P | Clic pour un point d'angle, **glisser** pour un point de courbe lisse. Tapez longueur et angle pour un bord droit. Cliquez le premier point pour fermer. |
| **Arc (3 points)** | A | Cliquez le début, la fin, puis un point par lequel passe l'arc. |
| **Ligne d'axe** | X | Cliquez une forme pour placer une ligne d'axe verticale ou horizontale en son milieu, ou tracez-en une à partir de deux points. Les lignes d'axe servent d'axes de symétrie. |
| **Perpendiculaire** | T | Cliquez un bord droit, puis placez une ligne à angle droit (ou tapez la distance le long du bord et la longueur). |
| **Parallèle** | G | Cliquez un bord droit, puis le côté et la distance, ou tapez la distance. |
| **Étiquette** | N | Mode *Texte* : cliquez où commence le texte, tapez (par ex. « Devant · couper 2 »), Entrée. Mode *Flèche de sens du grain* : cliquez les deux extrémités. Les étiquettes vont sur le calque Notes. |

## 4. Modifier les formes

### Transformer

**Déplacer, Pivoter, Mettre à l'échelle, Symétrie** et **Réseau** agissent sur la sélection. Si rien n'est sélectionné, l'outil vous demande d'abord de sélectionner des objets ; appuyez sur **Entrée** ou faites un clic droit quand vous avez fini. Cochez **Conserver l'original (copie)** pour transformer une copie.

| Outil | Touche | Étapes |
| --- | --- | --- |
| **Déplacer** | M | Point de base → destination, ou tapez ΔX et ΔY. |
| **Pivoter** | O | Centre → cliquez l'angle, ou tapez-le. Maj arrondit à 15°. |
| **Mettre à l'échelle** | S | Point de base (reste fixe) → tapez un facteur, ou cliquez un point de référence puis sa nouvelle position. |
| **Symétrie** | I | Cliquez une ligne d'axe pour symétriser autour d'elle, ou cliquez deux points d'un axe (ou un point et tapez l'angle). |
| **Réseau** | Q | *Linéaire* : point de base → emplacement de la copie suivante ; *Nombre* inclut l'original. *Circulaire* : centre → Entrée ; 360° répartit les copies également, un angle inférieur les répartit du premier au dernier. |
| **Miroir horizontal / vertical** | Maj+H / Maj+V | Retourne la sélection sur place, instantanément. |

### Modifier

| Outil | Touche | Étapes |
| --- | --- | --- |
| **Décalage** | E | Cliquez un tracé, un cercle ou une ligne d'axe, puis cliquez le côté. La distance suit le curseur, ou tapez-la. *Angles* : vifs, arrondis ou chanfreinés. Cliquez à nouveau pour d'autres décalages ; Échap pour choisir une autre source. |
| **Congé** | F | Survolez un angle entre deux bords droits et cliquez pour l'arrondir. **Maj-clic** arrondit tous les angles de la forme. Tapez un rayon pour le modifier ; s'il est trop grand, l'invite indique le plus grand possible. |
| **Chanfrein** | B | Comme Congé, mais coupe l'angle en droite. Tapez deux distances, ou une distance et un angle. |
| **Couper / prolonger / scinder** | W | *Couper* : cliquez le morceau de ligne à supprimer, jusqu'aux intersections les plus proches. *Prolonger* : cliquez près d'une extrémité de ligne pour l'allonger jusqu'à la suivante. *Scinder* : cliquez une ligne pour la couper à cet endroit. Maj-clic inverse couper et prolonger. |
| **Joindre les tracés** | Maj+J | Joint les tracés ouverts sélectionnés qui se rejoignent bout à bout ; un tracé unique dont les extrémités se touchent est fermé. |
| **Éclater** | Maj+X | Décompose les rectangles, polylignes ou contours sélectionnés en segments séparés. |
| **Union** | Maj+U | Fusionne deux formes fermées sélectionnées ou plus en un seul contour. |
| **Différence** | Maj+D | Découpe les autres formes fermées sélectionnées dans la plus grande. |

## 5. Outils du cuir

C'est ce qui distingue LeatherDraft d'un logiciel de CAO générique. Leurs résultats **restent liés** : si vous modifiez un contour, sa ligne de couture suit ; les trous suivent la ligne de couture. Tout se met à jour dans une même étape d'annulation.

### Ligne de couture (K)

1. Cliquez un contour.
2. Cliquez à l'intérieur ou à l'extérieur pour choisir le côté. La marge vient des réglages du projet (voir plus bas), ou tapez une autre valeur.

La ligne de couture est tracée sur le calque Coutures et suit ensuite son contour. Pour rompre le lien, sélectionnez-la et appuyez sur **Détacher** dans les Propriétés.

### Trous de couture (H)

1. Réglez les options dans la barre de saisie :
   - **Pas** du ciseau : 2,7, 3,38, 3,85, 4,0 ou 5,0 mm, ou **Personnalisé**.
   - **Taille du trou** et **Forme** : *Rond* ou *Fente oblique* (comme un ciseau losange).
   - **Trou à chaque angle** : l'espacement est réparti par côté pour qu'un trou tombe exactement sur chaque angle, comme on guide le ciseau.
2. Survolez une ligne de couture (ou toute ligne) pour prévisualiser les trous et leur nombre.
3. Cliquez pour les ajouter.

Vous pouvez modifier le pas, la taille ou la forme plus tard dans les Propriétés ; la liste **Par côté** indique le nombre de trous sur chaque côté.

### Valeurs par défaut du projet

Sans sélection, la section **Projet** des Propriétés définit les valeurs par défaut des nouvelles lignes de couture et des nouveaux trous : **Marge de couture** (3,5 mm), **Pas** (3,85 mm) et **Taille du trou** (1,2 mm) ; les valeurs par défaut sont entre crochets.

### Marge de couture (Y)

1. Cliquez un contour fermé.
2. Tapez une valeur pour tous les côtés, ou cliquez des côtés (Maj-clic pour plusieurs) et tapez une valeur pour ceux-là seulement.
3. Appuyez sur **Entrée** sans rien taper pour ajouter le contour.

### Trou à œillet / fente (U)

Pour rivets, boutons-pression, tiges de vis et languettes de boucle. Choisissez *Trou rond* ou *Fente*, sélectionnez un diamètre de **Poinçon** courant ou **Personnalisé**, puis cliquez pour placer (cela s'accroche aux centres et aux points) ou tapez X/Y et Entrée. Pour une fente, *Longueur* se mesure d'un bout à l'autre et *Largeur* correspond au diamètre du poinçon.

### Cran (J)

Repères d'assemblage. Choisissez *Simple* ou *Double*, et *Trait (ligne)* ou *Cran en V*, réglez la profondeur (et l'écart / la largeur), puis cliquez un bord. Les crans pointent vers l'intérieur de la pièce ; sur les lignes ouvertes, ils vont du côté du curseur.

### Styles de trait

Dans les Propriétés, réglez le **Style de trait** d'un tracé : *Plein (coupe)*, *Tireté (pli / rainage)*, *Pointillé (repère)* ou *Mixte (axe)*. **Trait (export)** définit l'épaisseur de trait utilisée dans les fichiers exportés.

## 6. Contraintes

L'outil **Contrainte** (Z) rend les relations entre formes exactes. Dans chaque cas, le **premier** élément cliqué reste en place et le **second** se déplace.

| Type | Cliquez |
| --- | --- |
| **Parallèle** / **Perpendiculaire** | Deux bords droits. |
| **Tangente** | Un bord droit ou un cercle, puis le cercle (ou le bord) à rendre tangent. |
| **Coïncidence** | Deux points. |
| **Distance** | Deux points, puis tapez la distance et Entrée (Entrée seule conserve la valeur actuelle). |
| **Rayon** | Un cercle, puis tapez le rayon et Entrée. |

Si une nouvelle contrainte est en conflit avec des contraintes existantes, rien ne change et l'invite le signale.

Les objets sélectionnés listent leurs contraintes dans la section **Contraintes** des Propriétés. Une contrainte marquée *Non satisfaite* signifie que la géométrie a été déplacée après résolution ; appuyez sur **Résoudre** pour la rétablir. *Cassée* signifie que l'élément auquel elle se réfère a changé ou été supprimé ; supprimez-la avec son bouton ×.

## 7. Mesurer

**Mesurer** (D) propose quatre modes :

- **Distance** : cliquez deux points.
- **Angle** : cliquez un point, le sommet, puis un autre point.
- **Longueur** : survolez une forme pour voir sa longueur.
- **Nombre de trous** : cliquez un bord d'un jeu de trous, puis le bord auquel il sera cousu. L'invite indique si les nombres correspondent, ou de combien de trous ils diffèrent, afin de régler le pas ou la longueur des bords avant la découpe.

## 8. Calques et propriétés

### Calques

Chaque dessin comporte quatre calques :

| Calque | Usage |
| --- | --- |
| **Coupe** | Contours à découper. |
| **Couture** | Lignes de couture et trous. |
| **Référence** | Lignes de construction et dessins importés. |
| **Notes** | Étiquettes et flèches de sens du grain. |

Pour chaque calque, vous pouvez **afficher / masquer** (case à cocher), changer sa **couleur** (pastille), **verrouiller / déverrouiller** (cadenas), et cliquer sur son nom pour **dessiner dessus**. Vous ne pouvez pas dessiner sur un calque verrouillé ou masqué.

### Propriétés

Sélectionnez des objets pour voir et modifier leurs valeurs : position, largeur et hauteur, longueur, rayon ou diamètre, rotation, calque, style de trait, texte, pas, etc. Tapez une valeur et appuyez sur Entrée. Avec plusieurs objets sélectionnés, les valeurs différentes apparaissent comme « — » ; en saisir une les applique toutes.

### Unités

Choisissez **mm**, **cm** ou **in** dans la barre d'état. Cela ne modifie que l'affichage et la saisie ; le dessin est toujours enregistré en millimètres.

## 9. Fichiers

- **Enregistrer** (⌘/Ctrl+S) écrit un fichier de projet `.json`. **⌘/Ctrl+Maj+S** enregistre sous un nouveau nom.
- **Ouvrir…** (⌘/Ctrl+O) ouvre un projet `.json`.
- **Nouveau** crée un projet vide (demande confirmation s'il y a des modifications non enregistrées).
- Le nom du projet figure dans la barre d'outils ; un point dans le titre de l'onglet du navigateur signale des modifications non enregistrées.
- **Importer…** place un fichier **SVG ou DXF** à l'échelle réelle sur le calque Référence, sélectionné, pour que vous puissiez calquer un patron existant.
- **Sauvegarde automatique** : votre travail est conservé dans le navigateur une demi-seconde après chaque modification et restauré à la prochaine ouverture de LeatherDraft. La sauvegarde automatique est un filet de sécurité, pas un remplacement de l'enregistrement d'un fichier : effacer les données du navigateur la supprime.

**Application de bureau** : Enregistrer, Ouvrir et Exporter utilisent les boîtes de dialogue du système, et Enregistrer continue d'écrire dans le même fichier.

**Hors ligne** : une fois chargée, l'application web fonctionne hors ligne (« Prêt à travailler hors ligne »). Lorsqu'une nouvelle version est disponible, un avis propose **Recharger**.

## 10. Export et impression

**Exporter…** ouvre la boîte de dialogue d'export.

| Format | Usage | Options |
| --- | --- | --- |
| **PDF** | Impression à 1:1 | Papier (A4, Letter, A3, ou **Une page, aux dimensions du patron** pour traceurs grand format), orientation (*Moins de pages*, portrait, paysage), chevauchement entre feuilles |
| **SVG** | Découpeuses laser, traceurs de découpe, Inkscape, Illustrator | Courbes converties en courts segments droits (pour les logiciels laser qui ne lisent pas les courbes) |
| **DXF** | Logiciels laser et CNC, en mm | Formes uniquement : les étiquettes sont omises |
| **PNG** | Partage d'une image | Résolution : 96, 150 ou 300 dpi. Pas pour fabriquer le patron. |

Options courantes : **Calques de coupe uniquement (laser)**, **Inclure les étiquettes**, **Épaisseur de trait**, et un **Filigrane** (texte et opacité ; dans les PDF, il se répète sur chaque page).

Si le dessin contient des objets créés par IA (via le serveur MCP) que personne n'a encore vérifiés, la boîte de dialogue vous en avertit. Sélectionnez-les via la barre d'état et appuyez sur **Marquer comme vérifié** dans les Propriétés une fois contrôlés.

### Impression à l'échelle réelle

Un PDF découpé en feuilles commence par une **page d'assemblage** : un plan des feuilles et un **carré d'étalonnage de 50 mm**. Chaque feuille porte des repères de coupe et une étiquette (A1, A2, B1…).

1. Imprimez à **100 % / « Taille réelle »**. Jamais « Ajuster à la page » ni « Réduire les pages surdimensionnées ».
2. **Mesurez le carré de 50 mm.** S'il ne fait pas exactement 50 mm, corrigez la mise à l'échelle de l'imprimante et réimprimez.
3. Découpez le long du pointillé ou faites chevaucher les feuilles, en alignant les repères d'angle et les étiquettes de feuille, puis collez-les ensemble.

## 11. Raccourcis clavier

### Outils et actions

| Touche | Outil | Touche | Outil |
| --- | --- | --- | --- |
| V | Sélection | M | Déplacer |
| L | Ligne / polyligne | O | Pivoter |
| R | Rectangle / carré | S | Mettre à l'échelle |
| C | Cercle / 3 points / ellipse | I | Symétrie |
| P | Plume (courbes) | Q | Réseau |
| A | Arc (3 points) | W | Couper / prolonger / scinder |
| X | Ligne d'axe | E | Décalage |
| T | Perpendiculaire | Y | Marge de couture |
| G | Parallèle | F | Congé |
| N | Étiquette / flèche de sens du grain | B | Chanfrein |
| D | Mesurer | K | Ligne de couture |
| Z | Contrainte | H | Trous de couture |
| U | Trou à œillet / fente | J | Cran |
| Maj+H / Maj+V | Miroir horizontal / vertical | Maj+J | Joindre les tracés |
| Maj+X | Éclater | Maj+U / Maj+D | Union / différence |

Vous pouvez modifier chacun de ces raccourcis dans **Raccourcis…** de la barre d'outils. Ce sont des touches de lettres, avec ou sans Maj, reconnues par leur position sur le clavier : elles fonctionnent avec toute disposition de clavier et toute méthode de saisie. Ils sont conservés par navigateur ; **Tout réinitialiser** restaure les valeurs par défaut.

### Général

| Touche | Action |
| --- | --- |
| ⌘/Ctrl+Z, ⇧⌘Z / Ctrl+Y | Annuler, rétablir |
| ⌘/Ctrl+S, ⌘/Ctrl+Maj+S | Enregistrer, enregistrer sous |
| ⌘/Ctrl+O | Ouvrir |
| ⌘/Ctrl+A | Tout sélectionner |
| Suppr | Supprimer la sélection ou le point sélectionné |
| Échap | Annuler / désélectionner |
| Entrée, double-clic, clic droit | Terminer une forme / valider |
| Retour arrière | Supprimer le dernier point pendant le dessin |
| Maj (maintenue) | Verrouiller l'angle par pas de 15° |
| Alt (maintenue) | Rectangle depuis le centre ; copier en glissant |
| Touches numériques | Commencer à saisir une valeur |
| Tab | Champ de saisie suivant |
| Espace + glisser, glisser au bouton central | Déplacer la vue |
| Molette, pincement | Zoom |

## 12. Exemple guidé avec un porte-cartes

1. **Rectangle** (R) : cliquez une fois, tapez `95`, Tab, `65`, Entrée. Vous avez une pièce de 95 × 65 mm sur le calque Coupe.
2. **Congé** (F) : tapez `5`, puis **Maj-clic** sur un coin pour arrondir les quatre.
3. **Ligne de couture** (K) : cliquez le contour, puis cliquez à l'intérieur. Avec la marge par défaut, vous obtenez une ligne de couture à 3,5 mm du bord.
4. **Trous de couture** (H) : choisissez le pas **3,85**, cochez **Trou à chaque angle**, survolez la ligne de couture et cliquez.
5. **Étiquette** (N) : cliquez à l'intérieur de la pièce, tapez `Porte-cartes · couper 2`, Entrée.
6. Essayez de modifier le contour : sélectionnez le rectangle et réglez **L** sur `100` dans les Propriétés. La ligne de couture et les trous suivent.
7. **Enregistrer** (⌘/Ctrl+S), puis **Exporter…** → PDF → A4 → imprimez à 100 % et mesurez le carré de 50 mm.

## 13. Dépannage

| Problème | Solution |
| --- | --- |
| Rien ne se dessine / « Le calque actif est verrouillé ou masqué » | Déverrouillez ou affichez le calque, ou choisissez-en un autre dans Calques. |
| L'impression est un peu trop petite ou trop grande | Le PDF a été mis à l'échelle. Imprimez à 100 % / Taille réelle et revérifiez le carré de 50 mm. |
| Congé indique « trop grand pour cet angle » | Utilisez le plus grand rayon indiqué dans l'invite, ou allongez les bords. |
| Les nombres de trous ne correspondent pas sur deux bords à coudre | Utilisez Mesurer → Nombre de trous, puis ajustez le pas ou la longueur d'un bord. |
| Contrainte « conflit » | La nouvelle contrainte contredit les existantes. Supprimez-en une dans Propriétés → Contraintes. |
| Le logiciel laser affiche des courbes brisées | Exportez en SVG avec **Courbes converties en courts segments droits**, ou utilisez DXF. |
| Un raccourci d'outil ne répond pas | Un champ de texte a peut-être le focus : cliquez d'abord sur la zone de dessin. Vérifiez dans **Raccourcis…** que la touche n'a pas été réassignée. |
