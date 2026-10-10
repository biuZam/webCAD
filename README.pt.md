# LeatherDraft

[English](README.md) · [简体中文](README.zh-CN.md) · [繁體中文](README.zh-TW.md) · [Deutsch](README.de.md) · [Français](README.fr.md) · [Español](README.es.md) · [Italiano](README.it.md) · **Português** · [日本語](README.ja.md) · [한국어](README.ko.md)

Uma ferramenta de CAD 2D no navegador para desenhar **moldes de couro em milímetros** e imprimi-los ou cortá-los em **escala real 1:1**.

Funciona inteiramente no navegador: sem conta, sem servidor, e seus arquivos nunca saem do seu dispositivo. Pode ser instalada como aplicativo e funciona offline; também há um aplicativo de desktop para Windows, macOS e Linux.

![LeatherDraft: desenho de uma carteira de cartões, arredondamento dos cantos, adição de uma linha de costura vinculada e furos de ponteiro, redimensionamento e exportação](docs/media/demo.gif)

> **Status: pré-1.0.** As funções de desenho, trabalho com couro e exportação estão implementadas e testadas. Ainda faltam, antes do lançamento: uma verificação física da precisão de impressão em impressoras reais, testes de compatibilidade com Inkscape, Illustrator e LightBurn, e alguns itens menores (veja [`docs/TASKS.md`](docs/TASKS.md)).

## Guia do usuário

Instruções passo a passo para cada ferramenta, impressão em tamanho real, atalhos e um exemplo completo:

- [Guia do usuário (Português)](docs/USER_GUIDE.pt.md)
- [User guide (English)](docs/USER_GUIDE.md)

## O que faz

**Desenho**

- Linhas (cada segmento é um objeto próprio, como no CAD) e polilinhas, retângulos e quadrados (com raio de canto), círculos (centro + raio, 3 pontos, elipse), caneta Bézier, arcos de 3 pontos
- Linhas de centro (utilizáveis como eixos de espelhamento) e perpendiculares
- Rótulos: texto (nome da peça, «cortar 2»…) e setas de veio, na camada Notas
- Mover, girar, escalar e espelhar (cada um opcionalmente como cópia), inverter no lugar; matrizes lineares e circulares
- Deslocamento, arredondamento e chanfro; paralelas; aparar, estender e dividir; unir caminhos; união e diferença de formas
- Editar pontos e alças de Bézier diretamente; alternar pontos entre suave e canto; adicionar e excluir pontos; arrastar formas selecionadas para movê-las
- Encaixe em objetos: extremidade, ponto médio, centro, quadrante, interseção, perpendicular, tangente, mais próximo, grade; rastreamento polar e de objeto
- Restrições: paralela, perpendicular, tangente, coincidente, distância e raio, resolvidas de forma que o primeiro objeto permaneça no lugar e o segundo se mova
- Valores exatos: digite coordenadas, comprimentos, ângulos e raios enquanto desenha; edite os números no painel de propriedades
- Camadas (corte, costura, referência, notas) com visibilidade, bloqueio e cor; exibição em mm, cm ou polegadas

**Específico para couro**

- **Linhas de costura** a uma margem definida de um contorno, vinculadas a ele: edite o contorno e a linha de costura acompanha
- **Furos de costura** em passos de ponteiro de losango (2,7, 3,38, 3,85, 4,0, 5,0 mm ou personalizado), redondos ou em fenda inclinada. Com «furo em cada canto», o espaçamento é distribuído por borda para que um furo caia exatamente em cada canto, como ao conduzir o ponteiro.
- Os furos seguem sua linha de costura, que segue o contorno, tudo em uma única etapa de desfazer
- **Quantidade de furos por borda**, e uma verificação de que duas bordas a serem costuradas juntas têm a mesma quantidade (Medir → Quantidade de furos)
- **Furos de punção e fendas** para rebites, botões de pressão e fivelas, com os diâmetros de punção comuns
- **Entalhes**: marcas de alinhamento simples ou duplas em qualquer borda, em corte ou em V

**Saída**

- **SVG** em 1:1 (1 unidade = 1 mm), uma camada por grupo, com opção de converter curvas em pequenos segmentos retos para softwares de laser
- **PDF** para impressoras domésticas: dividido em A4, Letter ou A3 com sobreposição, marcas de corte e rótulos de folha, mais uma página de montagem com um **quadrado de calibração de 50 mm**. Ou uma única página no tamanho do molde, para impressoras de grande formato.
- **DXF** (mm) para softwares de laser e CNC, e uma imagem **PNG** para compartilhar
- **Marca d'água** opcional nas exportações (repetida em cada página do PDF)
- **Importar SVG ou DXF** em tamanho real para a camada de referência, para decalcar um molde existente
- Salvar e abrir arquivos de projeto `.json`. O trabalho é salvo automaticamente no navegador e restaurado ao recarregar.

