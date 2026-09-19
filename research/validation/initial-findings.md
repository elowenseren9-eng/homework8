# 首轮验证问题与处理

| 页面 | 首轮结果 | 处理 |
| --- | --- | --- |
| `index.html` | 1 error：通用 div 使用 aria-label 但没有合适角色 | 补 `role="group"` |
| `case/index.html` | 1 error：结果区 div 使用 aria-label 但没有合适角色 | 补 `role="region"` |
| `integration/index.html` | 3 errors：两个通用容器及模态框的 ARIA 角色不完整 | 分别补 group、dialog 角色 |
| `integration/index.html` | 4 warnings：统计 article 缺少标题 | 这四项只是数值单元，不是独立文章，改为普通 div |

修正后七个目标页面均为 0 error、0 warning，最终响应见 `results/`。
