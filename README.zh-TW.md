# LeatherDraft

[English](README.md) · [简体中文](README.zh-CN.md) · **繁體中文** · [Deutsch](README.de.md) · [Français](README.fr.md) · [Español](README.es.md) · [Italiano](README.it.md) · [Português](README.pt.md) · [日本語](README.ja.md) · [한국어](README.ko.md)

一款以瀏覽器執行的二維 CAD 工具，用於以**毫米**繪製**皮件版型**，並以**1:1 實際尺寸**列印或裁切。

完全在瀏覽器中執行：不需帳號，沒有伺服器，檔案從不離開您的裝置。可以安裝為應用程式並離線使用，也提供 Windows、macOS 與 Linux 的桌面版。

![LeatherDraft：繪製一個卡夾零件，圓角處理，加入關聯的縫線與菱斬孔，調整尺寸後匯出](docs/media/demo.gif)

> **狀態：1.0 之前。** 製圖、皮革專用功能與匯出均已實作並通過測試。發布前仍待完成：在實體印表機上做列印精度檢查，在 Inkscape、Illustrator 與 LightBurn 中做相容性檢查，以及一些較小的項目（見 [`docs/TASKS.md`](docs/TASKS.md)）。

## 操作手冊

每個工具的逐步說明、依實際尺寸列印、快捷鍵，以及完整實例：

- [操作手冊（繁體中文）](docs/USER_GUIDE.zh-TW.md)
- [User guide (English)](docs/USER_GUIDE.md)

## 功能

**製圖**

- 直線（每一段都是獨立物件，與 CAD 一致）與多段線、矩形與正方形（可設圓角半徑）、圓（圓心 + 半徑、三點、橢圓）、貝茲筆、三點圓弧
- 中心線（可作為鏡射軸）與垂線
- 標註：文字（零件名稱、「裁 2 片」等）與紋理方向箭頭，位於備註圖層
- 移動、旋轉、縮放、鏡射（均可選擇產生複本）、原地翻轉；線性與環形陣列
- 偏移、圓角與倒角；平行線；修剪、延伸與打斷；接合路徑；圖形的聯集與差集
- 直接編輯節點與貝茲控制柄；節點在平滑與尖角之間切換；新增與刪除節點；拖曳選取的圖形即可移動
- 物件鎖點：端點、中點、圓心、象限點、交點、垂足、切點、最近點、格線；極座標與物件追蹤
- 約束：平行、垂直、相切、重合、距離與半徑，求解時保持第一個物件不動、第二個物件移動
- 精確數值：繪圖時直接輸入座標、長度、角度與半徑；在屬性面板中修改數字
- 圖層（裁切、縫線、參考、備註），可設定顯示、鎖定與顏色；可依 mm、cm 或英吋顯示

**皮革專用**

- **縫線**：在輪廓內外設定邊距產生，並與輪廓關聯：修改輪廓，縫線隨之更新
- **縫孔**：依菱斬孔距產生（2.7、3.38、3.85、4.0、5.0 mm 或自訂），圓孔或斜孔。開啟「每個角都打孔」後，各邊間距會被均分，使每個角上正好有一個孔，就像實際用菱斬走線一樣。
- 孔隨縫線、縫線隨輪廓更新，全部在同一個復原步驟內完成
- **每邊孔數**，並可檢查兩條待縫合的邊孔數是否一致（量測 → 孔數）
- 用於鉚釘、四合扣與皮帶扣的**沖孔與長孔**，內建常用沖頭直徑
- **對位刀口**：任意邊上的單個或雙個對位標記，可做成切口或 V 形刀口

**輸出**

- **SVG**，1:1 輸出（1 單位 = 1 mm），每個群組一個圖層；可選擇將曲線轉為短直線，以適配雷射軟體
- **PDF**，適合家用印表機：依 A4、Letter 或 A3 分頁並保留重疊，附裁切標記與頁面標籤，另有包含 **50 mm 校準方塊**的組裝頁；也可輸出為與版型同尺寸的單頁，適合大幅面印表機
- **DXF**（mm）用於雷射與 CNC 軟體，**PNG** 圖片用於分享
- 匯出時可加入**浮水印**文字（PDF 中每頁重複）
- **以實際尺寸匯入 SVG 或 DXF** 到參考圖層，用於描摹既有版型
- 儲存與開啟 `.json` 專案檔。作品自動儲存在瀏覽器中，重新整理後自動還原。

### 依實際尺寸列印

以 **100 % /「實際大小」**列印 PDF，切勿選擇「符合頁面」，然後在第一頁量測 50 mm 方塊。若不是 50 mm，請檢查印表機的縮放設定。

