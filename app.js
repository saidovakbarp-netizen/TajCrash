const LS={get:(k,d=null)=>{try{return JSON.parse(localStorage.getItem(k))??d}catch{return d}},set:(k,v)=>localStorage.setItem(k,JSON.stringify(v))};
const id = LS.get('tg_id') || Math.floor(100000+Math.random()*899999); LS.set('tg_id', id);
function getBalance(){return Number(LS.get('balance_'+id, 50));}
function setBalance(v){LS.set('balance_'+id, Number(v)); document.getElementById('balance').textContent=Number(v).toFixed(2);}
setBalance(getBalance());

const coefEl = document.getElementById('coef');
const rocket = document.getElementById('rocket');
const statusEl = document.getElementById('status');
const lastEl = document.getElementById('last');

let running=false, coef=1.00, crashAt=1.00, timer=null, betSum=0;

function addLastTag(v){
  const span=document.createElement('span');
  span.className='tag '+(v>=2?'good':(v<=1.2?'bad':''));
  span.textContent=v.toFixed(2)+'x';
  lastEl.prepend(span);
  while(lastEl.children.length>20) lastEl.lastChild.remove();
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
  const bet = Number(document.getElementById('bet').value||0);
  if(bet<1.5) return alert('Минимальная ставка 1.50');
  if(bet>getBalance()) return alert('Недостаточно средств');
  setBalance(getBalance()-bet);
  betSum=bet;
  running=true; coef=1.00; crashAt=pickCrash();
  coefEl.textContent='1.00x';
  statusEl.textContent='Идёт раунд…';
  rocket.classList.add('flying');
  document.getElementById('cashBtn').disabled=false;

  timer=setInterval(()=>{
    coef = +(coef + 0.01).toFixed(2);
    coefEl.textContent=coef.toFixed(2)+'x';
    const y = Math.min(160, (coef - 1) * 14);
    rocket.style.setProperty('--y', `-${y}px`);
    const auto = Number(document.getElementById('autoCash').value||0);
    if(auto>1 && coef>=auto){ cashOut(); }
    if(coef>=crashAt){
      clearInterval(timer); running=false;
      rocket.classList.remove('flying'); rocket.classList.add('shake');
      setTimeout(()=>rocket.classList.remove('shake'),450);
      document.getElementById('cashBtn').disabled=true;
      statusEl.textContent='КРАШ!';
      addLastTag(crashAt);
    }
  }, 65);
}

function cashOut(){
  if(!running) return;
  clearInterval(timer); running=false;
  rocket.classList.remove('flying');
  document.getElementById('cashBtn').disabled=true;
  const win = betSum*coef;
  setBalance(getBalance()+win);
  statusEl.textContent='Забрано: '+win.toFixed(2);
  addLastTag(coef);
}

document.getElementById('betBtn').addEventListener('click', startRound);
document.getElementById('cashBtn').addEventListener('click', cashOut);
document.getElementById('addTest').addEventListener('click', ()=> setBalance(getBalance()+50));

document.getElementById('promoBtn').addEventListener('click', ()=>{
  const code=(document.getElementById('promo').value||'').trim().toUpperCase();
  if(code==='TAJ99999' && !LS.get('promo_used_'+id)){
    LS.set('promo_used_'+id,true);
    setBalance(getBalance()+10);
    alert('🎁 Промо активирован: +10');
  }else{ alert('❌ Неверный или уже использован'); }
});
