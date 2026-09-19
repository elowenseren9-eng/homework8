"use strict";

const state = { rooms: [], chart: null, scene: null };

document.addEventListener("DOMContentLoaded", () => {
  bindFilters();
  loadRooms();
  initLandmark();
});

function bindFilters() {
  ["buildingFilter", "floorFilter", "statusFilter", "keywordFilter"].forEach((id) => {
    document.getElementById(id).addEventListener("input", renderRooms);
  });
  window.addEventListener("resize", () => {
    state.chart?.resize();
    resizeScene();
  });
}

async function loadRooms() {
  const message = document.getElementById("roomMessage");
  try {
    const response = await fetch("../data/studyrooms.json", { cache: "no-store" });
    if (!response.ok) throw new Error(`HTTP ${response.status}`);
    const payload = await response.json();
    if (!Array.isArray(payload.rooms)) throw new Error("rooms 字段不是数组");
    state.rooms = payload.rooms;
    fillBuildings();
    updateSummary();
    renderRooms();
    renderChart();
  } catch (error) {
    console.error("自习室数据读取失败：", error);
    message.textContent = "数据读取失败。请确认已使用本地 HTTP 服务器，并检查 data/studyrooms.json。";
    message.classList.add("text-danger");
    document.getElementById("chartFallback").textContent = "图表暂时无法显示：自习室数据未成功读取。";
  }
}

function fillBuildings() {
  const select = document.getElementById("buildingFilter");
  [...new Set(state.rooms.map((room) => room.building))].sort().forEach((building) => {
    const option = document.createElement("option");
    option.value = building;
    option.textContent = building;
    select.append(option);
  });
}

function updateSummary() {
  document.getElementById("roomCount").textContent = state.rooms.length;
  document.getElementById("seatCount").textContent = state.rooms.reduce((sum, room) => sum + room.seats, 0);
  document.getElementById("openCount").textContent = state.rooms.filter((room) => room.status === "开放").length;
}

function renderRooms() {
  const building = document.getElementById("buildingFilter").value;
  const floor = document.getElementById("floorFilter").value;
  const status = document.getElementById("statusFilter").value;
  const keyword = document.getElementById("keywordFilter").value.trim().toLowerCase();
  const list = state.rooms.filter((room) =>
    (building === "all" || room.building === building) &&
    (floor === "all" || String(room.floor) === floor) &&
    (status === "all" || room.status === status) &&
    (!keyword || room.name.toLowerCase().includes(keyword))
  );

  const container = document.getElementById("roomList");
  container.replaceChildren();
  list.forEach((room) => {
    const ratio = room.seats ? Math.round((room.occupied / room.seats) * 100) : 0;
    const column = document.createElement("div");
    column.className = "col-md-6 col-xl-4";
    const card = document.createElement("article");
    card.className = "room-card";
    const badge = document.createElement("span");
    badge.className = `status-badge ${room.status === "开放" ? "status-open" : "status-closed"}`;
    badge.textContent = room.status;
    const title = document.createElement("h3");
    title.textContent = room.name;
    const meta = document.createElement("p");
    meta.textContent = `${room.building} · ${room.floor} 楼 · ${room.hours}`;
    const seats = document.createElement("p");
    seats.textContent = `座位 ${room.occupied}/${room.seats}，使用率 ${ratio}%`;
    const bar = document.createElement("div");
    bar.className = "occupancy";
    bar.setAttribute("aria-label", `使用率 ${ratio}%`);
    const fill = document.createElement("span");
    fill.style.width = `${ratio}%`;
    bar.append(fill);
    card.append(badge, title, meta, seats, bar);
    column.append(card);
    container.append(column);
  });
  document.getElementById("roomMessage").textContent = list.length ? `找到 ${list.length} 个符合条件的空间。` : "没有符合当前条件的自习室，请调整筛选项。";
}

function renderChart() {
  if (typeof echarts === "undefined") {
    document.getElementById("chartFallback").textContent = "ECharts 未能加载，无法显示统计图。";
    return;
  }
  const grouped = new Map();
  state.rooms.forEach((room) => {
    const current = grouped.get(room.building) || { seats: 0, occupied: 0 };
    current.seats += room.seats;
    current.occupied += room.occupied;
    grouped.set(room.building, current);
  });
  const labels = [...grouped.keys()];
  state.chart = echarts.init(document.getElementById("usageChart"));
  state.chart.setOption({
    title: { text: "各建筑自习座位使用情况", subtext: "单位：座位｜教学演示数据", left: "center" },
    tooltip: { trigger: "axis", axisPointer: { type: "shadow" } },
    legend: { bottom: 0 },
    grid: { left: 45, right: 24, top: 82, bottom: 62, containLabel: true },
    xAxis: { type: "category", data: labels, axisLabel: { interval: 0, rotate: labels.length > 5 ? 20 : 0 } },
    yAxis: { type: "value", name: "座位" },
    series: [
      { name: "座位总数", type: "bar", data: labels.map((key) => grouped.get(key).seats), itemStyle: { color: "#8bb9a8" } },
      { name: "已占用", type: "bar", data: labels.map((key) => grouped.get(key).occupied), itemStyle: { color: "#0b6b4d" } }
    ]
  });
}

