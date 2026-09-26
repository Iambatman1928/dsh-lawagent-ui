# lawagent-ui · 法学学习实训工作台

面向法学学生与法考考生的本地学习实训工作台：三栏学术风界面，直读「明律」（`lawagent` agent preset）的学习档案，并可一键把指令送进明律会话。

> 本插件是学习辅助工具，不构成法律意见；法条原文与现行有效性请以官方文本为准。

## 特性

- **三栏学术风工作台**：左导航 / 中间工作区 / 右侧动态面板。
- **案件卷宗**：案情 / 要件清单 / 时间线 / 三段论 / 正反论证 / 谬误 / 文书等分区。
- **背诵卡 + 错题本**：间隔复习排程，与明律共用同一份 `settings.json`。
- **笔记**：Obsidian 双链笔记的列出、检索与写入（挂载资料文件夹）。
- **一键联动**：把指令（出题 / 批改 / 复盘 / 文书）真的送进明律会话，点一下就发生。

## 安装

```bash
dsh plugin add github:Iambatman1928/dsh-lawagent-ui
```

装完重启 DSH。工作台默认读 `~/lawdata/`（与 `lawagent` preset 的学习档案一致），可用环境变量 `LAWAGENT_DATA_ROOT` 或 `cordis.patch.yml` 的 `config.dataRoot` 覆盖。

## 依赖

无外部依赖，纯本地存储，不上传任何学习档案。

## 许可证

MIT © 2026 Iambatman1928
