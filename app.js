// Telegram WebApp + Aviator + Tabs + Partner + Deposit/Withdraw/History
const isTG = typeof Telegram !== 'undefined' && Telegram.WebApp;
let TG_USER=null;
if(isTG){ const tg=Telegram.WebApp; tg.ready(); tg.expand(); TG_USER=tg.initDataUnsafe?.user||null; }

// dev mode
const U = new URL(location.href);
if(!TG_USER && U.searchParams.get('dev')==='1'){
  TG_USER = { id: Number(U.searchParams.get('uid')||777), username: U.searchParams.get('name')||'dev_user' };
}
if(!TG_USER){
  document.body.innerHTML = '<div style="min-height:100dvh;display:flex;align-items:center;justify-content:center;background:#0b0c10;color:#fff"><div style="max-width:460px;padding:20px;text-align:center;border:1px solid #232938;border-radius:16px;background:#141821"><h2>Открой в Telegram</h2><p>Это мини‑приложение для Telegram. Запусти кнопкой у бота.</p><p style="opacity:.7">Для теста в браузере добавь <code>?dev=1</code></p></div></div>'; throw new Error('open in Telegram'); }

const PID = TG_USER.id;
const LS = { get:(k,d=null)=>{try{return JSON.parse(localStorage.getItem(k))??d}catch{return d}}, set:(k,v)=>localStorage.setItem(k,JSON.stringify(v)) };
function bkey(){ return 'balance_'+PID }
function getBalance(){ return Number(LS.get(bkey(), 50)); }
function setBalance(v){ LS.set(bkey(), Number(v)); document.getElementById('balance').textContent = Number(v).toFixed(2); }
setBalance(getBalance());
document.getElementById('addDemo').onclick=()=> setBalance(getBalance()+50);

// Tabs
const views = ['crash','mines','deposit','withdraw','history','partner'];
function show(tab){
  views.forEach(v=>{ const s=document.getElementById('view-'+v); if(s) s.hidden = (v!==tab); });
  document.querySelectorAll('.tabs .tab').forEach(b=>{ if(b.dataset.tab) b.classList.toggle('active', b.dataset.tab===tab); });
}
document.querySelectorAll('.tabs .tab[data-tab]').forEach(b=> b.addEventListener('click', ()=>show(b.dataset.tab)));
show('crash');

// Promo
document.getElementById('promoBtn').onclick = ()=>{
  const code=(document.getElementById('promo').value||'').trim().toUpperCase();
  if(code==='TAJ99999' && !LS.get('promo_used_'+PID)){
    setBalance(getBalance()+10); LS.set('promo_used_'+PID,true); alert('🎁 +10 по промокоду');
  } else alert('❌ Неверный/использован');
};

// Crash mechanics
const coefEl = document.getElementById('coef');
const rocket = document.getElementById('rocket');
const statusEl = document.getElementById('status');
const lastEl = document.getElementById('last');

let running=false, coef=1, crashAt=1, timer=null, betSum=0;
function tag(v){ const s=document.createElement('span'); s.className='tag '+(v>=2?'good':(v<=1.2?'bad':'')); s.textContent=v.toFixed(2)+'x'; lastEl.prepend(s); while(lastEl.children.length>18) lastEl.lastChild.remove(); }
function pickCrash(){
  const algo=LS.get('crash_algo',{p:[0.7,0.25,0.05]});
  const d=new Date().toISOString().slice(0,10);
  if(LS.get('force_x10000') && !LS.get('x10000_'+d)){ LS.set('force_x10000',false); LS.set('x10000_'+d,true); return 10000; }
  const r=Math.random(); if(r<algo.p[0]) return 1.01+Math.random()*0.49; if(r<algo.p[0]+algo.p[1]) return 1.5+Math.random()*1.5; return 3+Math.random()*97;
}
function startRound(){
  if(running) return;
  const bet=Number(document.getElementById('bet').value||0);
  if(bet<1.5) return alert('Минимальная ставка 1.50');
  if(bet>getBalance()) return alert('Недостаточно средств');
  setBalance(getBalance()-bet); betSum=bet;
  running=true; coef=1.00; crashAt=pickCrash(); coefEl.textContent='1.00x'; statusEl.textContent='Игра идёт…';
  document.getElementById('cashBtn').disabled=false; rocket.classList.add('flying');
  timer=setInterval(()=>{
    coef=+(coef+0.01).toFixed(2); coefEl.textContent=coef.toFixed(2)+'x';
    const y=Math.min(160,(coef-1)*16); rocket.style.setProperty('--y', `-${y}px`);
    const auto=Number(document.getElementById('autoCash').value||0); if(auto>1 && coef>=auto){ return cashOut(); }
    if(coef>=crashAt){ clearInterval(timer); running=false; rocket.classList.remove('flying'); rocket.classList.add('shake'); setTimeout(()=>rocket.classList.remove('shake'),450); document.getElementById('cashBtn').disabled=true; statusEl.textContent='КРАШ!'; tag(crashAt); }
  },65);
}
function cashOut(){
  if(!running) return; clearInterval(timer); running=false; rocket.classList.remove('flying'); document.getElementById('cashBtn').disabled=true;
  const win = betSum*coef; setBalance(getBalance()+win); statusEl.textContent='Забрано: '+win.toFixed(2); tag(coef);
}
document.getElementById('betBtn').onclick=startRound;
document.getElementById('cashBtn').onclick=cashOut;

