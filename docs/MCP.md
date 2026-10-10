# LeatherDraft — MCP server（方案 2：无界面）设计稿

状态：P1–P3 已实现（T6.1–T6.6）。决定见 §10。目标读者：实现者和评审者。相关文档：`docs/ARCHITECTURE.md`、`docs/TASKS.md`。

## 1. 目标与边界

让 AI（Claude Desktop / Claude Code / 任何 MCP 客户端）**在 Node 里直接读写 LeatherDraft 工程文件**：画线、做缝线和针孔、变换、导出 SVG/DXF/PDF。不需要打开浏览器。

- **做**：stdio 传输的本地 MCP server；读写 `.json` 工程文件；复用现有的命令、派生和导出代码，结果和在 App 里手画完全一致（同一套 `Command`，同一套 `regenerateDerived`，同一个 `exportSvg`）。
- **不做（本期）**：和正在运行的浏览器页面实时同步（方案 1，以后通过 WebSocket 桥接复用本期的工具定义）；远程 HTTP 部署；捕捉、吸附（AI 直接给坐标，不需要吸附）。
- **原则**：MCP 层只是一层薄适配，**不写新的几何代码**。缺少的能力先补到 `geometry`/`document` 里（带测试），再在 MCP 层暴露。

## 2. 在分层里的位置

```
┌───────────────────────────────┬──────────────────────────┐
│ 4. UI shell  src/app, src/ui   │ 4'. MCP  src/mcp (新增)   │  ← 同为最上层，互不引用
├───────────────────────────────┴──────────────────────────┤
│ 3. src/tools 中的纯函数（path-ops 等），不引用 ToolSession   │
├──────────────────────────────────────────────────────────┤
│ 2. src/document, src/persistence                           │
├──────────────────────────────────────────────────────────┤
│ 1. src/geometry, src/export, src/lib                       │
└──────────────────────────────────────────────────────────┘
```

- `src/mcp` 可以引用 `document`、`persistence`、`geometry`、`export`、`lib`，以及 `src/tools` 里**不依赖 ToolSession 的纯函数**（`joinSelection`、`explodeSelection`、`booleanSelection`）。
- `src/mcp` **不得**引用 React、`src/canvas`、`src/ui`、`src/i18n`、全局 `documentStore`。每个打开的文档各自用 `createDocumentStore()` 新建一个 store。
- 反向同样禁止：App 代码不得引用 `src/mcp`，这样 MCP 代码不会进入浏览器包，`bundle:check` 不受影响。
- 如果某个工具需要的逻辑目前只写在某个 Tool 类里（例如 stitch-line、stitch-holes 里构造实体的那几行），先把它抽成纯函数，放到 `src/document/builders.ts`，Tool 和 MCP 共用。这是本期唯一对现有代码的重构。

## 3. 运行时与构建

| 项 | 选择 | 原因 |
|---|---|---|
| SDK | `@modelcontextprotocol/sdk` + `zod`，放进本包的 `dependencies`（同一个包，只用独立构建入口隔离；浏览器代码不引用，不进浏览器包） | 官方实现；工具参数用 zod 定义，同时生成 JSON Schema |
| 传输 | stdio | Claude Desktop / Claude Code 本地配置最简单 |
| 构建 | 单独的 `vite.mcp.config.ts`，`build.ssr = 'src/mcp/server.ts'`，输出 `dist-mcp/server.mjs` | **必须**沿用 `paper → paper/dist/paper-core` 别名，并把 `paperjs-offset`、`svg2pdf.js`、`jspdf` 打进产物（与 vitest 的 `server.deps.inline` 同理），否则会出现两个 Paper.js 实例 |
| 开发运行 | `pnpm mcp:dev` = `vite-node --config vite.mcp.config.ts src/mcp/server.ts` | 直接用 `tsx` 跑不会应用别名，不可行 |
| DOM | 默认不加载。仅 `export_pdf` 和 SVG 的 `import_file` 第一次调用时由 `src/mcp/headless-dom.ts` 把 happy-dom 的 window 装成 Node 全局，并调用与测试共用的 `stubCanvas()`（`src/lib/headless-canvas.ts`）。happy-dom 因此移到了 `dependencies`（App 不引用，不进浏览器包） | 和测试环境相同，已验证可用；**永远不引入 jsdom**（见 CLAUDE.md） |
| 日志 | 只写 stderr | stdout 被 stdio 协议占用 |

