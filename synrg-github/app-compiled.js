 function _optionalChain(ops) { let lastAccessLHS = undefined; let value = ops[0]; let i = 1; while (i < ops.length) { const op = ops[i]; const fn = ops[i + 1]; i += 2; if ((op === 'optionalAccess' || op === 'optionalCall') && value == null) { return undefined; } if (op === 'access' || op === 'optionalAccess') { lastAccessLHS = value; value = fn(value); } else if (op === 'call' || op === 'optionalCall') { value = fn((...args) => value.call(lastAccessLHS, ...args)); lastAccessLHS = undefined; } } return value; }const { useMemo, useState, useEffect, useCallback } = React;
function useIsMobile() {
  const [m,setM]=useState(()=>window.innerWidth<640)
  useEffect(()=>{
    const h=()=>setM(window.innerWidth<640)
    window.addEventListener("resize",h)
    return ()=>window.removeEventListener("resize",h)
  },[])
  return m
}

// ─── Persistent Storage DB (localStorage) ───────────────────
function uuid() { return crypto.randomUUID ? crypto.randomUUID() : Math.random().toString(36).slice(2)+Date.now().toString(36) }

const DB = {
  async get(key) {
    try { const v = localStorage.getItem(key); return v ? JSON.parse(v) : null } catch(e) { return null }
  },
  async set(key, val) {
    try { localStorage.setItem(key, JSON.stringify(val)) } catch(e) { console.error("storage set error",e) }
  },
  async del(key) {
    try { localStorage.removeItem(key) } catch(e) {}
  },
  async listKeys(prefix) {
    try {
      const keys = []
      for(let i=0;i<localStorage.length;i++){const k=localStorage.key(i);if(k&&k.startsWith(prefix))keys.push(k)}
      return keys
    } catch(e) { return [] }
  },

  // Table operations
  async selectAll(table) {
    const keys = await this.listKeys(table+":")
    const rows = await Promise.all(keys.map(k=>this.get(k)))
    return rows.filter(Boolean)
  },
  async insert(table, row) {
    const id = uuid()
    const record = {...row, id, created_at: new Date().toISOString()}
    await this.set(table+":"+id, record)
    return record
  },
  async update(table, id, patch) {
    const row = await this.get(table+":"+id)
    if(!row) return null
    const updated = {...row, ...patch}
    await this.set(table+":"+id, updated)
    return updated
  },
  async upsertByFields(table, row, matchFields) {
    const all = await this.selectAll(table)
    const existing = all.find(r => matchFields.every(f => r[f]===row[f]))
    if(existing) {
      return this.update(table, existing.id, row)
    } else {
      return this.insert(table, row)
    }
  },
  async deleteById(table, id) {
    await this.del(table+":"+id)
  },
  async findWhere(table, field, value) {
    const all = await this.selectAll(table)
    return all.filter(r => r[field]===value)
  },

  // Seed initial data if empty
  async seedIfEmpty() {
    const coaches = await this.selectAll("coaches")
    if(coaches.length === 0) {
      await Promise.all([
        this.insert("coaches", {name:"Елина", password:"1111"}),
        this.insert("coaches", {name:"Никола", password:"1111"}),
        this.insert("coaches", {name:"Ицко", password:"1111"}),
        this.insert("coaches", {name:"Алекс", password:"1111"}),
      ])
    }
  }
}

function todayDate() {
  const d = new Date()
  return `${String(d.getDate()).padStart(2,"0")}.${String(d.getMonth()+1).padStart(2,"0")}.${d.getFullYear()}`
}
function dateToInput(s) {
  const p = String(s||"").split(".")
  if (p.length !== 3) return ""
  return `${p[2]}-${p[1]}-${p[0]}`
}
function inputToDate(v) {
  if (!v) return todayDate()
  const [y,m,d] = v.split("-")
  return `${d}.${m}.${y}`
}
function parseDate(s) {
  const [d,m,y] = String(s||"").split(".").map(Number)
  return new Date(y,(m||1)-1,d||1)
}
function fmt1(v) {
  if (v===null||v===undefined||isNaN(v)) return "—"
  return Number(v).toFixed(1)
}
function avgArr(nums) {
  if (!nums.length) return 0
  return nums.reduce((s,n)=>s+n,0)/nums.length
}
function sameDateStr(a,b) { return String(a||"")===String(b||"") }

function last30Days() {
  const arr=[], now=new Date()
  for(let i=29;i>=0;i--) {
    const d=new Date(now); d.setDate(now.getDate()-i)
    arr.push(`${String(d.getDate()).padStart(2,"0")}.${String(d.getMonth()+1).padStart(2,"0")}.${d.getFullYear()}`)
  }
  return arr
}

function computeRanking(clients) {
  const days = new Set(last30Days())
  return clients.map(c => {
    const weightPts = (c.weightLogs||[]).filter(w=>days.has(w.date)).length * 2
    const workoutPts = (c.workouts||[]).filter(w=>days.has(w.date)).length * 5
    const byDate = {}
    ;(c.meals||[]).forEach(m => {
      if (!days.has(m.date)) return
      if (!byDate[m.date]) byDate[m.date]={kcal:0,protein:0}
      byDate[m.date].kcal += Number(m.kcal||0)
      byDate[m.date].protein += Number(m.protein||0)
    })
    let calPts=0, protPts=0
    Object.values(byDate).forEach(day => {
      if (day.kcal>=(c.calorieTarget||99999)) calPts+=3
      if (day.protein>=(c.proteinTarget||99999)) protPts+=3
    })
    return { name:c.name, points:weightPts+workoutPts+calPts+protPts, breakdown:{weightPts,workoutPts,calPts,protPts} }
  }).sort((a,b)=>b.points-a.points)
}

const C = {
  bg:"#1A1918", sidebar:"#141312", card:"#1E1C1B", text:"#F4F4F3",
  muted:"#F4F4F3", primary:"#C4E9BF", border:"#2E2B2A",
  danger:"#FF6B9D", accentSoft:"rgba(196,233,191,0.15)",
  purple:"#F2F0FF", purpleSoft:"rgba(196,193,255,0.16)",
  blue:"#F2F0FF", orange:"#FFB3C6",
}

const inp = {
  background:"#141312", color:"#F4F4F3", border:`1px solid ${C.border}`, WebkitTextFillColor:"#F4F4F3",
  borderRadius:"10px", padding:"11px 14px", outline:"none",
  width:"100%", boxSizing:"border-box", fontSize:"14px", fontFamily:"inherit",
}
const btn = {
  background:C.primary, color:"#000000", border:"none",
  borderRadius:"10px", padding:"11px 18px", cursor:"pointer",
  fontWeight:700, fontSize:"14px", fontFamily:"inherit",
}
const btnGhost = {
  background:"transparent", color:C.text, border:`1px solid ${C.border}`,
  borderRadius:"10px", padding:"11px 18px", cursor:"pointer",
  fontWeight:600, fontSize:"14px", fontFamily:"inherit",
}
const btnDanger = {
  background:"rgba(213,90,143,0.13)", color:C.danger,
  border:`1px solid rgba(213,90,143,0.3)`, borderRadius:"8px",
  padding:"7px 12px", cursor:"pointer", fontWeight:600,
  fontSize:"13px", fontFamily:"inherit",
}

const foodDB = {
  "пилешко филе":{label:"Пилешко филе",kcal:165,protein:31},
  "пилешко бутче":{label:"Пилешко бутче",kcal:215,protein:18},
  "пилешки гърди":{label:"Пилешки гърди",kcal:165,protein:31},
  "пуешко филе":{label:"Пуешко филе",kcal:135,protein:29},
  "телешко бонфиле":{label:"Телешко бонфиле",kcal:187,protein:27},
  "телешка кайма":{label:"Телешка кайма",kcal:250,protein:26},
  "свински врат":{label:"Свински врат",kcal:290,protein:18},
  "свинско бонфиле":{label:"Свинско бонфиле",kcal:143,protein:21},
  "свински котлет":{label:"Свински котлет",kcal:231,protein:25},
  "кайма смес":{label:"Кайма смес",kcal:260,protein:17},
  "сьомга":{label:"Сьомга",kcal:206,protein:22},
  "риба":{label:"Риба",kcal:150,protein:22},
  "тон":{label:"Тон",kcal:132,protein:29},
  "риба тон":{label:"Риба тон",kcal:132,protein:29},
  "хек":{label:"Хек",kcal:90,protein:19},
  "скумрия":{label:"Скумрия",kcal:205,protein:19},
  "лаврак":{label:"Лаврак",kcal:124,protein:23},
  "ципура":{label:"Ципура",kcal:121,protein:20},
  "скариди":{label:"Скариди",kcal:99,protein:24},
  "яйца":{label:"Яйца",kcal:155,protein:13},
  "яйце":{label:"Яйца",kcal:155,protein:13},
  "белтъци":{label:"Белтъци",kcal:52,protein:11},
  "сирене":{label:"Сирене",kcal:260,protein:14},
  "кашкавал":{label:"Кашкавал",kcal:356,protein:25},
  "извара":{label:"Извара",kcal:98,protein:11},
  "кисело мляко":{label:"Кисело мляко",kcal:61,protein:3.5},
  "гръцко кисело мляко":{label:"Гръцко кисело мляко",kcal:97,protein:9},
  "моцарела":{label:"Моцарела",kcal:280,protein:22},
  "пармезан":{label:"Пармезан",kcal:431,protein:38},
  "ориз":{label:"Ориз (сготвен)",kcal:130,protein:2.7},
  "бял ориз":{label:"Бял ориз (сготвен)",kcal:130,protein:2.7},
  "кафяв ориз":{label:"Кафяв ориз (сготвен)",kcal:123,protein:2.7},
  "картофи":{label:"Картофи",kcal:87,protein:1.9},
  "печени картофи":{label:"Печени картофи",kcal:120,protein:2.5},
  "сладки картофи":{label:"Сладки картофи",kcal:86,protein:1.6},
  "овес":{label:"Овесени ядки",kcal:370,protein:13},
  "хляб":{label:"Хляб",kcal:265,protein:9},
  "бял хляб":{label:"Бял хляб",kcal:265,protein:9},
  "пълнозърнест хляб":{label:"Пълнозърнест хляб",kcal:247,protein:13},
  "тортила":{label:"Тортила",kcal:310,protein:8},
  "паста":{label:"Паста (сготвена)",kcal:157,protein:5.8},
  "спагети":{label:"Спагети (сготвени)",kcal:158,protein:5.8},
  "кус-кус":{label:"Кус-кус (сготвен)",kcal:112,protein:3.8},
  "киноа":{label:"Киноа (сготвена)",kcal:120,protein:4.4},
  "булгур":{label:"Булгур (сготвен)",kcal:83,protein:3.1},
  "боб":{label:"Боб (сготвен)",kcal:127,protein:8.7},
  "леща":{label:"Леща (сготвена)",kcal:116,protein:9},
  "нахут":{label:"Нахут (сготвен)",kcal:164,protein:8.9},
  "банан":{label:"Банан",kcal:89,protein:1.1},
  "ябълка":{label:"Ябълка",kcal:52,protein:0.3},
  "портокал":{label:"Портокал",kcal:47,protein:0.9},
  "авокадо":{label:"Авокадо",kcal:160,protein:2},
  "домати":{label:"Домати",kcal:18,protein:0.9},
  "краставица":{label:"Краставица",kcal:15,protein:0.7},
  "броколи":{label:"Броколи",kcal:35,protein:2.8},
  "моркови":{label:"Моркови",kcal:41,protein:0.9},
  "чушки":{label:"Чушки",kcal:31,protein:1},
  "салата":{label:"Салата",kcal:15,protein:1.4},
  "зехтин":{label:"Зехтин",kcal:884,protein:0},
  "масло":{label:"Масло",kcal:717,protein:0.9},
  "ядки":{label:"Ядки",kcal:607,protein:20},
  "бадеми":{label:"Бадеми",kcal:579,protein:21},
  "орехи":{label:"Орехи",kcal:654,protein:15},
  "фъстъчено масло":{label:"Фъстъчено масло",kcal:588,protein:25},
  "протеин":{label:"Суроватъчен протеин",kcal:400,protein:80},
  "суроватъчен протеин":{label:"Суроватъчен протеин",kcal:400,protein:80},
}

const quickFoods = [
  {key:"пилешко филе",grams:200},{key:"ориз",grams:200},
  {key:"яйца",grams:150},{key:"кисело мляко",grams:250},
]

