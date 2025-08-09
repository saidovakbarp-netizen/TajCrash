const LS = { get:(k,d=null)=>{try{return JSON.parse(localStorage.getItem(k))??d}catch{return d}}, set:(k,v)=>localStorage.setItem(k,JSON.stringify(v)) };

// Mock Telegram auth
const tg = { id: LS.get('tg_id') || Math.floor(100000 + Math.random()*899999), username: LS.get('tg_user') || 'player_'+Math.floor(Math.random()*9999) };
LS.set('tg_id', tg.id); LS.set('tg_user', tg.username);

// Balance
function getBalance(){ return Number(LS.get('balance_'+tg.id, 10)); }
function setBalance(v){ LS.set('balance_'+tg.id, Number(v)); document.getElementById('balance').textContent = Number(v).toFixed(2); }
setBalance(getBalance());

// Tabs
document.querySelectorAll('.tabs button').forEach(b=>{
  b.addEventListener('click', ()=>{
    document.querySelectorAll('.tabs button').forEach(x=>x.classList.remove('active')); b.classList.add('active');
    document.querySelectorAll('.tab').forEach(x=>x.classList.remove('active'));
    document.getElementById('tab-'+b.dataset.tab).classList.add('active');
  })
});

// History
function pushHistory(item){
  const all = LS.get('history_'+tg.id, []);
  all.unshift({...item, ts: Date.now()});
  LS.set('history_'+tg.id, all);
  renderHistory();
}
function renderHistory(filter='all'){
  const wrap = document.getElementById('historyList'); if(!wrap) return;
  const all = LS.get('history_'+tg.id, []);
  const list = all.filter(i=> filter==='all' ? true : i.type===filter );
  wrap.innerHTML = list.map((i,idx)=>{
    const dt = new Date(i.ts);
    const stc = i.status==='processing'?'proc': (i.status==='done'?'done': (i.status==='cancel'?'cancel':''));
    const sign = i.type==='deposit' ? '+' : (i.type==='withdraw' ? '-' : '');
    const sumtxt = i.amount ? `${sign}${Number(i.amount).toFixed(2)} TJS` : '';
    return `<div class="card">
      <div><strong>${i.title||i.type}</strong> <span style="opacity:.6">#${idx}</span></div>
      <div class="status ${stc}">${i.status||''}</div>
      <div>${sumtxt}</div>
      <div style="font-size:12px;opacity:.7">${dt.toLocaleString()}</div>
    </div>`;
  }).join('') || '<div class="card">История пуста</div>';
}
document.querySelectorAll('.history-filters button').forEach(b=>{
  b.addEventListener('click', ()=>{
    document.querySelectorAll('.history-filters button').forEach(x=>x.classList.remove('active')); b.classList.add('active');
    renderHistory(b.dataset.hf);
  });
});
renderHistory();

// Promo (built-in + admin promos)
document.getElementById('applyPromoBtn').addEventListener('click', ()=>{
  const code = document.getElementById('promoInput').value.trim().toUpperCase();
  const promos = LS.get('promos', {});
  if(code==='TAJ99999' && !LS.get('promo_used_'+tg.id)){
    setBalance(getBalance()+10);
    LS.set('promo_used_'+tg.id, true);
    pushHistory({type:'deposit', title:'Промокод TAJ99999', status:'done', amount:10});
    return alert('🎁 Промокод активирован +10');
  }
  if(promos[code] && promos[code].used < promos[code].limit){
    setBalance(getBalance()+Number(promos[code].bonus));
    promos[code].used += 1; LS.set('promos', promos);
    pushHistory({type:'deposit', title:'Промокод '+code, status:'done', amount:promos[code].bonus});
    return alert('🎁 Промокод активирован');
  }
  alert('❌ Неверный или лимит исчерпан');
});