客户端配置示例（Claude Code）：

```bash
claude mcp add leatherdraft -- node /path/to/webCAD/dist-mcp/server.mjs --root ~/Patterns
# 只读：
claude mcp add leatherdraft-ro -- node /path/to/webCAD/dist-mcp/server.mjs --root ~/Patterns --readonly
```

### 只读模式（`--readonly`）

- 只注册不改动文档、也不写工程文件的工具：`open_project`、`close_project`、`get_project`、`list_entities`、`get_entity`、`measure`、`export_svg`、`export_dxf`、`export_pdf`，以及 resources。
- 修改类工具**根本不注册**（AI 看不到它们），而不是注册后再报错，这样 AI 不会反复尝试。
- 导出到文件仍然允许（只能写 `.svg`/`.dxf`/`.pdf`，并受 `--root` 限制），但任何 `.json` 工程文件都不会被写入。
- `get_project` 的返回值里带上 `"readonly": true`，让 AI 知道自己处于什么模式。

## 3.1 使用

```bash
pnpm mcp:build                                   # → dist-mcp/server.mjs（依赖本仓库的 node_modules）
claude mcp add leatherdraft -- node "$PWD/dist-mcp/server.mjs" --root ~/Patterns
pnpm mcp:dev -- --root ~/Patterns                # 开发时不用先 build
```

Claude Desktop：在 `claude_desktop_config.json` 的 `mcpServers` 里加
`{"leatherdraft": {"command": "node", "args": ["/abs/path/dist-mcp/server.mjs", "--root", "/abs/path/Patterns"]}}`。

## 4. 会话与文件模型

- server 进程里有一个 `Map<docId, { store: DocumentStore; path?: string; dirty: boolean }>`。
- `docId` 由 server 生成，短字符串；同一路径重复打开时返回已有的 `docId`。
- **文件访问限定在 `--root` 目录之内**（可以传多个）。所有路径先 `realpath` 再检查前缀，越界直接报错。没有传 `--root` 时只允许 cwd。
- 保存用 `serializeProject`，打开用 `parseProjectFile`（会自动执行 schema 迁移）。不自动保存；`save_project` 前文档只在内存里。
- 撤销历史保存在内存的 store 里，跟随会话，不写进文件（和 App 一致）。

## 5. 约定（写进每个工具的 description）

- 长度一律 **mm**，坐标 **y 轴向下**，角度为**度、屏幕上顺时针为正**（与模型字段一致）。注意 App 的 Rotate 工具输入框是逆时针为正，MCP 的 `transform` rotate 已在内部换算。不接受 `"3cm"` 这类字符串，避免歧义；需要换算时由 AI 自己算。
- 实体默认放进**第一个 piece**；可选参数 `pieceId`。图层用 `layer: 'cut' | 'stitch' | 'reference' | 'notes' | <layerId>`，默认值按工具语义选（画轮廓用 `cut`，缝线/针孔用 `stitch`，中心线用 `reference`，文字用 `notes`）。
- 锁定或隐藏的图层拒绝写入，返回错误，**不**自动解锁。
- **一次工具调用 = 一次 `dispatch` = 一个撤销步骤**。批量工具（`add_entities`）也只占一步。
- 派生实体（`path.derived`，带 `sourceEntityId` 的 holeSet）：直接改它的几何会触发脱离（与 App 一致）。`update_entity` 在这种情况下默认拒绝，需显式传 `detach: true`。
- AI 新建的每个实体都带 `aiCreated: true` 标记（见 §6.7）。
- 返回值统一为 JSON 文本：

