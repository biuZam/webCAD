# LeatherDraft

[English](README.md) · **简体中文** · [繁體中文](README.zh-TW.md) · [Deutsch](README.de.md) · [Français](README.fr.md) · [Español](README.es.md) · [Italiano](README.it.md) · [Português](README.pt.md) · [日本語](README.ja.md) · [한국어](README.ko.md)

一款基于浏览器的二维 CAD 工具，用于以**毫米**绘制**皮具版型**，并以**1:1 真实尺寸**打印或切割。

完全在浏览器中运行：无需账号，没有服务器，文件从不离开你的设备。可以安装为应用并离线使用，也提供 Windows、macOS 和 Linux 的桌面版。

![LeatherDraft：绘制一个卡包部件，圆角处理，添加关联的缝线与菱斩孔，调整尺寸并导出](docs/media/demo.gif)

> **状态：1.0 之前。** 制图、皮具专用功能与导出均已实现并通过测试。发布前仍待完成：在真实打印机上做实物打印精度检查，在 Inkscape、Illustrator 和 LightBurn 中做兼容性检查，以及一些较小的事项（见 [`docs/TASKS.md`](docs/TASKS.md)）。

## 操作手册

每个工具的分步说明、按实际尺寸打印、快捷键以及完整实例：

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

## 功能

**制图**

- 直线（每一段都是独立对象，与 CAD 一致）与多段线、矩形与正方形（可设圆角半径）、圆（圆心 + 半径、三点、椭圆）、贝塞尔钢笔、三点圆弧
- 中心线（可作为镜像轴）与垂线
- 标注：文字（部件名称、"裁 2 片"等）与纹理方向箭头，位于备注图层
- 移动、旋转、缩放、镜像（均可选择生成副本）、原地翻转；线性与环形阵列
- 偏移、圆角与倒角；平行线；修剪、延伸与打断；连接路径；图形的联集与差集
- 直接编辑节点与贝塞尔控制柄；节点在平滑与尖角之间切换；增加与删除节点；拖动选中图形即可移动
- 对象捕捉：端点、中点、圆心、象限点、交点、垂足、切点、最近点、网格；极轴与对象追踪
- 约束：平行、垂直、相切、重合、距离与半径，求解时保持第一个对象不动、第二个对象移动
- 精确数值：绘图时直接输入坐标、长度、角度与半径；在属性面板中修改数字
- 图层（裁切、缝线、参考、备注），支持显示、锁定与颜色；可按 mm、cm 或英寸显示

**皮具专用**

- **缝线**：在轮廓内外设定边距生成，并与轮廓关联：修改轮廓，缝线随之更新
- **缝孔**：按菱斩孔距生成（2.7、3.38、3.85、4.0、5.0 mm 或自定义），圆孔或斜孔。开启"每个角都打孔"后，各边间距会被均分，使每个角上正好有一个孔，就像实际用菱斩走线一样。
- 孔随缝线、缝线随轮廓更新，全部在同一个撤销步骤内完成
- **每边孔数**，并可检查两条待缝合的边孔数是否一致（测量 → 孔数）
- 用于铆钉、四合扣与皮带扣的**沖孔与长孔**，内置常用沖头直径
- **对位刀口**：任意边上的单个或双个对位标记，可做成切口或 V 形刀口

**输出**

- **SVG**，1:1 输出（1 单位 = 1 mm），每个分组一个图层；可选将曲线转为短直线，适配激光软件
- **PDF**，适合家用打印机：按 A4、Letter 或 A3 分页并保留重叠，带裁切标记与页面标签，另有包含 **50 mm 校准方块**的组装页；也可输出为与版型同尺寸的单页，适合大幅面打印机
- **DXF**（mm）用于激光与 CNC 软件，**PNG** 图片用于分享
- 导出时可加**水印**文字（PDF 中每页重复）
- **以实际尺寸导入 SVG 或 DXF** 到参考图层，用于描摹已有版型
- 保存与打开 `.json` 项目文件。作品自动保存在浏览器中，刷新后自动恢复。

### 按实际尺寸打印

以 **100 % /"实际大小"** 打印 PDF，切勿选择"适合页面"，然后在第一页测量 50 mm 方块。若不是 50 mm，请检查打印机的缩放设置。

## 键盘快捷键

