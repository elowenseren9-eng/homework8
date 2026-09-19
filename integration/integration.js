"use strict";

const app = {
  rooms: [], campus: null, saved: new Set(), tasks: [], charts: [], scene: null,
  mode: new URLSearchParams(window.location.search).get("state") || "normal"
};

document.addEventListener("DOMContentLoaded", () => {
  readLocalState();
  bindInterface();
  setDefaultDate();
  renderTasks();
  loadDashboard();
});

function bindInterface() {
  ["spaceKeyword", "spaceStatus", "seatNeed", "savedOnly"].forEach((id) => {
    document.getElementById(id).addEventListener("input", renderSpaces);
  });
  document.getElementById("taskForm").addEventListener("submit", addTask);
  document.getElementById("showStateHelp").addEventListener("click", () => {
    bootstrap.Modal.getOrCreateInstance(document.getElementById("stateModal")).show();
  });
  document.getElementById("resetCampusView").addEventListener("click", resetCampusView);
  window.addEventListener("resize", () => {
    app.charts.forEach((chart) => chart.resize());
    resizeScene();
  });
}

function readLocalState() {
  try {
    const saved = JSON.parse(localStorage.getItem("w8-saved-rooms") || "[]");
    const tasks = JSON.parse(localStorage.getItem("w8-study-tasks") || "[]");
    app.saved = new Set(Array.isArray(saved) ? saved : []);
    app.tasks = Array.isArray(tasks) ? tasks : [];
  } catch (error) {
    console.warn("本地记录格式异常，已恢复为空记录。", error.message);
    app.saved = new Set();
    app.tasks = [];
  }
  updateSavedMetric();
}

async function loadDashboard() {
  showGlobalAlert("正在读取校园空间和趋势数据……", "loading");
  try {
    if (app.mode === "offline") throw new Error("已按地址参数模拟离线/请求失败");
    const [roomResponse, campusResponse] = await Promise.all([
      fetch("../data/studyrooms.json", { cache: "no-store" }),
      fetch("../data/campus.json", { cache: "no-store" })
    ]);
    if (!roomResponse.ok || !campusResponse.ok) throw new Error(`HTTP ${roomResponse.status}/${campusResponse.status}`);
    const roomPayload = await roomResponse.json();
    const campusPayload = await campusResponse.json();

    if (app.mode === "empty") {
      roomPayload.rooms = [];
      campusPayload.announcements = [];
      campusPayload.weekFlow.values = [];
      campusPayload.studyTypes = [];
    } else if (app.mode === "malformed") {
      campusPayload.weekFlow.values = "这不是数组";
    }
    validatePayload(roomPayload, campusPayload);
    app.rooms = roomPayload.rooms;
    app.campus = campusPayload;
    showGlobalAlert(modeMessage(), app.mode === "normal" ? "success" : "warning");
    renderAll();
  } catch (error) {
    console.warn("数据状态已进入可控错误分支：", error.message);
    app.rooms = [];
    app.campus = null;
    showGlobalAlert(`数据暂时不可用：${error.message}。请检查本地服务器和 JSON 文件，或删除地址中的 state 参数后重试。`, "error");
    renderAll();
  }
}

function validatePayload(roomPayload, campusPayload) {
  if (!roomPayload || !Array.isArray(roomPayload.rooms)) throw new Error("studyrooms.json 缺少 rooms 数组");
  if (!campusPayload || !Array.isArray(campusPayload.announcements)) throw new Error("campus.json 缺少 announcements 数组");
  if (!campusPayload.weekFlow || !Array.isArray(campusPayload.weekFlow.labels) || !Array.isArray(campusPayload.weekFlow.values)) throw new Error("weekFlow 的 labels/values 格式不正确");
  if (!Array.isArray(campusPayload.studyTypes) || !Array.isArray(campusPayload.landmarks)) throw new Error("studyTypes 或 landmarks 字段格式不正确");
}

