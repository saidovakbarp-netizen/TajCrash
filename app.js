// Telegram WebApp + Aviator front-end
(function(){
  // 1) AUTH
  let TG_USER=null;
  const isTG = typeof window.Telegram!=='undefined' && window.Telegram.WebApp;
  if(isTG){
    const tg=window.Telegram.WebApp; tg.ready(); tg.expand();
    TG_USER = tg.initDataUnsafe?.user || null;
  }
  const url = new URL(location.href);
  if(!TG_USER && url.searchParams.get('dev')==='1'){
    TG_USER = { id: Number(url.searchParams.get('uid')||123456), username: url.searchParams.get('name')||'dev_user' };
  }
  if(!TG_USER){
    document.body.innerHTML = `<div style="min-height:100dvh;display:flex;align-items:center;justify-content:center;background:#0b0c10;color:#fff;font:16px system-ui">
      <div style="max-width:460px;padding:20px;text-align:center;border:1px solid #232938;border-radius:16px;background:#141821">
        <h2 style="margin:0 0 12px">Открой в Telegram</h2>
        <p>Это мини‑приложение работает внутри Telegram. Запусти его у бота (WebApp).</p>
        <p style="opacity:.7">Для теста открой <code>?dev=1&uid=777&name=Akbar</code></p>
      </div>
    </div>`;
    return;
  }

  const ID = TG_USER.id;
  const NAME = TG_USER.username || TG_USER.first_name || ('user'+ID);
  document.getElementById('userInfo').textContent = `ID: ${ID} • ${NAME}`;

  // 2) STORAGE
  const LS={get:(k,d=null)=>{try{return JSON.parse(localStorage.getItem(k))??d}catch{return d}},set:(k,v)=>localStorage.setItem(k,JSON.stringify(v))};
  const bkey = ()=> 'balance_'+ID;
  function getBalance(){ return Number(LS.get(bkey(), 50)); }
  function setBalance(v){ LS.set(bkey(), Number(v)); document.getElementById('balance').textContent = Number(v).toFixed(2); }
  setBalance(getBalance());

  // 3) Aviator loop
  const coefEl = document.getElementById('coef');
  const rocket = document.getElementById('rocket');
  const statusEl = document.getElementById('status');
  const lastEl = document.getElementById('last');
  const betInp = document.getElementById('bet');
  const betBtn = document.getElementById('betBtn');
  const cashBtn = document.getElementById('cashBtn');
  const autoInp = document.getElementById('autoCash');

  let running=false, coef=1.00, crashAt=1.00, timer=null, betSum=0;

  function addLast(v){
    const span=document.createElement('span');
    span.className='tag '+(v>=2?'good':(v<=1.2?'bad':''));
    span.textContent=v.toFixed(2)+'x';
    lastEl.prepend(span);
    while(lastEl.children.length>18) lastEl.lastChild.remove();
  }

  function pickCrash(){
    const algo = LS.get('crash_algo',{p:[0.7,0.25,0.05]});
    const today=new Date().toISOString().slice(0,10);
    if(LS.get('force_x10000') && !LS.get('x10000_'+today)){
      LS.set('force_x10000',false); LS.set('x10000_'+today,true); return 10000;
    }
    const r=Math.random();
    if(r<algo.p[0]) return 1.01+Math.random()*0.49;
    if(r<algo.p[0]+algo.p[1]) return 1.5+Math.random()*1.5;
    return 3+Math.random()*97;
  }

  function startRound(){
    if(running) return;
    const bet = Number(betInp.value||0);
    if(bet<1.5) return alert('Минимальная ставка 1.50');
    if(bet>getBalance()) return alert('Недостаточно средств');
    setBalance(getBalance()-bet);
    betSum=bet; running=true; coef=1.00; crashAt=pickCrash();
    coefEl.textContent='1.00x'; statusEl.textContent='Игра идёт…';
    cashBtn.disabled=false; rocket.classList.add('flying');

    timer=setInterval(()=>{
      coef = +(coef + 0.01).toFixed(2);
      coefEl.textContent=coef.toFixed(2)+'x';
      const y = Math.min(160, (coef-1)*14);
      rocket.style.setProperty('--y', `-${y}px`);
      const auto=Number(autoInp.value||0);
      if(auto>1 && coef>=auto){ return cashOut(); }
      if(coef>=crashAt){
        clearInterval(timer); running=false; cashBtn.disabled=true;
        statusEl.textContent='КРАШ!'; rocket.classList.remove('flying'); rocket.classList.add('shake');
        setTimeout(()=>rocket.classList.remove('shake'),450);
        addLast(crashAt);
      }
    },65);
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

  // 4) Promo
  document.getElementById('promoBtn').addEventListener('click', ()=>{
    const code=(document.getElementById('promo').value||'').trim().toUpperCase();
    if(code==='TAJ99999' && !LS.get('promo_'+ID)){
      LS.set('promo_'+ID,true); setBalance(getBalance()+10); alert('🎁 +10');
    } else alert('❌ Неверный/использован');
  });
})();