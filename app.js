const KEY="streaks-v1";
const EMOJIS=["🍱","🏋️","🧗","📚","♟️","🎸","💰","🧘","💻","🧹","🥗","🚶","💧","😴","🎯"];
const MILESTONES=[3,7,14,30,60,100,365];

let data=JSON.parse(localStorage.getItem(KEY)||"null")||{streaks:[]};
const $=id=>document.getElementById(id);
const iso=d=>{const x=new Date(d);return new Date(x.getTime()-x.getTimezoneOffset()*60000).toISOString().slice(0,10)};
const today=iso(new Date());
function save(){localStorage.setItem(KEY,JSON.stringify(data))}
function parseDate(s){return new Date(s+"T12:00:00")}
function diff(a,b){return Math.round((parseDate(b)-parseDate(a))/86400000)}
function applicable(s,date){
  const dow=parseDate(date).getDay();
  if(s.frequency==="daily") return true;
  if(s.frequency==="weekdays") return dow>=1&&dow<=5;
  return (s.customDays||[]).includes(dow);
}
function done(s,date){return !!s.completed?.includes(date)}
function currentStreak(s){
  let d=today,n=0;
  while(true){
    if(!applicable(s,d)){d=iso(new Date(parseDate(d)-86400000));continue}
    if(!done(s,d))break;
    n++; d=iso(new Date(parseDate(d)-86400000));
  }
  return n;
}
function bestStreak(s){
  const days=(s.completed||[]).sort();
  let best=0,run=0,last=null;
  for(const d of days){
    if(!applicable(s,d)) continue;
    if(last && diff(last,d)===1) run++; else run=1;
    best=Math.max(best,run);last=d;
  }
  return best;
}
function total(s){return (s.completed||[]).length}
function toggle(s,date=today){
  s.completed=s.completed||[];
  const i=s.completed.indexOf(date);
  if(i>=0)s.completed.splice(i,1);else s.completed.push(date);
  save();render();
}
function fmtDate(d){return parseDate(d).toLocaleDateString(undefined,{weekday:"long",month:"long",day:"numeric"})}
function render(){
  $("todayLabel").textContent=fmtDate(today);
  const applicableToday=data.streaks.filter(s=>applicable(s,today));
  const completedToday=applicableToday.filter(s=>done(s,today)).length;
  $("todayScore").textContent=`${completedToday}/${applicableToday.length} complete`;
  $("todayList").innerHTML=applicableToday.length?applicableToday.map(s=>`
    <div class="card today-row">
      <div class="icon">${s.icon}</div><div class="grow"><div class="name">${esc(s.name)}</div><div class="meta">🔥 ${currentStreak(s)} day streak</div></div>
      <button class="done ${done(s,today)?"checked":""}" data-toggle="${s.id}">${done(s,today)?"✓ Done":"Mark done"}</button>
    </div>`).join(""):`<div class="empty"><strong>Nothing to track today</strong>Add your first streak with +</div>`;
  $("streakList").innerHTML=data.streaks.length?data.streaks.map(s=>`
    <div class="card streak-row" data-open="${s.id}">
      <div class="icon">${s.icon}</div><div class="grow"><div class="name">${esc(s.name)}</div><div class="meta">${s.frequency==="weekdays"?"Weekdays":s.frequency==="daily"?"Every day":"Custom schedule"} · ${total(s)} completed</div></div>
      <div style="text-align:right"><div class="big-number">${currentStreak(s)}</div><div class="meta">🔥 streak</div></div><div class="arrow">›</div>
    </div>`).join(""):`<div class="empty"><strong>Build your first streak</strong>Track anything you want to do consistently.</div>`;
  document.querySelectorAll("[data-toggle]").forEach(b=>b.onclick=e=>{e.stopPropagation();toggle(data.streaks.find(s=>s.id===b.dataset.toggle))});
  document.querySelectorAll("[data-open]").forEach(c=>c.onclick=()=>openDetail(c.dataset.open));
}
function esc(x){return String(x).replace(/[&<>"']/g,m=>({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;"}[m]))}