```jsonc
{
  "ok": true,
  "created": ["k3Fz9aQ1bX"],          // 新建实体 id
  "changed": ["..."], "removed": ["..."],
  "bounds": { "minX": 0, "minY": 0, "maxX": 120, "maxY": 80 },  // 受影响实体的包围盒
  "warnings": ["offset: corner clipped"]                       // 例如 offsetEntity 的 warnings
}
```

- 出错时返回 MCP `isError: true`，消息为英文纯文本，说明原因和修正方法（例如 `"Layer 'stitch' is locked. Unlock it with update_layer first."`）。消息给 AI 看，不走 i18n。
- 列表类返回值要**紧凑**：`list_entities` 默认只给 id、type、layer、bounds 和摘要（例如 `"path, closed, 4 segments, length 400.0"`），完整几何要单独调用 `get_entity` 获取，以免撑爆上下文。

## 6. 工具清单

“复用”一列是实现时调用的现有函数。标 *新* 的需要先在下层补上（带测试）。

### 6.1 工程

| 工具 | 参数 | 复用 |
|---|---|---|
| `new_project` | `name?` | `createProject` |
| `open_project` | `path` | `parseProjectFile` |
| `save_project` | `docId, path?`（省略则覆盖原路径） | `serializeProject` |
| `close_project` | `docId, discard?`（有未保存修改且未传 `discard` 时拒绝） | — |
| `get_project` | `docId` | 名称、设置、图层、piece 列表、实体数、总包围盒 |
| `update_settings` | `docId, stitchMargin?, pitch?, holeSize?` | `updateProjectSettings` |
| `update_layer` | `docId, layer, visible?, locked?, name?, color?` | `updateLayer` |

### 6.2 查询

| 工具 | 参数 | 复用 |
|---|---|---|
| `list_entities` | `docId, pieceId?, layer?, type?, offset?, limit?`（默认 100） | `entityBounds` |
| `get_entity` | `docId, ids[]` | 完整实体 JSON |
| `measure` | `docId, id` | 长度、面积、是否闭合、孔数（*新*：`src/geometry/measure.ts`，从 measure 工具里抽出） |

### 6.3 绘制

| 工具 | 参数 | 复用 |
|---|---|---|
| `add_lines` | `points[][2], closed?, mode: 'segments' \| 'polyline'`（默认 `segments`：每段一个实体，和 App 的 Line 工具一致；`polyline` 生成一条 path） | 同 line 工具 |
| `add_rect` | `x, y, width, height, cornerRadius?` 或 `center` | `rectangleSegments` |
| `add_circle` | `center, r` 或 `rx, ry, rotation?` | — |
| `add_arc` | `center, r, startAngle, endAngle` 或三点 | `src/geometry/arcs.ts` |
| `add_path` | `segments: {p, hi?, ho?}[], closed` | 原样写入，供需要贝塞尔曲线时使用 |
| `add_text` | `position, text, size, rotation?` | — |
| `add_centre_line` | `from, to` | — |
| `add_entities` | 以上任意组合的数组，一次 dispatch | `addEntities` |

### 6.4 编辑

| 工具 | 参数 | 复用 |
|---|---|---|
| `update_entity` | `id, changes, detach?` | `updateEntity` |
| `set_style` | `ids[], layer?, lineStyle?, strokeWidth?` | `updateEntities` |
| `delete_entities` | `ids[]` | `removeEntities` |
| `transform` | `ids[], op: move\|rotate\|scale\|mirror, …, copy?` | `transformEntities` + `translation`/`rotationAbout`/`scaleAbout`/`mirrorAcross` |
| `array` | `ids[], kind: linear\|polar, count, step/center+angle` | `arrayEntities` |
| `fillet` / `chamfer` | `id, corners: number[] \| 'all', radius / distance` | `filletCorner`、`chamferCorner`、`applyToCorners` |
| `offset` | `id, distance, join?` | `offsetEntity`（`precise`，绝不用 `preview`） |
| `join` / `explode` / `boolean` | `ids[]`（boolean 另有 `op`） | `joinSelection`、`explodeSelection`、`booleanSelection` |
| `undo` / `redo` | `docId, steps?` | store 的 `undo`/`redo` |