## 鍵盤快捷鍵

| 按鍵 | 工具 | 按鍵 | 工具 |
| --- | --- | --- | --- |
| V | 選取（並可編輯節點） | M | 移動 |
| L | 直線 / 多段線 | O | 旋轉 |
| R | 矩形 | S | 縮放 |
| C | 圓 / 三點圓 / 橢圓 | I | 鏡射 |
| P | 筆（曲線） | Shift+H / Shift+V | 水平 / 垂直翻轉 |
| A | 圓弧（三點） | E | 偏移 |
| X | 中心線 | F | 圓角 |
| T | 垂線 | B | 倒角 |
| D | 量測 | K | 縫線 |
| N | 標註 / 紋理方向箭頭 | H | 縫孔 |
| G | 平行線 | W | 修剪 / 延伸 / 打斷 |
| U | 沖孔 / 長孔 | Y | 縫份（逐邊） |
| Q | 陣列（線性 / 環形） | J | 對位刀口 |
| Shift+J | 接合路徑 | Shift+U / Shift+D | 聯集 / 差集 |
| Z | 約束 | Shift+X | 分解為線段 |

與 Photoshop 一樣，相似的工具共用工具面板中的一個格子：右下角帶小三角的格子，**右鍵**點擊（或長按，或在獲得焦點時按 →）即可選擇其他工具。群組包括：直線 / 多段線、矩形 / 正方形、圓 / 三點圓 / 橢圓、筆 / 圓弧、垂線 / 平行線、圓角 / 倒角、偏移 / 縫份、沖孔 / 對位刀口、水平 / 垂直翻轉、接合 / 分解、聯集 / 差集。側邊欄可透過頂部箭頭收合。

工具列中的**快捷鍵…**可修改所有工具與操作的按鍵（依瀏覽器保存）。

繪圖時：**直接輸入數字**即可寫入輸入列，**Tab** 在欄位間切換，**Enter** 確認，**Esc** 取消，**Backspace** 刪除最後一個節點，按住 **Shift** 可將角度鎖定為 15° 的倍數。**空白鍵拖曳**或按住中鍵拖曳可平移，滾輪縮放。**⌘/Ctrl+Z / ⇧⌘Z** 復原與重做，**⌘/Ctrl+S** 儲存，**⌘/Ctrl+O** 開啟，**⌘/Ctrl+A** 全選。

## 開發

需要 **Node ≥ 20.19** 與 **pnpm 10**（執行 `corepack enable` 會依 `package.json` 使用對應版本）。

```bash
pnpm install
pnpm dev                     # http://localhost:5173
```

開發時常用的 URL：

- `?fixture=acceptance`：PRD 驗收圖面（100 mm 正方形、50 mm 圓、3.85 mm 縫孔）
- `?fixture=perf`：2,000 個實體，用於效能檢查

fixture 工作階段從不自動儲存，因此不會覆蓋您自己的作品。

| 指令 | 作用 |
| --- | --- |
| `pnpm test` | 單元與元件測試（Vitest）；`pnpm test <檔案>` 或 `pnpm test -t "<名稱>"` 執行單一測試 |
| `pnpm check` | 型別檢查、lint、測試與翻譯報告 |
| `pnpm verify` | CI 執行的全部檢查：以上內容加上格式檢查、正式建置與套件大小預算 |
| `pnpm build` / `pnpm preview` | 正式建置（含 Service Worker）與本機預覽 |
| `pnpm i18n:check` | 非英文語系中缺少的鍵 |
| `pnpm bundle:check` | 首次下載須低於 600 KB（gzip） |
| `BENCH=1 pnpm test perf.bench` | 2,000 個實體的效能量測 |

若您所在地區安裝套件較慢，可以試用鏡像來源，例如 `pnpm install --registry=https://registry.npmmirror.com`。

### 桌面版（Tauri）

