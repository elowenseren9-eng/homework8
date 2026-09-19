# 运行与测试记录

## 自动检查结果（2026-09-19）

- `integration/index.html` 在 375、768、1200 px 均返回 HTTP 200，无横向滚动。
- 三个宽度均加载 12 个空间卡片、2 张 ECharts 图和 1 个 Three.js canvas。
- `case/index.html` 在 375 px 加载 12 个卡片、1 张图表、1 个 3D canvas，无横向滚动。
- normal、empty、malformed、offline 四种状态均没有未处理的 JavaScript 错误或红色 Console error。
- 搜索“图书馆”返回 3 条，学习计划添加成功。
- Lighthouse：对比页 78 → 100；正式综合页 100。
- Nu HTML Checker：七个最终页面均为 0 error、0 warning。

## 手工复现地址

启动本地服务器后打开：

- 正常：`http://localhost:8008/integration/index.html`
- 空数据：`http://localhost:8008/integration/index.html?state=empty`
- 格式错误：`http://localhost:8008/integration/index.html?state=malformed`
- 离线/请求失败模拟：`http://localhost:8008/integration/index.html?state=offline`

测试脚本只用于本地核对，没有放入提交仓库；仓库保存了研究原始报告和可复现实验页面。