// Crash
let inRound=false, betValue=0, coef=1.00, coefTimer=null;
let algo = LS.get('crash_algo', {mode:'auto', p:[0.7,0.25,0.05]});
function startCrash(){
  if(inRound) return;
  const bet = Number(document.getElementById('betAmount').value);
  if(!bet || bet<1.5) return alert('Минимальная сумма ставки — 1.50 сомони');
  if(bet>getBalance()) return alert('Недостаточно средств');
  setBalance(getBalance()-bet);
  pushHistory({type:'bets', title:'Ставка Crash', status:'processing', amount:bet});
  betValue=bet; inRound=true;
  document.getElementById('cashOutBtn').disabled=false;
  coef=1.00; document.getElementById('coef').textContent=coef.toFixed(2)+'x';
  // pick crash point
  let crashAt = pickCrashPoint();
  coefTimer = setInterval(()=>{
    coef = +(coef + 0.01).toFixed(2);
    document.getElementById('coef').textContent = coef.toFixed(2)+'x';
    const rocket = document.getElementById('rocket');
    rocket.style.transform = `translateY(-${Math.min(80, (coef-1)*10)}px)`;
    if(coef>=crashAt){
      clearInterval(coefTimer);
      inRound=false;
      document.getElementById('cashOutBtn').disabled=true;
      alert('🔥 Краш! Вы проиграли.');
      finalizeLastBet(false, coef);
    }
  }, 80);
}
function pickCrashPoint(){
  const manual = LS.get('manual_crash');
  const dkey = new Date().toISOString().slice(0,10);
  const x10000Used = LS.get('x10000_'+dkey, false);
  if(manual && manual>0){ LS.set('manual_crash', null); return manual; }
  if(LS.get('force_x10000', false) && !x10000Used){ LS.set('force_x10000', false); LS.set('x10000_'+dkey,true); return 10000; }
  const r = Math.random();
  if(r < algo.p[0]) return +(1.01 + Math.random()*0.49).toFixed(2);
  if(r < algo.p[0]+algo.p[1]) return +(1.5 + Math.random()*1.5).toFixed(2);
  return +(3 + Math.random()*97).toFixed(2);
}
function cashOut(){
  if(!inRound) return;
  clearInterval(coefTimer);
  const win = betValue*coef;
  setBalance(getBalance()+win);
  alert('💰 Вы забрали: '+win.toFixed(2));
  inRound=false;
  document.getElementById('cashOutBtn').disabled=true;
  finalizeLastBet(true, coef);
}
function finalizeLastBet(win, k){
  const all = LS.get('history_'+tg.id, []);
  const idx = all.findIndex(i=> i.type==='bets' && i.status==='processing');
  if(idx>-1){
    all[idx].status = win?'done':'cancel';
    all[idx].title = (win?'Выигрыш':'Проигрыш')+' Crash ('+k.toFixed(2)+'x)';
    LS.set('history_'+tg.id, all);
    renderHistory(document.querySelector('.history-filters button.active').dataset.hf);
  }
}
document.getElementById('placeBetBtn').addEventListener('click', startCrash);
document.getElementById('cashOutBtn').addEventListener('click', cashOut);

// Mines
let minesState=null;
function buildMinesGrid(){
  const grid = document.getElementById('minesGrid');
  grid.innerHTML = '';
  for(let i=0;i<25;i++){
    const c = document.createElement('button');
    c.className='cell'; c.textContent='?';
    c.addEventListener('click', ()=>openCell(i,c));
    grid.appendChild(c);
  }
}
function startMines(){
  if(minesState && minesState.active) return;
  const bet = Number(document.getElementById('minesBet').value);
  const mcount = Number(document.getElementById('minesCount').value);
  if(!bet || bet<1.5) return alert('Минимальная сумма ставки — 1.50 сомони');
  if(bet>getBalance()) return alert('Недостаточно средств');
  setBalance(getBalance()-bet);
  pushHistory({type:'bets', title:'Ставка Mines', status:'processing', amount:bet});
  const mines = new Set();
  while(mines.size<mcount){ mines.add(Math.floor(Math.random()*25)); }
  minesState = {active:true, bet, opened:0, mines, coef:1.0};
  document.getElementById('minesCashout').disabled=false;
  document.getElementById('minesCoef').textContent='1.00x';
  buildMinesGrid();
}
function openCell(idx, btn){
  if(!minesState?.active) return;
  if(minesState.mines.has(idx)){
    btn.classList.add('mine'); btn.textContent='💥';
    loseMines();
  } else {
    btn.classList.add('open'); btn.textContent='✅'; btn.disabled=true;
    minesState.opened++;
    minesState.coef = Number((1 + minesState.opened*0.15).toFixed(2));
    document.getElementById('minesCoef').textContent = minesState.coef.toFixed(2)+'x';
  }
}
function cashoutMines(){
  if(!minesState?.active) return;
  const win = Number((minesState.bet * minesState.coef).toFixed(2));
  setBalance(getBalance()+win);
  alert('💰 Вы забрали: '+win.toFixed(2));
  finishMines(true);
}
function loseMines(){
  alert('🔥 Мина! Вы проиграли.');
  finishMines(false);
}
function finishMines(win){
  const all = LS.get('history_'+tg.id, []);
  const idx = all.findIndex(i=> i.type==='bets' && i.status==='processing');
  if(idx>-1){
    all[idx].status = win?'done':'cancel';
    all[idx].title = (win?'Выигрыш':'Проигрыш')+' Mines ('+minesState.coef.toFixed(2)+'x)';
    LS.set('history_'+tg.id, all);
    renderHistory(document.querySelector('.history-filters button.active').dataset.hf);
  }
  minesState.active=false; document.getElementById('minesCashout').disabled=true;
}
document.getElementById('minesStart').addEventListener('click', startMines);
document.getElementById('minesCashout').addEventListener('click', cashoutMines);
buildMinesGrid();