function modeMessage() {
  if (app.mode === "empty") return "空数据状态已启用：页面没有伪造默认结果，各模块均显示明确的空状态。";
  if (app.mode === "malformed") return "格式错误状态已启用。";
  return "数据读取成功，页面已使用本地 JSON 更新。";
}

function showGlobalAlert(message, kind) {
  const host = document.getElementById("globalAlert");
  const symbol = kind === "success" ? "✓" : kind === "error" ? "!" : kind === "warning" ? "△" : "…";
  host.innerHTML = "";
  const panel = document.createElement("div");
  panel.className = "global-alert";
  panel.textContent = `${symbol} ${message}`;
  host.append(panel);
}

function renderAll() {
  renderMetrics();
  renderNotices();
  fillTaskPlaces();
  renderSpaces();
  renderCharts();
  initCampusScene();
}

function renderMetrics() {
  const openRooms = app.rooms.filter((room) => room.status === "开放");
  const totalSeats = openRooms.reduce((sum, room) => sum + room.seats, 0);
  const occupied = openRooms.reduce((sum, room) => sum + room.occupied, 0);
  document.getElementById("metricOpen").textContent = openRooms.length;
  document.getElementById("metricAvailable").textContent = Math.max(0, totalSeats - occupied);
  document.getElementById("metricRate").textContent = totalSeats ? Math.round((occupied / totalSeats) * 100) : 0;
  updateSavedMetric();
}

function renderNotices() {
  const host = document.getElementById("noticeList");
  host.replaceChildren();
  document.getElementById("lastUpdated").textContent = `数据更新时间：${app.campus?.updated || "暂无"}`;
  const notices = app.campus?.announcements || [];
  if (!notices.length) {
    host.append(emptyPanel("当前没有公告数据。"));
    return;
  }
  notices.forEach((notice) => {
    const article = document.createElement("article");
    article.className = "notice-card";
    const level = document.createElement("span"); level.className = "notice-level"; level.textContent = notice.level;
    const date = document.createElement("span"); date.className = "date"; date.textContent = notice.date;
    const title = document.createElement("h3"); title.textContent = notice.title;
    const detail = document.createElement("p"); detail.textContent = notice.detail;
    article.append(level, date, title, detail);
    host.append(article);
  });
}

function fillTaskPlaces() {
  const select = document.getElementById("taskPlace");
  select.querySelectorAll("option:not(:first-child)").forEach((option) => option.remove());
  app.rooms.filter((room) => room.status === "开放").forEach((room) => {
    const option = document.createElement("option");
    option.value = room.name;
    option.textContent = room.name;
    select.append(option);
  });
}

function renderSpaces() {
  const keyword = document.getElementById("spaceKeyword").value.trim().toLowerCase();
  const status = document.getElementById("spaceStatus").value;
  const seatNeed = Math.max(0, Number(document.getElementById("seatNeed").value) || 0);
  const savedOnly = document.getElementById("savedOnly").checked;
  const filtered = app.rooms.filter((room) => {
    const available = Math.max(0, room.seats - room.occupied);
    const matchText = !keyword || `${room.name}${room.building}`.toLowerCase().includes(keyword);
    return matchText && (status === "all" || room.status === status) && available >= seatNeed && (!savedOnly || app.saved.has(room.name));
  });
  const host = document.getElementById("spaceList");
  host.replaceChildren();
  if (!filtered.length) host.append(emptyPanel(app.rooms.length ? "没有符合条件的空间，请放宽筛选条件。" : "当前没有可显示的空间数据。"));
  filtered.forEach((room) => host.append(createSpaceCard(room)));
  document.getElementById("spaceResult").textContent = `共找到 ${filtered.length} 个空间。`;
}