const initialClients = [
  { name:"Анастасов", password:"1234", calorieTarget:2200, proteinTarget:160,
    meals:[
      {id:1,foodKey:"пилешко филе",label:"Пилешко филе",grams:200,kcal:330,protein:62,date:todayDate()},
      {id:2,foodKey:"ориз",label:"Ориз (сготвен)",grams:200,kcal:260,protein:5.4,date:todayDate()}
    ],
    workouts:[{date:"05.03.2026",coach:"Никола",items:[{exercise:"Лег преса",scheme:"3x12",weight:120},{exercise:"Гребане",scheme:"3x10",weight:45}]}],
    weightLogs:[{date:"01.03.2026",weight:94.4},{date:"02.03.2026",weight:94.1},{date:"03.03.2026",weight:93.9},{date:"04.03.2026",weight:94.0},{date:"05.03.2026",weight:93.7},{date:"06.03.2026",weight:93.5},{date:"07.03.2026",weight:93.4}]
  },
  { name:"Габриела", password:"1234", calorieTarget:1800, proteinTarget:130, meals:[],
    workouts:[{date:"06.03.2026",coach:"Елина",items:[{exercise:"Хип тръст",scheme:"4x10",weight:60},{exercise:"Раменна преса",scheme:"3x12",weight:12}]}],
    weightLogs:[{date:"01.03.2026",weight:67.2},{date:"02.03.2026",weight:67.0},{date:"03.03.2026",weight:66.9},{date:"04.03.2026",weight:66.8},{date:"05.03.2026",weight:66.7},{date:"06.03.2026",weight:66.6}]
  },
  {name:"Деница Петкова",password:"1234",calorieTarget:1700,proteinTarget:120,meals:[],workouts:[],weightLogs:[]},
  {name:"Лъчо",password:"1234",calorieTarget:2400,proteinTarget:170,meals:[],workouts:[],weightLogs:[]},
  {name:"Елена",password:"1234",calorieTarget:1850,proteinTarget:125,meals:[],workouts:[],weightLogs:[]},
  {name:"Дани",password:"1234",calorieTarget:2100,proteinTarget:145,meals:[],workouts:[],weightLogs:[]},
  {name:"Никола",password:"1234",calorieTarget:2300,proteinTarget:160,meals:[],workouts:[],weightLogs:[]},
  {name:"Ани",password:"1234",calorieTarget:1750,proteinTarget:120,meals:[],workouts:[],weightLogs:[]},
  {name:"Ади",password:"1234",calorieTarget:1600,proteinTarget:105,meals:[],workouts:[],weightLogs:[]},
  {name:"Господин",password:"1234",calorieTarget:2200,proteinTarget:150,meals:[],workouts:[],weightLogs:[]},
  {name:"Надя",password:"1234",calorieTarget:1700,proteinTarget:115,meals:[],workouts:[],weightLogs:[]},
  {name:"Диян",password:"1234",calorieTarget:2250,proteinTarget:155,meals:[],workouts:[],weightLogs:[]},
  {name:"Боян",password:"1234",calorieTarget:2350,proteinTarget:165,meals:[],workouts:[],weightLogs:[]},
  {name:"Теодора Праматарова",password:"1234",calorieTarget:1800,proteinTarget:125,meals:[],workouts:[],weightLogs:[]},
  {name:"Дорина",password:"1234",calorieTarget:1750,proteinTarget:120,meals:[],workouts:[],weightLogs:[]},
  {name:"Цветелина",password:"1234",calorieTarget:1800,proteinTarget:125,meals:[],workouts:[],weightLogs:[]},
  {name:"Мария",password:"1234",calorieTarget:1800,proteinTarget:125,meals:[],workouts:[],weightLogs:[]},
  {name:"Анди",password:"1234",calorieTarget:1900,proteinTarget:130,meals:[],workouts:[],weightLogs:[]},
]

const initialCoaches = [
  {name:"Елина",password:"1111"},
  {name:"Никола",password:"1111"},
  {name:"Ицко",password:"1111"},
  {name:"Алекс",password:"1111"},
]

// ─── WeightChart ───────────────────────────────────────────────
function WeightChart({data}) {
  if (!data||!data.length) return React.createElement('div', { style: {color:C.muted,fontSize:"14px",padding:"20px 0"},}, "Няма данни за графика."   )
  const W=800,H=200,P=30
  const vals=data.flatMap(d=>[d.weight,d.avg].filter(v=>typeof v==="number"&&isFinite(v)))
  if (!vals.length) return React.createElement('div', { style: {color:C.muted,fontSize:"14px",padding:"20px 0"},}, "Няма валидни данни."  )
  const minV=Math.min(...vals),maxV=Math.max(...vals),range=Math.max(maxV-minV,1)
  const xStep=data.length===1?0:(W-P*2)/(data.length-1)
  const gx=i=>P+i*xStep
  const gy=v=>H-P-((v-minV)/range)*(H-P*2)
  const wPts=data.map((d,i)=>`${gx(i)},${gy(d.weight)}`).join(" ")
  const aPts=data.map((d,i)=>`${gx(i)},${gy(d.avg)}`).join(" ")
  return (
    React.createElement('div', null
      , React.createElement('svg', { viewBox: `0 0 ${W} ${H}`, style: {width:"100%",height:"200px",borderRadius:"12px",background:"#141312",display:"block",color:C.text},}
        , [0,1,2,3].map(li=>{const y=P+((H-P*2)/3)*li;returnReact.createElement('line', { key: li, x1: P, y1: y, x2: W-P, y2: y, stroke: C.border, strokeWidth: "1",})})
        , React.createElement('polyline', { fill: "none", stroke: C.primary, strokeWidth: "2.5", points: wPts, strokeLinecap: "round", strokeLinejoin: "round",})
        , React.createElement('polyline', { fill: "none", stroke: "#B8B4FF", strokeWidth: "2", strokeDasharray: "5,4", points: aPts, strokeLinecap: "round", strokeLinejoin: "round",})
        , data.map((d,i)=>React.createElement('circle', { key: i, cx: gx(i), cy: gy(d.weight), r: "4", fill: "#FFFFFF",}))
      )
      , React.createElement('div', { style: {display:"flex",justifyContent:"space-between",marginTop:"6px",color:C.muted,fontSize:"12px"},}
        , React.createElement('span', null, _optionalChain([data, 'access', _2 => _2[0], 'optionalAccess', _3 => _3.date])), React.createElement('span', null, _optionalChain([data, 'access', _4 => _4[data.length-1], 'optionalAccess', _5 => _5.date]))
      )
      , React.createElement('div', { style: {display:"flex",gap:"16px",marginTop:"8px",fontSize:"12px",color:C.muted},}
        , React.createElement('span', null, React.createElement('span', { style: {color:C.primary},}, "●"), " тегло" )
        , React.createElement('span', null, React.createElement('span', { style: {color:"#B8B4FF"},}, "●"), " moving avg"  )
      )
    )
  )
}

// ─── StatCard ──────────────────────────────────────────────────
function StatCard({label,value,accent,sub}) {
  return (
    React.createElement('div', { style: {background:accent?C.accentSoft:C.card,border:`1px solid ${accent?"rgba(196,233,191,0.3)":C.border}`,borderRadius:"14px",padding:"16px 18px"},}
      , React.createElement('div', { style: {fontSize:"12px",color:C.muted,marginBottom:"6px",textTransform:"uppercase",letterSpacing:"0.6px"},}, label)
      , React.createElement('div', { style: {fontSize:"24px",fontWeight:800,color:accent?C.primary:C.text},}, value)
      , sub&&React.createElement('div', { style: {fontSize:"12px",color:C.muted,marginTop:"4px"},}, sub)
    )
  )
}

// ─── ProgressRing ──────────────────────────────────────────────
function ProgressRing({percent,color,size=80}) {
  const r=(size-10)/2,circ=2*Math.PI*r,offset=circ-(Math.min(percent,100)/100)*circ
  return (
    React.createElement('svg', { width: size, height: size, style: {transform:"rotate(-90deg)"},}
      , React.createElement('circle', { cx: size/2, cy: size/2, r: r, fill: "none", stroke: C.border, strokeWidth: "8",})
      , React.createElement('circle', { cx: size/2, cy: size/2, r: r, fill: "none", stroke: color, strokeWidth: "8", strokeDasharray: circ, strokeDashoffset: offset, strokeLinecap: "round",})
    )
  )
}