| 按键 | 工具 | 按键 | 工具 |
| --- | --- | --- | --- |
| V | 选择（并可编辑节点） | M | 移动 |
| L | 直线 / 多段线 | O | 旋转 |
| R | 矩形 | S | 缩放 |
| C | 圆 / 三点圆 / 椭圆 | I | 镜像 |
| P | 钢笔（曲线） | Shift+H / Shift+V | 水平 / 垂直翻转 |
| A | 圆弧（三点） | E | 偏移 |
| X | 中心线 | F | 圆角 |
| T | 垂线 | B | 倒角 |
| D | 测量 | K | 缝线 |
| N | 标注 / 纹理方向箭头 | H | 缝孔 |
| G | 平行线 | W | 修剪 / 延伸 / 打断 |
| U | 沖孔 / 长孔 | Y | 缝份（逐边） |
| Q | 阵列（线性 / 环形） | J | 对位刀口 |
| Shift+J | 连接路径 | Shift+U / Shift+D | 联集 / 差集 |
| Z | 约束 | Shift+X | 分解为线段 |

与 Photoshop 一样，相似的工具共用工具面板中的一个格子：右下角带小三角的格子，**右键**单击（或长按，或获得焦点时按 →）即可选择其他工具。分组包括：直线 / 多段线、矩形 / 正方形、圆 / 三点圆 / 椭圆、钢笔 / 圆弧、垂线 / 平行线、圆角 / 倒角、偏移 / 缝份、沖孔 / 对位刀口、水平 / 垂直翻转、连接 / 分解、联集 / 差集。侧边栏可通过顶部箭头收起。

工具栏中的**快捷键…**可修改所有工具和操作的按键（按浏览器保存）。

绘图时：**直接输入数字**即可写入输入栏，**Tab** 在字段间切换，**Enter** 确认，**Esc** 取消，**Backspace** 删除最后一个节点，按住 **Shift** 可将角度锁定为 15° 的倍数。**空格拖动**或按住中键拖动可平移，滚轮缩放。**⌘/Ctrl+Z / ⇧⌘Z** 撤销与重做，**⌘/Ctrl+S** 保存，**⌘/Ctrl+O** 打开，**⌘/Ctrl+A** 全选。

## 开发

需要 **Node ≥ 20.19** 和 **pnpm 10**（执行 `corepack enable` 会根据 `package.json` 使用对应版本）。

```bash
pnpm install
pnpm dev                     # http://localhost:5173
```

开发时常用的 URL：

- `?fixture=acceptance`：PRD 验收图纸（100 mm 正方形、50 mm 圆、3.85 mm 缝孔）
- `?fixture=perf`：2,000 个实体，用于性能检查

fixture 会话从不自动保存，因此不会覆盖你自己的作品。

| 命令 | 作用 |
| --- | --- |
| `pnpm test` | 单元与组件测试（Vitest）；`pnpm test <文件>` 或 `pnpm test -t "<名称>"` 运行单个测试 |
| `pnpm check` | 类型检查、lint、测试与翻译报告 |
| `pnpm verify` | CI 运行的全部检查：以上内容加上格式检查、生产构建与包体积预算 |
| `pnpm build` / `pnpm preview` | 生产构建（含 Service Worker）与本地预览 |
| `pnpm i18n:check` | 非英文语言中缺失的键 |
| `pnpm bundle:check` | 首次下载体积须低于 600 KB（gzip） |
| `BENCH=1 pnpm test perf.bench` | 2,000 个实体的性能测量 |

如果你所在地区安装依赖较慢，可以尝试镜像源，例如 `pnpm install --registry=https://registry.npmmirror.com`。

### 桌面版（Tauri）