function createSpaceCard(room) {
  const available = Math.max(0, room.seats - room.occupied);
  const ratio = room.seats ? Math.round((room.occupied / room.seats) * 100) : 0;
  const article = document.createElement("article"); article.className = "space-card";
  const top = document.createElement("div"); top.className = "space-card-top";
  const metaWrap = document.createElement("div");
  const status = document.createElement("span"); status.className = `room-status ${room.status === "开放" ? "open" : "closed"}`; status.textContent = room.status;
  const title = document.createElement("h3"); title.textContent = room.name;
  const meta = document.createElement("p"); meta.textContent = `${room.building} · ${room.floor} 楼 · ${room.hours}`;
  metaWrap.append(status, title, meta);
  const availability = document.createElement("strong"); availability.textContent = `${available} 空位`; availability.className = available ? "text-success" : "text-secondary";
  top.append(metaWrap, availability);
  const footer = document.createElement("div"); footer.className = "space-card-footer";
  const meter = document.createElement("div"); meter.className = "seat-meter"; meter.setAttribute("role", "progressbar"); meter.setAttribute("aria-label", "座位使用率"); meter.setAttribute("aria-valuemin", "0"); meter.setAttribute("aria-valuemax", "100"); meter.setAttribute("aria-valuenow", String(ratio));
  const fill = document.createElement("span"); fill.style.width = `${ratio}%`; meter.append(fill);
  const button = document.createElement("button"); button.type = "button"; button.className = `btn btn-sm save-button ${app.saved.has(room.name) ? "btn-success" : "btn-outline-success"}`; button.textContent = app.saved.has(room.name) ? "已收藏" : "收藏"; button.setAttribute("aria-pressed", String(app.saved.has(room.name)));
  button.addEventListener("click", () => toggleSaved(room.name));
  footer.append(meter, button); article.append(top, footer); return article;
}

function toggleSaved(name) {
  if (app.saved.has(name)) app.saved.delete(name); else app.saved.add(name);
  localStorage.setItem("w8-saved-rooms", JSON.stringify([...app.saved]));
  updateSavedMetric(); renderSpaces();
}

function updateSavedMetric() { document.getElementById("metricSaved").textContent = app.saved.size; }

function setDefaultDate() {
  const date = new Date(); date.setDate(date.getDate() + 1);
  document.getElementById("taskDate").value = date.toISOString().slice(0, 10);
}

function addTask(event) {
  event.preventDefault();
  const name = document.getElementById("taskName").value.trim();
  const place = document.getElementById("taskPlace").value;
  const date = document.getElementById("taskDate").value;
  const message = document.getElementById("taskFormMessage");
  if (!name || !date) { message.textContent = "请填写计划内容和日期。"; return; }
  app.tasks.unshift({ id: Date.now(), name, place, date, done: false });
  saveTasks(); renderTasks(); event.target.reset(); setDefaultDate(); message.textContent = "计划已添加。";
}

function saveTasks() { localStorage.setItem("w8-study-tasks", JSON.stringify(app.tasks)); }

function renderTasks() {
  const host = document.getElementById("taskList"); host.replaceChildren();
  if (!app.tasks.length) host.append(emptyPanel("还没有学习计划，可以从左侧添加一项。", "li"));
  app.tasks.forEach((task) => {
    const item = document.createElement("li"); item.className = `task-item ${task.done ? "completed" : ""}`;
    const check = document.createElement("input"); check.type = "checkbox"; check.className = "form-check-input"; check.checked = task.done; check.setAttribute("aria-label", `标记“${task.name}”为${task.done ? "未完成" : "已完成"}`);
    check.addEventListener("change", () => { task.done = check.checked; saveTasks(); renderTasks(); });
    const main = document.createElement("div"); main.className = "task-main";
    const strong = document.createElement("strong"); strong.textContent = task.name;
    const meta = document.createElement("span"); meta.className = "task-meta"; meta.textContent = `${task.date} · ${task.place}`;
    main.append(strong, meta);
    const remove = document.createElement("button"); remove.type = "button"; remove.className = "btn btn-sm delete-task"; remove.textContent = "删除";
    remove.addEventListener("click", () => { app.tasks = app.tasks.filter((itemTask) => itemTask.id !== task.id); saveTasks(); renderTasks(); });
    item.append(check, main, remove); host.append(item);
  });
  document.getElementById("pendingCount").textContent = app.tasks.filter((task) => !task.done).length;
  document.getElementById("doneCount").textContent = app.tasks.filter((task) => task.done).length;
}

