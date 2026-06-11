import { payStartFee, payEndFee } from './web3.js';

// ─── Canvas setup ─────────────────────────────────────────────────────────────
const canvas  = document.getElementById('canvas');
const ctx     = canvas.getContext('2d');
const diffBtn = document.getElementById('difficulty');

let score = 0;
const brickRowCount    = 9;
const brickColumnCount = 5;
let animId = null;

// ─── Ball ─────────────────────────────────────────────────────────────────────
const ball = {
  x: canvas.width / 2,
  y: canvas.height / 2,
  size: 9,
  speed: 0,
  dx: 0,
  dy: 0,
};

// ─── Paddle ───────────────────────────────────────────────────────────────────
const paddle = {
  x: canvas.width / 2 - 40,
  y: canvas.height - 20,
  w: 73,
  h: 9,
  speed: 8,
  dx: 0,
};

// ─── Bricks ───────────────────────────────────────────────────────────────────
const brickInfo = { w: 65, h: 18, padding: 9, offsetX: 45, offsetY: 60, visible: true };
const bricks = [];
for (let i = 0; i < brickRowCount; i++) {
  bricks[i] = [];
  for (let j = 0; j < brickColumnCount; j++) {
    const x = i * (brickInfo.w + brickInfo.padding) + brickInfo.offsetX;
    const y = j * (brickInfo.h + brickInfo.padding) + brickInfo.offsetY;
    bricks[i][j] = { x, y, ...brickInfo };
  }
}

// ─── Draw functions ───────────────────────────────────────────────────────────
function drawBall() {
  ctx.beginPath();
  ctx.arc(ball.x, ball.y, ball.size, 0, Math.PI * 2);
  ctx.fillStyle = '#6B5B95';
  ctx.fill();
  ctx.closePath();
}

function drawPaddle() {
  ctx.beginPath();
  ctx.rect(paddle.x, paddle.y, paddle.w, paddle.h);
  ctx.fillStyle = '#6B5B95';
  ctx.fill();
  ctx.closePath();
}

function drawScore() {
  ctx.font = '20px Arial';
  ctx.fillStyle = '#fff';
  ctx.fillText(`Score : ${score}`, canvas.width - 110, 30);
}

function drawBricks() {
  bricks.forEach((column) => {
    column.forEach((brick) => {
      ctx.beginPath();
      ctx.rect(brick.x, brick.y, brick.w, brick.h);
      ctx.fillStyle = brick.visible ? '#6B5B95' : 'transparent';
      ctx.fill();
      ctx.closePath();
    });
  });
}

// ─── Move functions ───────────────────────────────────────────────────────────
function movePaddle() {
  paddle.x += paddle.dx;
  if (paddle.x + paddle.w > canvas.width) paddle.x = canvas.width - paddle.w;
  if (paddle.x < 0) paddle.x = 0;
}

function moveBall() {
  ball.x += ball.dx;
  ball.y += ball.dy;

  // Wall collision (left / right)
  if (ball.x + ball.size > canvas.width || ball.x - ball.size < 0) ball.dx *= -1;

  // Wall collision (top)
  if (ball.y - ball.size < 0) ball.dy *= -1;

  // Paddle collision
  if (
    ball.x - ball.size > paddle.x &&
    ball.x + ball.size < paddle.x + paddle.w &&
    ball.y + ball.size > paddle.y
  ) {
    ball.dy = -ball.speed;
  }

  // Brick collision
  bricks.forEach((column) => {
    column.forEach((brick) => {
      if (brick.visible) {
        if (
          ball.x - ball.size > brick.x &&
          ball.x + ball.size < brick.x + brick.w &&
          ball.y + ball.size > brick.y &&
          ball.y - ball.size < brick.y + brick.h
        ) {
          ball.dy *= -1;
          brick.visible = false;
          increaseScore();
        }
      }
    });
  });

  // Hit bottom – lose
  if (ball.y + ball.size > canvas.height) {
    score = 0;
    showAllBricks();
    pauseBall();
    pausePaddle();
    document.querySelector('.lose').style.display = 'block';
    payEndFee(); // fire-and-forget
  }
}

function pauseBall()   { ball.speed = 0; ball.dx = 0; ball.dy = 0; }
function pausePaddle() { paddle.speed = 0; paddle.dx = 0; }