// Deposit
const ADDR = {
  trc20: "TSHEy8sR3dW7exRNbsnTBPYKTSyeCToYM8",
  bep20: "0xC9736B6FdB696551c8D7d73ff1778b80a700229c",
  erc20: "0x91B45A5447C05c618B7c2EdC6E5d8926CA25a5D1",
  ton: "UQBrIMC8PtboQuEg4v_FJoGw3i4Cim57mOszF6SdsLvXOkae",
  sol: "6ftoWFRi1TNPztRd9eAXzXzFhf32kTcNBjQ4EnLCf4mC"
};
document.querySelectorAll('.deposit-grid .tile').forEach(tile=>{
  tile.addEventListener('click', ()=>{
    const net = tile.dataset.net;
    const box = document.getElementById('depositDetails');
    const depNet = document.getElementById('depNetwork');
    const depAddr = document.getElementById('depAddress');
    if(net==='stars'){
      depNet.textContent = 'Telegram Stars';
      depAddr.textContent = 'Откроется окно оплаты в Telegram (заглушка)';
      box.style.display='block'; return;
    }
    depNet.textContent = 'USDT '+net.toUpperCase();
    depAddr.textContent = ADDR[net] || '—';
    box.style.display='block';
  });
});
document.getElementById('copyDep').addEventListener('click', ()=>{
  const txt = document.getElementById('depAddress').textContent.trim();
  if(txt && txt!=='—' && !txt.includes('заглушка')){
    navigator.clipboard.writeText(txt).then(()=> alert('Скопировано: '+txt));
  }
});

// Withdraw
const withdrawForm = document.getElementById('withdrawForm');
document.querySelectorAll('.withdraw-methods button').forEach(b=>{
  b.addEventListener('click', ()=>openWithdraw(b.dataset.with));
});
function openWithdraw(kind){
  if(kind==='phone'){
    withdrawForm.innerHTML = `
      <label>Номер телефона (ДС/Alif)</label>
      <input id="w_phone" placeholder="+992..." />
      <label>Сумма</label>
      <input id="w_sum" type="number" step="0.01" />
      <button onclick="submitWithdraw('phone')">Отправить заявку</button>
    `;
  } else if(kind==='card'){
    withdrawForm.innerHTML = `
      <label>Карта РФ (номер)</label>
      <input id="w_card" placeholder="0000 0000 0000 0000" />
      <label>Сумма</label>
      <input id="w_sum" type="number" step="0.01" />
      <button onclick="submitWithdraw('card')">Отправить заявку</button>
    `;
  } else if(kind==='crypto'){
    withdrawForm.innerHTML = `
      <label>Сеть</label>
      <select id="w_net">
        <option value="trc20">USDT TRC20</option>
        <option value="bep20">USDT BEP20</option>
        <option value="erc20">USDT ERC20</option>
        <option value="ton">USDT TON</option>
        <option value="sol">USDT SOL</option>
      </select>
      <label>Адрес кошелька</label>
      <input id="w_addr" placeholder="Вставьте адрес" />
      <label>Сумма</label>
      <input id="w_sum" type="number" step="0.01" />
      <button onclick="submitWithdraw('crypto')">Отправить заявку</button>
    `;
  } else if(kind==='steam'){
    withdrawForm.innerHTML = `
      <label>Steam аккаунт / логин</label>
      <input id="w_steam" placeholder="Введите логин" />
      <label>Сумма</label>
      <input id="w_sum" type="number" step="0.01" />
      <button onclick="submitWithdraw('steam')">Отправить заявку</button>
    `;
  }
}
window.submitWithdraw = function(kind){
  const sum = Number(document.getElementById('w_sum')?.value||0);
  if(!sum || sum<1.5) return alert('Минимальная сумма — 1.50');
  pushHistory({type:'withdraw', title:'Заявка на вывод ('+kind+')', status:'processing', amount:sum});
  alert('✅ Заявка отправлена. Статус: обрабатывается');
};

// Admin hooks
window.__ADMIN__ = {
  setManualCrash:(x)=> LS.set('manual_crash', x),
  forceX10000:()=> LS.set('force_x10000', true),
  setAlgo:(p1,p2,p3)=> { LS.set('crash_algo', {mode:'auto', p:[p1,p2,p3]}); },
  adjustBalance:(delta)=> setBalance(getBalance()+delta)
};