function renderCharts() {
  app.charts.forEach((chart) => chart.dispose()); app.charts = [];
  if (typeof echarts === "undefined") {
    document.getElementById("flowChart").textContent = "图表库未加载。";
    document.getElementById("typeChart").textContent = "图表库未加载。";
    return;
  }
  const flow = echarts.init(document.getElementById("flowChart"));
  const labels = app.campus?.weekFlow.labels || [];
  const values = app.campus?.weekFlow.values || [];
  flow.setOption({ color:["#f1bd59"], tooltip:{trigger:"axis"}, grid:{left:45,right:20,top:24,bottom:38,containLabel:true}, xAxis:{type:"category",data:labels,axisLine:{lineStyle:{color:"#8aa49a"}},axisLabel:{color:"#d8e9e3"}}, yAxis:{type:"value",name:"人次",nameTextStyle:{color:"#d8e9e3"},axisLabel:{color:"#d8e9e3"},splitLine:{lineStyle:{color:"rgba(255,255,255,.12)"}}}, series:[{type:"line",smooth:true,data:values,symbolSize:9,areaStyle:{color:"rgba(241,189,89,.18)"}}], graphic: values.length ? [] : [{type:"text",left:"center",top:"middle",style:{text:"暂无趋势数据",fill:"#d8e9e3",fontSize:16}}] });
  const types = echarts.init(document.getElementById("typeChart"));
  const typeData = app.campus?.studyTypes || [];
  types.setOption({ color:["#f1bd59","#65c59f","#7ca7c9","#d9846a"], tooltip:{trigger:"item"}, legend:{bottom:0,textStyle:{color:"#d8e9e3"}}, series:[{type:"pie",radius:["43%","68%"],center:["50%","45%"],label:{color:"#fff",formatter:"{b}\n{d}%"},data:typeData}], graphic:typeData.length ? [{type:"text",left:"center",top:"40%",style:{text:"学习目的",fill:"#fff",fontSize:15,textAlign:"center"}}] : [{type:"text",left:"center",top:"middle",style:{text:"暂无构成数据",fill:"#d8e9e3",fontSize:16}}] });
  app.charts.push(flow, types);
}

function emptyPanel(message, tagName = "div") { const panel = document.createElement(tagName); panel.className = "empty-panel"; panel.textContent = message; return panel; }