function increaseScore() {
  score++;
  if (score % (brickRowCount * brickColumnCount) === 0) {
    showAllBricks();
    document.querySelector('.win').style.display = 'block';
    payEndFee(); // fire-and-forget
  }
}

function showAllBricks() {
  bricks.forEach((col) => col.forEach((b) => (b.visible = true)));
}

// ─── Main loop ────────────────────────────────────────────────────────────────
function draw() {
  ctx.clearRect(0, 0, canvas.width, canvas.height);
  drawBall();
  drawPaddle();
  drawScore();
  drawBricks();
}

function update() {
  movePaddle();
  moveBall();
  draw();
  animId = requestAnimationFrame(update);
}

// ─── Game start (with on-chain fee) ───────────────────────────────────────────
window.startGame = function () {
  const startEl = document.getElementById('start');
  startEl.style.display = 'none';
  diffBtn.style.display = 'block';
};

function hideDiff() { diffBtn.style.display = 'none'; }

async function launchWithFee(speed, dx, dy) {
  hideDiff();

  // Show a pending overlay while awaiting tx
  const overlay = document.getElementById('tx-overlay');
  if (overlay) overlay.style.display = 'flex';

  await payStartFee();

  if (overlay) overlay.style.display = 'none';

  ball.speed = speed;
  ball.dx    = dx;
  ball.dy    = dy;
  if (animId) cancelAnimationFrame(animId);
  update();
}

window.easyMode   = () => launchWithFee(3.8,  4,    -4);
window.mediumMode = () => launchWithFee(4.8,  5.2, -5.2);
window.hardMode   = () => launchWithFee(5.6,  5.9, -5.9);

// ─── Keyboard ─────────────────────────────────────────────────────────────────
document.addEventListener('keydown', (e) => {
  if (e.key === 'Right' || e.key === 'ArrowRight') paddle.dx =  paddle.speed;
  else if (e.key === 'Left' || e.key === 'ArrowLeft')  paddle.dx = -paddle.speed;
});
document.addEventListener('keyup', (e) => {
  if (['Right', 'ArrowRight', 'Left', 'ArrowLeft'].includes(e.key)) paddle.dx = 0;
});

// ─── Touch Controls (mobile buttons) ─────────────────────────────────────────
const touchLeft  = document.getElementById('touch-left');
const touchRight = document.getElementById('touch-right');

function startLeft()  { paddle.dx = -paddle.speed; }
function startRight() { paddle.dx =  paddle.speed; }
function stopTouch()  { paddle.dx = 0; }

touchLeft?.addEventListener('touchstart',  (e) => { e.preventDefault(); startLeft();  }, { passive: false });
touchLeft?.addEventListener('touchend',    stopTouch);
touchLeft?.addEventListener('touchcancel', stopTouch);
touchRight?.addEventListener('touchstart',  (e) => { e.preventDefault(); startRight(); }, { passive: false });
touchRight?.addEventListener('touchend',    stopTouch);
touchRight?.addEventListener('touchcancel', stopTouch);

// Also support mouse hold (desktop fallback for buttons)
touchLeft?.addEventListener('mousedown',  startLeft);
touchRight?.addEventListener('mousedown', startRight);
document.addEventListener('mouseup', stopTouch);

// ─── Canvas swipe (drag paddle directly on canvas) ────────────────────────────
let lastTouchX = null;
canvas.addEventListener('touchstart', (e) => {
  lastTouchX = e.touches[0].clientX;
}, { passive: true });
canvas.addEventListener('touchmove', (e) => {
  e.preventDefault();
  if (lastTouchX === null) return;
  const dx = e.touches[0].clientX - lastTouchX;
  // Scale dx by canvas internal vs displayed width ratio
  const scaleX = canvas.width / canvas.getBoundingClientRect().width;
  paddle.x += dx * scaleX;
  if (paddle.x < 0) paddle.x = 0;
  if (paddle.x + paddle.w > canvas.width) paddle.x = canvas.width - paddle.w;
  lastTouchX = e.touches[0].clientX;
}, { passive: false });
canvas.addEventListener('touchend', () => { lastTouchX = null; });


// ─── Rules panel ──────────────────────────────────────────────────────────────
const rulesBtn = document.getElementById('rules-btn');
const closeBtn = document.getElementById('close-btn');
const rules    = document.getElementById('rules');
rulesBtn?.addEventListener('click', () => rules.classList.add('show'));
closeBtn?.addEventListener('click', () => rules.classList.remove('show'));

// Kick off idle drawing
update();
