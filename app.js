const STORAGE_KEY = "smartdiary.mobile.v1";
const MONTHS_TG = ["январи","феврали","марти","апрели","майи","июни","июли","августи","сентябри","октябри","ноябри","декабри"];

const SUBJECT_ICONS = {
  "Математика": { bg:"#dbeafe", fg:"#2563eb", path:"calc" },
  "Забони тоҷикӣ": { bg:"#fce7f3", fg:"#db2777", path:"book" },
  "Физика": { bg:"#fee2e2", fg:"#dc2626", path:"atom" },
  "Кимё": { bg:"#ffedd5", fg:"#ea580c", path:"flask" },
  "Таърих": { bg:"#dcfce7", fg:"#16a34a", path:"hist" },
  "Адабиёти тоҷикӣ": { bg:"#ccfbf1", fg:"#0d9488", path:"lit" }
};

const DAYS = [
  { id:"mon", short:"Дш", name:"Душанбе" },
  { id:"tue", short:"Сш", name:"Сешанбе" },
  { id:"wed", short:"Чш", name:"Чоршанбе" },
  { id:"thu", short:"Пш", name:"Панҷшанбе" },
  { id:"fri", short:"Ҷм", name:"Ҷумъа" },
  { id:"sat", short:"Шн", name:"Шанбе" }
];

let db, role, page, selected = 10, toastTimer, currentNotifId, selectedDay, chosenSubject = "", gradeSheetSubject = "", editingProfile = false, pendingChild = null, pendingStudentCode = null;