### 6.5 皮具

| 工具 | 参数 | 复用 |
|---|---|---|
| `add_stitch_line` | `sourceId, margin?`（正数，默认 settings.stitchMargin）, `side?`（闭合：inside 默认/outside；开放线必填 left/right）, `join?`, `withHoles?` + 针孔参数 | *新* `builders.stitchLine`（从 `src/tools/stitch-line.ts` 抽出）；派生关系由 `regenerateDerived` 维护 |
| `add_stitch_holes` | `sourceId, margin?`（带符号，可直接沿轮廓内缩打孔）`, pitch?, holeSize?, holeShape?, slitAngle?, cornerMode?` | *新* `builders.holeSet`（从 `stitch-holes.ts` 抽出） |
| `outline_edges` | `id` | `outlineEdges`：给出每条边的序号、端点、长度，供缝份按边设置 |
| `add_seam_allowance` | `id, allowances: number[], layer?` | `seamAllowance` |
| `add_notch` | `id, at, towards?`（开放线必填）`, count?, style?, length?, gap?, width?` | `notchShapes` |

### 6.6 导入与导出

| 工具 | 参数 | 复用 |
|---|---|---|
| `export_svg` | `docId, path?, layers?` | `exportSvg`；没有 `path` 时直接返回 SVG 文本（AI 可以自己检查结果） |
| `export_dxf` | `docId, path` | `exportDxf` |
| `export_pdf` | `docId, path, mode, paper, orientation?, overlap?` | `exportPdf` + happy-dom；`PdfStrings` 用英文默认值，CJK 字体从 `public/fonts/` 读取 |
| `import_file` | `docId, path`（.svg / .dxf） | `importSvg`（需要 DOM）、DXF 导入 |

### 6.7 AI 标记

AI 新建的实体需要能被人认出来并逐个复核，所以在模型里加一个标记，而**不是**放到单独的图层：图层带有语义（cut/stitch 决定导出和切割），挪图层会改变图纸的含义。

- **模型**：`EntityBase` 新增可选字段 `aiCreated?: true`。`CURRENT_SCHEMA_VERSION` 从 1 升到 2，加一个 `MIGRATIONS[1]`。这个字段是可选的，所以迁移是空操作，但仍按规则登记。（原计划 T5.1 约束模型用的 v2 顺延为 v3。）
- **谁打标记**：MCP 层所有新建实体的路径（`add_*`、`offset`、`transform`/`array` 的 `copy`、`join`/`explode`/`boolean` 的结果、`add_stitch_line`、`add_stitch_holes`、seam allowance、notch）统一由 `run` 包装器在 dispatch 前打上标记，各个工具不用自己处理。
- **修改已有实体**：AI 对人画的实体做 `update_entity`、`transform`（非复制）、`fillet`/`chamfer` 时**不**打标记（标记的含义是“由 AI 创建”）。`join`/`explode`/`boolean` 的结果是 AI 生成的新几何，即使沿用了原 id 也一律打标记。
- **派生实体**：缝线和针孔由 `regenerateDerived` 重新生成时保留自己原有的标记，不跟随源实体。
- **App 里怎么呈现**：
  - 画布角标：**暂缓**。“选择 AI 创建的实体”已经能在画布上高亮它们；角标要改渲染器，涉及每帧性能预算，等有需要再做。
  - Properties 面板：显示 “AI 创建” 徽标和一个 “标记为已复核” 按钮（删除该字段，一个撤销步骤，命令为 `history.reviewAi`）。
  - 状态栏：存在未复核的 AI 实体时显示数量按钮，点击即选中它们（`ToolSession.selectAiCreated`），再在 Properties 里一次“标记为已复核”。
- **导出**：SVG/DXF/PDF **不**输出这个标记，只是编辑期元数据。导出前不强制复核，但 Export 对话框里给一句提示（“还有 N 个 AI 创建的实体未复核”）。
- i18n：上述新字符串先加到 `en`，同一次改动里加 `zh-CN`。

### 6.8 Resources（只读）

