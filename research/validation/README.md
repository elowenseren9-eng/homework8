# W3C / Nu HTML Checker 验证说明

验证对象：仓库入口、案例复现、自主综合实践、研究入口、无障碍修正页、两张脚本加载页。

使用 Nu HTML Checker 的 JSON 接口逐页验证。接口命令示例：

```powershell
curl.exe -H "Content-Type: text/html; charset=utf-8" --data-binary "@index.html" "https://validator.w3.org/nu/?out=json"
```

机器生成的原始响应保存在本目录的 `results/`。最终检查以每份 JSON 中 `messages` 数组里的 `error` 数量为准。完整汇总见 `../STUDIES.md`。

