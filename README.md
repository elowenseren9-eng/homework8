# 第八次课堂实践：校园公共信息与数据展示中心

这个仓库包含两部分作品和三项选做研究：

- `case/`：课堂案例复现，含首页、自习室查询、使用统计和校园地标 3D。
- `integration/`：自主综合实践“云大学习与空间协同中心”。
- `research/`：Lighthouse 无障碍、脚本加载策略、W3C HTML 验证记录。

## 本地运行

不能直接双击 HTML。请在仓库根目录启动 HTTP 服务器：

```powershell
python -m http.server 8008
```

然后打开 `http://localhost:8008/`。如果电脑上命令是 `py`，可用 `py -m http.server 8008`。

## 数据和依赖

- `data/studyrooms.json`、`data/books.json` 来自课程统一数据集，都是教学演示数据。
- Bootstrap、jQuery、ECharts、Chart.js、Three.js 已放在 `libs/`，断网也能运行。
- 所有页面和原创 SVG 均在本仓库，不使用远程图片。

## 异常状态复现

自主实践支持查询参数：

- 正常：`integration/index.html`
- 空数据：`integration/index.html?state=empty`
- 格式错误：`integration/index.html?state=malformed`
- 请求失败/离线模拟：`integration/index.html?state=offline`

## 学习与工具说明

本项目在完成过程中使用了 AI 辅助梳理需求、检查代码与润色文档。页面结构、运行结果、异常状态和每一处代码需要由提交者本人逐项复核，并能在现场说明。GitHub 推送、全屏截图、同伴审查和课堂轮值协调由提交者本人完成。