// ─── AuthScreen ────────────────────────────────────────────────
function AuthScreen({clients,coaches,onLoginCoach,onLoginClient,onRegisterCoach,onRegisterClient}) {
  const isMobile = useIsMobile()
  const [mode,setMode] = useState("login")
  const [lcName,setLcName]=useState(""), [lcPass,setLcPass]=useState("")
  const [liName,setLiName]=useState(""), [liPass,setLiPass]=useState("")
  const [lcErr,setLcErr]=useState(""), [liErr,setLiErr]=useState("")
  const [rName,setRName]=useState(""), [rPass,setRPass]=useState(""), [rPass2,setRPass2]=useState("")
  const [rErr,setRErr]=useState("")
  const [rLoading,setRLoading]=useState(false)

  async function doLoginCoach() {
    setLcErr("")
    const err = await onLoginCoach(lcName, lcPass)
    if(err) setLcErr(err)
  }
  async function doLoginClient() {
    setLiErr("")
    const err = await onLoginClient(liName, liPass)
    if(err) setLiErr(err)
  }

  async function doRegister(role) {
    setRErr("")
    const name=rName.trim()
    if (!name) { setRErr("Въведи име"); return }
    if (rPass.length<3) { setRErr("Паролата трябва да е поне 3 символа"); return }
    if (rPass!==rPass2) { setRErr("Паролите не съвпадат"); return }
    if (role==="coach") {
      if (coaches.find(c=>c.name.toLowerCase()===name.toLowerCase())) { setRErr("Вече има треньор с това име"); return }
    } else {
      if (clients.find(c=>c.name.toLowerCase()===name.toLowerCase())) { setRErr("Вече има клиент с това име"); return }
    }
    setRLoading(true)
    const err = role==="coach" ? await onRegisterCoach(name,rPass) : await onRegisterClient(name,rPass)
    setRLoading(false)
    if(err) { setRErr(err); return }
    setRName(""); setRPass(""); setRPass2(""); setMode("login")
  }
  const GS = `@import url('https://fonts.googleapis.com/css2?family=DM+Sans:wght@400;500;600;700;800&family=Space+Grotesk:wght@700;800&display=swap');*{box-sizing:border-box;color:inherit}html,body{color:#F4F4F3!important;background:#1A1918!important;overflow-x:hidden!important;max-width:100vw!important}input,select{font-family:inherit;color:#F4F4F3!important;background:#141312!important}input::placeholder{color:#8887AB!important}input:focus{outline:none!important;border-color:rgba(196,233,191,0.6)!important;box-shadow:0 0 0 3px rgba(196,233,191,0.1)!important}button:hover{opacity:.88}::-webkit-scrollbar{width:4px}::-webkit-scrollbar-thumb{background:#3D3A38;border-radius:99px}`

  return (
    React.createElement('div', { style: {minHeight:"100vh",background:C.bg,display:"flex",alignItems:"center",justifyContent:"center",padding:"20px",fontFamily:"'DM Sans','Segoe UI',sans-serif",color:C.text,overflowX:"hidden",maxWidth:"100vw",boxSizing:"border-box"},}
      , React.createElement('style', null, GS)
      , React.createElement('div', { style: {width:"100%",maxWidth:"900px"},}

        /* Logo */
        , React.createElement('div', { style: {textAlign:"center",marginBottom:"36px"},}
          , React.createElement('div', { style: {display:"flex",justifyContent:"center",marginBottom:"12px"},}
            , React.createElement('svg', { xmlns: "http://www.w3.org/2000/svg", viewBox: "0 0 285.85 126.1"   , style: {width:"200px",height:"auto"},}
              , React.createElement('path', { fill: "#FFFFFF", d: "M248.3,36.76h-6.85c-.21,0-.41.1-.53.28l-2.24,3.28c-.12.17-.36.19-.5.04-2.96-3-7.43-4.8-13-4.8-12.4,0-22.06,9.59-22.06,21.62,0,9.44,6.64,16.01,17.49,16.01,3.45,0,6.63-.77,9.51-2.14.24-.12.51.1.45.37h0c-1.81,4.75-4.78,7.7-9.31,7.7h-91.93c-.3,0-.57.21-.63.51l-1.81,9.05c-.08.4.22.76.63.76h92.04c10.84,0,19.38-4.16,23.03-20.17h0s6.34-31.76,6.34-31.76c.08-.39-.22-.76-.63-.76ZM222.95,63.16c-5.09,0-8.04-2.95-8.04-7.01,0-5.76,5.09-10.55,11.59-10.55,5.09,0,8.04,2.95,8.04,7.01,0,5.76-5.09,10.55-11.59,10.55Z",})
              , React.createElement('path', { fill: "#FFFFFF", d: "M67.35,75.57c10.62,0,17.71-5.61,17.71-13.73,0-7.67-6.86-9.44-12.17-10.85-3.32-.88-5.98-1.62-5.98-3.47,0-1.62,1.55-3.1,4.58-3.1,2.54,0,3.74,1.15,3.9,2.89.03.32.31.57.63.57h10.49c.33,0,.6-.24.64-.57.04-.3.06-.63.06-.98,0-5.53-4.72-10.77-15.05-10.77s-17.27,5.83-17.27,13.28c0,6.94,6.42,9.08,11.59,10.55,3.84,1.11,6.57,1.99,6.57,4.13,0,1.84-2.07,3.17-5.09,3.17-3.27,0-4.78-1.2-4.99-3.36-.03-.3-.33-.55-.63-.55h-10.64c-.33,0-.6.24-.64.57-.04.4-.08.84-.08,1.28,0,5.83,5.02,10.92,16.38,10.92Z",})
              , React.createElement('path', { fill: "#FFFFFF", d: "M43.13,79.12l-2.08,10.33h-3.72c-.21,0-.36-.19-.32-.39l1.89-9.43c.06-.3.32-.51.63-.51h3.61Z",})
              , React.createElement('path', { fill: "#FFFFFF", d: "M133.45,37.23l-22.13,36.1c-7.52,12.25-12.22,16.12-23.07,16.12h-42.38l2.08-10.33h42.01c4.53,0,6.21-1.79,8.9-6.12.04-.07.06-.26.04-.34l-8.02-35.28c-.04-.24.19-.65.54-.65h10.7c.32,0,.56.29.59.45l4.45,20.88c.06.29.45.35.6.1l12.6-21.12c.05-.11.28-.31.53-.31h12.28c.25,0,.41.28.28.5Z",})
              , React.createElement('path', { fill: "#FFFFFF", d: "M130.47,74.39h10.21c.3,0,.57-.21.63-.51l3.59-17.93c1.55-7.01,5.39-10.03,9.81-10.03,3.17,0,5.17,1.7,5.17,5.39,0,.81-.08,1.7-.37,3.1l-3.83,19.23c-.08.39.22.76.63.76h10.21c.3,0,.57-.22.63-.51l4.25-21.33c.37-1.92.52-3.25.52-4.8,0-7.6-4.72-12.18-12.84-12.18-4.95,0-9.3,1.63-12.51,4.5-.19.17-.47.08-.54-.16l-.7-2.68c-.07-.28-.33-.48-.62-.48h-6.95c-.3,0-.57.21-.63.51l-7.27,36.35c-.08.4.22.76.63.76Z",})
              , React.createElement('path', { fill: "#FFFFFF", d: "M172.69,74.39h10.21c.3,0,.57-.21.63-.51l3.66-18.16c1.25-5.39,4.06-7.89,9.15-7.89h5.16c.3,0,.57-.21.63-.51l1.96-9.79c.08-.4-.22-.76-.63-.76h-3.65c-4.5,0-8.2,1.14-10.97,3.49-.19.16-.47.08-.53-.16l-.77-2.86c-.08-.28-.33-.47-.62-.47h-6.96c-.3,0-.57.21-.63.51l-7.27,36.35c-.08.4.22.76.63.76Z",})
            )
          )
          , React.createElement('div', { style: {color:C.muted,fontSize:"15px"},}, "Фитнес платформа за студиото"   )
        )

        /* Mode tabs */
        , React.createElement('div', { style: {display:"flex",justifyContent:"center",gap:"8px",marginBottom:"28px",flexWrap:"wrap"},}
          , [["login","🔑  Вход"],["registerCoach","💪  Треньор - Регистрация"],["registerClient","🏃  Клиент - Регистрация"]].map(([m,label])=>(
            React.createElement('button', { key: m, onClick: ()=>{setMode(m);setRErr("")}, style: {...btnGhost,background:mode===m?C.accentSoft:"transparent",color:mode===m?C.primary:C.muted,border:`1px solid ${mode===m?"rgba(196,233,191,0.35)":C.border}`,fontSize:"13px",padding:"9px 16px"},}
              , label
            )
          ))
        )

        /* LOGIN */
        , mode==="login"&&(
          React.createElement('div', { style: {display:"grid",gridTemplateColumns:isMobile?"1fr":"1fr 1fr",gap:"16px"},}
            , React.createElement('div', { style: {background:C.card,border:`1px solid ${C.border}`,borderRadius:"20px",padding:"28px"},}
              , React.createElement('div', { style: {display:"inline-flex",alignItems:"center",gap:"8px",background:C.accentSoft,border:"1px solid rgba(196,233,191,0.25)",borderRadius:"99px",padding:"5px 12px",marginBottom:"14px"},}
                , React.createElement('span', { style: {fontSize:"11px",color:C.primary,fontWeight:700,textTransform:"uppercase",letterSpacing:"1px"},}, "Треньор")
              )
              , React.createElement('div', { style: {fontSize:"22px",fontWeight:800,marginBottom:"20px"},}, "Вход за треньори"  )
              , React.createElement('div', { style: {display:"grid",gap:"10px"},}
                , React.createElement('input', { style: inp, placeholder: "Твоето име" , value: lcName, onChange: e=>setLcName(e.target.value),})
                , React.createElement('input', { type: "password", style: inp, placeholder: "Парола", value: lcPass, onChange: e=>setLcPass(e.target.value), onKeyDown: e=>e.key==="Enter"&&doLoginCoach(),})
                , lcErr&&React.createElement('div', { style: {color:"#D55A8F",fontSize:"13px",background:"rgba(213,90,143,0.1)",border:"1px solid rgba(213,90,143,0.25)",borderRadius:"8px",padding:"10px 12px"},}, lcErr)
                , React.createElement('button', { onClick: doLoginCoach, style: btn,}, "Влез →" )
              )
            )
            , React.createElement('div', { style: {background:C.card,border:`1px solid ${C.border}`,borderRadius:"20px",padding:"28px"},}
              , React.createElement('div', { style: {display:"inline-flex",alignItems:"center",gap:"8px",background:C.purpleSoft,border:"1px solid rgba(136,135,171,0.25)",borderRadius:"99px",padding:"5px 12px",marginBottom:"14px"},}
                , React.createElement('span', { style: {fontSize:"11px",color:C.purple,fontWeight:700,textTransform:"uppercase",letterSpacing:"1px"},}, "Клиент")
              )
              , React.createElement('div', { style: {fontSize:"22px",fontWeight:800,marginBottom:"20px"},}, "Клиентски вход" )
              , React.createElement('div', { style: {display:"grid",gap:"10px"},}
                , React.createElement('input', { style: inp, placeholder: "Твоето име" , value: liName, onChange: e=>setLiName(e.target.value),})
                , React.createElement('input', { type: "password", style: inp, placeholder: "Парола", value: liPass, onChange: e=>setLiPass(e.target.value), onKeyDown: e=>e.key==="Enter"&&doLoginClient(),})
                , liErr&&React.createElement('div', { style: {color:"#D55A8F",fontSize:"13px",background:"rgba(213,90,143,0.1)",border:"1px solid rgba(213,90,143,0.25)",borderRadius:"8px",padding:"10px 12px"},}, liErr)
                , React.createElement('button', { onClick: doLoginClient, style: {...btn,background:C.purple},}, "Влез →" )
              )
            )
          )
        )

        /* REGISTER FORM (shared) */
        , (mode==="registerCoach"||mode==="registerClient")&&(()=>{
          const isCoach=mode==="registerCoach"
          const color=isCoach?C.primary:C.purple
          const bgSoft=isCoach?C.accentSoft:C.purpleSoft
          const bdr=isCoach?"rgba(196,233,191,0.25)":"rgba(136,135,171,0.25)"
          const tag=isCoach?"Нов треньор":"Нов клиент"
          const titleColor=isCoach?C.primary:C.purple
          return (
            React.createElement('div', { style: {maxWidth:"440px",margin:"0 auto",background:C.card,border:`1px solid ${C.border}`,borderRadius:"20px",padding:"32px"},}
              , React.createElement('div', { style: {display:"inline-flex",alignItems:"center",gap:"8px",background:bgSoft,border:`1px solid ${bdr}`,borderRadius:"99px",padding:"5px 12px",marginBottom:"14px"},}
                , React.createElement('span', { style: {fontSize:"11px",color:titleColor,fontWeight:700,textTransform:"uppercase",letterSpacing:"1px"},}, tag)
              )
              , React.createElement('div', { style: {fontSize:"22px",fontWeight:800,marginBottom:"6px"},}, "Регистрация")
              , React.createElement('div', { style: {color:C.muted,fontSize:"14px",marginBottom:"22px"},}
                , isCoach?"Създай своя треньорски профил":"Създай своя клиентски профил"
              )
              , React.createElement('div', { style: {display:"grid",gap:"12px"},}
                , React.createElement('div', null
                  , React.createElement('div', { style: {fontSize:"12px",color:C.muted,marginBottom:"6px"},}, "Пълно име" )
                  , React.createElement('input', { style: inp, placeholder: isCoach?"Например: Иван Петров":"Например: Мария Иванова", value: rName, onChange: e=>setRName(e.target.value),})
                )
                , React.createElement('div', null
                  , React.createElement('div', { style: {fontSize:"12px",color:C.muted,marginBottom:"6px"},}, "Парола")
                  , React.createElement('input', { type: "password", style: inp, placeholder: "Мин. 3 символа"  , value: rPass, onChange: e=>setRPass(e.target.value),})
                )
                , React.createElement('div', null
                  , React.createElement('div', { style: {fontSize:"12px",color:C.muted,marginBottom:"6px"},}, "Потвърди паролата" )
                  , React.createElement('input', { type: "password", style: inp, placeholder: "Повтори паролата" , value: rPass2, onChange: e=>setRPass2(e.target.value), onKeyDown: e=>e.key==="Enter"&&doRegister(isCoach?"coach":"client"),})
                )
                , rErr&&React.createElement('div', { style: {color:C.danger,fontSize:"13px",background:"rgba(213,90,143,0.1)",border:"1px solid rgba(213,90,143,0.25)",borderRadius:"8px",padding:"10px 12px"},}, rErr)
                , React.createElement('button', { onClick: ()=>doRegister(isCoach?"coach":"client"), disabled: rLoading, style: {...btn,background:rLoading?"#555":color,color:"#1C1B1A",cursor:rLoading?"wait":"pointer"},}, rLoading?"Запазване...":"Създай профил →")
                , React.createElement('button', { onClick: ()=>setMode("login"), style: btnGhost,}, "← Назад към вход"   )
              )
            )
          )
        })()
      )
    )
  )
}