function openAdd(){
  $("modalContent").innerHTML=`<h2>Create a streak</h2>
  <div class="field"><label>NAME</label><input id="newName" placeholder="e.g. Bring lunch to work"></div>
  <div class="field"><label>ICON</label><div class="emoji-grid">${EMOJIS.map((e,i)=>`<button class="emoji ${i===0?"selected":""}" data-e="${e}">${e}</button>`).join("")}</div></div>
  <div class="field"><label>HOW OFTEN?</label><select id="newFreq"><option value="daily">Every day</option><option value="weekdays">Weekdays</option><option value="custom">Custom days</option></select></div>
  <div class="field hidden" id="customDays"><label>DAYS</label><div class="emoji-grid">${["Sun","Mon","Tue","Wed","Thu","Fri","Sat"].map((d,i)=>`<button class="emoji ${i>0&&i<6?"selected":""}" data-day="${i}">${d}</button>`).join("")}</div></div>
  <div class="field"><label>REWARD IDEA (OPTIONAL)</label><input id="newReward" placeholder="e.g. Restaurant dinner at 30 days"></div>
  <div class="field"><label>MONEY SAVED PER COMPLETION (OPTIONAL)</label><input id="newMoney" type="number" min="0" step=".50" placeholder="e.g. 8.50"></div>
  <button class="primary" id="create">Create streak</button>`;
  document.querySelectorAll("[data-e]").forEach(b=>b.onclick=()=>{document.querySelectorAll("[data-e]").forEach(x=>x.classList.remove("selected"));b.classList.add("selected")});
  $("newFreq").onchange=()=>$("customDays").classList.toggle("hidden",$("newFreq").value!=="custom");
  document.querySelectorAll("[data-day]").forEach(b=>b.onclick=()=>b.classList.toggle("selected"));
  $("create").onclick=()=>{
    const name=$("newName").value.trim();if(!name)return $("newName").focus();
    const freq=$("newFreq").value;
    data.streaks.push({id:crypto.randomUUID(),name,icon:document.querySelector("[data-e].selected").dataset.e,frequency:freq,customDays:freq==="custom"?[...document.querySelectorAll("[data-day].selected")].map(x=>+x.dataset.day):[],completed:[],reward:$("newReward").value.trim(),money:+$("newMoney").value||0,created:today});
    save();closeModal();render();
  };
  openModal();
}
function openDetail(id){
 const s=data.streaks.find(x=>x.id===id); if(!s)return;
 $("modalContent").innerHTML=`<button class="back" id="back">← All streaks</button><div style="display:flex;gap:13px;align-items:center"><div class="icon">${s.icon}</div><div><div class="eyebrow">STREAK</div><h2>${esc(s.name)}</h2></div></div>
 <div class="detail-stats"><div class="stat"><b>${currentStreak(s)}</b><span>Current</span></div><div class="stat"><b>${bestStreak(s)}</b><span>Best</span></div><div class="stat"><b>${total(s)}</b><span>Total</span></div></div>
 ${s.money?`<div class="card"><div class="eyebrow">ESTIMATED SAVINGS</div><div class="big-number">€${(total(s)*s.money).toFixed(2)}</div><div class="meta">Based on €${s.money.toFixed(2)} per completion</div></div>`:""}
 <div class="calendar">${calendar(s)}</div>
 <h2 style="margin-top:22px">Milestones</h2>
 <div>${MILESTONES.map(n=>`<div class="milestone"><span><span class="badge">${bestStreak(s)>=n?"🏆":"🔒"}</span> <b>${n} days</b></span><small>${bestStreak(s)>=n?"Unlocked":"Keep going"}</small></div>`).join("")}</div>
 ${s.reward?`<h2 style="margin-top:22px">Reward</h2><div class="reward"><b>${esc(s.reward)}</b><small>Use this as your reward when you hit a milestone.</small></div>`:""}
 <button class="secondary danger" id="delete">Delete streak</button>`;
 $("back").onclick=()=>{openModal();openAdd?render():null;}; // replaced below
 $("back").onclick=()=>{ $("modalContent").innerHTML=`<h2>All streaks</h2>`; closeModal(); render(); };
 $("delete").onclick=()=>{if(confirm("Delete this streak?")){data.streaks=data.streaks.filter(x=>x.id!==id);save();closeModal();render()}};
}
function calendar(s){
 const now=parseDate(today), first=new Date(now.getFullYear(),now.getMonth(),1), start=new Date(first);start.setDate(1-first.getDay());
 let html=`<div class="cal-head"><b>${now.toLocaleDateString(undefined,{month:"long",year:"numeric"})}</b><span class="meta">Tap days to change</span></div><div class="cal-grid">${["S","M","T","W","T","F","S"].map(x=>`<div class="dow">${x}</div>`).join("")}`;
 for(let i=0;i<42;i++){let d=new Date(start);d.setDate(start.getDate()+i);let ds=iso(d);let cls="day";if(done(s,ds))cls+=" done";else if(d<now&&applicable(s,ds))cls+=" missed";if(d>now)cls+=" future";html+=`<button class="${cls}" data-cal="${ds}">${d.getDate()}</button>`}
 return html+"</div></div>";
}
function openModal(){$("modal").classList.remove("hidden")}
function closeModal(){$("modal").classList.add("hidden")}
$("addBtn").onclick=openAdd;$("closeModal").onclick=closeModal;$("modal").onclick=e=>{if(e.target.id==="modal")closeModal()};
render();
if("serviceWorker" in navigator)navigator.serviceWorker.register("service-worker.js").catch(()=>{});