`src-tauri/` 将同一份 Vite 构建包装为原生窗口（Windows、macOS、Linux）。需要 Rust 工具链以及对应平台的构建工具（见 [Tauri 前置要求](https://v2.tauri.app/start/prerequisites/)）。

```bash
pnpm desktop:dev             # 在 Vite 开发服务器上打开原生窗口（支持热重载）
pnpm desktop:build           # 在 src-tauri/target/release/bundle/ 生成当前系统的安装包
pnpm tauri build --bundles app   # macOS：只生成 LeatherDraft.app，不生成 .dmg
```

与网页版的区别：保存、打开与导出使用原生文件对话框（退出前保存都会写入同一个文件），且没有 Service Worker；应用通过安装新版本来更新。自动保存与浏览器中一致。Tauri 无法交叉编译，因此 Windows 安装包由 CI 生成：运行 **Desktop** 工作流（`.github/workflows/desktop.yml`）或推送 `desktop-v*` 标签，它会将 Windows `.exe`（NSIS）和通用 macOS `.dmg` 作为工作流产物生成。`src-tauri/icons` 中的应用图标由 `public/icon.svg` 通过 `pnpm tauri icon public/icon.svg -o src-tauri/icons` 生成。

### 技术栈

React 19 + TypeScript + Vite · [Paper.js](http://paperjs.org) 负责几何与渲染 · Zustand + Immer（文档存储，撤销 / 重做基于补丁） · [paperjs-offset](https://github.com/glenzli/paperjs-offset)，偏移的备选方案为 Clipper · jsPDF + svg2pdf.js 生成 PDF（按需加载） · i18next · vite-plugin-pwa · Vitest。

### 整体结构

- **图纸是毫米为单位的普通 JSON**，保存在存储中。每次修改都是一个命令，因此撤销不受限制，保存文件也很简单。
- **Paper.js** 负责屏幕绘制与几何计算，但不拥有数据。
- **关联实体在修改其源的同一个命令中重新生成**，因此缝线和缝孔永远不会过时。
- **PDF 由应用导出的同一份 SVG 生成**，屏幕、SVG 与打印不会出现偏差。

更多内容：

- [`docs/ARCHITECTURE.md`](docs/ARCHITECTURE.md)：设计决策、图层、数据模型、性能与无障碍说明
- [`docs/USER_GUIDE.zh-CN.md`](docs/USER_GUIDE.zh-CN.md) 及其他语言：操作手册（见下方"语言"一节）
- [`docs/MCP.md`](docs/MCP.md)：无界面的 MCP 服务器，让 AI 客户端可以绘制、编辑、缝合与导出版型
- [`docs/TASKS.md`](docs/TASKS.md)：任务清单与各里程碑进度
- [`PRD — Leather Pattern CAD (Web).md`](<PRD — Leather Pattern CAD (Web).md>)：产品需求
- [`CLAUDE.md`](CLAUDE.md)：参与代码开发的约定

### 质量标准

- **精度。** 偏移与请求距离的误差在 0.02 mm 以内，圆角圆弧与真实圆的误差在 0.001 mm 以内。PDF 比例在测试中通过读回 PDF 绘图指令（按页面毫米计）进行验证。
- **性能。** 2,000 个实体（17,600 个缝孔）约 12 ms 完成一次重绘。
- **无障碍。** CI 强制执行 WCAG 2.2 AA 的亮色与暗色主题颜色对比度，axe-core 审计未报告任何违规项。

## 语言

界面支持英语、简体中文、繁體中文、Deutsch、Français、Español、Italiano、Português、日本語与한국어；点击工具栏中的地球图标即可切换。PDF 页面文字跟随界面语言，PDF 中的中文文字（页面文字、标签、名称）使用内嵌的 Noto Sans SC 字体打印。

操作手册提供[英文](docs/USER_GUIDE.md)、[简体中文](docs/USER_GUIDE.zh-CN.md)以及 `docs/` 下的其他语言版本。本 README 也有相应语言版本，位于项目根目录。

## 许可证

LeatherDraft 以 [PolyForm Noncommercial License 1.0.0](LICENSE) 授权，属于**源码可用**软件：

- **免费**用于个人、爱好、学习与研究，也适用于学校、慈善机构及其他非商业组织。你可以修改代码，并以非商业目的分享你的修改。
- **你的版型与产品归你所有。** 图纸、导出的文件以及用它们制作的皮具产品不受限制，你可以出售。
- **软件本身的商业使用**（出售软件或修改版、以服务形式提供、集成到商业产品中）需要商业授权。修改后的版本不得用于商业用途。详见 [COMMERCIAL.md](COMMERCIAL.md)。
- 欢迎贡献代码；贡献者需签署一次 [CLA](CLA.md)。详见 [CONTRIBUTING.md](CONTRIBUTING.md)。

"LeatherDraft" 名称及其 Logo 不在许可证范围内。提交 `ca93653` / `7db180a`（2026 年 10 月 10 日）及之前的版本以 Apache-2.0 发布。
