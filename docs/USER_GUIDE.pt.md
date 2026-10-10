# Guia do usuário do LeatherDraft

[English](USER_GUIDE.md) · [简体中文](USER_GUIDE.zh-CN.md) · [繁體中文](USER_GUIDE.zh-TW.md) · [Deutsch](USER_GUIDE.de.md) · [Français](USER_GUIDE.fr.md) · [Español](USER_GUIDE.es.md) · [Italiano](USER_GUIDE.it.md) · **Português** · [日本語](USER_GUIDE.ja.md) · [한국어](USER_GUIDE.ko.md)

O LeatherDraft é uma ferramenta de desenho 2D para moldes de artigos de couro. Você desenha em milímetros e imprime ou corta em escala real 1:1. Funciona no navegador (ou como aplicativo de desktop), não exige conta, e seus arquivos ficam no seu dispositivo.

## Sumário

1. [A tela](#1-a-tela)
2. [Conceitos básicos: seleção, digitação de valores, encaixe, visualização](#2-conceitos-básicos)
3. [Ferramentas de desenho](#3-ferramentas-de-desenho)
4. [Alterar formas](#4-alterar-formas)
5. [Ferramentas de couro](#5-ferramentas-de-couro)
6. [Restrições](#6-restrições)
7. [Medir](#7-medir)
8. [Camadas e propriedades](#8-camadas-e-propriedades)
9. [Arquivos: salvar, abrir, importar, salvamento automático](#9-arquivos)
10. [Exportação e impressão em tamanho real](#10-exportação-e-impressão)
11. [Atalhos de teclado](#11-atalhos-de-teclado)
12. [Passo a passo: uma carteira de cartões](#12-passo-a-passo-uma-carteira-de-cartões)
13. [Solução de problemas](#13-solução-de-problemas)

---

## 1. A tela

| Área | Conteúdo |
| --- | --- |
| **Barra de ferramentas** (topo) | Nome do projeto, Novo, Abrir…, Salvar, Importar…, Exportar…, Desfazer / Refazer, Atalhos…, Idioma |
| **Paleta de ferramentas** (esquerda) | Todas as ferramentas, agrupadas. Um botão com um pequeno triângulo no canto guarda mais ferramentas: **clique com o botão direito** nele (ou pressione e segure, ou → com o foco no botão) para escolher outra. O botão lembra a última usada. |
| **Área de desenho** (centro) | A prancheta em milímetros, com grade. A dica da ferramenta e a **barra de entrada** para valores digitados aparecem aqui. |
| **Painel lateral** (direita) | **Camadas** e **Propriedades**. Recolha-o com a seta no topo. |
| **Barra de status** (inferior) | Posição X/Y do cursor, zoom, espaçamento da grade, número de objetos e de objetos selecionados, unidades de exibição e o menu **Encaixes**. |

Cada ferramenta mostra uma linha de dica informando o que clicar ou digitar em seguida. Leia-a quando tiver dúvida.

## 2. Conceitos básicos

### Selecionar

Com **Selecionar** (V):

- Clique em um objeto para selecioná-lo; **Shift+clique** adiciona ou remove.
- Arraste uma caixa **da esquerda para a direita** para selecionar objetos totalmente dentro dela; **da direita para a esquerda** para selecionar tudo o que ela toca.
- **Arraste** um objeto selecionado para movê-lo; segure **Alt** enquanto arrasta para mover uma cópia.
- **Delete** remove a seleção. **⌘/Ctrl+A** seleciona tudo. **Esc** desmarca.

**Editar pontos.** Com uma forma selecionada, aparecem seus pontos e alças de Bézier:

- Arraste um ponto ou alça para movê-lo.
- **Clique duplo em um ponto** para alternar entre suave e canto.
- **Clique duplo no contorno** para adicionar um ponto.
- Clique em um ponto e pressione **Delete** para removê-lo.

### Digitar valores exatos

Todas as ferramentas de desenho e edição aceitam números. **Basta começar a digitar um número**: ele vai para a barra de entrada.

- **Tab** passa para o próximo campo (por exemplo, Comprimento → Ângulo, ou X → Y).
- **Enter** aplica, **Esc** limpa.
- Os comprimentos estão nas unidades escolhidas na barra de status (mm, cm ou in). Os ângulos são em graus, no sentido anti-horário a partir da direção +X.

Mantenha **Shift** pressionado ao desenhar para travar os ângulos em passos de 15°.

### Encaixes

O cursor se encaixa na geometria existente. Abra **Encaixes** na barra de status para ativar ou desativar cada tipo:

Extremidade · Ponto médio · Centro · Quadrante · Interseção · Perpendicular · Tangente · Mais próximo · Grade · Rastreamento polar (45°) · Rastreamento de objeto

A marca no cursor mostra qual encaixe está ativo.

### Navegar pela visualização

- **Roda do mouse** ou pinça no trackpad: zoom no ponto do cursor.
- **Espaço + arrastar** ou **arrastar com o botão do meio**: deslocar a visualização.
- O nível de zoom fica na barra de status; a 100 %, 1 mm é desenhado como 96/25,4 pixels CSS (tamanho real nominal).

### Desfazer

**⌘/Ctrl+Z** desfaz, **⇧⌘Z / Ctrl+Shift+Z** (ou Ctrl+Y) refaz. Cada ação é exatamente uma etapa de desfazer, incluindo as linhas de costura e os furos vinculados que ela atualiza. O desfazer é ilimitado dentro de uma sessão.

## 3. Ferramentas de desenho

Novas formas vão para a **camada ativa** (veja [Camadas](#8-camadas-e-propriedades)). A maioria das ferramentas conclui uma forma com **Enter, clique duplo ou clique com o botão direito**, e **Backspace** remove o último ponto.

| Ferramenta | Tecla | Como usar |
| --- | --- | --- |
| **Linha** | L | Clique nos pontos, ou digite comprimento e ângulo. Cada segmento é um objeto separado, como no CAD. Clique no primeiro ponto para fechar. |
| **Polilinha** | (grupo Linha) | Igual à Linha, mas todos os segmentos formam um único caminho. Troque pelo campo *Modo* da ferramenta Linha. |
| **Retângulo** | R | Clique em dois cantos, ou digite largura e altura. Segure **Alt** no primeiro clique para desenhar a partir do centro. Defina *Raio do canto* para cantos arredondados. |
| **Quadrado** | (grupo Retângulo) | Retângulo com um único valor de *Lado*. |
| **Círculo** | C | Clique no centro e depois em um ponto da circunferência, ou digite o raio. |
| **Círculo por 3 pontos** | (grupo Círculo) | Clique em três pontos pelos quais o círculo passa. |
| **Elipse** | (grupo Círculo) | Clique no centro, na extremidade do primeiro eixo e depois defina o outro raio. |
| **Caneta (curvas)** | P | Clique para um ponto de canto, **arraste** para um ponto de curva suave. Digite comprimento e ângulo para uma borda reta. Clique no primeiro ponto para fechar. |
| **Arco (3 pontos)** | A | Clique no início, no fim e em um ponto pelo qual o arco passa. |
| **Linha de centro** | X | Clique em uma forma para traçar uma linha de centro vertical ou horizontal pelo meio dela, ou desenhe uma a partir de dois pontos. As linhas de centro servem como eixos de espelhamento. |
| **Perpendicular** | T | Clique em uma borda reta e depois posicione uma linha em ângulo reto (ou digite a distância ao longo da borda e o comprimento). |
| **Paralela** | G | Clique em uma borda reta e depois no lado e na distância, ou digite a distância. |
| **Rótulo** | N | Modo *Texto*: clique onde o texto começa, digite (ex.: «Frente · cortar 2»), Enter. Modo *Seta de veio*: clique nas duas extremidades. Os rótulos vão para a camada Notas. |

## 4. Alterar formas

### Transformar

**Mover, Girar, Escalar, Espelhar** e **Matriz** atuam sobre a seleção. Se nada estiver selecionado, a ferramenta pede primeiro que você selecione objetos; pressione **Enter** ou clique com o botão direito quando terminar. Marque **Manter original (cópia)** para transformar uma cópia.

| Ferramenta | Tecla | Passos |
| --- | --- | --- |
| **Mover** | M | Ponto-base → destino, ou digite ΔX e ΔY. |
| **Girar** | O | Centro → clique no ângulo, ou digite-o. Shift arredonda em 15°. |
| **Escalar** | S | Ponto-base (permanece fixo) → digite um fator, ou clique em um ponto de referência e depois onde ele deve ir. |
| **Espelhar** | I | Clique em uma linha de centro para espelhar em torno dela, ou clique em dois pontos de um eixo (ou em um ponto e digite o ângulo). |
| **Matriz** | Q | *Linear*: ponto-base → onde vai a próxima cópia; *Quantidade* inclui o original. *Circular*: centro → Enter; 360° distribui as cópias igualmente, menos graus as distribuem da primeira à última. |
| **Espelhar horizontal / vertical** | Shift+H / Shift+V | Espelha a seleção no lugar, instantaneamente. |

### Editar

| Ferramenta | Tecla | Passos |
| --- | --- | --- |
| **Deslocamento** | E | Clique em um caminho, círculo ou linha de centro e depois no lado. A distância segue o cursor, ou digite-a. *Cantos*: vivos, arredondados ou chanfrados. Clique de novo para mais deslocamentos; Esc para escolher outra origem. |
| **Arredondamento** | F | Passe sobre um canto entre duas bordas retas e clique para arredondá-lo. **Shift+clique** arredonda todos os cantos da forma. Digite um raio para alterá-lo; se for grande demais, a dica informa o maior que cabe. |
| **Chanfro** | B | Como o Arredondamento, mas corta o canto em linha reta. Digite duas distâncias, ou uma distância e um ângulo. |
| **Aparar / estender / dividir** | W | *Aparar*: clique no trecho de linha a remover, até os cruzamentos mais próximos. *Estender*: clique perto da extremidade de uma linha para alongá-la até a próxima. *Dividir*: clique em uma linha para cortá-la naquele ponto. Shift+clique troca aparar e estender. |
| **Unir caminhos** | Shift+J | Une os caminhos abertos selecionados que se encontram ponta a ponta; um único caminho cujas extremidades se tocam é fechado. |
| **Explodir** | Shift+X | Separa os retângulos, polilinhas ou contornos selecionados em segmentos individuais. |
| **União** | Shift+U | Funde duas ou mais formas fechadas selecionadas em um único contorno. |
| **Diferença** | Shift+D | Recorta das demais formas fechadas selecionadas a maior delas. |

## 5. Ferramentas de couro

É isso que torna o LeatherDraft diferente de um programa de CAD genérico. Os resultados **permanecem vinculados**: se você editar um contorno, a linha de costura o acompanha; os furos acompanham a linha de costura. Tudo é atualizado na mesma etapa de desfazer.

### Linha de costura (K)

1. Clique em um contorno.
2. Clique dentro ou fora para escolher o lado. A margem vem das configurações do projeto (veja abaixo), ou digite outro valor.

A linha de costura é desenhada na camada Costura e, a partir daí, segue o contorno. Para desfazer o vínculo, selecione-a e pressione **Desvincular** em Propriedades.

### Furos de costura (H)

1. Ajuste as opções na barra de entrada:
   - **Passo** do ponteiro de losango: 2,7, 3,38, 3,85, 4,0 ou 5,0 mm, ou **Personalizado**.
   - **Tamanho do furo** e **Formato**: *Redondo* ou *Fenda inclinada* (como um ponteiro de losango).
   - **Furo em cada canto**: o espaçamento é distribuído por borda para que um furo caia exatamente em cada canto, como se faz ao conduzir o ponteiro.
2. Passe o cursor sobre uma linha de costura (ou qualquer linha) para visualizar os furos e a quantidade.
3. Clique para adicioná-los.

Você pode alterar passo, tamanho ou formato depois em Propriedades; a lista **Por borda** mostra a quantidade de furos de cada borda.

### Padrões do projeto

Sem nada selecionado, a seção **Projeto** das Propriedades define os padrões para novas linhas de costura e furos: **Margem de costura** (3,5 mm), **Passo** (3,85 mm) e **Tamanho do furo** (1,2 mm); os padrões aparecem entre colchetes.

### Margem de costura (Y)

1. Clique em um contorno fechado.
2. Digite um valor para todas as bordas, ou clique nas bordas (Shift+clique para várias) e digite um valor só para elas.
3. Pressione **Enter** sem digitar nada para adicionar o contorno.

### Furo de rebite / fenda (U)

Para rebites, botões de pressão, pinos de parafuso e línguas de fivela. Escolha *Furo redondo* ou *Fenda*, selecione um diâmetro de **Punção** comum ou **Personalizado**, depois clique para posicionar (encaixa em centros e pontos) ou digite X/Y e Enter. Em uma fenda, *Comprimento* é de ponta a ponta e *Largura* é o diâmetro do punção.

### Entalhe (J)

Marcas de alinhamento para a montagem. Escolha *Simples* ou *Duplo*, e *Corte (linha)* ou *Entalhe em V*, defina a profundidade (e o espaçamento / a largura), depois clique em uma borda. Os entalhes apontam para dentro da peça; em linhas abertas, para o lado do cursor.

### Estilos de linha

Nas Propriedades, defina o **Estilo de linha** de um caminho: *Sólida (corte)*, *Tracejada (dobra / vinco)*, *Pontilhada (referência)* ou *Traço e ponto (centro)*. **Traço (exportação)** define a espessura de linha usada nos arquivos exportados.

## 6. Restrições

A ferramenta **Restrição** (Z) torna exatas as relações entre formas. Em cada caso, o **primeiro** elemento clicado permanece no lugar e o **segundo** se move.

| Tipo | Clique em |
| --- | --- |
| **Paralela** / **Perpendicular** | Duas bordas retas. |
| **Tangente** | Uma borda reta ou um círculo, e depois o círculo (ou a borda) que deve ficar tangente. |
| **Coincidente** | Dois pontos. |
| **Distância** | Dois pontos, depois digite a distância e pressione Enter (Enter sozinho mantém a atual). |
| **Raio** | Um círculo, depois digite o raio e pressione Enter. |

Se uma nova restrição entrar em conflito com as existentes, nada muda e a dica informa isso.

Os objetos selecionados listam suas restrições na seção **Restrições** das Propriedades. Uma restrição marcada como *Não satisfeita* significa que a geometria foi movida depois de resolvida; pressione **Resolver** para restaurá-la. *Quebrada* significa que algo a que ela se refere mudou ou foi excluído; remova-a com o botão ×.

## 7. Medir

**Medir** (D) tem quatro modos:

- **Distância**: clique em dois pontos.
- **Ângulo**: clique em um ponto, no vértice e depois em outro ponto.
- **Comprimento**: passe sobre uma forma para ver seu comprimento.
- **Quantidade de furos**: clique em uma borda de um conjunto de furos e depois na borda em que ele será costurado. A dica informa se as quantidades coincidem ou quantos furos de diferença existem, para que você ajuste o passo ou o comprimento das bordas antes de cortar.

## 8. Camadas e propriedades

### Camadas

Cada desenho tem quatro camadas:

| Camada | Uso |
| --- | --- |
| **Corte** | Contornos a cortar. |
| **Costura** | Linhas de costura e furos. |
| **Referência** | Linhas de construção e desenhos importados. |
| **Notas** | Rótulos e setas de veio. |

Em cada camada você pode **mostrar / ocultar** (caixa de seleção), mudar a **cor** (amostra), **bloquear / desbloquear** (cadeado) e clicar no nome para **desenhar nela**. Não é possível desenhar em uma camada bloqueada ou oculta.

### Propriedades

Selecione objetos para ver e editar seus valores: posição, largura e altura, comprimento, raio ou diâmetro, rotação, camada, estilo de linha, texto, passo etc. Digite um valor e pressione Enter. Com vários objetos selecionados, valores diferentes aparecem como «—»; digitar um valor define todos.

### Unidades

Escolha **mm**, **cm** ou **in** na barra de status. Isso altera apenas o que é exibido e digitado; o desenho é sempre armazenado em milímetros.

## 9. Arquivos

- **Salvar** (⌘/Ctrl+S) grava um arquivo de projeto `.json`. **⌘/Ctrl+Shift+S** salva com um novo nome.
- **Abrir…** (⌘/Ctrl+O) abre um projeto `.json`.
- **Novo** inicia um projeto vazio (pergunta antes se há alterações não salvas).
- O nome do projeto fica na barra de ferramentas; um ponto no título da aba do navegador indica alterações não salvas.
- **Importar…** traz um **SVG ou DXF** em tamanho real para a camada Referência, selecionado, para que você possa decalcar um molde existente.
- **Salvamento automático**: seu trabalho é guardado no navegador meio segundo após cada alteração e restaurado na próxima vez que você abrir o LeatherDraft. O salvamento automático é uma rede de segurança, não substitui salvar o arquivo: limpar os dados do navegador o apaga.

**Aplicativo de desktop**: Salvar, Abrir e Exportar usam as janelas de diálogo do sistema, e Salvar continua gravando no mesmo arquivo.

**Offline**: depois de carregado, o aplicativo web funciona offline («Pronto para trabalhar offline»). Quando há uma nova versão, um aviso oferece **Recarregar**.

## 10. Exportação e impressão

**Exportar…** abre a janela de exportação.

| Formato | Uso | Opções |
| --- | --- | --- |
| **PDF** | Impressão em 1:1 | Papel (A4, Letter, A3, ou **Uma página, no tamanho do molde** para plotters de grande formato), orientação (*Menos páginas*, retrato, paisagem), sobreposição entre folhas |
| **SVG** | Cortadoras a laser, plotters de recorte, Inkscape, Illustrator | Curvas convertidas em pequenos segmentos retos (para softwares de laser que não leem curvas) |
| **DXF** | Softwares de laser e CNC, em mm | Apenas formas: os rótulos são omitidos |
| **PNG** | Compartilhar uma imagem | Resolução: 96, 150 ou 300 dpi. Não serve para fazer o molde. |

Opções comuns: **Somente camadas de corte (laser)**, **Incluir rótulos**, **Espessura de linha** e uma **Marca d'água** (texto e opacidade; em PDFs ela se repete em cada página).

Se o desenho tiver objetos criados por IA (pelo servidor MCP) que ninguém revisou, a janela avisa. Selecione-os pela barra de status e pressione **Marcar como revisado** em Propriedades depois de conferi-los.

### Impressão em tamanho real

Um PDF em folhas começa com uma **página de montagem**: um mapa das folhas e um **quadrado de calibração de 50 mm**. Cada folha tem marcas de corte e um rótulo (A1, A2, B1…).

1. Imprima em **100 % / «Tamanho real»**. Nunca «Ajustar à página» nem «Reduzir páginas grandes».
2. **Meça o quadrado de 50 mm.** Se não medir exatamente 50 mm, corrija a escala na impressora e imprima de novo.
3. Recorte pela linha tracejada ou sobreponha as folhas, alinhando as marcas de canto e os rótulos, e cole-as com fita.

## 11. Atalhos de teclado

### Ferramentas e ações

| Tecla | Ferramenta | Tecla | Ferramenta |
| --- | --- | --- | --- |
| V | Selecionar | M | Mover |
| L | Linha / polilinha | O | Girar |
| R | Retângulo / quadrado | S | Escalar |
| C | Círculo / 3 pontos / elipse | I | Espelhar |
| P | Caneta (curvas) | Q | Matriz |
| A | Arco (3 pontos) | W | Aparar / estender / dividir |
| X | Linha de centro | E | Deslocamento |
| T | Perpendicular | Y | Margem de costura |
| G | Paralela | F | Arredondamento |
| N | Rótulo / seta de veio | B | Chanfro |
| D | Medir | K | Linha de costura |
| Z | Restrição | H | Furos de costura |
| U | Furo de rebite / fenda | J | Entalhe |
| Shift+H / Shift+V | Espelhar horizontal / vertical | Shift+J | Unir caminhos |
| Shift+X | Explodir | Shift+U / Shift+D | União / diferença |

Você pode alterar qualquer um desses atalhos em **Atalhos…** na barra de ferramentas. São teclas de letra, com ou sem Shift, reconhecidas pela posição na tecla, então funcionam com qualquer layout de teclado ou método de entrada. Ficam guardados por navegador; **Restaurar tudo** volta aos padrões.

### Geral

| Tecla | Ação |
| --- | --- |
| ⌘/Ctrl+Z, ⇧⌘Z / Ctrl+Y | Desfazer, refazer |
| ⌘/Ctrl+S, ⌘/Ctrl+Shift+S | Salvar, salvar como |
| ⌘/Ctrl+O | Abrir |
| ⌘/Ctrl+A | Selecionar tudo |
| Delete | Excluir a seleção ou o ponto selecionado |
| Esc | Cancelar / desmarcar |
| Enter, clique duplo, clique com o botão direito | Concluir uma forma / confirmar |
| Backspace | Remover o último ponto durante o desenho |
| Shift (segurado) | Travar o ângulo em passos de 15° |
| Alt (segurado) | Retângulo a partir do centro; copiar ao arrastar |
| Teclas numéricas | Começar a digitar um valor |
| Tab | Próximo campo de entrada |
| Espaço + arrastar, arrastar com o botão do meio | Deslocar a visualização |
| Roda, pinça | Zoom |

## 12. Passo a passo: uma carteira de cartões

1. **Retângulo** (R): clique uma vez, digite `95`, Tab, `65`, Enter. Você tem uma peça de 95 × 65 mm na camada Corte.
2. **Arredondamento** (F): digite `5`, depois **Shift+clique** em um canto para arredondar os quatro.
3. **Linha de costura** (K): clique no contorno e depois dentro dele. Com a margem padrão, você obtém uma linha de costura a 3,5 mm da borda.
4. **Furos de costura** (H): escolha o passo **3,85**, marque **Furo em cada canto**, passe sobre a linha de costura e clique.
5. **Rótulo** (N): clique dentro da peça, digite `Carteira de cartões · cortar 2`, Enter.
6. Experimente alterar o contorno: selecione o retângulo e defina **L** como `100` em Propriedades. A linha de costura e os furos acompanham.
7. **Salvar** (⌘/Ctrl+S), depois **Exportar…** → PDF → A4 → imprima em 100 % e meça o quadrado de 50 mm.

## 13. Solução de problemas

| Problema | Solução |
| --- | --- |
| Nada é desenhado / «A camada ativa está bloqueada ou oculta» | Desbloqueie ou mostre a camada, ou escolha outra em Camadas. |
| A impressão ficou um pouco menor ou maior | O PDF foi escalonado. Imprima em 100 % / Tamanho real e confira de novo o quadrado de 50 mm. |
| Arredondamento diz «grande demais para este canto» | Use o maior raio mostrado na dica, ou alongue as bordas. |
| As quantidades de furos não batem em duas bordas a costurar | Use Medir → Quantidade de furos, depois ajuste o passo ou o comprimento de uma borda. |
| Restrição «conflito» | A nova restrição contradiz as existentes. Exclua uma em Propriedades → Restrições. |
| O software de laser mostra curvas quebradas | Exporte em SVG com **Curvas convertidas em pequenos segmentos retos**, ou use DXF. |
| Um atalho de ferramenta não responde | Um campo de texto pode estar com o foco: clique primeiro na área de desenho. Confira em **Atalhos…** se a tecla foi reatribuída. |
