// Telegram WebApp + shared-round Aviator + withdrawals
(function(){
  // AUTH
  let TG_USER=null;
  const isTG = typeof window.Telegram!=='undefined' && window.Telegram.WebApp;
  if(isTG){ const tg=window.Telegram.WebApp; tg.ready(); tg.expand(); TG_USER=tg.initDataUnsafe?.user||null; }
  const url = new URL(location.href);
  if(!TG_USER && url.searchParams.get('dev')==='1'){ TG_USER={ id:Number(url.searchParams.get('uid')||777), username:url.searchParams.get('name')||'dev' }; }
  if(!TG_USER){
    document.body.innerHTML = '<div style="min-height:100dvh;display:flex;align-items:center;justify-content:center;background:#0b0c10;color:#fff"><div style="max-width:460px;padding:20px;text-align:center;border:1px solid #232938;border-radius:16px;background:#141821"><h2>Открой в Telegram</h2><p>Mini App запускается внутри Telegram. Для теста добавь ?dev=1&uid=123&name=Akbar к URL.</p></div></div>';
    return;
  }
  const ID = TG_USER.id, NAME = TG_USER.username||TG_USER.first_name||('user'+ID);
  document.getElementById('userInfo').textContent = 'ID: '+ID+' • '+NAME;

  // STORAGE
  const LS={get:(k,d=null)=>{try{return JSON.parse(localStorage.getItem(k))??d}catch{return d}},set:(k,v)=>localStorage.setItem(k,JSON.stringify(v))};
  const bkey=()=> 'balance_'+ID;
  function getBalance(){ return Number(LS.get(bkey(), 0)); }
  function setBalance(v){ LS.set(bkey(), Number(v)); document.getElementById('balance').textContent=Number(v).toFixed(2); }
  setBalance(getBalance());

  // UI refs
  const coefEl = document.getElementById('coef');
  const rocket = document.getElementById('rocket');
  const statusEl = document.getElementById('status');
  const lastEl = document.getElementById('last');
  const betInp = document.getElementById('bet');
  const betBtn = document.getElementById('betBtn');
  const cashBtn = document.getElementById('cashBtn');
  const autoInp = document.getElementById('autoCash');

  // SHARED ROUND ENGINE
  function hashStr(s){ // simple xorshift32 hash to [0,1)
    let h=2166136261>>>0;
    for(let i=0;i<s.length;i++){ h^=s.charCodeAt(i); h = Math.imul(h, 16777619); }
    return (h>>>0)/4294967296;
  }
  function nextCrash(){
    const algo=LS.get('crash_algo',{p:[0.70,0.25,0.05],salt:'tajcrash'});
    const today=new Date().toISOString().slice(0,10);
    if(LS.get('force_x10000') && !LS.get('x10000_'+today)){ LS.set('force_x10000',false); LS.set('x10000_'+today,true); return 10000; }
    // Round index every 4 seconds (global)
    const roundIndex = Math.floor(Date.now()/4000);
    const seed = algo.salt+'|'+roundIndex;
    const r = hashStr(seed);
    const p=r;
    if(p<algo.p[0]) return 1.01 + (hashStr(seed+'a')*0.49);
    if(p<algo.p[0]+algo.p[1]) return 1.50 + (hashStr(seed+'b')*1.50);
    return 3 + (hashStr(seed+'c')*97);
  }

  let running=false, coef=1.00, crashAt=1.00, timer=null, betSum=0;
  function addLast(v){
    const span=document.createElement('span');
    span.className='tag '+(v>=2?'good':(v<=1.2?'bad':''));
    span.textContent=v.toFixed(2)+'x';
    lastEl.prepend(span);
    while(lastEl.children.length>18) lastEl.lastChild.remove();
  }

  function startRound(){
    if(running) return;
    const bet = Number(betInp.value||0);
    if(bet<1.5) return alert('Минимальная ставка 1.50');
    if(bet>getBalance()) return alert('Недостаточно средств');
    setBalance(getBalance()-bet);
    betSum=bet; running=true; coef=1.00; crashAt=nextCrash();
    coefEl.textContent='1.00x'; statusEl.textContent='Игра идёт…';
    cashBtn.disabled=false; rocket.classList.add('flying');
    timer=setInterval(()=>{
      coef=+(coef+0.01).toFixed(2);
      coefEl.textContent=coef.toFixed(2)+'x';
      rocket.style.setProperty('--y', `-${Math.min(160,(coef-1)*14)}px`);
      const auto=Number(autoInp.value||0);
      if(auto>1 && coef>=auto){ return cashOut(); }
      if(coef>=crashAt){
        clearInterval(timer); running=false; cashBtn.disabled=true;
        statusEl.textContent='КРАШ!'; rocket.classList.remove('flying'); rocket.classList.add('shake');
        setTimeout(()=>rocket.classList.remove('shake'),450);
        addLast(crashAt);
      }
    }, 65);
  }

  function cashOut(){
    if(!running) return;
    clearInterval(timer); running=false; cashBtn.disabled=true;
    const win = betSum*coef; setBalance(getBalance()+win);
    statusEl.textContent='Забрано: '+win.toFixed(2);
    rocket.classList.remove('flying'); rocket.style.setProperty('--y','0px');
    addLast(coef);
  }
  betBtn.addEventListener('click', startRound);
  cashBtn.addEventListener('click', cashOut);

  // PROMO
  document.getElementById('promoBtn').addEventListener('click', ()=>{
    const code=(document.getElementById('promo').value||'').trim().toUpperCase();
    if(code==='TAJ99999' && !LS.get('promo_'+ID)){ LS.set('promo_'+ID,true); setBalance(getBalance()+10); alert('🎁 +10'); }
    else alert('❌ Неверный/использован');
  });

  // WITHDRAW REQUEST
  const wdBtn=document.getElementById('wdSend');
  const wdAmt=document.getElementById('wdAmt');
  const wdMethod=document.getElementById('wdMethod');
  const wdAddr=document.getElementById('wdAddr');
  const wdNote=document.getElementById('wdNote');

  wdBtn.addEventListener('click', ()=>{
    const amt=Number(wdAmt.value||0);
    if(amt<=0) return alert('Сумма не указана');
    if(amt>getBalance()) return alert('Недостаточно средств');
    setBalance(getBalance()-amt);
    const req={ id:Date.now(), uid:ID, user:NAME, amount:amt, method:wdMethod.value, addr:wdAddr.value||'', status:'pending', time:new Date().toLocaleString() };
    const list=LS.get('wd_requests',[]); list.unshift(req); LS.set('wd_requests',list);
    wdNote.textContent='Заявка отправлена. Статус: ожидание.';
    wdAmt.value=''; wdAddr.value='';
  });
})();