- `leatherdraft://{docId}/project.json`：完整工程。
- `leatherdraft://{docId}/drawing.svg`：当前导出的 SVG。

客户端可以把它们作为上下文附件，不用每次都调用工具。

**暂不提供** PNG 预览。如果之后 AI 需要“看图”，再评估 `@resvg/resvg-wasm`（WASM，可惰性加载），不要引入原生 canvas。

## 7. 目录结构

```
src/mcp/
  server.ts          入口：解析 --root，创建 McpServer，挂上 stdio
  sessions.ts        docId → store 映射，路径校验
  result.ts          统一返回格式与错误包装
  schemas.ts         共用 zod 片段：Vec2、layer、ids、docId
  tools/
    project.ts  query.ts  draw.ts  edit.ts  leather.ts  io.ts
  resources.ts
  *.test.ts          用 SDK 的 InMemoryTransport 连真实 server 做端到端测试
src/document/builders.ts   (新) stitchLine / holeSet 等实体构造，Tool 和 MCP 共用
src/geometry/measure.ts    (新) 长度/面积
src/lib/headless-dom.ts    (由 src/test/canvas-stub.ts 移来) 惰性启用 happy-dom
vite.mcp.config.ts
```

每个 `tools/*.ts` 导出 `register(server, sessions)`，一个工具的写法：

```ts
server.registerTool(
  'add_rect',
  {
    description: 'Add a rectangle. Millimetres, y down. Returns the new entity id and its bounds.',
    inputSchema: { docId, x: z.number(), y: z.number(), width: z.number().positive(), height: z.number().positive(),
                   cornerRadius: z.number().min(0).optional(), layer: layerRef.optional(), pieceId: id.optional() },
  },
  run(sessions, ({ doc, args }) => {
    const entity = pathEntity(doc, args.layer ?? 'cut', rectangleSegments([args.x, args.y],
      [args.x + args.width, args.y + args.height], args.cornerRadius), true)
    doc.dispatch(addEntities(pieceOf(doc, args.pieceId), [entity]))
    return { created: [entity.id] }
  }),
)
```

`run` 负责：查找 docId、检查图层是否可写、捕获异常并转成 `isError`、计算 `bounds`、标记 dirty。

## 8. 测试

- 每个工具至少一个 InMemoryTransport 端到端测试：调用 → 断言 store 里的实体 → 断言 `exportSvg` 输出。
- 一条验收测试：从零开始用 MCP 画 PRD 验收图形（和 `?fixture=acceptance` 一致），导出 SVG 与现有 golden 对比（允许 id 不同）。
- 路径越界、锁定图层、派生实体未传 `detach`、未保存就关闭：都要有失败用例。
- `pnpm check` 照常覆盖；新增 `pnpm mcp:build`，加进 `verify`。

## 9. 分期

- **P1（核心可用）**：sessions、`--readonly`、project/query/draw/edit 的基础工具、undo/redo、export_svg/dxf、`builders.ts` 重构、`aiCreated` 字段 + schema v2 + App 里的复核 UI、测试。
- **P2（皮具）**：stitch line、stitch holes、seam allowance、notch、fillet/chamfer、boolean/join/explode、array。
- **P3（周边）**：export_pdf、import_file（happy-dom）、resources、Claude Desktop 安装说明。
- **之后**：方案 1 的浏览器桥。`src/mcp/tools/*` 的处理函数只依赖 `DocumentStore` 接口，桥接时把 store 换成“通过 WebSocket 转发到页面 `dispatch` 的代理”即可复用。

## 10. 已定决策（2026-10-10）

1. **同一个包**：`@modelcontextprotocol/sdk`、`zod` 加入本包的 `dependencies`，用 `vite.mcp.config.ts` 单独构建，不拆 workspace。
2. **提供只读模式**：`--readonly`，见 §3。
3. **AI 创建的实体打标记**：`aiCreated` 字段 + schema v2，见 §6.7。
4. **`add_lines` 默认每段一个实体**，与 App 的 Line 工具一致；需要整条路径时传 `mode: 'polyline'`。