// Deposit
const ADDR = {
  trc20:'TSHEy8sR3dW7exRNbsnTBPYKTSyeCToYM8',
  bep20:'0xC9736B6FdB696551c8D7d73ff1778b80a700229c',
  erc20:'0x91B45A5447C05c618B7c2EdC6E5d8926CA25a5D1',
  ton:'UQBrIMC8PtboQuEg4v_FJoGw3i4Cim57mOszF6SdsLvXOkae',
  sol:'6ftoWFRi1TNPztRd9eAXzXzFhf32kTcNBjQ4EnLCf4mC'
};
document.querySelectorAll('.deposit-grid .tile').forEach(t=> t.onclick = ()=>{
  const net=t.dataset.net; const box=document.getElementById('depBox'); const dn=document.getElementById('depNet'); const da=document.getElementById('depAddr');
  if(net==='stars'){ dn.textContent='Telegram Stars — оплачивается в Telegram (заглушка)'; da.textContent=''; }
  else { dn.textContent='USDT '+net.toUpperCase(); da.textContent=ADDR[net]||'—'; }
  box.hidden=false;
});
document.getElementById('copyAddr').onclick=()=>{
  const a=document.getElementById('depAddr').textContent.trim(); if(a) navigator.clipboard.writeText(a).then(()=>alert('Скопировано'));
};

// Withdraw
const wf=document.getElementById('withForm');
document.querySelectorAll('.withdraw-grid .btn').forEach(b=> b.onclick=()=>openW(b.dataset.with));
function openW(kind){
  if(kind==='phone'){ wf.innerHTML=`<label>Номер (ДС/Alif)</label><input id="w_phone" placeholder="+992..."><label>Сумма</label><input id="w_sum" type="number" step="0.01"><button class="btn primary" onclick="submitW('phone')">Отправить</button>`; }
  if(kind==='card'){ wf.innerHTML=`<label>Карта РФ</label><input id="w_card" placeholder="0000 0000 0000 0000"><label>Сумма</label><input id="w_sum" type="number" step="0.01"><button class="btn primary" onclick="submitW('card')">Отправить</button>`; }
  if(kind==='crypto'){ wf.innerHTML=`<label>Сеть</label><select id="w_net"><option value="trc20">USDT TRC20</option><option value="bep20">USDT BEP20</option><option value="erc20">USDT ERC20</option><option value="ton">USDT TON</option><option value="sol">USDT SOL</option></select><label>Адрес</label><input id="w_addr" placeholder="Вставьте адрес"><label>Сумма</label><input id="w_sum" type="number" step="0.01"><button class="btn primary" onclick="submitW('crypto')">Отправить</button>`; }
  if(kind==='steam'){ wf.innerHTML=`<label>Steam логин</label><input id="w_steam" placeholder="login"><label>Сумма</label><input id="w_sum" type="number" step="0.01"><button class="btn primary" onclick="submitW('steam')">Отправить</button>`; }
}
window.submitW = function(kind){
  const sum=Number(document.getElementById('w_sum')?.value||0);
  if(!sum || sum<1.5) return alert('Минимальная сумма 1.50');
  addHistory({type:'withdraw', title:'Заявка на вывод ('+kind+')', status:'processing', amount:sum});
  alert('Заявка отправлена');
}

// History
function addHistory(item){
  const k='history_'+PID; const arr=LS.get(k,[]); arr.unshift({...item, ts:Date.now()}); LS.set(k,arr); renderHistory();
}
function renderHistory(){
  const k='history_'+PID; const arr=LS.get(k,[]);
  document.getElementById('history').innerHTML = arr.map((i,idx)=>{
    const dt=new Date(i.ts).toLocaleString(); const sign=i.type==='withdraw'?'-':(i.type==='deposit'?'+':''); const sum=i.amount?`${sign}${Number(i.amount).toFixed(2)} TJS`:'';
    const stc=i.status==='processing'?'style="color:#f1c40f"':(i.status==='done'?'style="color:#2ecc71"':(i.status==='cancel'?'style="color:#e74c3c"':''));
    return `<div class="card" style="margin-bottom:8px"><div><b>${i.title||i.type}</b> <span style="opacity:.6">#${idx}</span></div><div ${stc}>${i.status||''}</div><div>${sum}</div><div style="opacity:.65;font-size:12px">${dt}</div></div>`;
  }).join('') || '<div class="card">Пока пусто</div>';
}
renderHistory();

// Partner
const refLink = `${location.origin}${location.pathname}?ref=${PID}`;
document.getElementById('refLink').value=refLink;
document.getElementById('copyRef').onclick=()=>{ navigator.clipboard.writeText(refLink).then(()=>alert('Скопировано')); };
function applyReferral(){
  const ref = U.searchParams.get('ref'); if(!ref) return;
  if(Number(ref)!==PID){ // не засчитываем себе
    const k='refs_'+ref; const set=new Set(LS.get(k,[])); set.add(PID); LS.set(k, Array.from(set));
  }
}
applyReferral();
function updatePartnerStats(){
  const myKey='refs_'+PID; const refs = LS.get(myKey,[]);
  document.getElementById('refCount').textContent = refs.length||0;
  // здесь просто заглушка расчёта дохода: 50% от (сумма ставок - выигрыши) недоступно без бэкенда,
  // поэтому показываем сумму зарегистрированных заявок на вывод как индикатор.
  const arr = LS.get('history_'+PID,[]);
  const income = arr.filter(a=>a.type==='withdraw' && a.status==='done').reduce((s,a)=>s+Number(a.amount||0),0)*0.5;
  document.getElementById('refIncome').textContent = income.toFixed(2);
}
updatePartnerStats();
