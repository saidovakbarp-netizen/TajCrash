let balance = 10.00;
let inGame = false;
let crashAt = 0;
let coefficient = 1.00;
let gameInterval;

function updateBalance() {
  document.getElementById('balance').textContent = balance.toFixed(2);
}

function placeBet() {
  if (inGame) return;
  let amount = parseFloat(document.getElementById('betAmount').value);
  if (isNaN(amount) || amount < 1.5) {
    alert("Минимальная сумма ставки — 1.50 сомони");
    return;
  }
  if (amount > balance) {
    alert("Недостаточно средств");
    return;
  }
  balance -= amount;
  updateBalance();
  inGame = true;
  document.getElementById('gameArea').style.display = 'block';
  startRocket(amount);
}

function startRocket(betAmount) {
  coefficient = 1.00;
  crashAt = 1.5 + Math.random() * 3;
  gameInterval = setInterval(() => {
    coefficient += 0.01;
    document.getElementById('coefficient').textContent = coefficient.toFixed(2) + "x";
    if (coefficient >= crashAt) {
      clearInterval(gameInterval);
      alert("🔥 Краш! Вы проиграли.");
      resetGame();
    }
  }, 100);
}

function cashOut() {
  if (!inGame) return;
  clearInterval(gameInterval);
  let amount = parseFloat(document.getElementById('betAmount').value);
  let win = amount * coefficient;
  balance += win;
  alert("💰 Вы забрали: " + win.toFixed(2) + " сомони");
  updateBalance();
  resetGame();
}

function resetGame() {
  inGame = false;
  document.getElementById('gameArea').style.display = 'none';
}

function showPromo() {
  document.getElementById('promoArea').style.display = 'block';
}
function applyPromo() {
  let code = document.getElementById('promoInput').value.trim();
  if (code === 'TAJ99999') {
    balance += 10;
    updateBalance();
    alert("🎁 Промокод активирован! +10 сомони");
  } else {
    alert("❌ Неверный промокод");
  }
}

function showDeposit() {
  document.getElementById('depositArea').style.display = 'block';
}
function showWithdraw() {
  document.getElementById('withdrawArea').style.display = 'block';
}
function submitWithdraw() {
  const method = document.getElementById('withdrawMethod').value;
  const wallet = document.getElementById('wallet').value;
  const amount = parseFloat(document.getElementById('withdrawAmount').value);
  if (!wallet || isNaN(amount) || amount < 1.5) {
    alert("Введите корректные данные");
    return;
  }
  alert("✅ Заявка на вывод отправлена! Способ: " + method + ", Кошелек: " + wallet + ", Сумма: " + amount.toFixed(2));
}

function copy(text) {
  navigator.clipboard.writeText(text).then(() => alert("Скопировано: " + text));
}