function initLandmark() {
  const host = document.getElementById("threeScene");
  if (typeof THREE === "undefined" || !window.WebGLRenderingContext) {
    host.textContent = "当前浏览器不支持 WebGL，无法显示三维钟楼模型。";
    host.classList.add("text-white", "p-4");
    return;
  }
  try {
    const scene = new THREE.Scene();
    scene.background = new THREE.Color(0x082f27);
    scene.fog = new THREE.Fog(0x082f27, 12, 34);
    const camera = new THREE.PerspectiveCamera(48, host.clientWidth / host.clientHeight, 0.1, 100);
    camera.position.set(8, 7, 10);
    const renderer = new THREE.WebGLRenderer({ antialias: true });
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    renderer.setSize(host.clientWidth, host.clientHeight);
    renderer.shadowMap.enabled = true;
    host.append(renderer.domElement);

    const controls = new THREE.OrbitControls(camera, renderer.domElement);
    controls.enableDamping = true;
    controls.target.set(0, 3, 0);
    controls.minDistance = 6;
    controls.maxDistance = 22;

    scene.add(new THREE.HemisphereLight(0xfff4d4, 0x173c31, 1.2));
    const sun = new THREE.DirectionalLight(0xffffff, 1.1);
    sun.position.set(7, 12, 9);
    sun.castShadow = true;
    scene.add(sun);

    const tower = new THREE.Group();
    const stone = new THREE.MeshStandardMaterial({ color: 0xe9ddbf, roughness: 0.78 });
    const green = new THREE.MeshStandardMaterial({ color: 0x126b50, roughness: 0.6 });
    const gold = new THREE.MeshStandardMaterial({ color: 0xf2b84b, metalness: 0.25, roughness: 0.4 });
    const dark = new THREE.MeshStandardMaterial({ color: 0x18322b });

    addBox(tower, 4.6, .45, 4.6, 0, .25, 0, green);
    addBox(tower, 3.3, 4.5, 3.3, 0, 2.7, 0, stone);
    addBox(tower, 4.1, .35, 4.1, 0, 5.05, 0, green);
    addBox(tower, 2.8, 2.2, 2.8, 0, 6.3, 0, stone);
    const roof = new THREE.Mesh(new THREE.ConeGeometry(2.25, 2.3, 4), green);
    roof.position.y = 8.55;
    roof.rotation.y = Math.PI / 4;
    roof.castShadow = true;
    tower.add(roof);
    [[0,6.5,1.42,0],[1.42,6.5,0,Math.PI/2],[0,6.5,-1.42,Math.PI],[-1.42,6.5,0,-Math.PI/2]].forEach(([x,y,z,ry]) => {
      const face = new THREE.Mesh(new THREE.CylinderGeometry(.72,.72,.12,40), gold);
      face.position.set(x,y,z); face.rotation.set(Math.PI/2,0,ry); tower.add(face);
      const hand = new THREE.Mesh(new THREE.BoxGeometry(.08,.58,.1), dark);
      hand.position.set(x,y,z); hand.rotation.set(0,0,.55); tower.add(hand);
    });
    tower.traverse((part) => { if (part.isMesh) { part.castShadow = true; part.receiveShadow = true; } });
    scene.add(tower);

    const ground = new THREE.Mesh(new THREE.CircleGeometry(11, 64), new THREE.MeshStandardMaterial({ color: 0x315f4f, roughness: 1 }));
    ground.rotation.x = -Math.PI / 2;
    ground.receiveShadow = true;
    scene.add(ground);
    state.scene = { host, scene, camera, renderer, controls };

    function animate() {
      requestAnimationFrame(animate);
      controls.update();
      renderer.render(scene, camera);
    }
    animate();
    document.getElementById("resetView").addEventListener("click", () => {
      camera.position.set(8, 7, 10);
      controls.target.set(0, 3, 0);
      controls.update();
      host.focus();
    });
  } catch (error) {
    console.error("三维场景初始化失败：", error);
    host.textContent = "三维场景初始化失败，请检查浏览器是否已启用硬件加速。";
    host.classList.add("text-white", "p-4");
  }
}

function addBox(group, width, height, depth, x, y, z, material) {
  const mesh = new THREE.Mesh(new THREE.BoxGeometry(width, height, depth), material);
  mesh.position.set(x, y, z);
  group.add(mesh);
}

function resizeScene() {
  if (!state.scene) return;
  const { host, camera, renderer } = state.scene;
  camera.aspect = host.clientWidth / host.clientHeight;
  camera.updateProjectionMatrix();
  renderer.setSize(host.clientWidth, host.clientHeight);
}