function uid(){
  return crypto.randomUUID ? crypto.randomUUID() : "id-"+Date.now()+"-"+Math.random().toString(16).slice(2);
}
function esc(v){
  return String(v??"").replace(/&/g,"&amp;").replace(/</g,"&lt;").replace(/>/g,"&gt;").replace(/"/g,"&quot;");
}
function pad(n){ return String(n).padStart(2,"0"); }
function todayISO(){
  const d = new Date();
  return `${d.getFullYear()}-${pad(d.getMonth()+1)}-${pad(d.getDate())}`;
}
function fmtDot(iso){
  if(!iso) return "";
  const [y,m,d] = iso.split("-");
  if(d) return `${d}.${m}.${y}`;
  const dt = new Date(iso);
  return `${pad(dt.getDate())}.${pad(dt.getMonth()+1)}.${dt.getFullYear()}`;
}
function fmtTime(iso){
  const d = new Date(iso);
  return `${pad(d.getHours())}:${pad(d.getMinutes())}`;
}

function ico(name){
  const s = 'fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"';
  const p = {
    user:`<circle cx="12" cy="8" r="3.2"/><path d="M5 19c1.5-3.2 4-5 7-5s5.5 1.8 7 5"/>`,
    gear:`<circle cx="12" cy="12" r="3"/><path d="M12 4v2M12 18v2M4 12h2M18 12h2M6.3 6.3l1.5 1.5M16.2 16.2l1.5 1.5M17.7 6.3l-1.5 1.5M7.8 16.2l-1.5 1.5"/>`,
    back:`<path d="M15 19l-7-7 7-7"/>`,
    plus:`<path d="M12 5v14M5 12h14"/>`,
    book:`<path d="M4 19V6a2 2 0 0 1 2-2h5v17H6a2 2 0 0 0-2 2zM20 19V6a2 2 0 0 0-2-2h-5v17h5a2 2 0 0 1 2 2z"/>`,
    home:`<path d="M4 12l8-7 8 7v8a1 1 0 0 1-1 1h-5v-6H10v6H5a1 1 0 0 1-1-1z"/>`,
    grades:`<rect x="5" y="4" width="14" height="16" rx="2"/><path d="M8 9h8M8 13h8M8 17h5"/>`,
    info:`<circle cx="12" cy="12" r="8"/><path d="M12 11v5M12 8h.01"/>`,
    out:`<path d="M10 7V5a1 1 0 0 1 1-1h8v16h-8a1 1 0 0 1-1-1v-2M4 12h11M12 9l3 3-3 3"/>`,
    calc:`<rect x="5" y="3" width="14" height="18" rx="2"/><path d="M8 8h8M8 13h.01M12 13h.01M16 13h.01M8 17h.01M12 17h.01"/>`,
    atom:`<circle cx="12" cy="12" r="2"/><ellipse cx="12" cy="12" rx="8" ry="3"/><ellipse cx="12" cy="12" rx="8" ry="3" transform="rotate(60 12 12)"/>`,
    flask:`<path d="M9 3h6M10 3v6L6 18a3 3 0 0 0 2.6 4h6.8A3 3 0 0 0 18 18l-4-9V3"/>`,
    hist:`<path d="M5 5h14v14H5z"/><path d="M8 9h8M8 13h5"/>`,
    lit:`<path d="M6 4h9a3 3 0 0 1 3 3v13H9a3 3 0 0 0-3 3V4z"/>`,
    cap:`<path d="M3 10l9-5 9 5-9 5-9-5z"/><path d="M7 12v4c2 2 8 2 10 0v-4"/>`,
    cal:`<rect x="4" y="5" width="16" height="15" rx="2"/><path d="M8 3v4M16 3v4M4 10h16"/>`,
    minus:`<path d="M6 12h12"/>`,
    trash:`<path d="M4 7h16M9 7V5h6v2M10 11v6M14 11v6M6 7l1 12a2 2 0 0 0 2 2h6a2 2 0 0 0 2-2l1-12"/>`,
    chart:`<path d="M4 19V5M4 19h16"/><path d="M7 14l4-5 3 3 5-7"/>`,
    bell:`<path d="M6 17h12l-1-3V10a5 5 0 0 0-10 0v4z"/><path d="M10 17a2 2 0 0 0 4 0"/>`,
    speaker:`<path d="M4 10v4h3l4 3V7L7 10H4z"/><path d="M16 9.5a3.5 3.5 0 0 1 0 5"/><path d="M18.2 7.2a6 6 0 0 1 0 9.6"/>`,
    mute:`<path d="M4 10v4h3l4 3V7L7 10H4z"/><path d="M16 10l5 5M21 10l-5 5"/>`
  };
  return `<svg viewBox="0 0 24 24" ${s}>${p[name]||p.book}</svg>`;
}

function subjectMeta(name){
  return SUBJECT_ICONS[name] || { bg:"#e0e7ff", fg:"#4f46e5", path:"book" };
}
function subjectIco(name){
  const m = subjectMeta(name);
  return `<span class="sic" style="background:${m.bg};color:${m.fg}">${ico(m.path)}</span>`;
}

function avatar(kind){
  const src = kind==="parent" ? "assets/parent-avatar.png" : "assets/student-avatar.png";
  const alt = kind==="parent" ? "Падар" : "Хонанда";
  return `<img class="portrait" src="${src}" alt="${alt}">`;
}

function loginArt(){
  return `<svg viewBox="0 0 200 160" fill="none" aria-hidden="true">
    <circle cx="100" cy="86" r="64" fill="rgba(255,255,255,.16)"/>
    <path d="M34 62l5 12 12 5-12 5-5 12-5-12-12-5 12-5z" fill="#93c5fd"/>
    <path d="M164 40l4 9 9 4-9 4-4 9-4-9-9-4 9-4z" fill="#bfdbfe"/>
    <path d="M158 112l3 7 7 3-7 3-3 7-3-7-7-3 7-3z" fill="#93c5fd"/>
    <rect x="54" y="100" width="92" height="18" rx="5" fill="#1d4ed8"/>
    <rect x="50" y="104" width="8" height="10" rx="2" fill="#93c5fd"/>
    <rect x="60" y="84" width="80" height="18" rx="5" fill="#38bdf8"/>
    <rect x="56" y="88" width="8" height="10" rx="2" fill="#e0f2fe"/>
    <rect x="68" y="68" width="64" height="18" rx="5" fill="#7dd3fc"/>
    <path d="M72 66l28-18 28 18-28 12z" fill="#1e3a8a"/>
    <path d="M100 48v16" stroke="#1e3a8a" stroke-width="3" stroke-linecap="round"/>
    <circle cx="100" cy="46" r="3.4" fill="#1e3a8a"/>
    <path d="M80 66v18c8 9 32 9 40 0V66" stroke="#1e3a8a" stroke-width="5" fill="none" stroke-linecap="round"/>
  </svg>`;
}

function emptyProfile(kind){
  return kind==="parent"
    ? { name:"", surname:"", age:"", childName:"", phone:"", registered:false }
    : { name:"", surname:"", age:"", klass:"", school:"", phone:"", registered:false };
}
function defaultDb(){
  return {
    settings:{ dark:false, sound:true },
    users:[],
    activeId:"",
    childId:"",
    student: emptyProfile("student"),
    parent: emptyProfile("parent"),
    grades:[],
    notifications:[],
    schedule: emptySchedule()
  };
}

function emptySchedule(){
  return { mon:[], tue:[], wed:[], thu:[], fri:[], sat:[] };
}

function todayDayId(){
  const ids = [null,"mon","tue","wed","thu","fri","sat"];
  return ids[new Date().getDay()] || "mon";
}

function ensureSchedule(){
  if(!db.schedule || typeof db.schedule !== "object") db.schedule = emptySchedule();
  DAYS.forEach(d=>{
    if(!Array.isArray(db.schedule[d.id])) db.schedule[d.id] = [];
  });
}

function subjectHints(){
  const names = new Set(visibleGrades().map(g=>g.subject));
  ensureSchedule();
  DAYS.forEach(d=> (db.schedule[d.id]||[]).forEach(s=>{ if(String(s).trim()) names.add(s.trim()); }));
  return [...names];
}
function lastGrade(subject){
  const s = String(subject||"").trim();
  return visibleGrades().find(g => g.subject === s);
}

function normalizeCode(v){
  return String(v||"").replace(/\D/g,"");
}
function uniqueCode(kind, list){
  const pool = list || (db && db.users) || [];
  for(let n=0;n<40;n++){
    const code = String(100000 + Math.floor(Math.random()*900000));
    if(!pool.some(u => normalizeCode(u.code)===code)) return code;
  }
  return String(Date.now()).slice(-6);
}
function ensureNumericCodes(){
  const users = db.users || [];
  let changed = false;
  users.forEach(u => {
    if(u.role!=="student") return;
    if(/^\d{6}$/.test(normalizeCode(u.code))) return;
    const old = u.code;
    const neu = uniqueCode("student", users);
    u.code = neu;
    changed = true;
    users.forEach(p => {
      if(p.role==="parent" && (p.childId===u.id || normalizeCode(p.childCode)===normalizeCode(old) || String(p.childCode||"")===String(old||""))){
        p.childCode = neu;
      }
    });
  });
  return changed;
}
function findUserByCode(code, kind){
  const c = normalizeCode(code);
  if(!c) return null;
  const matches = (db.users||[]).filter(u => normalizeCode(u.code)===c && (!kind || u.role===kind));
  return matches.length === 1 ? matches[0] : null;
}
function namesMatch(a, b){
  const n = s => String(s||"").trim().toLowerCase().replace(/\s+/g," ");
  return n(a) && n(a) === n(b);
}
function cloneData(v){
  try{ return JSON.parse(JSON.stringify(v)); }catch(e){ return v; }
}
function ownerStudentId(){
  if(role==="student") return db.activeId || "";
  if(role==="parent") return db.childId || "";
  return "";
}
function bindOwner(list, studentId){
  if(!studentId) return [];
  return (list||[]).map(x => ({ ...x, studentId: x.studentId || studentId })).filter(x => x.studentId === studentId);
}
function linkedStudent(parent){
  if(!parent) return null;
  const byCode = findUserByCode(parent.childCode, "student");
  if(!byCode) return null;
  if(parent.childId && parent.childId !== byCode.id) return null;
  if(normalizeCode(byCode.code) !== normalizeCode(parent.childCode)) return null;
  return byCode;
}
function activeUser(){ return (db.users||[]).find(u => u.id===db.activeId) || null; }
function profileFrom(u){
  return {
    name: u.name||"", surname: u.surname||"", age: u.age||"",
    klass: u.klass||"", school: u.school||"", phone: u.phone||"",
    childName: u.childName||"", childCode: u.childCode||"",
    registered: !!u.registered, code: u.code||""
  };
}
function applyAccount(user){
  if(!user) return;
  db.activeId = user.id;
  role = user.role;
  db.grades = [];
  db.notifications = [];
  db.childId = "";
  db.schedule = emptySchedule();
  if(user.role==="student"){
    db.student = profileFrom(user);
    db.parent = emptyProfile("parent");
    db.grades = bindOwner(cloneData(user.grades||[]), user.id);
    db.schedule = cloneData({ ...emptySchedule(), ...(user.schedule||{}) });
    db.notifications = bindOwner(cloneData(user.notifications||[]), user.id);
  }else{
    db.parent = profileFrom(user);
    const child = linkedStudent(user);
    if(child){
      db.student = profileFrom(child);
      db.grades = bindOwner(cloneData(child.grades||[]), child.id);
      db.schedule = cloneData({ ...emptySchedule(), ...(child.schedule||{}) });
      db.notifications = bindOwner(cloneData(child.notifications||[]), child.id);
      db.childId = child.id;
      if(!user.childId) user.childId = child.id;
    }else{
      db.student = { ...emptyProfile("student"), name: user.childName||"" };
    }
  }
  ensureSchedule();
}
function persistActiveAccount(){
  if(!Array.isArray(db.users)) db.users = [];
  const u = db.users.find(x => x.id===db.activeId);
  if(!u) return;
  if(u.role==="student"){
    const sid = u.id;
    Object.assign(u, {
      name: db.student.name, surname: db.student.surname, age: db.student.age,
      klass: db.student.klass, school: db.student.school, phone: db.student.phone,
      registered: true,
      code: u.code,
      grades: bindOwner(db.grades||[], sid),
      schedule: db.schedule,
      notifications: bindOwner(db.notifications||[], sid)
    });
  }else{
    Object.assign(u, {
      name: db.parent.name, surname: db.parent.surname, age: db.parent.age,
      childName: db.parent.childName, phone: db.parent.phone, registered: true,
      childId: u.childId || db.childId || "",
      childCode: u.childCode || ""
    });
    const child = linkedStudent(u);
    if(child && db.childId === child.id){
      const local = new Map((db.notifications||[]).map(n => [n.id, n]));
      child.notifications = bindOwner(child.notifications||[], child.id).map(n => {
        const cur = local.get(n.id);
        return cur ? { ...n, read: !!cur.read } : n;
      });
    }
  }
}

function loadDb(){
  try{
    const raw = localStorage.getItem(STORAGE_KEY);
    if(!raw) return defaultDb();
    const p = JSON.parse(raw);
    const base = defaultDb();
    if(Array.isArray(p.users)){
      return {
        ...base,
        settings:{ ...base.settings, ...(p.settings||{}) },
        users: p.users,
        activeId: p.activeId || "",
        childId: p.childId || ""
      };
    }
    const grades = Array.isArray(p.grades) ? p.grades.map(g=>{
      let v = Number(g.value);
      return { ...g, id: g.id || uid(), value: v, date: g.date && g.date.includes("-") ? g.date : toISODate(g.date) };
    }) : [];
    const users = [];
    if(p.student && (p.student.registered || String(p.student.name||"").trim())){
      users.push({
        id: uid(), role:"student", code: uniqueCode("student", users), registered:true,
        ...emptyProfile("student"), ...p.student,
        grades, schedule: { ...emptySchedule(), ...(p.schedule||{}) },
        notifications: Array.isArray(p.notifications)?p.notifications:[]
      });
    }
    if(p.parent && (p.parent.registered || String(p.parent.name||"").trim())){
      const child = users[0];
      users.push({
        id: uid(), role:"parent", code: uniqueCode("parent", users), registered:true,
        ...emptyProfile("parent"), ...p.parent,
        childCode: child ? child.code : "",
        grades:[], schedule: emptySchedule(), notifications:[]
      });
    }
    return { ...base, settings:{ ...base.settings, ...(p.settings||{}) }, users };
  }catch(e){ return defaultDb(); }
}
function toISODate(dot){
  const m = /^(\d{2})\.(\d{2})\.(\d{4})$/.exec(dot||"");
  return m ? `${m[3]}-${m[2]}-${m[1]}` : todayISO();
}
function saveDb(){
  persistActiveAccount();
  localStorage.setItem(STORAGE_KEY, JSON.stringify({
    settings: db.settings,
    users: db.users||[],
    activeId: db.activeId||"",
    childId: db.childId||""
  }));
}

function personName(p){
  return [p && p.name, p && p.surname].filter(Boolean).join(" ").trim();
}
function studentName(){ return personName(db.student) || "Хонанда"; }
function parentName(){ return personName(db.parent) || "Падар"; }
function childName(){
  if(role==="parent"){
    const child = linkedStudent(activeUser());
    if(child) return personName(child) || "Хонанда";
  }
  return personName(db.student) || "Хонанда";
}
function klassLabel(){
  const k = String((db.student && db.student.klass) || "").trim();
  if(!k) return "";
  return /^синф/i.test(k) ? k : `Синфи ${k}`;
}
function isRegistered(r){
  const p = r==="parent" ? (db.parent||{}) : (db.student||{});
  return !!(p.registered && String(p.name||"").trim());
}
function setSessionReady(on){
  try{ on ? localStorage.setItem("sd.ready","1") : localStorage.removeItem("sd.ready"); }catch(e){}
}

function visibleGrades(){ return bindOwner(db.grades||[], ownerStudentId()); }
function visibleNotes(){ return bindOwner(db.notifications||[], ownerStudentId()); }
function avg(){
  const list = visibleGrades();
  if(!list.length) return 0;
  return list.reduce((s,g)=>s+Number(g.value),0)/list.length;
}
function fmtShort(iso){
  if(!iso) return "";
  const [y,m,d] = String(iso).split("-");
  return d && m ? `${d}.${m}` : fmtDot(iso).slice(0,5);
}
function markColor(v){
  const n = Number(v)||1;
  if(n>=9) return "#16a34a";
  if(n>=7) return "#22c55e";
  if(n>=5) return "#f59e0b";
  if(n>=3) return "#fb923c";
  return "#ef4444";
}
function gradesChrono(){
  return [...visibleGrades()].sort((a,b)=>{
    const da = a.date || a.createdAt || "";
    const dbDate = b.date || b.createdAt || "";
    if(da !== dbDate) return String(da).localeCompare(String(dbDate));
    return String(a.createdAt||"").localeCompare(String(b.createdAt||""));
  });
}
function progressTrend(values){
  if(values.length < 2) return { dir: 0, text: "Нав оғоз шуд" };
  const k = Math.min(3, Math.max(1, Math.floor(values.length/2)));
  const a = values.slice(0,k).reduce((s,v)=>s+v,0)/k;
  const b = values.slice(-k).reduce((s,v)=>s+v,0)/k;
  const d = b - a;
  if(d >= 0.4) return { dir: 1, text: "Беҳтар мешавад" };
  if(d <= -0.4) return { dir: -1, text: "Каме паст шуд" };
  return { dir: 0, text: "Устувор" };
}
function subjectAverages(){
  const map = {};
  (visibleGrades()).forEach(g=>{
    const s = String(g.subject||"").trim() || "Дигар";
    if(!map[s]) map[s] = { sum:0, n:0 };
    map[s].sum += Number(g.value)||0;
    map[s].n++;
  });
  return Object.entries(map)
    .map(([subject, x])=>({ subject, avg: x.sum/x.n, n: x.n }))
    .sort((a,b)=>b.avg-a.avg)
    .slice(0,6);
}
function progressCard(){
  const all = gradesChrono();
  if(!all.length){
    return `<div class="card progress-card">
      <h3>Пешрафт</h3>
      <p class="empty" style="padding:12px 0">Баҳо гузоред, график пайдо мешавад.</p>
    </div>`;
  }
  const shown = all.slice(-10);
  const values = shown.map(g=>Number(g.value)||0);
  const a = avg();
  const trend = progressTrend(all.map(g=>Number(g.value)||0));
  const w = 320, h = 168, padL = 26, padR = 10, padT = 14, padB = 26;
  const plotW = w - padL - padR, plotH = h - padT - padB;
  const n = shown.length;
  const xAt = i => padL + (n===1 ? plotW/2 : i * plotW / (n-1));
  const yAt = v => padT + plotH * (1 - Math.max(0, Math.min(10, v)) / 10);
  const pts = values.map((v,i)=>({ x:xAt(i), y:yAt(v), v, g:shown[i] }));
  const line = pts.map((p,i)=>`${i?"L":"M"}${p.x.toFixed(1)},${p.y.toFixed(1)}`).join(" ");
  const area = `${line} L${pts[pts.length-1].x.toFixed(1)},${(padT+plotH).toFixed(1)} L${pts[0].x.toFixed(1)},${(padT+plotH).toFixed(1)} Z`;
  const avgY = yAt(a);
  const yTicks = [10,7,4,1];
  const labelIdx = n===1 ? [0] : n===2 ? [0,1] : [0, Math.round((n-1)/2), n-1];
  const ticks = yTicks.map(v=>`
    <line class="chart-grid" x1="${padL}" y1="${yAt(v).toFixed(1)}" x2="${w-padR}" y2="${yAt(v).toFixed(1)}"/>
    <text class="chart-y" x="${padL-6}" y="${yAt(v)+4}">${v}</text>
  `).join("");
  const xLabels = labelIdx.map(i=>`
    <text class="chart-x" x="${pts[i].x.toFixed(1)}" y="${h-6}">${esc(fmtShort(shown[i].date))}</text>
  `).join("");
  const dots = pts.map(p=>`<circle class="chart-dot" cx="${p.x.toFixed(1)}" cy="${p.y.toFixed(1)}" r="4.2" fill="${markColor(p.v)}"/>`).join("");
  const bars = subjectAverages().map(s=>`
    <div class="sbar">
      <span class="sbar-name">${esc(s.subject)}</span>
      <div class="sbar-track"><i style="width:${Math.max(8, s.avg*10)}%;background:${markColor(s.avg)}"></i></div>
      <b>${s.avg.toFixed(1)}</b>
    </div>
  `).join("");
  const arrow = trend.dir>0 ? "↑" : trend.dir<0 ? "↓" : "→";
  return `
    <div class="card progress-card">
      <div class="progress-head">
        <h3>${ico("chart")} Пешрафт</h3>
        <span class="trend ${trend.dir>0?"up":trend.dir<0?"down":"flat"}">${arrow} ${esc(trend.text)}</span>
      </div>
      <div class="progress-meta">
        <div><small>Миёна</small><b>${a.toFixed(1)}</b></div>
        <div><small>Баҳоҳо</small><b>${visibleGrades().length}</b></div>
        <div><small>Охирин</small><b>${values[values.length-1]}</b></div>
      </div>
      <svg class="chart-svg" viewBox="0 0 ${w} ${h}" aria-label="Графики пешрафт">
        <defs>
          <linearGradient id="progFill" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stop-color="currentColor" stop-opacity=".28"/>
            <stop offset="100%" stop-color="currentColor" stop-opacity="0"/>
          </linearGradient>
        </defs>
        ${ticks}
        <line class="chart-avg" x1="${padL}" y1="${avgY.toFixed(1)}" x2="${w-padR}" y2="${avgY.toFixed(1)}"/>
        <path class="chart-area" d="${area}"/>
        <path class="chart-line" d="${line}"/>
        ${dots}
        ${xLabels}
      </svg>
      <div class="sbar-list">${bars}</div>
    </div>
  `;
}
function unread(){ return visibleNotes().filter(n=>n.to==="parent" && !n.read).length; }
function markParentNotesSeen(){
  if(role!=="parent") return;
  const sid = ownerStudentId();
  let changed = false;
  (db.notifications||[]).forEach(n=>{
    if(n.to!=="parent" || n.read) return;
    if(n.studentId && sid && n.studentId!==sid) return;
    n.read = true;
    changed = true;
  });
  if(changed) saveDb();
}
function mark(v){
  const n = Number(v)||1;
  if(n>=9) return "v10";
  if(n>=7) return "v8";
  if(n>=5) return "v6";
  if(n>=3) return "v4";
  return "v2";
}

function toast(t){
  let el = document.querySelector(".toast");
  if(!el){ el = document.createElement("div"); el.className="toast"; document.querySelector(".phone").appendChild(el); }
  el.textContent = t;
  el.classList.add("show");
  clearTimeout(toastTimer);
  toastTimer = setTimeout(()=>el.classList.remove("show"), 2400);
}

function playSound(){
  if(!db.settings.sound) return;
  try{
    const ctx = new (window.AudioContext||window.webkitAudioContext)();
    const o = ctx.createOscillator(), g = ctx.createGain();
    o.frequency.value = 880; o.type="sine";
    g.gain.setValueAtTime(.08, ctx.currentTime);
    g.gain.exponentialRampToValueAtTime(.001, ctx.currentTime+.2);
    o.connect(g); g.connect(ctx.destination); o.start(); o.stop(ctx.currentTime+.22);
  }catch(e){}
}

function savedRole(){
  try{
    const r = localStorage.getItem("sd.role") || sessionStorage.getItem("sd.role");
    return r === "student" || r === "parent" ? r : "";
  }catch(e){ return ""; }
}
function rememberRole(r){
  try{
    localStorage.setItem("sd.role", r);
    sessionStorage.setItem("sd.role", r);
  }catch(e){}
}
function rememberUser(u){
  if(!u) return;
  rememberRole(u.role);
  try{
    localStorage.setItem("sd.userId", u.id);
    if(u.role==="student") localStorage.setItem("sd.studentId", u.id);
    if(u.role==="parent") localStorage.setItem("sd.parentId", u.id);
  }catch(e){}
  setSessionReady(true);
}
function savedAccount(r){
  try{
    const key = r==="parent" ? "sd.parentId" : "sd.studentId";
    const id = localStorage.getItem(key) || "";
    if(!id) return null;
    return (db.users||[]).find(x => x.id===id && x.role===r) || null;
  }catch(e){ return null; }
}
function forgetRole(r){
  try{
    if(r==="student") localStorage.removeItem("sd.studentId");
    if(r==="parent") localStorage.removeItem("sd.parentId");
  }catch(e){}
}
function clearSession(){
  try{
    localStorage.removeItem("sd.role");
    sessionStorage.removeItem("sd.role");
    localStorage.removeItem("sd.userId");
  }catch(e){}
  setSessionReady(false);
}
function hideAllScreens(){
  ["login","auth","register","app"].forEach(id=>{
    const el = document.getElementById(id);
    if(el) el.classList.add("hidden");
  });
  document.documentElement.classList.remove("remembered");
}
function login(r){
  if(r!=="student" && r!=="parent") return;
  pendingChild = null;
  pendingStudentCode = null;
  role = r;
  selectedDay = selectedDay || todayDayId();
  const known = savedAccount(r);
  if(known){
    applyAccount(known);
    rememberUser(known);
    saveDb();
    enterApp();
    return;
  }
  hideAllScreens();
  showAuth();
}
function showAuth(){
  hideAllScreens();
  document.getElementById("login").classList.add("hidden");
  const el = document.getElementById("auth");
  el.classList.remove("hidden");
  el.className = "screen app-screen "+(role==="student"?"student":"parent");
  document.getElementById("authTop").innerHTML = `<button class="back" onclick="backToLogin()">${ico("back")}</button><div><h2>Даромад</h2><small>${role==="student"?"Хонанда":"Падар"}</small></div>`;
  if(role==="parent"){
    document.getElementById("authContent").innerHTML = `
      <div class="card">
        <h3>Рамзи хонанда</h3>
        <p class="hint">Рамзро аз саҳифаи фарзанд гирифта, ҳамин ҷо нависед.</p>
        <label>Рамз</label>
        <input class="field" id="aCode" placeholder="масалан 482917" inputmode="numeric" autocomplete="off" onkeydown="if(event.key==='Enter')loginWithCode()">
        <button type="button" class="add-btn" onclick="loginWithCode()">Даромадан</button>
      </div>
    `;
    return;
  }
  const newCode = pendingStudentCode;
  document.getElementById("authContent").innerHTML = `
    <div class="card">
      <h3>Рамзи шумо</h3>
      ${newCode
        ? `<p class="hint">Бақайдгирӣ шуд. Ҳамин рамзро поён нависед ва дароед. Ба падар ҳам диҳед.</p>
           <div class="user-code">${esc(newCode)}</div>`
        : `<p class="hint">Агар аллакай бақайд гирифта бошед, рамзи худро нависед.</p>`}
      <label>Рамз</label>
      <input class="field" id="aCode" placeholder="масалан 482917" inputmode="numeric" autocomplete="off" onkeydown="if(event.key==='Enter')loginWithCode()">
      <button type="button" class="add-btn" onclick="loginWithCode()">Даромадан</button>
    </div>
    ${newCode?"":`<button type="button" class="out-btn" onclick="goRegister()">Нав ҳастам — бақайдгирӣ</button>`}
  `;
}
function loginWithCode(){
  const typed = val("aCode");
  if(!normalizeCode(typed)){ toast("Рамзро нависед."); return; }
  if(role==="student"){
    const u = findUserByCode(typed, "student");
    if(!u){ toast("Рамз нодуруст аст."); return; }
    pendingStudentCode = null;
    applyAccount(u);
    rememberUser(u);
    saveDb();
    enterApp();
    return;
  }
  const child = findUserByCode(typed, "student");
  if(!child){ toast("Рамзи хонанда нодуруст аст. Онро аз саҳифаи фарзанд гиред."); return; }
  if(!Array.isArray(db.users)) db.users = [];
  let parent = db.users.find(u => u.role==="parent" && (u.childId===child.id || normalizeCode(u.childCode)===normalizeCode(child.code)));
  if(!parent){
    parent = {
      id: uid(), role:"parent", registered:true, name:"Падар",
      childName: personName(child) || child.name,
      childCode: child.code,
      childId: child.id
    };
    db.users.push(parent);
  }else{
    parent.childId = child.id;
    parent.childCode = child.code;
  }
  pendingChild = null;
  applyAccount(parent);
  rememberUser(parent);
  saveDb();
  enterApp();
}
function goRegister(){
  if(role==="parent"){
    toast("Аввал рамзи хонандаро нависед.");
    return;
  }
  pendingChild = null;
  pendingStudentCode = null;
  showRegister();
}
function enterApp(){
  editingProfile = false;
  page = role==="student" ? "grades" : "home";
  const u = activeUser();
  if(u) rememberUser(u);
  document.documentElement.classList.add("remembered");
  document.getElementById("register").classList.add("hidden");
  document.getElementById("auth").classList.add("hidden");
  document.getElementById("login").classList.add("hidden");
  const app = document.getElementById("app");
  app.classList.remove("hidden");
  app.className = "screen app-screen "+(role==="student"?"student":"parent");
  applyDark();
  if(role==="parent") markParentNotesSeen();
  render();
}
function logout(){
  editingProfile = false;
  pendingChild = null;
  pendingStudentCode = null;
  db.grades = [];
  db.notifications = [];
  db.childId = "";
  db.activeId = "";
  clearSession();
  hideAllScreens();
  startLogin();
}
function switchAccount(){
  const r = role;
  forgetRole(r);
  logout();
  login(r);
}
function showRegister(){
  if(role==="parent"){
    showAuth();
    return;
  }
  document.getElementById("login").classList.add("hidden");
  document.getElementById("app").classList.add("hidden");
  const auth = document.getElementById("auth");
  if(auth) auth.classList.add("hidden");
  const reg = document.getElementById("register");
  reg.classList.remove("hidden");
  reg.className = "screen app-screen "+(role==="student"?"student":"parent");
  document.getElementById("regTop").innerHTML = registerTopHTML();
  document.getElementById("regContent").innerHTML = registerFormHTML();
}
function registerTopHTML(){
  const back = editingProfile
    ? `<button class="back" onclick="cancelRegister()">${ico("back")}</button>`
    : `<button class="back" onclick="backToLogin()">${ico("back")}</button>`;
  return `${back}<div><h2>${editingProfile?"Таҳрири маълумот":"Бақайдгирӣ"}</h2><small>${role==="student"?"Хонанда":"Падар"}</small></div>`;
}
function registerFormHTML(){
  const s = db.student || {};
  return `
    <div class="card" style="text-align:center">
      <div class="ava" style="width:86px;height:86px;border-radius:50%;overflow:hidden;margin:0 auto 8px">${avatar("student")}</div>
      <h3>Маълумоти хонанда</h3>
      <p class="hint">Ном, насаб ва синфро нависед. Рамз худ сохта мешавад — онро навишта дароед.</p>
    </div>
    <div class="card">
      <label>Ном</label>
      <input class="field" id="rName" value="${esc(s.name)}" placeholder="Номи худро нависед">
      <label>Насаб</label>
      <input class="field" id="rSurname" value="${esc(s.surname)}" placeholder="Насаби худро нависед">
      <label>Синф</label>
      <input class="field" id="rKlass" value="${esc(s.klass)}" placeholder="масалан 10е">
      <button type="button" class="add-btn" onclick="saveRegister()">${ico("plus")} Сабт кардан</button>
    </div>
  `;
}
function val(id){
  const el = document.getElementById(id);
  return el ? String(el.value||"").trim() : "";
}
function saveRegister(){
  const name = val("rName");
  const surname = val("rSurname");
  if(name.length < 2){ toast("Номро нависед."); return; }
  if(role==="student"){
    const klass = val("rKlass");
    if(!klass){ toast("Синфро нависед."); return; }
    if(editingProfile){
      db.student = { ...(db.student||{}), name, surname, klass, registered:true };
      saveDb();
      toast("Маълумот сабт шуд.");
      editingProfile = false;
      page = "profile";
      document.getElementById("register").classList.add("hidden");
      const app = document.getElementById("app");
      app.classList.remove("hidden");
      app.className = "screen app-screen student";
      render();
      return;
    }
    if(!Array.isArray(db.users)) db.users = [];
    const code = uniqueCode("student");
    const user = {
      id: uid(), role:"student", code, registered:true,
      name, surname, klass,
      grades:[], schedule: emptySchedule(), notifications:[]
    };
    db.users.push(user);
    saveDb();
    pendingStudentCode = code;
    showAuth();
    toast("Рамзро нависед ва дароед.");
    return;
  }
  toast("Аввал рамзи хонандаро нависед.");
}
function showCodeReveal(code){
  document.getElementById("register").classList.add("hidden");
  const el = document.getElementById("auth");
  el.classList.remove("hidden");
  el.className = "screen app-screen "+(role==="student"?"student":"parent");
  document.getElementById("authTop").innerHTML = `<div><h2>Рамзи шумо</h2><small>Инро нигоҳ доред</small></div>`;
  document.getElementById("authContent").innerHTML = `
    <div class="card" style="text-align:center">
      <h3>Бақайдгирӣ шуд</h3>
      <p class="hint">Ин рамзро ба падар диҳед. Ҳар хонандаи нав рамзи нав мегирад.</p>
      <div class="user-code">${esc(code)}</div>
      <button type="button" class="out-btn" onclick="copyUserCode()">Нусха бардоштан</button>
      <button type="button" class="add-btn" onclick="enterApp()">Даромадан</button>
    </div>
  `;
}
function copyUserCode(){
  const code = pendingStudentCode || studentCode();
  if(!code){ toast("Рамз ёфт нашуд."); return; }
  if(navigator.clipboard && navigator.clipboard.writeText){
    navigator.clipboard.writeText(code).then(()=>toast("Рамз нусха шуд.")).catch(()=>toast(code));
  }else toast(code);
}
function editProfile(){
  if(role==="parent") return;
  editingProfile = true;
  showRegister();
}
function cancelRegister(){
  editingProfile = false;
  document.getElementById("register").classList.add("hidden");
  document.getElementById("app").classList.remove("hidden");
  render();
}
function backToLogin(){
  editingProfile = false;
  pendingChild = null;
  pendingStudentCode = null;
  startLogin();
}

function applyDark(){
  document.documentElement.classList.toggle("dark", !!db.settings.dark);
}

function go(p){ page = p; render(); }

function render(){
  if(role==="parent") markParentNotesSeen();
  const top = document.getElementById("topbar");
  top.className = "top";
  top.innerHTML = topHTML();
  document.getElementById("content").innerHTML = contentHTML();
  document.getElementById("tabbar").innerHTML = tabHTML();
}

function bindUi(){
  const content = document.getElementById("content");
  if(!content || content.dataset.bound) return;
  content.dataset.bound = "1";
  content.addEventListener("click", function(e){
    const btn = e.target.closest("[data-del-grade]");
    if(!btn) return;
    e.preventDefault();
    e.stopPropagation();
    deleteGrade(btn.getAttribute("data-del-grade"));
  });
}

function topHTML(){
  if(role==="student"){
    if(page==="list") return `<button class="back" onclick="go('grades')">${ico("back")}</button><div><h2>Баҳоҳои ман</h2></div>`;
    if(page==="profile") return `<h2>Профил</h2>`;
    if(page==="schedule") return `<span class="top-ico">${ico("cal")}</span><div><h2>Ҷадвали дарсҳо</h2><small>Тартиби дарсҳои имрӯз</small></div>`;
    return `<div class="who"><div class="ava">${avatar("student")}</div><div class="who-txt"><h2>${esc(studentName())}</h2><small>${ico("cap")} ${esc(klassLabel() || "Хонанда")}</small></div></div>`;
  }
  if(page==="all") return `<button class="back" onclick="go('home')">${ico("back")}</button><div><h2>Ҳамаи баҳоҳо</h2></div>`;
  if(page==="profile") return `<h2>Профил</h2>`;
  if(page==="schedule") return `<span class="top-ico">${ico("cal")}</span><div><h2>Ҷадвали дарсҳо</h2><small>Тартиби дарсҳои фарзанд</small></div>`;
  return `<div class="who"><div class="ava">${avatar("parent")}</div><div class="who-txt"><h2>${esc(parentName())}</h2><small>${ico("user")} Падари ${esc(childName())}${klassLabel()?" · "+klassLabel():""}</small></div></div>`;
}

function tabHTML(){
  if(role==="student"){
    return `
      <button class="tab ${page==="grades"||page==="list"?"on":""}" onclick="go('grades')">${ico("grades")}<span>Баҳо</span></button>
      <button class="tab ${page==="schedule"?"on":""}" onclick="go('schedule')">${ico("cal")}<span>Ҷадвал</span></button>
      <button class="tab ${page==="profile"?"on":""}" onclick="go('profile')">${ico("user")}<span>Профил</span></button>`;
  }
  const n = unread();
  return `
    <button class="tab ${page==="home"||page==="all"?"on":""}" onclick="go('home')" style="position:relative">
      ${ico("home")}<span>Асосӣ</span>${n?`<b class="badge">${n}</b>`:""}
    </button>
    <button class="tab ${page==="schedule"?"on":""}" onclick="go('schedule')">${ico("cal")}<span>Ҷадвал</span></button>
    <button class="tab ${page==="profile"?"on":""}" onclick="go('profile')">${ico("user")}<span>Профил</span></button>`;
}

function gradeList(limit){
  const list = visibleGrades().slice(0, limit||99);
  if(!list.length) return `<p class="empty">Ҳоло баҳо нест. Аввал фанро нависед ва баҳо гузоред.</p>`;
  return list.map(g=>`
    <div class="g-row">
      ${subjectIco(g.subject)}
      <div><b>${esc(g.subject)}</b><span>${fmtDot(g.date)}</span></div>
      <span class="mark ${mark(g.value)}">${g.value}</span>
      ${role==="student"?`<button type="button" class="del" data-del-grade="${esc(g.id)}" aria-label="Нест кардан">${ico("trash")}</button>`:""}
    </div>
  `).join("");
}

function contentHTML(){
  if(role==="student"){
    if(page==="profile") return studentProfile();
    if(page==="list") return `${progressCard()}<div class="card">${gradeList()}</div>`;
    if(page==="schedule") return schedulePage(true);
    return studentHome();
  }
  if(page==="profile") return parentProfile();
  if(page==="all") return `${progressCard()}<div class="card">${gradeList()}</div>`;
  if(page==="schedule") return schedulePage(false);
  return parentHome();
}

function schedulePage(editable){
  ensureSchedule();
  selectedDay = selectedDay || todayDayId();
  const day = DAYS.find(d=>d.id===selectedDay) || DAYS[0];
  const lessons = db.schedule[day.id] || [];
  const hints = subjectHints();
  const filled = lessons.filter(s=>String(s).trim()).length;
  const chips = DAYS.map(d=>`
    <button class="day ${d.id===day.id?"on":""}" onclick="pickDay('${d.id}')">
      ${d.short}<small>${(db.schedule[d.id]||[]).filter(s=>String(s).trim()).length}</small>
    </button>
  `).join("");
  const rows = lessons.length ? lessons.map((s,i)=>{
    const name = String(s).trim();
    const g = name ? lastGrade(name) : null;
    return `
    <div class="lesson">
      <span class="num">${i+1}</span>
      ${editable
        ? `<input class="field" list="subHints" value="${esc(s)}" placeholder="Номи фанро нависед" oninput="setLesson(${i}, this.value)">`
        : `<div class="view-sub">${name?subjectIco(name)+esc(name):'<span style="color:var(--muted)">Фан гузошта нашудааст</span>'}</div>`}
      ${editable
        ? `<button type="button" class="gmini ${g?"has "+mark(g.value):""}" onclick="openGradeSheetFromRow(${i})" title="Баҳо гузоштан">${g?g.value:"+"}</button>
           <button type="button" class="del" onclick="removeLesson(${i})" aria-label="Нест кардан">${ico("minus")}</button>`
        : (g?`<span class="mark ${mark(g.value)}">${g.value}</span>`:"")}
    </div>`;
  }).join("") : "";
  const empty = !filled ? `
    <div class="sched-empty">
      ${ico("book")}
      <b>Ҳанӯз дарсҳо илова нашудаанд</b>
      <span>Аввалин дарсро илова кунед</span>
    </div>` : "";
  const when = day.id===todayDayId() ? "Имрӯз" : day.name;

  return `
    <div class="days">${chips}</div>
    <div class="card day-card">
      <div class="day-head">
        <h3 class="card-title">${ico("book")} ${esc(day.name)}</h3>
        <p class="hint ico-lab">${ico("cal")} ${esc(when)}: ${filled} дарс</p>
        <p class="quote">«Баъди ҳар як дарс – қадами нав ба сӯи муваффақият!»</p>
      </div>
      ${editable?`
      <h3 class="card-title add-lesson-h">${ico("plus")} Иловаи дарс</h3>
      <label>Фан</label>
      <input class="field" id="newLesson" list="subHints" placeholder="Номи фанро нависед" onkeydown="if(event.key==='Enter')addNamedLesson()">
      <datalist id="subHints">${hints.map(n=>`<option value="${esc(n)}">`).join("")}</datalist>
      <label>Шумораи дарсҳо</label>
      <div class="count-row">
        <button class="count-btn" onclick="setLessonCount(${lessons.length-1})">−</button>
        <b>${lessons.length}</b>
        <button class="count-btn" onclick="setLessonCount(${lessons.length+1})">+</button>
      </div>
      <button type="button" class="add-btn" onclick="addNamedLesson()">${ico("plus")} Илова кардан</button>
      `:""}
      ${rows}
      ${empty}
    </div>
  `;
}

function pickDay(id){
  selectedDay = id;
  render();
}
function setLesson(i, v){
  ensureSchedule();
  db.schedule[selectedDay][i] = v;
  saveDb();
}
function addLesson(){
  ensureSchedule();
  db.schedule[selectedDay].push("");
  saveDb();
  render();
}
function addNamedLesson(){
  const name = val("newLesson");
  if(!name){ toast("Номи фанро нависед."); return; }
  ensureSchedule();
  const arr = db.schedule[selectedDay];
  const empty = arr.findIndex(s => !String(s).trim());
  if(empty >= 0) arr[empty] = name;
  else arr.push(name);
  saveDb();
  render();
}
function removeLesson(i){
  ensureSchedule();
  db.schedule[selectedDay].splice(i,1);
  saveDb();
  render();
}
function setLessonCount(n){
  n = Math.max(0, Math.min(12, Number(n)||0));
  ensureSchedule();
  const arr = db.schedule[selectedDay];
  while(arr.length < n) arr.push("");
  while(arr.length > n) arr.pop();
  saveDb();
  render();
}

function studentHome(){
  const names = subjectHints();
  return `
    <div class="card copy-card">
      <p class="hint copy-hint">${ico("book")} Падар ҳамин рамзро навишта даромада метавонад.</p>
      <button type="button" class="add-btn copy-pill" onclick="copyUserCode()">${ico("user")} Нусха бардоштан</button>
    </div>
    <div class="card">
      <h3 class="card-title">${ico("grades")} Иловаи баҳо</h3>
      ${names.length?`<div class="sub-chips">${names.map(n=>`<button type="button" class="chip ${chosenSubject===n?"on":""}" data-n="${esc(n)}" onclick="chooseSubject(this.dataset.n)">${esc(n)}</button>`).join("")}</div>`:""}
      <label class="ico-lab">${ico("book")} Фан</label>
      <input class="field" id="fSubject" list="subHints" value="${esc(chosenSubject)}" placeholder="Номи фанро нависед">
      <datalist id="subHints">${names.map(n=>`<option value="${esc(n)}">`).join("")}</datalist>
      <label class="ico-lab">${ico("grades")} Баҳо (1-10)</label>
      <div class="grades-pick">
        ${[1,2,3,4,5,6,7,8,9,10].map(v=>`<button type="button" class="gbtn ${selected===v?"on":""}" data-v="${v}" onclick="pick(${v})">${v}</button>`).join("")}
      </div>
      <button type="button" class="add-btn" onclick="saveGrade()">${ico("plus")} Баҳо гузоштан</button>
      <label class="ico-lab">${ico("cal")} Сана</label>
      <input class="field" id="fDate" type="date" value="${todayISO()}">
    </div>
    ${progressCard()}
    <div class="list-h"><h3>Баҳоҳои ман</h3><button type="button" class="link" onclick="go('list')">Ҳама →</button></div>
    <div class="card">${gradeList(4)}</div>
  `;
}

function studentCode(){
  const u = role==="student" ? activeUser() : null;
  let code = (u && u.code) || (db.student && db.student.code) || "";
  if(role==="student" && !/^\d{6}$/.test(normalizeCode(code))){
    code = uniqueCode("student");
    if(u) u.code = code;
    if(db.student) db.student.code = code;
    saveDb();
  }
  return code;
}
function codeCard(){
  if(role!=="student") return "";
  const code = studentCode();
  if(!code) return "";
  return `
    <div class="card" style="text-align:center">
      <small style="color:var(--muted);font-weight:700">Рамзи шумо — ба падар диҳед</small>
      <div class="user-code">${esc(code)}</div>
      <p class="hint">Падар ҳамин рамзро навишта даромада метавонад.</p>
      <button type="button" class="out-btn" style="margin-top:8px" onclick="copyUserCode()">Нусха бардоштан</button>
    </div>
  `;
}
function studentProfile(){
  const a = avg();
  return `
    <div class="card" style="text-align:center">
      <div class="ava" style="width:86px;height:86px;border-radius:50%;overflow:hidden;margin:0 auto 8px">${avatar("student")}</div>
      <h3>${esc(studentName())}</h3>
      <p style="color:var(--muted)">${esc(klassLabel() || "Хонанда")}</p>
    </div>
    ${codeCard()}
    <div class="avg-card">
      <div><small>Миёнаи баҳо</small><b>${a?a.toFixed(1):"—"} ⭐</b></div>
    </div>
    <div class="card">
      <button class="menu-item" onclick="openAbout()"><span class="mic">${ico("info")}</span> Дар бораи барнома</button>
    </div>
    <button class="out-btn" onclick="logout()">${ico("out")} Баромадан</button>
    <button class="switch-acc" onclick="switchAccount()">Ҳисобро иваз кунам</button>
  `;
}

function parentHome(){
  const last = visibleGrades()[0];
  const a = avg();
  const n = unread();
  const day = DAYS.find(d=>d.id===todayDayId()) || DAYS[0];
  ensureSchedule();
  const lessons = (db.schedule[day.id]||[]).map(s=>String(s).trim()).filter(Boolean);
  const notes = visibleNotes().filter(x=>x.to==="parent").slice(0,6);
  const linked = role==="parent" ? linkedStudent(activeUser()) : true;
  if(role==="parent" && !linked){
    return `<div class="card"><p class="empty">Фарзанд пайваст нашудааст. Рамзи хонандаи худро дуруст ворид кунед.</p></div>`;
  }
  return `
    <div class="stats">
      <div class="stat"><small>Фарзанд</small><b>${esc(childName())}</b></div>
      <div class="stat"><small>Миёнаи баҳо</small><b>${a?a.toFixed(1):"—"}</b></div>
    </div>
    ${progressCard()}
    <div class="card">
      <div class="list-h" style="margin:0 0 10px"><h3>Ҷадвали имрӯз</h3><button class="link" onclick="go('schedule')">Ҷадвал →</button></div>
      <p class="hint" style="margin:0 0 8px">${day.name}</p>
      ${lessons.length
        ? `<div class="lessons-preview">${lessons.map((s,i)=>`<span class="chip">${i+1}. ${esc(s)}</span>`).join("")}</div>`
        : `<p class="empty" style="padding:8px 0">Ҳоло ҷадвал гузошта нашудааст.</p>`}
    </div>
    <div class="list-h"><h3>Баҳои охирин</h3></div>
    ${last?`<div class="latest">
      ${subjectIco(last.subject)}
      <div><b>${esc(last.subject)}</b><span>${fmtDot(last.date)}</span></div>
      <div class="val">${last.value}</div>
    </div>`:`<p class="empty">Ҳанӯз баҳо нест.</p>`}
    <div class="list-h"><h3>Баҳоҳои ${esc(childName())}</h3><button class="link" onclick="go('all')">Ҳама →</button></div>
    <div class="card">${gradeList(6)}</div>
    <div class="list-h"><h3>Огоҳномаҳо</h3>${n?`<span class="link">${n} нав</span>`:""}</div>
    <div class="card">
      ${notes.length ? notes.map(x=>`
        <button class="sms" onclick="openNotif('${x.id}', true)">
          ${subjectIco(x.subject)}
          <div>
            <b>Баҳои нав: ${esc(x.subject)} — ${esc(x.value)}</b>
            <span>${fmtDot(x.date)} · ${fmtTime(x.createdAt)}</span>
          </div>
          ${x.read?"":`<i class="dot"></i>`}
        </button>
      `).join("") : `<p class="empty" style="padding:8px 0">Ҳоло огоҳнома нест.</p>`}
    </div>
  `;
}

function parentProfile(){
  return `
    <div class="card" style="text-align:center">
      <div class="ava" style="width:86px;height:86px;border-radius:50%;overflow:hidden;margin:0 auto 8px">${avatar("parent")}</div>
      <h3>${esc(parentName())}</h3>
      <p style="color:var(--muted)">Падари ${esc(childName())}</p>
    </div>
    <div class="card">
      <button class="menu-item" onclick="openAbout()"><span class="mic">${ico("info")}</span> Дар бораи барнома</button>
    </div>
    <button class="out-btn" onclick="logout()">${ico("out")} Баромадан</button>
    <button class="switch-acc" onclick="switchAccount()">Ҳисобро иваз кунам</button>
  `;
}

function pick(v){
  selected = v;
  document.querySelectorAll(".gbtn").forEach(b=>b.classList.toggle("on", Number(b.dataset.v)===v));
}
function chooseSubject(name){
  chosenSubject = String(name||"");
  const el = document.getElementById("fSubject");
  if(el) el.value = chosenSubject;
  document.querySelectorAll(".sub-chips .chip").forEach(b=>b.classList.toggle("on", b.dataset.n===chosenSubject));
}

function deleteGrade(id){
  if(role!=="student"){ toast("Танҳо хонанда баҳоро нест мекунад."); return; }
  id = String(id||"");
  if(!id){ toast("Баҳо ёфт нашуд."); return; }
  const sid = ownerStudentId();
  const idx = db.grades.findIndex(x=>String(x.id)===id && (!x.studentId || x.studentId===sid));
  if(idx < 0){ toast("Баҳо ёфт нашуд."); return; }
  const g = db.grades[idx];
  db.grades.splice(idx, 1);
  db.notifications = (db.notifications||[]).filter(n=>n.createdAt!==g.createdAt || n.studentId!==sid);
  saveDb();
  toast("Баҳо нест шуд.");
  render();
}
window.deleteGrade = deleteGrade;

function addGrade(subject, value, date){
  if(role!=="student"){ toast("Танҳо хонанда баҳо мегузорад."); return false; }
  const sid = ownerStudentId();
  if(!sid || sid !== db.activeId){ toast("Ҳисоб нодуруст аст."); return false; }
  subject = String(subject||"").trim();
  value = Number(value);
  if(!subject){ toast("Аввал номи фанро нависед."); return false; }
  if(!(value>=1 && value<=10)){ toast("Баҳоро аз 1 то 10 интихоб кунед."); return false; }
  date = date || todayISO();
  const grade = { id:uid(), studentId:sid, subject, value, date, createdAt:new Date().toISOString() };
  if(!Array.isArray(db.grades)) db.grades = [];
  db.grades.unshift(grade);
  if(!Array.isArray(db.notifications)) db.notifications = [];
  db.notifications.unshift({
    id: uid(),
    studentId: sid,
    to:"parent",
    read:false,
    createdAt: grade.createdAt,
    studentName: studentName(),
    subject, value, date
  });
  saveDb();
  playSound();
  toast("Баҳо сабт шуд. Падари шумо огоҳ шуд.");
  chosenSubject = subject;
  selected = 10;
  return true;
}

function saveGrade(){
  const subEl = document.getElementById("fSubject");
  const dateEl = document.getElementById("fDate");
  const subject = ((subEl && subEl.value) || chosenSubject || "").trim();
  if(addGrade(subject, selected, dateEl && dateEl.value)) render();
}

function openGradeSheetFromRow(i){
  ensureSchedule();
  const name = String((db.schedule[selectedDay]||[])[i]||"").trim();
  if(!name){ toast("Аввал номи фанро нависед."); return; }
  openGradeSheet(name);
}
function openGradeSheet(subject){
  gradeSheetSubject = String(subject||"").trim();
  if(!gradeSheetSubject){ toast("Аввал номи фанро нависед."); return; }
  selected = 10;
  document.getElementById("gradeSheet").innerHTML = `
    <h3>Баҳо гузоштан</h3>
    <p>Фан: <b>${esc(gradeSheetSubject)}</b></p>
    <div class="grades-pick">
      ${[1,2,3,4,5,6,7,8,9,10].map(v=>`<button type="button" class="gbtn ${selected===v?"on":""}" data-v="${v}" onclick="pick(${v})">${v}</button>`).join("")}
    </div>
    <button type="button" class="add-btn" onclick="saveSheetGrade()">${ico("plus")} Баҳо гузоштан</button>
  `;
  document.getElementById("gradeOverlay").classList.remove("hidden");
}
function saveSheetGrade(){
  if(addGrade(gradeSheetSubject, selected, todayISO())){
    closeGradeSheet();
    render();
  }
}
function closeGradeSheet(){
  document.getElementById("gradeOverlay").classList.add("hidden");
  gradeSheetSubject = "";
}

function openLatestNotif(){
  const n = visibleNotes().find(x=>x.to==="parent" && !x.read) || visibleNotes()[0];
  if(n) openNotif(n.id, true);
}
function openNotif(id, markRead){
  const n = visibleNotes().find(x=>x.id===id);
  if(!n) return;
  if(n.studentId && n.studentId !== ownerStudentId()) return;
  currentNotifId = id;
  if(markRead!==false && !n.read){ n.read = true; saveDb(); }
  document.getElementById("notifCard").innerHTML = `
    <div class="who">
      ${subjectIco(n.subject)}
      <div>
        <small>Рӯзномаи мактабӣ · ${fmtTime(n.createdAt)}</small>
        <p><b>Баҳои нав!</b><br>${esc(n.studentName || childName())} аз фанни ${esc(n.subject)} — ${esc(n.value)} гирифт.</p>
      </div>
    </div>
  `;
  document.getElementById("notifOverlay").classList.remove("hidden");
  if(markRead!==false) render();
}
function closeNotif(){
  if(currentNotifId){
    const n = db.notifications.find(x=>x.id===currentNotifId);
    if(n && !n.read){ n.read = true; saveDb(); }
    currentNotifId = null;
  }
  document.getElementById("notifOverlay").classList.add("hidden");
  render();
}

function toggleDark(){
  db.settings.dark = !db.settings.dark;
  saveDb(); applyDark(); render();
}
function openAbout(){ document.getElementById("aboutOverlay").classList.remove("hidden"); }
function closeAbout(){ document.getElementById("aboutOverlay").classList.add("hidden"); }

function startLogin(){
  ["register","auth","app"].forEach(id=>{
    const el = document.getElementById(id);
    if(el) el.classList.add("hidden");
  });
  document.getElementById("login").classList.remove("hidden");
  placeLoginHits();
}

function heroBox(img){
  const nw = img.naturalWidth || 682, nh = img.naturalHeight || 1024;
  const rw = img.clientWidth, rh = img.clientHeight;
  const scale = Math.max(rw/nw, rh/nh);
  const w = nw * scale, h = nh * scale;
  return { left:(rw-w)/2, top:(rh-h)/2, w, h };
}
function placeLoginHits(){
  const img = document.querySelector(".login-hero");
  const s = document.getElementById("btnStudent");
  const p = document.getElementById("btnParent");
  if(!img || !s || !p || !img.clientWidth) return;
  const box = heroBox(img);
  const put = (el, x0, y0, x1, y1)=>{
    el.style.left = (box.left + box.w * x0) + "px";
    el.style.top = (box.top + box.h * y0) + "px";
    el.style.width = (box.w * (x1 - x0)) + "px";
    el.style.height = (box.h * (y1 - y0)) + "px";
    el.classList.add("ready");
  };
  put(s, 0.175, 0.602, 0.825, 0.668);
  put(p, 0.175, 0.682, 0.825, 0.748);
}
function tapLoginFromHero(e){
  const img = e.currentTarget;
  const box = heroBox(img);
  const r = img.getBoundingClientRect();
  const x = (e.clientX - r.left - box.left) / box.w;
  const y = (e.clientY - r.top - box.top) / box.h;
  if(x < 0.12 || x > 0.88) return;
  if(y >= 0.58 && y < 0.675) login("student");
  else if(y >= 0.675 && y < 0.78) login("parent");
}
function bindLogin(){
  const img = document.querySelector(".login-hero");
  const s = document.getElementById("btnStudent");
  const p = document.getElementById("btnParent");
  if(s) s.addEventListener("click", function(e){ e.preventDefault(); login("student"); });
  if(p) p.addEventListener("click", function(e){ e.preventDefault(); login("parent"); });
  if(img){
    img.addEventListener("click", tapLoginFromHero);
    img.addEventListener("load", placeLoginHits);
  }
  window.addEventListener("resize", placeLoginHits);
  placeLoginHits();
}

function boot(){
  db = loadDb();
  if(ensureNumericCodes()) saveDb();
  ensureSchedule();
  selectedDay = todayDayId();
  applyDark();
  bindUi();
  bindLogin();
  let userId = "", ready = "";
  try{
    userId = localStorage.getItem("sd.userId") || "";
    ready = localStorage.getItem("sd.ready") || "";
  }catch(e){}
  const u = userId && (db.users||[]).find(x => x.id===userId);
  if(u && ready==="1"){
    applyAccount(u);
    rememberUser(u);
    enterApp();
    return;
  }
  const r = savedRole();
  const known = (r && savedAccount(r)) || savedAccount("student") || savedAccount("parent");
  if(known){
    applyAccount(known);
    rememberUser(known);
    enterApp();
    return;
  }
  const migrated = ready==="1" && r && (db.users||[]).find(x => x.role===r);
  if(migrated){
    applyAccount(migrated);
    rememberUser(migrated);
    enterApp();
    return;
  }
  startLogin();
}
boot();