### Impressão em tamanho real

Imprima o PDF em **100 % / «Tamanho real»**, nunca «Ajustar à página», e meça o quadrado de 50 mm na primeira página. Se não medir 50 mm, verifique as configurações de escala da sua impressora.

## Atalhos de teclado

| Tecla | Ferramenta | Tecla | Ferramenta |
| --- | --- | --- | --- |
| V | Selecionar (e editar pontos) | M | Mover |
| L | Linha / polilinha | O | Girar |
| R | Retângulo | S | Escalar |
| C | Círculo / 3 pontos / elipse | I | Espelhar |
| P | Caneta (curvas) | Shift+H / Shift+V | Espelhar horizontal / vertical |
| A | Arco (3 pontos) | E | Deslocamento |
| X | Linha de centro | F | Arredondamento |
| T | Perpendicular | B | Chanfro |
| D | Medir | K | Linha de costura |
| N | Rótulo / seta de veio | H | Furos de costura |
| G | Paralela | W | Aparar / estender / dividir |
| U | Furo de punção / fenda | Y | Margem de costura (por borda) |
| Q | Matriz (linear / circular) | J | Entalhe |
| Shift+J | Unir caminhos | Shift+U / Shift+D | União / diferença |
| Z | Restrição | Shift+X | Explodir em segmentos |

Ferramentas semelhantes compartilham um botão da paleta, como no Photoshop: **clique com o botão direito** em um botão com triângulo no canto (ou pressione e segure, ou → sobre ele) para escolher outra. Os grupos são: linha / polilinha, retângulo / quadrado, círculo / círculo de 3 pontos / elipse, caneta / arco, perpendicular / paralela, arredondamento / chanfro, deslocamento / margem de costura, punção / entalhe, espelhar horizontal / vertical, unir / explodir, união / diferença. O painel lateral se recolhe com a seta no topo.

Cada ferramenta e cada tecla de ação pode ser alterada em **Atalhos…** na barra de ferramentas (guardado por navegador).

Enquanto desenha: **comece a digitar um número** para inseri-lo na barra de entrada, **Tab** passa entre campos, **Enter** aplica, **Esc** cancela, **Backspace** remove o último ponto, **Shift** trava os ângulos em passos de 15°. **Espaço + arrastar** ou arrastar com o botão do meio desloca a visualização; a roda faz zoom. **⌘/Ctrl+Z / ⇧⌘Z** desfazem e refazem, **⌘/Ctrl+S** salva, **⌘/Ctrl+O** abre, **⌘/Ctrl+A** seleciona tudo.

## Desenvolvimento

Requer **Node ≥ 20.19** e **pnpm 10** (`corepack enable` usa a versão indicada em `package.json`).

```bash
pnpm install
pnpm dev                     # http://localhost:5173
```

URLs úteis em desenvolvimento:

- `?fixture=acceptance`: o desenho de aceitação do PRD (quadrado de 100 mm, círculo de 50 mm, furos de costura de 3,85 mm)
- `?fixture=perf`: 2.000 entidades para verificações de desempenho

As sessões com fixture nunca são salvas automaticamente, então não podem sobrescrever o seu trabalho.

| Comando | O que faz |
| --- | --- |
| `pnpm test` | Testes unitários e de componentes (Vitest); `pnpm test <arquivo>` ou `pnpm test -t "<nome>"` para um só |
| `pnpm check` | Verificação de tipos, lint, testes e relatório de traduções |
| `pnpm verify` | Tudo o que a CI executa: o acima mais formatação, build de produção e orçamento do bundle |
| `pnpm build` / `pnpm preview` | Build de produção (com service worker) e pré-visualização local |
| `pnpm i18n:check` | Chaves ausentes nos idiomas que não são inglês |
| `pnpm bundle:check` | O download inicial deve ficar abaixo de 600 KB gzip |
| `BENCH=1 pnpm test perf.bench` | Medição de desempenho com 2.000 entidades |

Se as instalações de pacotes estiverem lentas onde você está, experimente um espelho do registro, por ex. `pnpm install --registry=https://registry.npmmirror.com`.

### Aplicativo de desktop (Tauri)