function initCampusScene() {
  const host = document.getElementById("campusScene"); host.replaceChildren();
  document.getElementById("landmarkButtons").replaceChildren();
  if (app.scene) { app.scene.renderer.dispose(); app.scene = null; }
  const landmarks = app.campus?.landmarks || [];
  if (!landmarks.length) { document.getElementById("webglMessage").textContent = "暂无可显示的三维地标数据。"; return; }
  if (typeof THREE === "undefined" || !window.WebGLRenderingContext) { document.getElementById("webglMessage").textContent = "浏览器不支持 WebGL，已保留文字版地点信息。"; createLandmarkButtons(landmarks); return; }
  try {
    const scene = new THREE.Scene(); scene.background = new THREE.Color(0x072e26); scene.fog = new THREE.Fog(0x072e26, 16, 38);
    const camera = new THREE.PerspectiveCamera(48, host.clientWidth / host.clientHeight, .1, 100); camera.position.set(11,9,13);
    const renderer = new THREE.WebGLRenderer({antialias:true}); renderer.setPixelRatio(Math.min(window.devicePixelRatio,2)); renderer.setSize(host.clientWidth,host.clientHeight); renderer.shadowMap.enabled=true; host.append(renderer.domElement);
    const controls = new THREE.OrbitControls(camera,renderer.domElement); controls.enableDamping=true; controls.target.set(0,1.8,0); controls.minDistance=7; controls.maxDistance=27;
    scene.add(new THREE.HemisphereLight(0xfff3d4,0x153b31,1.3));
    const sun = new THREE.DirectionalLight(0xffffff,1.05); sun.position.set(9,13,8); sun.castShadow=true; scene.add(sun);
    const ground = new THREE.Mesh(new THREE.CircleGeometry(12,64),new THREE.MeshStandardMaterial({color:0x315f4f,roughness:1})); ground.rotation.x=-Math.PI/2; ground.receiveShadow=true; scene.add(ground);
    const points = new Map();
    landmarks.forEach((landmark) => {
      const group = createBuilding(landmark); group.position.set(landmark.x,0,landmark.z); scene.add(group); points.set(landmark.id,group.position.clone().add(new THREE.Vector3(0,landmark.height/2,0)));
    });
    for(let i=0;i<34;i+=1){const tree=new THREE.Mesh(new THREE.ConeGeometry(.22,.75,8),new THREE.MeshStandardMaterial({color:0x0c6046})); const angle=(i/34)*Math.PI*2; tree.position.set(Math.cos(angle)*8.4,.38,Math.sin(angle)*8.4); scene.add(tree);}
    app.scene={host,scene,camera,renderer,controls,points};
    createLandmarkButtons(landmarks);
    (function animate(){requestAnimationFrame(animate);controls.update();renderer.render(scene,camera);}());
    document.getElementById("webglMessage").textContent = "三维场景已加载，可拖动浏览。";
  } catch (error) { console.warn("三维场景未能初始化：",error.message); document.getElementById("webglMessage").textContent="三维场景初始化失败，请检查硬件加速设置。"; createLandmarkButtons(landmarks); }
}

function createBuilding(landmark) {
  const group=new THREE.Group(); const material=new THREE.MeshStandardMaterial({color:new THREE.Color(landmark.color),roughness:.72}); const dark=new THREE.MeshStandardMaterial({color:0x164236});
  const body=new THREE.Mesh(new THREE.BoxGeometry(2.4,landmark.height,2.1),material); body.position.y=landmark.height/2; body.castShadow=true; body.receiveShadow=true; group.add(body);
  const roof=new THREE.Mesh(new THREE.ConeGeometry(1.8,1.1,4),dark); roof.position.y=landmark.height+.55; roof.rotation.y=Math.PI/4; roof.castShadow=true; group.add(roof);
  for(let floor=.8;floor<landmark.height;floor+=.9){for(const x of [-.65,0,.65]){const windowMesh=new THREE.Mesh(new THREE.PlaneGeometry(.32,.36),new THREE.MeshBasicMaterial({color:0xffd784})); windowMesh.position.set(x,floor,1.056); group.add(windowMesh);}}
  return group;
}

function createLandmarkButtons(landmarks) {
  const host=document.getElementById("landmarkButtons");
  landmarks.forEach((landmark)=>{const button=document.createElement("button");button.type="button";button.className="btn btn-outline-success";button.textContent=landmark.name;button.addEventListener("click",()=>focusLandmark(landmark));host.append(button);});
}

function focusLandmark(landmark) {
  document.getElementById("landmarkName").textContent=landmark.name;
  document.getElementById("landmarkDescription").textContent=landmark.description;
  if(!app.scene)return; const target=app.scene.points.get(landmark.id); app.scene.controls.target.copy(target); app.scene.camera.position.set(target.x+6,target.y+4,target.z+7); app.scene.controls.update(); app.scene.host.focus();
}

function resetCampusView(){document.getElementById("landmarkName").textContent="校园全景";document.getElementById("landmarkDescription").textContent="选择一个地点查看说明，也可以自由拖动浏览全部几何模型。";if(!app.scene)return;app.scene.camera.position.set(11,9,13);app.scene.controls.target.set(0,1.8,0);app.scene.controls.update();app.scene.host.focus();}
function resizeScene(){if(!app.scene)return;const {host,camera,renderer}=app.scene;camera.aspect=host.clientWidth/host.clientHeight;camera.updateProjectionMatrix();renderer.setSize(host.clientWidth,host.clientHeight);}