// ─── Main App ──────────────────────────────────────────────────
function App() {
  const [clients,setClients] = useState([])
  const [coaches,setCoaches] = useState([])
  const [auth,setAuth] = useState({isLoggedIn:false,role:null,name:"",id:null})
  const [loading,setLoading] = useState(true)
  const [loadError,setLoadError] = useState("")
  const [view,setView] = useState("dashboard")
  const [selIdx,setSelIdx] = useState(0)
  const isMobile = useIsMobile()
  const [sidebarOpen,setSidebarOpen] = useState(false)
  const [showClientMenu,setShowClientMenu] = useState(false)
  const [confirmDelete,setConfirmDelete] = useState(null) // {id, name}

  const [exName,setExName]=useState(""), [exScheme,setExScheme]=useState(""), [exWeight,setExWeight]=useState("")
  const [workoutCategory,setWorkoutCategory]=useState("Предна верига")
  const [currentWorkout,setCurrentWorkout]=useState([])
  const [selCoach,setSelCoach]=useState("")

  const [foodDate,setFoodDate]=useState(dateToInput(todayDate()))
  const [foodModalOpen,setFoodModalOpen]=useState(false)
  const [foodSearch,setFoodSearch]=useState(""), [gramsInput,setGramsInput]=useState("")

  const [weightInput,setWeightInput]=useState("")
  const [weightDate,setWeightDate]=useState(dateToInput(todayDate()))

  // ── Load all data from Supabase ──────────────────────────────
  const loadAll = useCallback(async () => {
    setLoading(true)
    setLoadError("")
    try {
      await DB.seedIfEmpty()
      const [rawCoaches, rawClients, meals, workouts, weights] = await Promise.all([
        DB.selectAll("coaches"),
        DB.selectAll("clients"),
        DB.selectAll("meals"),
        DB.selectAll("workouts"),
        DB.selectAll("weight_logs"),
      ])

      setCoaches(rawCoaches.map(c=>({name:c.name,password:c.password,id:c.id})))
      if(rawCoaches.length && !selCoach) setSelCoach(rawCoaches[0].name)
      setClients(rawClients.map(c=>({
        id: c.id,
        name: c.name,
        password: c.password,
        calorieTarget: c.calorie_target||c.calorieTarget||2000,
        proteinTarget: c.protein_target||c.proteinTarget||140,
        meals: meals.filter(m=>m.client_id===c.id).map(m=>({
          id:m.id, label:m.label, grams:m.grams, kcal:m.kcal, protein:m.protein, date:m.date
        })),
        workouts: workouts.filter(w=>w.client_id===c.id)
          .sort((a,b)=>_optionalChain([b, 'access', _6 => _6.created_at, 'optionalAccess', _7 => _7.localeCompare, 'call', _8 => _8(a.created_at||"")])||0)
          .map(w=>({id:w.id, date:w.date, coach:w.coach, category:w.category, items:w.items||[]})),
        weightLogs: weights.filter(w=>w.client_id===c.id)
          .sort((a,b)=>a.date.localeCompare(b.date))
          .map(w=>({id:w.id, date:w.date, weight:Number(w.weight)})),
      })))
    } catch(e) {
      console.error("loadAll error:", e)
      setLoadError(`${e.name}: ${e.message}`)
    }
    setLoading(false)
  }, [])

  useEffect(()=>{ loadAll() },[loadAll])

  // ── Auth ─────────────────────────────────────────────────────
  async function handleLoginCoach(name,pass) {
    const coach=coaches.find(c=>c.name.toLowerCase()===name.trim().toLowerCase()&&c.password===pass)
    if(!coach) return "Грешно име или парола"
    setAuth({isLoggedIn:true,role:"coach",name:coach.name,id:coach.id})
    setSelCoach(coach.name)
  }
  async function handleLoginClient(name,pass) {
    const c=clients.find(c=>c.name.toLowerCase()===name.trim().toLowerCase()&&c.password===pass)
    if(!c) return "Грешно име или парола"
    setSelIdx(clients.findIndex(x=>x.name===c.name))
    setAuth({isLoggedIn:true,role:"client",name:c.name,id:c.id})
  }
  async function handleRegisterCoach(name,pass) {
    await DB.insert("coaches",{name,password:pass})
    await loadAll()
    return null
  }
  async function handleRegisterClient(name,pass) {
    await DB.insert("clients",{name,password:pass,calorie_target:2000,protein_target:140})
    await loadAll()
    return null
  }
  function logout() {
    setAuth({isLoggedIn:false,role:null,name:"",id:null})
    setView("dashboard"); setCurrentWorkout([])
  }

  // ── Update helpers ───────────────────────────────────────────
  async function updateClientTargets(id, calorieTarget, proteinTarget) {
    await DB.update("clients",id,{calorie_target:calorieTarget,protein_target:proteinTarget})
    setClients(prev=>prev.map(c=>c.id===id?{...c,calorieTarget,proteinTarget}:c))
  }

  function updateClient(fn) {
    // local optimistic update — persisted by specific action functions below
    setClients(prev=>prev.map((c,i)=>i===actualIdx?fn(c):c))
  }

  async function addMealToClient(clientId, meal) {
    const data=await DB.insert("meals",{client_id:clientId,date:meal.date,label:meal.label,grams:meal.grams,kcal:meal.kcal,protein:meal.protein})
    setClients(prev=>prev.map(c=>c.id===clientId?{...c,meals:[...c.meals,{...meal,id:data.id}]}:c))
  }

  async function deleteMealFromClient(clientId, mealId) {
    await DB.deleteById("meals",mealId)
    setClients(prev=>prev.map(c=>c.id===clientId?{...c,meals:c.meals.filter(m=>m.id!==mealId)}:c))
  }

  async function saveWorkoutToClient(clientId, workout) {
    const data=await DB.insert("workouts",{client_id:clientId,date:workout.date,coach:workout.coach,category:workout.category,items:workout.items})
    setClients(prev=>prev.map(c=>c.id===clientId?{...c,workouts:[{...workout,id:data.id},...c.workouts]}:c))
  }

  async function saveWeightLog(clientId, date, weight) {
    const data=await DB.upsertByFields("weight_logs",{client_id:clientId,date,weight},["client_id","date"])
    setClients(prev=>prev.map(c=>{
      if(c.id!==clientId) return c
      const logs=c.weightLogs.filter(l=>l.date!==date)
      return {...c,weightLogs:[...logs,{id:data.id,date,weight:Number(weight)}].sort((a,b)=>a.date.localeCompare(b.date))}
    }))
  }

  async function deleteWeightLog(clientId, logId, date) {
    await DB.deleteById("weight_logs",logId)
    setClients(prev=>prev.map(c=>c.id===clientId?{...c,weightLogs:c.weightLogs.filter(l=>l.id!==logId)}:c))
  }

  async function deleteClient(clientId) {
    // Delete all related data first
    const clientMeals = await DB.findWhere("meals","client_id",clientId)
    const clientWorkouts = await DB.findWhere("workouts","client_id",clientId)
    const clientWeights = await DB.findWhere("weight_logs","client_id",clientId)
    await Promise.all([
      ...clientMeals.map(m=>DB.deleteById("meals",m.id)),
      ...clientWorkouts.map(w=>DB.deleteById("workouts",w.id)),
      ...clientWeights.map(w=>DB.deleteById("weight_logs",w.id)),
      DB.deleteById("clients",clientId),
    ])
    setClients(prev=>{
      const newList = prev.filter(c=>c.id!==clientId)
      setSelIdx(i=>Math.min(i, Math.max(0, newList.length-1)))
      return newList
    })
  }

  const actualIdx = useMemo(()=>{
    if(auth.role==="coach") return selIdx
    const i=clients.findIndex(c=>c.name===auth.name)
    return i>=0?i:0
  },[auth,selIdx,clients])

  const client = clients[actualIdx]||{name:"",calorieTarget:0,proteinTarget:0,meals:[],workouts:[],weightLogs:[]}
  const selFoodDate = inputToDate(foodDate)

  const mealsForDate = useMemo(()=>(client.meals||[]).filter(m=>sameDateStr(m.date,selFoodDate)),[client.meals,selFoodDate])
  const foodTotals = useMemo(()=>mealsForDate.reduce((a,m)=>({kcal:a.kcal+Number(m.kcal||0),protein:a.protein+Number(m.protein||0)}),{kcal:0,protein:0}),[mealsForDate])

  const sortedWeightLogs = useMemo(()=>[...(client.weightLogs||[])].sort((a,b)=>parseDate(a.date)-parseDate(b.date)),[client.weightLogs])
  const weightChartData = useMemo(()=>sortedWeightLogs.map((item,idx,arr)=>{
    const slice=arr.slice(Math.max(0,idx-6),idx+1)
    return {date:item.date,weight:Number(item.weight),avg:Math.round(avgArr(slice.map(x=>Number(x.weight)))*10)/10}
  }),[sortedWeightLogs])

  const latestWeight = weightChartData.length?weightChartData[weightChartData.length-1].weight:null
  const latestAvg = weightChartData.length?weightChartData[weightChartData.length-1].avg:null
  const weeklyRate = useMemo(()=>{
    if(sortedWeightLogs.length>=14){
      return avgArr(sortedWeightLogs.slice(-7).map(x=>Number(x.weight)))-avgArr(sortedWeightLogs.slice(-14,-7).map(x=>Number(x.weight)))
    }
    if(sortedWeightLogs.length>=2){
      const f=sortedWeightLogs[0],l=sortedWeightLogs[sortedWeightLogs.length-1]
      const days=Math.max(1,Math.round((parseDate(l.date)-parseDate(f.date))/86400000))
      return((Number(l.weight)-Number(f.weight))/days)*7
    }
    return null
  },[sortedWeightLogs])

  const ranking = useMemo(()=>computeRanking(clients),[clients])
  const kcalPct = Math.min((foodTotals.kcal/(client.calorieTarget||1))*100,100)
  const protPct = Math.min((foodTotals.protein/(client.proteinTarget||1))*100,100)

  const foodSuggestions = useMemo(()=>{
    const s=foodSearch.trim().toLowerCase()
    if(!s) return []
    return Object.entries(foodDB).filter(([k,f])=>k.includes(s)||f.label.toLowerCase().includes(s)).slice(0,8)
  },[foodSearch])

  function updateClient(fn) { setClients(prev=>prev.map((c,i)=>i===actualIdx?fn(c):c)) }

  function addFoodFromModal() {
    const key=foodSearch.trim().toLowerCase()
    const grams=Number(String(gramsInput).replace(",","."))
    if(!key||!foodDB[key]){console.warn("Избери валидна храна");return}
    if(!grams||isNaN(grams)){console.warn("Въведи грамаж");return}
    const food=foodDB[key]
    const meal={label:food.label,grams,kcal:Math.round((food.kcal/100)*grams),protein:Math.round(((food.protein/100)*grams)*10)/10,date:selFoodDate}
    addMealToClient(client.id, meal)
    setFoodSearch(""); setGramsInput(""); setFoodModalOpen(false)
  }
  function addQuickFood(key,grams) {
    const food=foodDB[key]; if(!food) return
    const meal={label:food.label,grams,kcal:Math.round((food.kcal/100)*grams),protein:Math.round(((food.protein/100)*grams)*10)/10,date:selFoodDate}
    addMealToClient(client.id, meal)
  }
  function saveWeight() {
    const w=Number(String(weightInput).replace(",","."))
    if(!w||isNaN(w)) return
    const date=inputToDate(weightDate)
    saveWeightLog(client.id, date, w)
    setWeightInput("")
  }
  function addExercise() {
    if(!exName.trim()||!exScheme.trim()||!exWeight.trim()) return
    setCurrentWorkout(prev=>[...prev,{exercise:exName.trim(),scheme:exScheme.trim(),weight:exWeight.trim()}])
    setExName(""); setExScheme(""); setExWeight("")
  }
  function saveWorkout() {
    if(!currentWorkout.length) return
    saveWorkoutToClient(client.id, {date:todayDate(),coach:selCoach||auth.name,category:workoutCategory,items:currentWorkout})
    setCurrentWorkout([])
  }

  if(loading) return (
    React.createElement('div', { style: {minHeight:"100vh",background:C.bg,display:"flex",alignItems:"center",justifyContent:"center",flexDirection:"column",gap:"16px",fontFamily:"'DM Sans',sans-serif",color:C.text},}
      , React.createElement('style', null, `@keyframes spin{to{transform:rotate(360deg)}}`)
      , loadError ? (
        React.createElement(React.Fragment, null
          , React.createElement('div', { style: {fontSize:"32px"},}, "⚠️")
          , React.createElement('div', { style: {color:C.danger,fontSize:"15px",fontWeight:700},}, "Грешка при зареждане"  )
          , React.createElement('div', { style: {color:C.muted,fontSize:"13px",maxWidth:"360px",textAlign:"center",background:C.card,padding:"14px",borderRadius:"12px",border:`1px solid ${C.border}`},}, loadError)
          , React.createElement('button', { onClick: ()=>{setLoadError("");setLoading(true);loadAll()}, style: {...btn,marginTop:"8px"},}, "Опитай отново" )
        )
      ) : (
        React.createElement(React.Fragment, null
          , React.createElement('div', { style: {width:"40px",height:"40px",border:`3px solid ${C.border}`,borderTop:`3px solid ${C.primary}`,borderRadius:"50%",animation:"spin 0.8s linear infinite"},})
          , React.createElement('div', { style: {color:C.muted,fontSize:"14px"},}, "Зареждане от базата данни..."   )
        )
      )
    )
  )

  if(!auth.isLoggedIn) return (
    React.createElement(AuthScreen, { clients: clients, coaches: coaches,
      onLoginCoach: handleLoginCoach, onLoginClient: handleLoginClient,
      onRegisterCoach: handleRegisterCoach, onRegisterClient: handleRegisterClient,})
  )

  const visibleClients = auth.role==="coach"?clients:clients.filter(c=>c.name===auth.name)
  const navItems = [["dashboard","📊","Табло"],["food","🥗","Хранителен тракер"],["weight","⚖️","Тегло"],["ranking","🏆","Класация"]]

  const FoodModal = foodModalOpen?(
    React.createElement('div', { style: {position:"fixed",inset:0,background:"rgba(0,0,0,0.7)",display:"flex",alignItems:"center",justifyContent:"center",zIndex:100,padding:"20px"},}
      , React.createElement('div', { style: {width:"100%",maxWidth:"520px",background:C.card,borderRadius:"20px",border:`1px solid ${C.border}`,padding:"24px"},}
        , React.createElement('div', { style: {display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:"20px"},}
          , React.createElement('div', { style: {fontSize:"20px",fontWeight:800},}, "Добави храна" )
          , React.createElement('button', { onClick: ()=>setFoodModalOpen(false), style: btnGhost,}, "✕")
        )
        , React.createElement('div', { style: {display:"grid",gap:"12px"},}
          , React.createElement('input', { style: inp, placeholder: "Търси: пилешко, ориз, яйца..."   , value: foodSearch, onChange: e=>setFoodSearch(e.target.value),})
          , foodSearch.trim()&&foodSuggestions.length>0&&(
            React.createElement('div', { style: {border:`1px solid ${C.border}`,borderRadius:"12px",overflow:"hidden",background:"#141312",color:C.text},}
              , foodSuggestions.map(([key,food])=>(
                React.createElement('button', { key: key, onClick: ()=>setFoodSearch(key), style: {width:"100%",textAlign:"left",background:"transparent",border:"none",borderBottom:`1px solid ${C.border}`,padding:"10px 14px",cursor:"pointer",color:C.text,fontFamily:"inherit"},}
                  , React.createElement('div', { style: {fontWeight:600},}, food.label)
                  , React.createElement('div', { style: {color:C.muted,fontSize:"12px"},}, food.kcal, " kcal · "   , food.protein, "г / 100г"  )
                )
              ))
            )
          )
          , React.createElement('input', { style: inp, placeholder: "Грамаж (200)" , value: gramsInput, onChange: e=>setGramsInput(e.target.value), onKeyDown: e=>e.key==="Enter"&&addFoodFromModal(),})
          , React.createElement('button', { onClick: addFoodFromModal, style: btn,}, "Добави →" )
        )
      )
    )
  ):null

  // ── Shared progress rings block ──
  const ProgressPair = (
    React.createElement('div', { style: {display:"grid",gridTemplateColumns:isMobile?"1fr":"1fr 1fr",gap:"12px",marginBottom:"20px"},}
      , [["Калории",kcalPct,foodTotals.kcal,client.calorieTarget,"",C.primary],["Протеин",protPct,foodTotals.protein,client.proteinTarget,"г",C.purple]].map(([label,pct,cur,tgt,suf,color])=>(
        React.createElement('div', { key: label, style: {background:C.card,border:`1px solid ${C.border}`,borderRadius:"16px",padding:"18px",display:"flex",alignItems:"center",gap:"16px"},}
          , React.createElement('div', { style: {position:"relative",flexShrink:0},}
            , React.createElement(ProgressRing, { percent: pct, color: color, size: 76,})
            , React.createElement('div', { style: {position:"absolute",inset:0,display:"flex",alignItems:"center",justifyContent:"center",fontSize:"13px",fontWeight:700,color},}, Math.round(pct), "%")
          )
          , React.createElement('div', null
            , React.createElement('div', { style: {fontWeight:700,marginBottom:"4px"},}, label)
            , React.createElement('div', { style: {fontSize:"22px",fontWeight:800,color},}, fmt1(cur), suf)
            , React.createElement('div', { style: {color:C.muted,fontSize:"12px"},}, "от " , tgt, suf)
          )
        )
      ))
    )
  )

  return (
    React.createElement('div', { style: {display:"flex",flexDirection:isMobile?"column":"row",fontFamily:"'DM Sans','Segoe UI',sans-serif",minHeight:"100vh",height:isMobile?"100dvh":"auto",background:C.bg,color:C.text,WebkitFontSmoothing:"antialiased",overflow:"hidden",maxWidth:"100vw",width:"100%"},}
      , React.createElement('style', null, `@import url('https://fonts.googleapis.com/css2?family=DM+Sans:wght@400;500;600;700;800&family=Space+Grotesk:wght@700;800&display=swap');*{box-sizing:border-box;color:inherit}html,body{color:#F4F4F3!important;background:#1A1918!important;overflow-x:hidden!important;max-width:100vw!important}input,select,textarea,button{font-family:inherit;color:#F4F4F3!important}input,select,textarea{background:#141312!important}input:focus,select:focus{outline:none!important;border-color:rgba(196,233,191,0.5)!important}input::placeholder{color:#8887AB!important}button:hover{opacity:.85;transition:opacity .15s}::-webkit-scrollbar{width:4px}::-webkit-scrollbar-thumb{background:#3D3A38;border-radius:99px}input[type=date]::-webkit-calendar-picker-indicator{filter:invert(.6);cursor:pointer}option{background:#2E2C2B!important;color:#F4F4F3!important}span,div,p,h1,h2,h3,h4,label{color:inherit}`)
      , FoodModal

      /* ── SIDEBAR ── */
      , React.createElement('aside', { style: {display:isMobile?"none":"flex",width:sidebarOpen?"280px":"64px",background:C.sidebar,borderRight:`1px solid ${C.border}`,padding:sidebarOpen?"24px 18px":"24px 10px",boxSizing:"border-box",overflow:"auto",transition:"width 0.2s",flexShrink:0,flexDirection:"column",color:C.text},}
        , React.createElement('div', { style: {display:"flex",alignItems:"center",justifyContent:sidebarOpen?"space-between":"center",marginBottom:"24px"},}
          , sidebarOpen&&(
            React.createElement('svg', { xmlns: "http://www.w3.org/2000/svg", viewBox: "0 0 285.85 126.1"   , style: {width:"110px",height:"auto"},}
              , React.createElement('path', { fill: "#FFFFFF", d: "M248.3,36.76h-6.85c-.21,0-.41.1-.53.28l-2.24,3.28c-.12.17-.36.19-.5.04-2.96-3-7.43-4.8-13-4.8-12.4,0-22.06,9.59-22.06,21.62,0,9.44,6.64,16.01,17.49,16.01,3.45,0,6.63-.77,9.51-2.14.24-.12.51.1.45.37h0c-1.81,4.75-4.78,7.7-9.31,7.7h-91.93c-.3,0-.57.21-.63.51l-1.81,9.05c-.08.4.22.76.63.76h92.04c10.84,0,19.38-4.16,23.03-20.17h0s6.34-31.76,6.34-31.76c.08-.39-.22-.76-.63-.76ZM222.95,63.16c-5.09,0-8.04-2.95-8.04-7.01,0-5.76,5.09-10.55,11.59-10.55,5.09,0,8.04,2.95,8.04,7.01,0,5.76-5.09,10.55-11.59,10.55Z",})
              , React.createElement('path', { fill: "#FFFFFF", d: "M67.35,75.57c10.62,0,17.71-5.61,17.71-13.73,0-7.67-6.86-9.44-12.17-10.85-3.32-.88-5.98-1.62-5.98-3.47,0-1.62,1.55-3.1,4.58-3.1,2.54,0,3.74,1.15,3.9,2.89.03.32.31.57.63.57h10.49c.33,0,.6-.24.64-.57.04-.3.06-.63.06-.98,0-5.53-4.72-10.77-15.05-10.77s-17.27,5.83-17.27,13.28c0,6.94,6.42,9.08,11.59,10.55,3.84,1.11,6.57,1.99,6.57,4.13,0,1.84-2.07,3.17-5.09,3.17-3.27,0-4.78-1.2-4.99-3.36-.03-.3-.33-.55-.63-.55h-10.64c-.33,0-.6.24-.64.57-.04.4-.08.84-.08,1.28,0,5.83,5.02,10.92,16.38,10.92Z",})
              , React.createElement('path', { fill: "#FFFFFF", d: "M43.13,79.12l-2.08,10.33h-3.72c-.21,0-.36-.19-.32-.39l1.89-9.43c.06-.3.32-.51.63-.51h3.61Z",})
              , React.createElement('path', { fill: "#FFFFFF", d: "M133.45,37.23l-22.13,36.1c-7.52,12.25-12.22,16.12-23.07,16.12h-42.38l2.08-10.33h42.01c4.53,0,6.21-1.79,8.9-6.12.04-.07.06-.26.04-.34l-8.02-35.28c-.04-.24.19-.65.54-.65h10.7c.32,0,.56.29.59.45l4.45,20.88c.06.29.45.35.6.1l12.6-21.12c.05-.11.28-.31.53-.31h12.28c.25,0,.41.28.28.5Z",})
              , React.createElement('path', { fill: "#FFFFFF", d: "M130.47,74.39h10.21c.3,0,.57-.21.63-.51l3.59-17.93c1.55-7.01,5.39-10.03,9.81-10.03,3.17,0,5.17,1.7,5.17,5.39,0,.81-.08,1.7-.37,3.1l-3.83,19.23c-.08.39.22.76.63.76h10.21c.3,0,.57-.22.63-.51l4.25-21.33c.37-1.92.52-3.25.52-4.8,0-7.6-4.72-12.18-12.84-12.18-4.95,0-9.3,1.63-12.51,4.5-.19.17-.47.08-.54-.16l-.7-2.68c-.07-.28-.33-.48-.62-.48h-6.95c-.3,0-.57.21-.63.51l-7.27,36.35c-.08.4.22.76.63.76Z",})
              , React.createElement('path', { fill: "#FFFFFF", d: "M172.69,74.39h10.21c.3,0,.57-.21.63-.51l3.66-18.16c1.25-5.39,4.06-7.89,9.15-7.89h5.16c.3,0,.57-.21.63-.51l1.96-9.79c.08-.4-.22-.76-.63-.76h-3.65c-4.5,0-8.2,1.14-10.97,3.49-.19.16-.47.08-.53-.16l-.77-2.86c-.08-.28-.33-.47-.62-.47h-6.96c-.3,0-.57.21-.63.51l-7.27,36.35c-.08.4.22.76.63.76Z",})
            )
          )
          , React.createElement('button', { onClick: ()=>setSidebarOpen(p=>!p), style: {background:"transparent",border:"none",color:C.muted,cursor:"pointer",fontSize:"18px",padding:"4px",lineHeight:1},}, sidebarOpen?"◀":"▶")
        )

        , sidebarOpen&&(
          React.createElement(React.Fragment, null
            , React.createElement('div', { style: {background:auth.role==="coach"?C.accentSoft:C.purpleSoft,border:`1px solid ${auth.role==="coach"?"rgba(196,233,191,0.25)":"rgba(136,135,171,0.25)"}`,borderRadius:"10px",padding:"10px 12px",marginBottom:"16px"},}
              , React.createElement('div', { style: {fontSize:"11px",color:auth.role==="coach"?C.primary:C.purple,fontWeight:700,textTransform:"uppercase",letterSpacing:"0.8px",marginBottom:"3px"},}, auth.role==="coach"?"Треньор":"Клиент")
              , React.createElement('div', { style: {fontWeight:700,fontSize:"15px"},}, auth.name)
            )

            , React.createElement('div', { style: {display:"grid",gap:"6px",marginBottom:"20px"},}
              , navItems.map(([v,icon,label])=>(
                React.createElement('button', { key: v, onClick: ()=>setView(v), style: {background:view===v?C.accentSoft:"transparent",color:view===v?C.primary:C.muted,border:`1px solid ${view===v?"rgba(196,233,191,0.3)":"transparent"}`,borderRadius:"10px",padding:"10px 12px",cursor:"pointer",textAlign:"left",fontWeight:600,fontSize:"14px",fontFamily:"inherit",display:"flex",alignItems:"center",gap:"8px"},}
                  , icon, " " , label
                )
              ))
              , React.createElement('button', { onClick: logout, style: {background:"rgba(213,90,143,0.1)",color:C.danger,border:"1px solid rgba(213,90,143,0.25)",borderRadius:"10px",padding:"10px 12px",cursor:"pointer",textAlign:"left",fontWeight:600,fontSize:"14px",fontFamily:"inherit",display:"flex",alignItems:"center",gap:"8px"},}, "🚪 Изход"

              )
            )

            , React.createElement('div', { style: {fontSize:"11px",color:C.muted,textTransform:"uppercase",letterSpacing:"0.8px",marginBottom:"10px"},}, "Клиенти")

            , React.createElement('div', { style: {overflowY:"auto",flex:1},}
              , visibleClients.map(c=>{
                const ri=clients.findIndex(x=>x.name===c.name)
                const isSel=actualIdx===ri
                return (
                  React.createElement('div', { key: c.name, style: {display:"flex",alignItems:"center",gap:"4px",marginBottom:"4px"},}
                    , React.createElement('button', { onClick: ()=>{if(auth.role==="coach"){setSelIdx(ri);setCurrentWorkout([])}},
                      style: {flex:1,textAlign:"left",background:isSel?C.accentSoft:"transparent",color:isSel?C.primary:C.text,border:`1px solid ${isSel?"rgba(196,233,191,0.3)":"transparent"}`,borderRadius:"10px",padding:"10px 12px",cursor:auth.role==="coach"?"pointer":"default",fontFamily:"inherit"},}
                      , React.createElement('div', { style: {fontWeight:700,fontSize:"14px"},}, c.name)
                      , React.createElement('div', { style: {fontSize:"12px",color:isSel?"rgba(196,233,191,0.8)":C.muted,opacity:0.75},}, c.calorieTarget, " kcal · "   , c.proteinTarget, "г")
                    )
                    , auth.role==="coach"&&(
                      React.createElement('button', { onClick: ()=>setConfirmDelete({id:c.id,name:c.name}),
                        title: "Изтрий клиент" ,
                        style: {flexShrink:0,width:"28px",height:"28px",background:"transparent",border:`1px solid ${C.border}`,borderRadius:"8px",color:C.danger,cursor:"pointer",display:"flex",alignItems:"center",justifyContent:"center",fontSize:"13px",fontFamily:"inherit",padding:0},}, "✕"

                      )
                    )
                  )
                )
              })
            )

            , auth.role==="coach"&&(
              React.createElement('div', { style: {marginTop:"16px",paddingTop:"16px",borderTop:`1px solid ${C.border}`},}
                , React.createElement('div', { style: {fontWeight:700,fontSize:"13px",marginBottom:"10px",cursor:"pointer"}, onClick: ()=>setView("ranking"),}, "🏆 Топ 5 · 30 дни"     )
                , ranking.slice(0,5).map((item,i)=>(
                  React.createElement('div', { key: item.name, style: {display:"flex",alignItems:"center",gap:"8px",padding:"5px 0",borderBottom:i<4?`1px solid ${C.border}`:"none"},}
                    , React.createElement('div', { style: {width:"22px",height:"22px",borderRadius:"99px",background:i<3?C.accentSoft:"#1C1C24",color:i<3?C.primary:C.muted,display:"flex",alignItems:"center",justifyContent:"center",fontWeight:800,fontSize:"11px",flexShrink:0},}, i+1)
                    , React.createElement('div', { style: {fontSize:"13px",fontWeight:600,flex:1,overflow:"hidden",textOverflow:"ellipsis",whiteSpace:"nowrap"},}, item.name)
                    , React.createElement('div', { style: {fontSize:"12px",color:C.muted,flexShrink:0},}, item.points, "т")
                  )
                ))
              )
            )
          )
        )
      )

      /* ── MOBILE HEADER ── */
      , isMobile&&(
        React.createElement('div', { style: {flexShrink:0,background:C.sidebar,borderBottom:`1px solid ${C.border}`,display:"flex",alignItems:"center",justifyContent:"space-between",padding:"12px 16px",boxSizing:"border-box",height:"56px"},}
          , React.createElement('div', { style: {display:"flex",alignItems:"center",gap:"8px"},}
            , React.createElement('div', { style: {width:"28px",height:"28px",borderRadius:"8px",background:auth.role==="coach"?C.accentSoft:C.purpleSoft,display:"flex",alignItems:"center",justifyContent:"center",fontSize:"14px"},}
              , auth.role==="coach"?"🏋":"🏃"
            )
            , React.createElement('div', null
              , React.createElement('div', { style: {fontWeight:700,fontSize:"14px",lineHeight:1.2},}, auth.name)
              , React.createElement('div', { style: {fontSize:"10px",color:auth.role==="coach"?C.primary:C.purple,fontWeight:600,textTransform:"uppercase",letterSpacing:"0.5px",lineHeight:1},}, auth.role==="coach"?"Треньор":"Клиент")
            )
          )
          , React.createElement('button', { onClick: logout, style: {background:"transparent",color:C.muted,border:"none",cursor:"pointer",fontFamily:"inherit",fontWeight:600,fontSize:"12px",padding:"6px 10px",borderRadius:"8px",display:"flex",alignItems:"center",gap:"4px"},}, "🚪 "
             , React.createElement('span', null, "Изход")
          )
        )
      )

      /* ── MAIN ── */
      , React.createElement('main', { style: {flex:1,padding:isMobile?"16px 14px 84px 14px":"28px",overflowY:"auto",overflowX:"hidden",color:C.text,minWidth:0,maxWidth:"100%",boxSizing:"border-box"},}


        /* DASHBOARD — COACH VIEW */
        , view==="dashboard"&&auth.role==="coach"&&(
          React.createElement(React.Fragment, null
            /* Header with client name + goal editing */
            , React.createElement('div', { style: {display:"flex",justifyContent:"space-between",alignItems:"flex-start",marginBottom:"20px",gap:"16px",flexWrap:"wrap"},}
              , React.createElement('div', null
                , React.createElement('h2', { style: {margin:0,fontSize:"26px",fontWeight:800},}, client.name)
                , React.createElement('div', { style: {display:"flex",gap:"16px",marginTop:"6px",flexWrap:"wrap"},}
                  , React.createElement('span', { style: {fontSize:"13px",color:C.muted},}, "⚖️ " , React.createElement('span', { style: {color:C.text,fontWeight:600},}, latestWeight!==null?`${fmt1(latestWeight)} кг`:"—"))
                  , React.createElement('span', { style: {fontSize:"13px",color:C.muted},}, "〰️ avg "  , React.createElement('span', { style: {color:C.purple,fontWeight:600},}, latestAvg!==null?`${fmt1(latestAvg)} кг`:"—"))
                  , React.createElement('span', { style: {fontSize:"13px",color:C.muted},}, "trend " , React.createElement('span', { style: {color:weeklyRate===null?C.muted:weeklyRate>0?C.orange:C.primary,fontWeight:600},}, weeklyRate!==null?`${weeklyRate>0?"+":""}${fmt1(weeklyRate)} кг/сед`:"—"))
                  , React.createElement('span', { style: {fontSize:"13px",color:C.muted},}, "🔥 " , React.createElement('span', { style: {color:C.text,fontWeight:600},}, client.calorieTarget, " kcal" ))
                  , React.createElement('span', { style: {fontSize:"13px",color:C.muted},}, "🥩 " , React.createElement('span', { style: {color:C.text,fontWeight:600},}, client.proteinTarget, "г"))
                )
              )
              , React.createElement('div', { style: {display:"flex",gap:"8px",alignItems:"center",flexWrap:"wrap"},}
                , React.createElement('input', { type: "number", style: {...inp,width:"90px",fontSize:"13px",padding:"8px 10px"}, value: client.calorieTarget, onChange: e=>{const v=Number(e.target.value);if(!isNaN(v)){updateClient(c=>({...c,calorieTarget:v}));updateClientTargets(client.id,v,client.proteinTarget)}}, placeholder: "Kcal цел" ,})
                , React.createElement('input', { type: "number", style: {...inp,width:"85px",fontSize:"13px",padding:"8px 10px"}, value: client.proteinTarget, onChange: e=>{const v=Number(e.target.value);if(!isNaN(v)){updateClient(c=>({...c,proteinTarget:v}));updateClientTargets(client.id,client.calorieTarget,v)}}, placeholder: "Протеин г" ,})
              )
            )

            /* NEW WORKOUT FORM — primary focus */
            , (()=>{
              const CATS=[
                {key:"Предна верига",icon:"🫀"},
                {key:"Задна верига",icon:"🔙"},
                {key:"Бутащи",icon:"💪"},
                {key:"Дърпащи",icon:"🤜"},
                {key:"Горна част",icon:"🏋️"},
                {key:"Крака",icon:"🦵"},
                {key:"Кардио",icon:"🏃"},
              ]
              return (
                React.createElement('div', { style: {background:C.card,border:`2px solid ${C.primary}`,borderRadius:"16px",padding:"24px",marginBottom:"20px"},}
                  /* Header row: dot + title + coach */
                  , React.createElement('div', { style: {display:"flex",alignItems:"center",gap:"10px",marginBottom:"18px",flexWrap:"wrap"},}
                    , React.createElement('div', { style: {width:"8px",height:"8px",borderRadius:"99px",background:C.primary,boxShadow:`0 0 8px ${C.primary}`,flexShrink:0},})
                    , React.createElement('h3', { style: {margin:0,fontSize:"18px",fontWeight:800},}, "Тренировка — "  , todayDate())
                    , React.createElement('div', { style: {marginLeft:"auto"},}
                      , React.createElement('select', { value: selCoach, onChange: e=>setSelCoach(e.target.value), style: {...inp,width:"auto",fontSize:"14px",padding:"9px 12px",cursor:"pointer"},}
                        , coaches.map(c=>React.createElement('option', { key: c.name, value: c.name, style: {background:C.card},}, c.name))
                      )
                    )
                  )

                  /* Category tabs */
                  , React.createElement('div', { style: {display:"flex",gap:"6px",flexWrap:"wrap",marginBottom:"20px"},}
                    , CATS.map(({key,icon})=>{
                      const active=workoutCategory===key
                      return (
                        React.createElement('button', { key: key, onClick: ()=>setWorkoutCategory(key), style: {
                          background:active?C.primary:"transparent",
                          color:active?"#111":C.text,
                          WebkitTextFillColor:active?"#111":C.text,
                          border:`1px solid ${active?C.primary:C.border}`,
                          borderRadius:"99px",padding:"8px 14px",cursor:"pointer",
                          fontWeight:active?800:500,fontSize:"13px",fontFamily:"inherit",
                          transition:"all .15s",whiteSpace:"nowrap"
                        },}
                          , icon, " " , key
                        )
                      )
                    })
                  )

                  /* Exercise input — bigger fields */
                  , React.createElement('div', { style: {display:"grid",gridTemplateColumns:isMobile?"1fr":"2fr 1fr 1fr auto",gap:"10px",marginBottom:"14px",alignItems:"end"},}
                    , React.createElement('div', null
                      , React.createElement('div', { style: {fontSize:"12px",color:C.text,marginBottom:"5px",fontWeight:700,textTransform:"uppercase",letterSpacing:"0.5px"},}, "Упражнение")
                      , React.createElement('input', { style: {...inp,fontSize:"16px",padding:"13px 14px"}, placeholder: "напр. Клек, Bench press..."   , value: exName, onChange: e=>setExName(e.target.value), onKeyDown: e=>e.key==="Enter"&&addExercise(),})
                    )
                    , React.createElement('div', null
                      , React.createElement('div', { style: {fontSize:"12px",color:C.text,marginBottom:"5px",fontWeight:700,textTransform:"uppercase",letterSpacing:"0.5px"},}, "Серии × Повт."  )
                      , React.createElement('input', { style: {...inp,fontSize:"16px",padding:"13px 14px"}, placeholder: "4×8", value: exScheme, onChange: e=>setExScheme(e.target.value), onKeyDown: e=>e.key==="Enter"&&addExercise(),})
                    )
                    , React.createElement('div', null
                      , React.createElement('div', { style: {fontSize:"12px",color:C.text,marginBottom:"5px",fontWeight:700,textTransform:"uppercase",letterSpacing:"0.5px"},}, "Кг")
                      , React.createElement('input', { style: {...inp,fontSize:"16px",padding:"13px 14px"}, placeholder: "80", value: exWeight, onChange: e=>setExWeight(e.target.value), onKeyDown: e=>e.key==="Enter"&&addExercise(),})
                    )
                    , React.createElement('button', { onClick: addExercise, style: {...btn,padding:"13px 22px",fontSize:"22px",alignSelf:"flex-end",marginTop:"auto"},}, "+")
                  )

                  /* Current workout list */
                  , currentWorkout.length>0&&(
                    React.createElement('div', { style: {background:"rgba(0,0,0,0.25)",borderRadius:"12px",padding:"14px",marginBottom:"16px"},}
                      , React.createElement('div', { style: {fontSize:"12px",color:C.muted,marginBottom:"10px",fontWeight:600,textTransform:"uppercase",letterSpacing:"0.5px"},}
                        , workoutCategory, " · "  , currentWorkout.length, " упражнения"
                      )
                      , currentWorkout.map((ex,i)=>(
                        React.createElement('div', { key: i, style: {display:"grid",gridTemplateColumns:isMobile?"1fr 80px auto":"1fr 110px 80px auto",gap:"8px",padding:"10px 4px",borderBottom:i<currentWorkout.length-1?`1px solid ${C.border}`:"none",alignItems:"center"},}
                          , React.createElement('span', { style: {fontWeight:600,fontSize:"15px"},}, ex.exercise)
                          , React.createElement('span', { style: {color:C.muted,fontSize:"14px"},}, ex.scheme)
                          , React.createElement('span', { style: {color:C.muted,fontSize:"14px"},}, ex.weight, " кг" )
                          , React.createElement('button', { onClick: ()=>setCurrentWorkout(prev=>prev.filter((_,j)=>j!==i)), style: btnDanger,}, "✕")
                        )
                      ))
                    )
                  )

                  , React.createElement('button', { onClick: saveWorkout, disabled: !currentWorkout.length, style: {...btn,background:currentWorkout.length?"#3D6B38":"#2A2A2A",opacity:currentWorkout.length?1:0.7,width:"100%",padding:"15px",fontSize:"16px",color:"#FFFFFF",fontWeight:800,letterSpacing:"0.3px",border:"none"},}, "💾 Запази тренировката ("
                       , currentWorkout.length, " упражнения)"
                  )
                )
              )
            })()

            /* Workout history — last sessions for reference */
            , React.createElement('div', { style: {background:C.card,border:`1px solid ${C.border}`,borderRadius:"16px",padding:"22px"},}
              , React.createElement('h3', { style: {margin:"0 0 16px",fontSize:"16px",fontWeight:800},}, "История на тренировките"  )
              , client.workouts.length===0
                ?React.createElement('div', { style: {color:C.muted,padding:"8px 0"},}, "Няма записани тренировки."  )
                :client.workouts.map((w,i)=>(
                  React.createElement('div', { key: i, style: {marginBottom:"16px",paddingBottom:"14px",borderBottom:i<client.workouts.length-1?`1px solid ${C.border}`:"none"},}
                    , React.createElement('div', { style: {display:"flex",justifyContent:"space-between",marginBottom:"8px",alignItems:"center"},}
                      , React.createElement('div', { style: {display:"flex",alignItems:"center",gap:"8px",flexWrap:"wrap"},}
                        , React.createElement('span', { style: {fontWeight:700,color:i===0?C.primary:C.text},}, w.date)
                        , w.category&&React.createElement('span', { style: {fontSize:"12px",background:C.purpleSoft,color:C.purple,border:`1px solid rgba(136,135,171,0.25)`,borderRadius:"99px",padding:"2px 9px",fontWeight:600},}, w.category)
                        , i===0&&React.createElement('span', { style: {fontSize:"11px",background:C.accentSoft,color:C.primary,border:"1px solid rgba(196,233,191,0.3)",borderRadius:"99px",padding:"2px 8px",fontWeight:700},}, "последна")
                      )
                      , React.createElement('span', { style: {color:C.muted,fontSize:"13px",flexShrink:0},}, "треньор: " , w.coach||"—")
                    )
                    , React.createElement('div', { style: {display:"grid",gap:"4px"},}
                      , w.items.map((ex,j)=>(
                        React.createElement('div', { key: j, style: {display:"grid",gridTemplateColumns:"1fr 110px 80px",gap:"10px",padding:"4px 0",fontSize:"14px"},}
                          , React.createElement('span', { style: {color:C.text,fontWeight:500},}, ex.exercise)
                          , React.createElement('span', { style: {color:C.muted},}, ex.scheme)
                          , React.createElement('span', { style: {color:C.muted},}, ex.weight, " кг" )
                        )
                      ))
                    )
                  )
                ))
              
            )
          )
        )

        /* DASHBOARD — CLIENT VIEW */
        , view==="dashboard"&&auth.role==="client"&&(
          React.createElement(React.Fragment, null
            , React.createElement('div', { style: {marginBottom:"24px"},}
              , React.createElement('h2', { style: {margin:0,fontSize:"26px",fontWeight:800},}, "Здравей, " , client.name, " 👋" )
              , React.createElement('div', { style: {color:C.muted,fontSize:"14px",marginTop:"4px"},}, "Твоят прогрес" )
            )

            /* Calorie + protein rings */
            , React.createElement('div', { style: {display:"grid",gridTemplateColumns:isMobile?"repeat(2,1fr)":"repeat(4,1fr)",gap:"12px",marginBottom:"20px"},}
              , React.createElement(StatCard, { label: "Калории цел" , value: client.calorieTarget, accent: true,})
              , React.createElement(StatCard, { label: "Протеин цел" , value: `${client.proteinTarget}г`, accent: true,})
              , [["Днес калории",kcalPct,foodTotals.kcal,client.calorieTarget,"",C.primary],["Днес протеин",protPct,foodTotals.protein,client.proteinTarget,"г",C.purple]].map(([label,pct,cur,tgt,suf,color])=>(
                React.createElement('div', { key: label, style: {background:C.card,border:`1px solid ${C.border}`,borderRadius:"14px",padding:"16px 18px",display:"flex",alignItems:"center",gap:"14px"},}
                  , React.createElement('div', { style: {position:"relative",flexShrink:0},}
                    , React.createElement(ProgressRing, { percent: pct, color: color, size: 64,})
                    , React.createElement('div', { style: {position:"absolute",inset:0,display:"flex",alignItems:"center",justifyContent:"center",fontSize:"11px",fontWeight:700,color},}, Math.round(pct), "%")
                  )
                  , React.createElement('div', null
                    , React.createElement('div', { style: {fontSize:"12px",color:C.muted,marginBottom:"5px",textTransform:"uppercase",letterSpacing:"0.6px"},}, label)
                    , React.createElement('div', { style: {fontSize:"22px",fontWeight:800,color,lineHeight:1},}, fmt1(cur), suf)
                    , React.createElement('div', { style: {color:C.muted,fontSize:"12px",marginTop:"3px"},}, "от " , tgt, suf)
                  )
                )
              ))
            )

            /* Weight stats */
            , React.createElement('div', { style: {display:"grid",gridTemplateColumns:isMobile?"1fr":"repeat(3,1fr)",gap:"12px",marginBottom:"20px"},}
              , React.createElement('div', { style: {background:C.card,border:`1px solid ${C.border}`,borderRadius:"14px",padding:"16px 18px"},}
                , React.createElement('div', { style: {fontSize:"12px",color:C.muted,marginBottom:"6px",textTransform:"uppercase",letterSpacing:"0.6px"},}, "Килограми")
                , React.createElement('div', { style: {fontSize:"24px",fontWeight:800},}, latestWeight!==null?`${fmt1(latestWeight)} кг`:"—")
                , React.createElement('div', { style: {fontSize:"12px",color:C.muted,marginTop:"4px"},}, "последно измерване" )
              )
              , React.createElement('div', { style: {background:C.card,border:`1px solid ${C.border}`,borderRadius:"14px",padding:"16px 18px"},}
                , React.createElement('div', { style: {fontSize:"12px",color:C.muted,marginBottom:"6px",textTransform:"uppercase",letterSpacing:"0.6px"},}, "Moving Average" )
                , React.createElement('div', { style: {fontSize:"24px",fontWeight:800,color:C.purple},}, latestAvg!==null?`${fmt1(latestAvg)} кг`:"—")
                , React.createElement('div', { style: {fontSize:"12px",color:C.muted,marginTop:"4px"},}, "7-дневна средна" )
              )
              , React.createElement('div', { style: {background:C.card,border:`1px solid ${C.border}`,borderRadius:"14px",padding:"16px 18px"},}
                , React.createElement('div', { style: {fontSize:"12px",color:C.muted,marginBottom:"6px",textTransform:"uppercase",letterSpacing:"0.6px"},}, "Weekly Rate" )
                , React.createElement('div', { style: {fontSize:"24px",fontWeight:800,color:weeklyRate===null?C.text:weeklyRate>0?C.orange:C.primary},}, weeklyRate!==null?`${weeklyRate>0?"+":""}${fmt1(weeklyRate)} кг/сед`:"—")
                , React.createElement('div', { style: {fontSize:"12px",color:C.muted,marginTop:"4px"},}, weeklyRate===null?"недостатъчно данни":weeklyRate>0?"качване ▲":"сваляне ▼")
              )
            )

            /* My ranking */
            , (()=>{
              const myRank=ranking.findIndex(r=>r.name===client.name)
              const myData=ranking[myRank]
              if(!myData) return null
              const medals=["🥇","🥈","🥉"]
              const posLabel=myRank<3?medals[myRank]:`#${myRank+1}`
              return (
                React.createElement('div', { style: {background:C.card,border:`1px solid ${C.border}`,borderRadius:"16px",padding:"22px"},}
                  , React.createElement('div', { style: {display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:"16px"},}
                    , React.createElement('h3', { style: {margin:0,fontSize:"16px",fontWeight:800},}, "🏆 Моята позиция в класацията"    )
                    , React.createElement('button', { onClick: ()=>setView("ranking"), style: {...btnGhost,fontSize:"13px",padding:"7px 14px"},}, "Виж всички →"  )
                  )
                  , React.createElement('div', { style: {display:"flex",alignItems:"center",gap:"20px",background:C.accentSoft,border:"1px solid rgba(196,233,191,0.2)",borderRadius:"12px",padding:"16px 20px"},}
                    , React.createElement('div', { style: {fontSize:"40px",lineHeight:1,minWidth:"52px",textAlign:"center"},}, posLabel)
                    , React.createElement('div', { style: {flex:1},}
                      , React.createElement('div', { style: {fontWeight:800,fontSize:"20px",color:C.primary,marginBottom:"6px"},}, myData.points, " точки" )
                      , React.createElement('div', { style: {display:"flex",gap:"16px",flexWrap:"wrap"},}
                        , [["⚖️",myData.breakdown.weightPts],["💪",myData.breakdown.workoutPts],["🔥",myData.breakdown.calPts],["🥩",myData.breakdown.protPts]].map(([ico,pts])=>(
                          React.createElement('span', { key: ico, style: {fontSize:"13px",color:C.muted},}, ico, " " , React.createElement('span', { style: {color:C.text,fontWeight:700},}, pts))
                        ))
                      )
                    )
                    , React.createElement('div', { style: {textAlign:"right",flexShrink:0},}
                      , React.createElement('div', { style: {fontSize:"13px",color:C.muted},}, "от " , ranking.length, " клиенти" )
                      , myRank>0&&React.createElement('div', { style: {fontSize:"13px",color:C.muted,marginTop:"4px"},}, "до 🥇: "  , React.createElement('span', { style: {color:C.primary,fontWeight:700},}, ranking[0].points-myData.points, " т." ))
                    )
                  )
                )
              )
            })()
          )
        )
        /* FOOD TAB */
        , view==="food"&&(
          React.createElement(React.Fragment, null
            , React.createElement('div', { style: {display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:"24px"},}
              , React.createElement('div', null
                , React.createElement('h2', { style: {margin:0,fontSize:"26px",fontWeight:800},}, "🥗 Хранителен тракер"  )
                , React.createElement('div', { style: {color:C.muted,marginTop:"4px",fontSize:"14px"},}, client.name)
              )
              , React.createElement('div', { style: {display:"flex",gap:"10px",alignItems:"center"},}
                , React.createElement('input', { type: "date", value: foodDate, onChange: e=>setFoodDate(e.target.value), style: {...inp,width:"160px"},})
                , React.createElement('button', { onClick: ()=>setFoodModalOpen(true), style: btn,}, "+ Добави храна"  )
              )
            )
            , ProgressPair
            , React.createElement('div', { style: {background:C.card,border:`1px solid ${C.border}`,borderRadius:"16px",padding:"18px",marginBottom:"20px"},}
              , React.createElement('div', { style: {fontSize:"13px",color:C.muted,marginBottom:"10px"},}, "Бързо добавяне" )
              , React.createElement('div', { style: {display:"flex",flexWrap:"wrap",gap:"8px"},}
                , quickFoods.map(item=>(
                  React.createElement('button', { key: item.key, onClick: ()=>addQuickFood(item.key,item.grams), style: {background:C.purpleSoft,color:C.purple,border:"1px solid rgba(136,135,171,0.25)",borderRadius:"99px",padding:"8px 14px",cursor:"pointer",fontWeight:600,fontSize:"13px",fontFamily:"inherit"},}, "+ "
                     , _optionalChain([foodDB, 'access', _9 => _9[item.key], 'optionalAccess', _10 => _10.label]), " " , item.grams, "г"
                  )
                ))
              )
            )
            , React.createElement('div', { style: {background:C.card,border:`1px solid ${C.border}`,borderRadius:"16px",padding:"22px"},}
              , React.createElement('h3', { style: {margin:"0 0 16px",fontSize:"16px",fontWeight:800},}, "Храна за "  , selFoodDate)
              , mealsForDate.length===0
                ?React.createElement('div', { style: {color:C.muted},}, "Няма въведена храна за тази дата."     )
                :React.createElement(React.Fragment, null
                  , mealsForDate.map((item,i)=>(
                    React.createElement('div', { key: item.id||i, style: {display:"grid",gridTemplateColumns:isMobile?(auth.role==="coach"?"1fr 60px auto":"1fr 60px"):(auth.role==="coach"?"1fr 80px 80px 110px auto":"1fr 80px 80px 110px"),gap:"10px",padding:"10px 0",borderBottom:`1px solid ${C.border}`,alignItems:"center"},}
                      , React.createElement('span', { style: {fontWeight:600},}, item.label)
                      , React.createElement('span', { style: {color:C.muted},}, item.grams, "г")
                      , React.createElement('span', null, item.kcal, " kcal" )
                      , React.createElement('span', { style: {color:C.purple},}, item.protein, "г")
                      , auth.role==="coach"&&React.createElement('button', { onClick: ()=>deleteMealFromClient(client.id,item.id), style: btnDanger,}, "✕")
                    )
                  ))
                  , React.createElement('div', { style: {marginTop:"12px",fontWeight:700,color:C.primary},}, "Общо: " , foodTotals.kcal, " kcal · "   , fmt1(foodTotals.protein), "г протеин" )
                )
              
            )
          )
        )

        /* WEIGHT TAB */
        , view==="weight"&&(
          React.createElement(React.Fragment, null
            , React.createElement('div', { style: {marginBottom:"24px"},}
              , React.createElement('h2', { style: {margin:0,fontSize:"26px",fontWeight:800},}, "⚖️ Тракер за тегло"   )
              , React.createElement('div', { style: {color:C.muted,marginTop:"4px",fontSize:"14px"},}, client.name)
            )
            , React.createElement('div', { style: {display:"grid",gridTemplateColumns:isMobile?"1fr":"repeat(3,1fr)",gap:"12px",marginBottom:"20px"},}
              , React.createElement(StatCard, { label: "Последно тегло" , value: latestWeight!==null?`${fmt1(latestWeight)} кг`:"—",})
              , React.createElement(StatCard, { label: "Moving average" , value: latestAvg!==null?`${fmt1(latestAvg)} кг`:"—",})
              , React.createElement(StatCard, { label: "Weekly rate" , value: weeklyRate!==null?`${weeklyRate>0?"+":""}${fmt1(weeklyRate)} кг/сед`:"—",})
            )
            , React.createElement('div', { style: {background:C.card,border:`1px solid ${C.border}`,borderRadius:"16px",padding:"22px",marginBottom:"20px"},}
              , React.createElement('h3', { style: {margin:"0 0 16px",fontSize:"16px",fontWeight:800},}, "Запиши тегло" )
              , React.createElement('div', { style: {display:"flex",gap:"10px",alignItems:"center",flexWrap:"wrap"},}
                , React.createElement('input', { type: "date", value: weightDate, onChange: e=>setWeightDate(e.target.value), style: {...inp,width:"160px"},})
                , React.createElement('input', { style: {...inp,width:"160px"}, placeholder: "Тегло в кг"  , value: weightInput, onChange: e=>setWeightInput(e.target.value), onKeyDown: e=>e.key==="Enter"&&saveWeight(),})
                , React.createElement('button', { onClick: saveWeight, style: btn,}, "Запази")
              )
            )
            , React.createElement('div', { style: {background:C.card,border:`1px solid ${C.border}`,borderRadius:"16px",padding:"22px",marginBottom:"20px"},}
              , React.createElement('h3', { style: {margin:"0 0 16px",fontSize:"16px",fontWeight:800},}, "Графика")
              , React.createElement(WeightChart, { data: weightChartData,})
            )
            , React.createElement('div', { style: {background:C.card,border:`1px solid ${C.border}`,borderRadius:"16px",padding:"22px"},}
              , React.createElement('h3', { style: {margin:"0 0 4px",fontSize:"16px",fontWeight:800},}, "История")
              , React.createElement('div', { style: {color:C.muted,fontSize:"13px",marginBottom:"16px"},}, "Точки за тегло: "   , (client.weightLogs||[]).filter(w=>new Set(last30Days()).has(w.date)).length * 2, " т. (последните 30 дни)"    )
              , sortedWeightLogs.length===0
                ?React.createElement('div', { style: {color:C.muted},}, "Няма записани тегления."  )
                :[...sortedWeightLogs].reverse().map((item,i)=>(
                  React.createElement('div', { key: i, style: {display:"flex",justifyContent:"space-between",alignItems:"center",padding:"10px 0",borderBottom:`1px solid ${C.border}`},}
                    , React.createElement('span', { style: {color:C.muted},}, item.date)
                    , React.createElement('span', { style: {fontWeight:700,fontSize:"16px"},}, fmt1(item.weight), " кг" )
                    , auth.role==="coach"&&React.createElement('button', { onClick: ()=>deleteWeightLog(client.id,item.id,item.date), style: btnDanger,}, "Изтрий")
                  )
                ))
              
            )
          )
        )

        /* RANKING TAB */
        , view==="ranking"&&(
          React.createElement(React.Fragment, null
            , React.createElement('div', { style: {marginBottom:"28px"},}
              , React.createElement('h2', { style: {margin:"0 0 6px",fontSize:"26px",fontWeight:800},}, "🏆 Класация" )
              , React.createElement('div', { style: {color:C.muted,fontSize:"14px"},}, "Точки за последните 30 дни"    )
            )
            , React.createElement('div', { style: {display:"grid",gridTemplateColumns:isMobile?"repeat(2,1fr)":"repeat(4,1fr)",gap:"10px",marginBottom:"28px"},}
              , [{icon:"⚖️",label:"Тегло",desc:"2 точки / ден",color:C.blue},{icon:"💪",label:"Тренировка",desc:"5 точки / занятие",color:C.primary},{icon:"🔥",label:"Калории цел",desc:"3 точки / ден",color:C.orange},{icon:"🥩",label:"Протеин цел",desc:"3 точки / ден",color:C.purple}].map(item=>(
                React.createElement('div', { key: item.label, style: {background:C.card,border:`1px solid ${C.border}`,borderRadius:"14px",padding:"14px 16px"},}
                  , React.createElement('div', { style: {fontSize:"20px",marginBottom:"6px"},}, item.icon)
                  , React.createElement('div', { style: {fontWeight:700,color:item.color,fontSize:"14px"},}, item.label)
                  , React.createElement('div', { style: {color:C.muted,fontSize:"12px",marginTop:"3px"},}, item.desc)
                )
              ))
            )

            , ranking.length>=3&&(
              React.createElement('div', { style: {display:"flex",alignItems:"flex-end",justifyContent:"center",gap:"12px",marginBottom:"28px"},}
                , React.createElement('div', { style: {textAlign:"center",flex:1,maxWidth:"180px"},}
                  , React.createElement('div', { style: {fontSize:"28px",marginBottom:"6px"},}, "🥈")
                  , React.createElement('div', { style: {background:C.card,border:`1px solid ${C.border}`,borderRadius:"16px",padding:"16px 10px",height:"110px",display:"flex",flexDirection:"column",justifyContent:"center"},}
                    , React.createElement('div', { style: {fontWeight:800,fontSize:"15px",marginBottom:"6px"},}, _optionalChain([ranking, 'access', _11 => _11[1], 'optionalAccess', _12 => _12.name]))
                    , React.createElement('div', { style: {fontSize:"22px",fontWeight:800,color:"#94A3B8"},}, _optionalChain([ranking, 'access', _13 => _13[1], 'optionalAccess', _14 => _14.points]))
                    , React.createElement('div', { style: {color:C.muted,fontSize:"12px"},}, "точки")
                  )
                )
                , React.createElement('div', { style: {textAlign:"center",flex:1,maxWidth:"200px"},}
                  , React.createElement('div', { style: {fontSize:"36px",marginBottom:"6px"},}, "🥇")
                  , React.createElement('div', { style: {background:C.accentSoft,border:"1px solid rgba(196,233,191,0.35)",borderRadius:"16px",padding:"16px 10px",height:"130px",display:"flex",flexDirection:"column",justifyContent:"center",boxShadow:"0 0 30px rgba(196,233,191,0.13)"},}
                    , React.createElement('div', { style: {fontWeight:800,fontSize:"16px",marginBottom:"6px",color:C.primary},}, _optionalChain([ranking, 'access', _15 => _15[0], 'optionalAccess', _16 => _16.name]))
                    , React.createElement('div', { style: {fontSize:"28px",fontWeight:800,color:C.primary},}, _optionalChain([ranking, 'access', _17 => _17[0], 'optionalAccess', _18 => _18.points]))
                    , React.createElement('div', { style: {color:"rgba(196,233,191,0.65)",fontSize:"12px"},}, "точки")
                  )
                )
                , React.createElement('div', { style: {textAlign:"center",flex:1,maxWidth:"180px"},}
                  , React.createElement('div', { style: {fontSize:"28px",marginBottom:"6px"},}, "🥉")
                  , React.createElement('div', { style: {background:C.card,border:`1px solid ${C.border}`,borderRadius:"16px",padding:"16px 10px",height:"90px",display:"flex",flexDirection:"column",justifyContent:"center"},}
                    , React.createElement('div', { style: {fontWeight:800,fontSize:"15px",marginBottom:"6px"},}, _optionalChain([ranking, 'access', _19 => _19[2], 'optionalAccess', _20 => _20.name]))
                    , React.createElement('div', { style: {fontSize:"22px",fontWeight:800,color:"#CD7F32"},}, _optionalChain([ranking, 'access', _21 => _21[2], 'optionalAccess', _22 => _22.points]))
                    , React.createElement('div', { style: {color:C.muted,fontSize:"12px"},}, "точки")
                  )
                )
              )
            )

            , React.createElement('div', { style: {background:C.card,border:`1px solid ${C.border}`,borderRadius:"16px",overflow:"hidden"},}
              , React.createElement('div', { style: {display:"grid",gridTemplateColumns:isMobile?"40px 1fr 70px 70px":"50px 1fr 80px 80px 80px 80px 90px",padding:isMobile?"10px 12px":"12px 20px",borderBottom:`1px solid ${C.border}`,background:"#141312",color:C.text},}
                , ["#","Клиент","⚖️ Тегло","💪 Тренир.","🔥 Kcal","🥩 Протеин","Общо"].map((h,i)=>(
                  React.createElement('div', { key: i, style: {fontSize:"11px",color:C.muted,fontWeight:700,textTransform:"uppercase",letterSpacing:"0.6px",textAlign:i>=2?"center":"left"},}, h)
                ))
              )
              , ranking.map((item,i)=>{
                const isMe=item.name===auth.name
                const medals=["🥇","🥈","🥉"]
                return (
                  React.createElement('div', { key: item.name, style: {display:"grid",gridTemplateColumns:isMobile?"40px 1fr 70px 70px":"50px 1fr 80px 80px 80px 80px 90px",padding:isMobile?"10px 12px":"14px 20px",borderBottom:i<ranking.length-1?`1px solid ${C.border}`:"none",background:isMe?"rgba(196,233,191,0.06)":"transparent",alignItems:"center"},}
                    , React.createElement('div', { style: {fontWeight:800,fontSize:"16px"},}, i<3?medals[i]:React.createElement('span', { style: {color:C.muted,fontSize:"14px"},}, i+1))
                    , React.createElement('div', { style: {fontWeight:isMe?800:600,color:isMe?C.primary:C.text,display:"flex",alignItems:"center",gap:"8px"},}
                      , item.name
                      , isMe&&React.createElement('span', { style: {fontSize:"10px",background:C.accentSoft,color:C.primary,border:"1px solid rgba(196,233,191,0.35)",borderRadius:"99px",padding:"2px 8px",fontWeight:700},}, "ТИ")
                    )
                    , React.createElement('div', { style: {textAlign:"center",color:C.blue,fontWeight:700},}, item.breakdown.weightPts)
                    , React.createElement('div', { style: {textAlign:"center",color:C.primary,fontWeight:700},}, item.breakdown.workoutPts)
                    , React.createElement('div', { style: {textAlign:"center",color:C.orange,fontWeight:700},}, item.breakdown.calPts)
                    , React.createElement('div', { style: {textAlign:"center",color:C.purple,fontWeight:700},}, item.breakdown.protPts)
                    , React.createElement('div', { style: {textAlign:"center",fontWeight:800,fontSize:"16px",color:i===0?C.primary:C.text},}, item.points)
                  )
                )
              })
            )
            , React.createElement('div', { style: {marginTop:"14px",color:C.muted,fontSize:"12px",textAlign:"center"},}, "Класацията се обновява в реално време · последните 30 дни"         )
          )
        )
      )

      /* ── Confirm Delete Modal ───────────────────────── */
      , confirmDelete&&(
        React.createElement('div', { style: {position:"fixed",inset:0,background:"rgba(0,0,0,0.7)",display:"flex",alignItems:"center",justifyContent:"center",zIndex:1000},}
          , React.createElement('div', { style: {background:C.card,border:`1px solid ${C.border}`,borderRadius:"20px",padding:"32px",maxWidth:"380px",width:"90%",fontFamily:"'DM Sans',sans-serif",color:C.text},}
            , React.createElement('div', { style: {fontSize:"28px",textAlign:"center",marginBottom:"12px"},}, "⚠️")
            , React.createElement('div', { style: {fontSize:"20px",fontWeight:800,textAlign:"center",marginBottom:"8px"},}, "Изтрий клиент?" )
            , React.createElement('div', { style: {color:C.muted,fontSize:"14px",textAlign:"center",marginBottom:"24px",opacity:0.8},}, "Всички данни на "
                 , React.createElement('span', { style: {color:C.danger,fontWeight:700},}, confirmDelete.name), " ще бъдат изтрити — храна, тренировки, тегло. Това не може да се върне."
            )
            , React.createElement('div', { style: {display:"grid",gridTemplateColumns:isMobile?"1fr":"1fr 1fr",gap:"10px"},}
              , React.createElement('button', { onClick: ()=>setConfirmDelete(null),
                style: {padding:"12px",background:"transparent",border:`1px solid ${C.border}`,borderRadius:"12px",color:C.text,cursor:"pointer",fontFamily:"inherit",fontWeight:700,fontSize:"14px"},}, "Отказ"

              )
              , React.createElement('button', { onClick: async()=>{await deleteClient(confirmDelete.id);setConfirmDelete(null)},
                style: {padding:"12px",background:C.danger,border:"none",borderRadius:"12px",color:"#fff",cursor:"pointer",fontFamily:"inherit",fontWeight:800,fontSize:"14px"},}, "Изтрий"

              )
            )
          )
        )
      )

      /* Mobile bottom navigation */
      , isMobile&&(
        React.createElement('nav', { style: {position:"fixed",bottom:0,left:0,right:0,height:"72px",background:C.sidebar,borderTop:`1px solid ${C.border}`,display:"flex",alignItems:"center",justifyContent:"space-around",zIndex:50,paddingBottom:"env(safe-area-inset-bottom)",paddingTop:"4px"},}
          , navItems.map(([v,icon,label])=>(
            React.createElement('button', { key: v, onClick: ()=>setView(v), style: {flex:1,display:"flex",flexDirection:"column",alignItems:"center",gap:"4px",background:"transparent",border:"none",cursor:"pointer",padding:"6px 2px",color:view===v?C.primary:C.muted,fontFamily:"inherit",minWidth:0},}
              , React.createElement('span', { style: {fontSize:"22px",lineHeight:1},}, icon)
              , React.createElement('span', { style: {fontSize:"9px",fontWeight:700,textTransform:"uppercase",letterSpacing:"0.2px"},}, label)
            )
          ))
          , auth.role==="coach"&&(
            React.createElement('button', { onClick: ()=>setShowClientMenu(p=>!p), style: {flex:1,display:"flex",flexDirection:"column",alignItems:"center",gap:"4px",background:"transparent",border:"none",cursor:"pointer",padding:"6px 2px",color:showClientMenu?C.primary:C.muted,fontFamily:"inherit",minWidth:0},}
              , React.createElement('span', { style: {fontSize:"22px",lineHeight:1},}, "👥")
              , React.createElement('span', { style: {fontSize:"9px",fontWeight:700,textTransform:"uppercase",letterSpacing:"0.2px"},}, "Клиенти")
            )
          )
        )
      )
      /* Mobile client menu overlay */
      , isMobile&&showClientMenu&&auth.role==="coach"&&(
        React.createElement('div', { style: {position:"fixed",bottom:"64px",left:0,right:0,maxHeight:"60vh",background:C.sidebar,borderTop:`1px solid ${C.border}`,zIndex:49,overflowY:"auto",padding:"16px"},}
          , React.createElement('div', { style: {fontWeight:700,fontSize:"14px",marginBottom:"12px",color:C.muted},}, "Избери клиент" )
          , visibleClients.map(c=>{
            const ri=clients.findIndex(x=>x.name===c.name)
            const isSel=actualIdx===ri
            return (
              React.createElement('button', { key: c.name, onClick: ()=>{setSelIdx(ri);setCurrentWorkout([]);setShowClientMenu(false)},
                style: {width:"100%",textAlign:"left",background:isSel?C.accentSoft:"transparent",color:isSel?C.primary:C.text,border:`1px solid ${isSel?"rgba(196,233,191,0.3)":C.border}`,borderRadius:"10px",padding:"12px 14px",cursor:"pointer",fontFamily:"inherit",marginBottom:"8px",display:"block"},}
                , React.createElement('div', { style: {fontWeight:700,fontSize:"14px"},}, c.name)
                , React.createElement('div', { style: {fontSize:"12px",color:C.muted,marginTop:"2px"},}, c.calorieTarget, " kcal · "   , c.proteinTarget, "г протеин" )
              )
            )
          })
        )
      )
    )
  )
}
