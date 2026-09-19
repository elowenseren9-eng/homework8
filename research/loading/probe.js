"use strict";
window.addEventListener("load", () => {
  const [nav] = performance.getEntriesByType("navigation");
  const strategy = document.body.dataset.strategy;
  const details = nav ? `DOM 可交互 ${nav.domInteractive.toFixed(1)} ms；DOMContentLoaded ${nav.domContentLoadedEventEnd.toFixed(1)} ms；load ${nav.loadEventEnd.toFixed(1)} ms` : "当前浏览器没有返回 Navigation Timing 数据";
  document.getElementById("timing").textContent = `${strategy}：${details}。jQuery ${typeof jQuery === "function" ? "已加载" : "未加载"}，ECharts ${typeof echarts === "object" ? "已加载" : "未加载"}。`;
});