`src-tauri/` envolve o mesmo build do Vite em uma janela nativa (Windows, macOS, Linux). É necessário um conjunto de ferramentas Rust e as ferramentas de build da plataforma ([pré-requisitos do Tauri](https://v2.tauri.app/start/prerequisites/)).

```bash
pnpm desktop:dev             # janela nativa sobre o servidor de desenvolvimento do Vite (hot reload)
pnpm desktop:build           # instalador para este sistema em src-tauri/target/release/bundle/
pnpm tauri build --bundles app   # macOS: apenas LeatherDraft.app, sem .dmg
```

Diferenças em relação ao aplicativo web: Salvar, Abrir e Exportar usam as janelas de diálogo nativas (Salvar continua gravando no mesmo arquivo até você fechar o app), e não há service worker; o app se atualiza instalando uma nova versão. O salvamento automático funciona como no navegador. O Tauri não compila de forma cruzada, então os instaladores do Windows vêm da CI: execute o fluxo **Desktop** (`.github/workflows/desktop.yml`) ou envie uma tag `desktop-v*`; ele gera um `.exe` para Windows (NSIS) e um `.dmg` universal para macOS como artefatos do fluxo. Os ícones em `src-tauri/icons` são gerados a partir de `public/icon.svg` com `pnpm tauri icon public/icon.svg -o src-tauri/icons`.

### Tecnologias

React 19 + TypeScript + Vite · [Paper.js](http://paperjs.org) para geometria e renderização · Zustand + Immer (armazenamento do documento, desfazer/refazer como patches) · [paperjs-offset](https://github.com/glenzli/paperjs-offset) com Clipper como alternativa para os deslocamentos · jsPDF + svg2pdf.js para PDF (carregados sob demanda) · i18next · vite-plugin-pwa · Vitest.

### Como tudo se encaixa

- **O desenho é JSON simples em milímetros**, mantido em um armazenamento. Cada alteração é um comando, o que permite desfazer sem limite e tem arquivos de salvamento simples.
- **O Paper.js** desenha a tela e faz os cálculos geométricos, mas não é dono dos dados.
- **As entidades vinculadas são regeneradas dentro do mesmo comando** que altera a origem delas, então linhas e furos de costura nunca ficam desatualizados.
- **O PDF é gerado a partir do mesmo SVG** que o app exporta, de modo que tela, SVG e impressão não podem divergir.

Mais detalhes:

- [`docs/ARCHITECTURE.md`](docs/ARCHITECTURE.md): decisões de projeto, camadas, modelo de dados, notas sobre desempenho e acessibilidade
- [`docs/USER_GUIDE.pt.md`](docs/USER_GUIDE.pt.md) e outros idiomas: guia do usuário (veja a seção Idiomas)
- [`docs/MCP.md`](docs/MCP.md): servidor MCP sem interface, para que clientes de IA possam desenhar, editar, costurar e exportar moldes
- [`docs/TASKS.md`](docs/TASKS.md): lista de tarefas e progresso por marco
- [`PRD — Leather Pattern CAD (Web).md`](<PRD — Leather Pattern CAD (Web).md>): requisitos do produto
- [`CLAUDE.md`](CLAUDE.md): convenções para trabalhar no código

### Critérios de qualidade

- **Precisão.** Os deslocamentos ficam a até 0,02 mm da distância pedida, e os arcos de arredondamento a até 0,001 mm de um círculo verdadeiro. A escala do PDF é verificada nos testes lendo de volta os comandos de desenho do PDF como milímetros de página.
- **Desempenho.** 2.000 entidades (17.600 furos de costura) são redesenhadas em cerca de 12 ms.
- **Acessibilidade.** Os contrastes de cor WCAG 2.2 AA são verificados na CI para os temas claro e escuro, e uma auditoria axe-core não relata violações.

## Idiomas

A interface está disponível em inglês, 简体中文, 繁體中文, Deutsch, Français, Español, Italiano, Português, 日本語 e 한국어; troque pelo ícone de globo na barra de ferramentas. O texto das páginas PDF segue o idioma da interface, e o texto em chinês nos PDFs (texto das páginas, rótulos, nomes) é impresso com uma fonte Noto Sans SC incorporada.

O guia do usuário está disponível em [inglês](docs/USER_GUIDE.md), [português](docs/USER_GUIDE.pt.md) e nos demais idiomas em `docs/`. Este README existe nos mesmos idiomas na raiz do projeto.

## Licença

O LeatherDraft é de **código disponível** sob a [PolyForm Noncommercial License 1.0.0](LICENSE):

- **Gratuito** para uso pessoal, de hobby, estudo e pesquisa, e para escolas, instituições de caridade e outras organizações sem fins lucrativos. Você pode alterar o código e compartilhar as alterações para fins não comerciais.
- **Seus moldes e produtos são seus.** Desenhos, arquivos exportados e os artigos de couro que você fabrica com eles não têm restrições; você pode vendê-los.
- **O uso comercial do próprio software** (vendê-lo, ou vender uma versão modificada, oferecê-lo como serviço, incorporá-lo a um produto comercial) exige uma licença comercial. Versões modificadas não podem ser usadas comercialmente. Veja [COMMERCIAL.md](COMMERCIAL.md).
- Contribuições são bem-vindas; os colaboradores assinam um [CLA](CLA.md) uma vez. Veja [CONTRIBUTING.md](CONTRIBUTING.md).

«LeatherDraft» e seu logotipo não são cobertos pela licença. As versões até o commit `ca93653` / `7db180a` (10 de outubro de 2026) foram lançadas sob Apache-2.0.
