# Contributing to LeatherDraft

[English](#english) · [简体中文](#简体中文)

## English

Contributions are welcome: bug reports, fixes, features, translations and documentation.

### Before you start

- LeatherDraft is under the [PolyForm Noncommercial License 1.0.0](LICENSE), with commercial licenses sold separately (see [COMMERCIAL.md](COMMERCIAL.md)). So that your work can ship in both, **every contributor signs the [Contributor License Agreement](CLA.md) once**. You keep the copyright in your contribution.
- On your first pull request, a bot asks you to sign: reply with the comment `I have read the CLA Document and I hereby sign the CLA`. Pull requests can't be merged until the CLA is signed.
- For anything larger than a small fix, open an issue first so we can agree on the approach.

### Making a change

1. Read [CLAUDE.md](CLAUDE.md) (conventions) and [docs/ARCHITECTURE.md](docs/ARCHITECTURE.md) (design).
2. `pnpm install`, then `pnpm dev`.
3. Add tests for what you change. New UI text goes in `src/locales/en` first, then the other locales.
4. Run `pnpm verify` before opening the pull request; CI runs the same.
5. Only submit work you wrote yourself, or third-party code whose license allows it; name its source and license in the pull request.

## 简体中文

欢迎贡献：问题反馈、缺陷修复、新功能、翻译和文档。

### 开始之前

- LeatherDraft 采用 [PolyForm 非商业许可证 1.0.0](LICENSE)，商业授权另行提供（见 [COMMERCIAL.md](COMMERCIAL.md)）。为了让你的贡献可以同时用于这两种授权，**每位贡献者需签署一次[贡献者许可协议（CLA）](CLA.md)**。你的贡献的著作权仍归你所有。
- 提交第一个拉取请求时，机器人会提示你签署：回复评论 `I have read the CLA Document and I hereby sign the CLA` 即可。未签署 CLA 的拉取请求无法合并。
- 较大的改动请先开一个 issue，商定实现方式后再动手。

### 提交修改

1. 阅读 [CLAUDE.md](CLAUDE.md)（开发约定）和 [docs/ARCHITECTURE.md](docs/ARCHITECTURE.md)（架构设计）。
2. 运行 `pnpm install`，然后 `pnpm dev`。
3. 为你的修改补充测试。新的界面文字先加到 `src/locales/en`，再加到其他语言。
4. 提交拉取请求前运行 `pnpm verify`，CI 也会执行同样的检查。
5. 只提交你本人编写的代码，或许可证允许使用的第三方代码；后者请在拉取请求中注明来源和许可证。
