# 第八次课堂实践：三项选做研究记录

## 1. Lighthouse 无障碍检查

检查对象：`accessibility/before.html` 和 `accessibility/after.html`。前者是为了复现实验而保留的初始快照，不是正式入口。

我在初始页集中发现并修正了四类问题：

1. 图片缺少 `alt`，读屏软件无法判断图标含义；修正后添加简短替代文本。
2. 搜索框只有 placeholder，没有可关联的标签；修正后使用 `label for="keyword"`。
3. 星形按钮没有可读名称；修正后补上“收藏空间”，并用 `aria-pressed` 表达状态。
4. 灰色说明文字对比度过低、标题从 h1 跳到 h3；修正后提高文字颜色对比度并改成连续的 h1/h2 层级。

检测时间为 2026-09-19，环境为 Lighthouse 13.5.0、Headless Chrome 153。初始页无障碍得分 **78**，Lighthouse 明确报出颜色对比度、标题层级和图片替代文本 3 项失败；修正页得分 **100**。随后又对正式的 `integration/index.html` 做了一轮检查，修正进度条 ARIA 角色、空列表结构和小号绿色文字对比度后，正式页面也达到 **100**。原始报告为本目录中的 `before-lighthouse.json`、`after-lighthouse.json` 和 `integration-lighthouse.json`。

## 2. defer 与 async 的脚本加载研究

- 普通 `<script>`：HTML 解析器遇到脚本后暂停，等下载、执行完再继续。
- `defer`：与 HTML 解析并行下载，保留文档中的执行顺序，在 DOM 解析完成后、`DOMContentLoaded` 前执行。适合本作业中互相有依赖的库和页面脚本。
- `async`：下载完立即执行，不保证相互顺序。更适合统计脚本等独立任务，不适合先加载 ECharts 再运行 `integration.js` 这种依赖链。

对比页使用同一组本地 jQuery、ECharts 和探针脚本；一个普通加载，一个全部加 `defer`。测试环境为 Headless Chrome、禁用缓存、40 ms 延迟、约 2.56 Mbps 下载速度，每页运行 3 次取中位数：

| 策略 | DOM 可交互中位数 | DOMContentLoaded 中位数 | load 中位数 |
| --- | ---: | ---: | ---: |
| 普通阻塞 | 4013.5 ms | 4013.9 ms | 4015.4 ms |
| defer | 82.4 ms | 4006.6 ms | 4008.0 ms |

`defer` 让 DOM 可交互时间提前约 **3931.1 ms（97.9%）**。DOMContentLoaded 与 load 改善不大，这与 defer 的语义一致：HTML 可以先解析完成，但 defer 脚本仍会在 DOMContentLoaded 前按顺序执行。正式页面的脚本放在 `body` 末尾，本身不会阻断前面的主体 HTML；如果后续改回 `head`，应使用 defer 并保持依赖顺序。

## 3. W3C HTML 验证

通过 Nu HTML Checker 的 HTTP 接口验证主要页面。第一次验证发现：自主实践页 3 个 ARIA 角色错误和 4 条 article 缺少标题的警告；仓库入口与案例页各 1 个 ARIA 角色错误。处理方式是给带 `aria-label` 的通用容器补上合适的 `role`、给 Bootstrap 模态框声明 dialog 角色，并把没有独立标题的统计 `article` 改为普通容器。

修正后重新验证以下 7 个页面，结果全部为 **0 error、0 warning**：

- `index.html`
- `case/index.html`
- `integration/index.html`
- `research/index.html`
- `research/accessibility/after.html`
- `research/loading/before.html`
- `research/loading/after.html`

最终原始 JSON 响应保存在 `validation/results/`，每个文件的 `messages` 数组均为空。

## 参考资料

- [MDN：script 元素](https://developer.mozilla.org/zh-CN/docs/Web/HTML/Element/script)
- [Chrome for Developers：Lighthouse](https://developer.chrome.com/docs/lighthouse/overview/)
- [Nu HTML Checker HTTP 接口](https://github.com/validator/validator/wiki/Service-%C2%BB-HTTP-interface)