`src-tauri/` 將同一份 Vite 建置包裝為原生視窗（Windows、macOS、Linux）。需要 Rust 工具鏈以及對應平台的建置工具（見 [Tauri 前置需求](https://v2.tauri.app/start/prerequisites/)）。

```bash
pnpm desktop:dev             # 在 Vite 開發伺服器上開啟原生視窗（支援熱重載）
pnpm desktop:build           # 在 src-tauri/target/release/bundle/ 產生目前系統的安裝檔
pnpm tauri build --bundles app   # macOS：只產生 LeatherDraft.app，不產生 .dmg
```

與網頁版的差異：儲存、開啟與匯出使用原生檔案對話框（結束前儲存都會寫入同一個檔案），且沒有 Service Worker；應用程式透過安裝新版本來更新。自動儲存與瀏覽器中一致。Tauri 無法交叉編譯，因此 Windows 安裝檔由 CI 產生：執行 **Desktop** 工作流程（`.github/workflows/desktop.yml`）或推送 `desktop-v*` 標籤，它會將 Windows `.exe`（NSIS）與通用 macOS `.dmg` 作為工作流程產物產生。`src-tauri/icons` 中的應用程式圖示由 `public/icon.svg` 透過 `pnpm tauri icon public/icon.svg -o src-tauri/icons` 產生。

### 技術堆疊

React 19 + TypeScript + Vite · [Paper.js](http://paperjs.org) 負責幾何與渲染 · Zustand + Immer（文件儲存，復原 / 重做以補丁實作） · [paperjs-offset](https://github.com/glenzli/paperjs-offset)，偏移的備援方案為 Clipper · jsPDF + svg2pdf.js 產生 PDF（按需載入） · i18next · vite-plugin-pwa · Vitest。

### 整體架構

- **圖面是以毫米為單位的純 JSON**，保存在儲存區中。每次修改都是一個指令，因此復原不受限制，儲存檔也很簡單。
- **Paper.js** 負責螢幕繪製與幾何計算，但不擁有資料。
- **關聯實體在修改其來源的同一個指令中重新產生**，因此縫線與縫孔永遠不會過時。
- **PDF 由應用程式匯出的同一份 SVG 產生**，螢幕、SVG 與列印不會出現偏差。

更多內容：

- [`docs/ARCHITECTURE.md`](docs/ARCHITECTURE.md)：設計決策、圖層、資料模型、效能與無障礙說明
- [`docs/USER_GUIDE.zh-TW.md`](docs/USER_GUIDE.zh-TW.md) 及其他語言：操作手冊（見下方「語言」一節）
- [`docs/MCP.md`](docs/MCP.md)：無介面的 MCP 伺服器，讓 AI 用戶端可以繪製、編輯、縫合與匯出版型
- [`docs/TASKS.md`](docs/TASKS.md)：任務清單與各里程碑進度
- [`PRD — Leather Pattern CAD (Web).md`](<PRD — Leather Pattern CAD (Web).md>)：產品需求
- [`CLAUDE.md`](CLAUDE.md)：參與程式開發的慣例

### 品質標準

- **精度。** 偏移與要求距離的誤差在 0.02 mm 以內，圓角圓弧與真實圓的誤差在 0.001 mm 以內。PDF 比例在測試中透過讀回 PDF 繪圖指令（以頁面毫米計）進行驗證。
- **效能。** 2,000 個實體（17,600 個縫孔）約 12 ms 完成一次重繪。
- **無障礙。** CI 強制執行 WCAG 2.2 AA 的亮色與暗色主題顏色對比度，axe-core 稽核未回報任何違規項目。

## 語言

介面支援英文、简体中文、繁體中文、Deutsch、Français、Español、Italiano、Português、日本語與한국어；點擊工具列中的地球圖示即可切換。PDF 頁面文字跟隨介面語言，PDF 中的中文文字（頁面文字、標籤、名稱）以內嵌的 Noto Sans SC 字型列印。

操作手冊提供[英文](docs/USER_GUIDE.md)、[繁體中文](docs/USER_GUIDE.zh-TW.md)以及 `docs/` 下的其他語言版本。本 README 也有對應語言版本，位於專案根目錄。

## 授權

LeatherDraft 以 [PolyForm Noncommercial License 1.0.0](LICENSE) 授權，屬於**原始碼公開可用**軟體：

- **免費**用於個人、興趣、學習與研究，也適用於學校、慈善機構及其他非商業組織。您可以修改程式碼，並以非商業目的分享您的修改。
- **您的版型與產品歸您所有。** 圖面、匯出的檔案以及用它們製作的皮件產品不受限制，您可以販售。
- **軟體本身的商業使用**（販售軟體或修改版、以服務形式提供、整合到商業產品中）需要商業授權。修改後的版本不得用於商業用途。詳見 [COMMERCIAL.md](COMMERCIAL.md)。
- 歡迎貢獻程式碼；貢獻者需簽署一次 [CLA](CLA.md)。詳見 [CONTRIBUTING.md](CONTRIBUTING.md)。

「LeatherDraft」名稱及其標誌不在授權範圍內。提交 `ca93653` / `7db180a`（2026 年 10 月 10 日）及之前的版本以 Apache-2.0 發布。
