const cameraView = document.getElementById("cameraView");
const gameArea = document.getElementById("gameArea");

const introScreen = document.getElementById("introScreen");
const resultScreen = document.getElementById("resultScreen");
const gameHud = document.getElementById("gameHud");

const startBtn = document.getElementById("startBtn");
const playAgainBtn = document.getElementById("playAgainBtn");
const shareBtn = document.getElementById("shareBtn");
const catchBtn = document.getElementById("catchBtn");

const scoreText = document.getElementById("scoreText");
const timerText = document.getElementById("timerText");
const finalScoreText = document.getElementById("finalScoreText");
const leaderboardList = document.getElementById("leaderboardList");

const GAME_DURATION = 60;
const SPAWN_SPEED = 1300;
const CHILI_LIFETIME_MIN = 3300;
const CHILI_LIFETIME_MAX = 4600;
const LEADERBOARD_KEY = "green_chili_hunt_leaderboard";

let score = 0;
let timeLeft = GAME_DURATION;
let gameRunning = false;

let timerInterval = null;
let spawnInterval = null;

let cameraStarted = false;
let cameraStream = null;

document.body.classList.add("intro-mode");

startBtn.addEventListener("click", startGame);
playAgainBtn.addEventListener("click", resetToIntro);
shareBtn.addEventListener("click", shareScoreImage);
catchBtn.addEventListener("click", catchChiliByMarker);

async function startCamera() {
  if (cameraStarted && cameraStream) {
    return true;
  }

  try {
    const stream = await navigator.mediaDevices.getUserMedia({
      video: {
        facingMode: {
          ideal: "environment"
        },
        width: {
          ideal: 1280
        },
        height: {
          ideal: 720
        }
      },
      audio: false
    });

    cameraStream = stream;
    cameraView.srcObject = stream;
    cameraStarted = true;

    return true;
  } catch (error) {
    console.error("Camera error:", error);

    alert(
      "Camera access is required to play this game. Please allow camera access."
    );

    return false;
  }
}

function stopCamera() {
  if (cameraStream) {
    cameraStream.getTracks().forEach((track) => {
      track.stop();
    });
  }

  cameraStream = null;
  cameraStarted = false;
  cameraView.srcObject = null;
}

async function startGame() {
  const cameraReady = await startCamera();

  if (!cameraReady) {
    return;
  }

  resetGameData();

  document.body.classList.remove("intro-mode");
  document.body.classList.remove("result-mode");
  document.body.classList.add("game-mode");

  introScreen.classList.remove("active");
  resultScreen.classList.remove("active");
  gameHud.classList.remove("hidden");

  gameRunning = true;

  runTimer();
  runSpawner();
}

function resetGameData() {
  score = 0;
  timeLeft = GAME_DURATION;

  scoreText.textContent = score;
  timerText.textContent = timeLeft;
  finalScoreText.textContent = score;

  gameArea.innerHTML = "";

  clearInterval(timerInterval);
  clearInterval(spawnInterval);
}

function runTimer() {
  clearInterval(timerInterval);

  timerInterval = setInterval(() => {
    if (!gameRunning) return;

    timeLeft--;

    if (timeLeft < 0) {
      timeLeft = 0;
    }

    timerText.textContent = timeLeft;

    if (timeLeft <= 0) {
      endGame();
    }
  }, 1000);
}

function runSpawner() {
  clearInterval(spawnInterval);

  spawnChili();

  spawnInterval = setInterval(() => {
    if (!gameRunning) return;
    spawnChili();
  }, SPAWN_SPEED);
}

function spawnChili() {
  const chili = document.createElement("img");

  chili.src = "assets/images/chili-green.png";
  chili.className = "chili moving-chili";
  chili.alt = "Green Chili";

  const size = randomNumber(64, 96);
  chili.style.width = `${size}px`;

  const movement = createRandomMovement(size);

  chili.style.left = `${movement.startX}px`;
  chili.style.top = `${movement.startY}px`;

  const rotate = randomNumber(-20, 20);
  chili.style.rotate = `${rotate}deg`;

  gameArea.appendChild(chili);

  const duration = randomNumber(CHILI_LIFETIME_MIN, CHILI_LIFETIME_MAX);

  chili.animate(
    [
      {
        left: `${movement.startX}px`,
        top: `${movement.startY}px`,
        transform: "scale(0.9)"
      },
      {
        left: `${movement.midX}px`,
        top: `${movement.midY}px`,
        transform: "scale(1.12)"
      },
      {
        left: `${movement.endX}px`,
        top: `${movement.endY}px`,
        transform: "scale(0.95)"
      }
    ],
    {
      duration: duration,
      easing: "ease-in-out",
      fill: "forwards"
    }
  );

  chili.dataset.caught = "false";

  setTimeout(() => {
    if (chili.parentElement) {
      chili.remove();
    }
  }, duration + 80);
}

function createRandomMovement(size) {
  const side = randomNumber(0, 3);
  const margin = 130;

  const topLimit = 130;
  const bottomLimit = window.innerHeight - 245;
  const leftLimit = 30;
  const rightLimit = window.innerWidth - size - 30;

  let startX;
  let startY;
  let endX;
  let endY;

  if (side === 0) {
    startX = -margin;
    startY = randomNumber(topLimit, Math.max(topLimit, bottomLimit));

    endX = window.innerWidth + margin;
    endY = randomNumber(topLimit, Math.max(topLimit, bottomLimit));
  } else if (side === 1) {
    startX = window.innerWidth + margin;
    startY = randomNumber(topLimit, Math.max(topLimit, bottomLimit));

    endX = -margin;
    endY = randomNumber(topLimit, Math.max(topLimit, bottomLimit));
  } else if (side === 2) {
    startX = randomNumber(leftLimit, Math.max(leftLimit, rightLimit));
    startY = -margin;

    endX = randomNumber(leftLimit, Math.max(leftLimit, rightLimit));
    endY = window.innerHeight + margin;
  } else {
    startX = randomNumber(leftLimit, Math.max(leftLimit, rightLimit));
    startY = window.innerHeight + margin;

    endX = randomNumber(leftLimit, Math.max(leftLimit, rightLimit));
    endY = -margin;
  }

  const centerOffsetX = randomNumber(-80, 80);
  const centerOffsetY = randomNumber(-80, 80);

  const midX = window.innerWidth / 2 + centerOffsetX;
  const midY = window.innerHeight * 0.46 + centerOffsetY;

  return {
    startX,
    startY,
    midX,
    midY,
    endX,
    endY
  };
}

function catchChiliByMarker() {
  if (!gameRunning) return;

  const target = document.querySelector(".aim-area");
  const chilies = document.querySelectorAll(".chili");

  if (!target || chilies.length === 0) {
    showMissEffect();
    return;
  }

  const targetRect = target.getBoundingClientRect();

  const targetCenterX = targetRect.left + targetRect.width / 2;
  const targetCenterY = targetRect.top + targetRect.height / 2;

  const catchRadius = targetRect.width * 0.39;

  let caughtChili = null;
  let caughtX = 0;
  let caughtY = 0;

  chilies.forEach((chili) => {
    if (caughtChili) return;

    if (chili.dataset.caught === "true") return;

    const chiliRect = chili.getBoundingClientRect();

    const chiliCenterX = chiliRect.left + chiliRect.width / 2;
    const chiliCenterY = chiliRect.top + chiliRect.height / 2;

    const distance = getDistance(
      targetCenterX,
      targetCenterY,
      chiliCenterX,
      chiliCenterY
    );

    if (distance <= catchRadius) {
      caughtChili = chili;
      caughtX = chiliRect.left;
      caughtY = chiliRect.top;
    }
  });

  if (caughtChili) {
    collectChili(caughtChili, caughtX, caughtY);
  } else {
    showMissEffect();
  }
}

function collectChili(chili, x, y) {
  if (!gameRunning) return;

  if (!chili || !chili.parentElement) return;

  chili.dataset.caught = "true";

  score++;
  scoreText.textContent = score;

  createHitEffect(x, y);
  createPlusOne(x, y);

  chili.remove();
}

function showMissEffect() {
  const target = document.querySelector(".aim-area");

  if (target) {
    target.classList.remove("miss");
    void target.offsetWidth;
    target.classList.add("miss");
  }

  const miss = document.createElement("div");
  miss.className = "miss-text";
  miss.textContent = "MISS";

  document.body.appendChild(miss);

  setTimeout(() => {
    miss.remove();
  }, 600);
}

function createHitEffect(x, y) {
  const effect = document.createElement("div");

  effect.className = "hit-effect";
  effect.style.left = `${x - 8}px`;
  effect.style.top = `${y - 8}px`;

  gameArea.appendChild(effect);

  setTimeout(() => {
    effect.remove();
  }, 500);
}

function createPlusOne(x, y) {
  const plus = document.createElement("div");

  plus.className = "plus-one";
  plus.textContent = "+1";
  plus.style.left = `${x + 22}px`;
  plus.style.top = `${y - 12}px`;

  gameArea.appendChild(plus);

  setTimeout(() => {
    plus.remove();
  }, 700);
}

function endGame() {
  if (!gameRunning) return;

  gameRunning = false;

  clearInterval(timerInterval);
  clearInterval(spawnInterval);

  gameArea.innerHTML = "";
  gameHud.classList.add("hidden");

  finalScoreText.textContent = score;

  saveLeaderboard(score);
  renderLeaderboard();

  stopCamera();

  document.body.classList.remove("game-mode");
  document.body.classList.add("result-mode");

  resultScreen.classList.add("active");
}

function resetToIntro() {
  gameRunning = false;

  clearInterval(timerInterval);
  clearInterval(spawnInterval);

  gameArea.innerHTML = "";

  stopCamera();

  score = 0;
  timeLeft = GAME_DURATION;

  scoreText.textContent = score;
  timerText.textContent = timeLeft;
  finalScoreText.textContent = score;

  resultScreen.classList.remove("active");
  gameHud.classList.add("hidden");
  introScreen.classList.add("active");

  document.body.classList.remove("game-mode");
  document.body.classList.remove("result-mode");
  document.body.classList.add("intro-mode");
}

function saveLeaderboard(newScore) {
  const leaderboard = getLeaderboard();

  const newData = {
    name: "Player",
    score: newScore,
    date: new Date().toISOString()
  };

  leaderboard.push(newData);

  leaderboard.sort((a, b) => b.score - a.score);

  const topFive = leaderboard.slice(0, 5);

  localStorage.setItem(LEADERBOARD_KEY, JSON.stringify(topFive));
}

function getLeaderboard() {
  const data = localStorage.getItem(LEADERBOARD_KEY);

  if (!data) {
    return [];
  }

  try {
    return JSON.parse(data);
  } catch (error) {
    console.error("Leaderboard parse error:", error);
    return [];
  }
}

function renderLeaderboard() {
  const leaderboard = getLeaderboard();

  leaderboardList.innerHTML = "";

  if (leaderboard.length === 0) {
    const emptyRow = document.createElement("div");
    emptyRow.className = "leaderboard-item";
    emptyRow.innerHTML = `
      <span class="leaderboard-rank">-</span>
      <span class="leaderboard-name">No score yet</span>
      <span class="leaderboard-score">0</span>
    `;

    leaderboardList.appendChild(emptyRow);
    return;
  }

  leaderboard.forEach((item, index) => {
    const row = document.createElement("div");

    row.className = "leaderboard-item";

    row.innerHTML = `
      <span class="leaderboard-rank">#${index + 1}</span>
      <span class="leaderboard-name">${item.name}</span>
      <span class="leaderboard-score">${item.score}</span>
    `;

    leaderboardList.appendChild(row);
  });
}

async function shareScoreImage() {
  try {
    const imageBlob = await createScoreImageBlob(score);

    const file = new File(
      [imageBlob],
      "green-chili-hunt-score.png",
      {
        type: "image/png"
      }
    );

    if (navigator.canShare && navigator.canShare({ files: [file] })) {
      await navigator.share({
        title: "Green Chili Hunt Score",
        text: `I collected ${score} green chilies in Green Chili Hunt!`,
        files: [file]
      });

      return;
    }

    if (navigator.share) {
      await navigator.share({
        title: "Green Chili Hunt Score",
        text: `I collected ${score} green chilies in Green Chili Hunt!`
      });

      return;
    }

    downloadScoreImage(imageBlob);
  } catch (error) {
    console.error("Share error:", error);
    alert("Share is not available on this browser.");
  }
}

function createScoreImageBlob(scoreValue) {
  return new Promise((resolve) => {
    const canvas = document.createElement("canvas");

    canvas.width = 1080;
    canvas.height = 1920;

    const ctx = canvas.getContext("2d");

    const gradient = ctx.createLinearGradient(0, 0, 0, canvas.height);
    gradient.addColorStop(0, "#1c5a21");
    gradient.addColorStop(0.5, "#071a0b");
    gradient.addColorStop(1, "#020502");

    ctx.fillStyle = gradient;
    ctx.fillRect(0, 0, canvas.width, canvas.height);

    ctx.fillStyle = "rgba(202, 255, 114, 0.12)";
    ctx.beginPath();
    ctx.arc(540, 360, 330, 0, Math.PI * 2);
    ctx.fill();

    ctx.fillStyle = "rgba(202, 255, 114, 0.08)";
    ctx.beginPath();
    ctx.arc(130, 1600, 290, 0, Math.PI * 2);
    ctx.fill();

    ctx.font = "900 76px Arial";
    ctx.fillStyle = "#caff72";
    ctx.textAlign = "center";
    ctx.fillText("GREEN CHILI HUNT", 540, 320);

    ctx.font = "400 44px Arial";
    ctx.fillStyle = "rgba(255, 255, 255, 0.78)";
    ctx.fillText("My Final Score", 540, 545);

    ctx.font = "900 230px Arial";
    ctx.fillStyle = "#ffffff";
    ctx.fillText(scoreValue.toString(), 540, 815);

    drawChiliIcon(ctx, 540, 1065);

    ctx.font = "500 44px Arial";
    ctx.fillStyle = "rgba(255, 255, 255, 0.84)";
    ctx.fillText("Can you beat my score?", 540, 1290);

    ctx.fillStyle = "rgba(255, 255, 255, 0.12)";
    roundRect(ctx, 150, 1420, 780, 145, 42);
    ctx.fill();

    ctx.font = "700 38px Arial";
    ctx.fillStyle = "#ffffff";
    ctx.fillText("Play now and collect green chilies!", 540, 1508);

    ctx.font = "400 30px Arial";
    ctx.fillStyle = "rgba(255, 255, 255, 0.55)";
    ctx.fillText("Share your score", 540, 1695);

    canvas.toBlob((blob) => {
      resolve(blob);
    }, "image/png");
  });
}

function drawChiliIcon(ctx, x, y) {
  ctx.save();

  ctx.translate(x, y);
  ctx.rotate(-0.35);

  ctx.fillStyle = "#55e85b";
  ctx.beginPath();
  ctx.moveTo(-115, 40);
  ctx.bezierCurveTo(-40, 110, 95, 60, 115, -35);
  ctx.bezierCurveTo(30, 25, -35, 15, -115, 40);
  ctx.fill();

  ctx.fillStyle = "rgba(255,255,255,0.35)";
  ctx.beginPath();
  ctx.ellipse(20, -5, 55, 18, -0.2, 0, Math.PI * 2);
  ctx.fill();

  ctx.strokeStyle = "#8ad34a";
  ctx.lineWidth = 18;
  ctx.lineCap = "round";
  ctx.beginPath();
  ctx.moveTo(-20, -30);
  ctx.quadraticCurveTo(-30, -95, 35, -115);
  ctx.stroke();

  ctx.restore();
}

function downloadScoreImage(blob) {
  const url = URL.createObjectURL(blob);

  const link = document.createElement("a");
  link.href = url;
  link.download = "green-chili-hunt-score.png";

  document.body.appendChild(link);
  link.click();
  link.remove();

  URL.revokeObjectURL(url);
}

function roundRect(ctx, x, y, width, height, radius) {
  ctx.beginPath();
  ctx.moveTo(x + radius, y);
  ctx.lineTo(x + width - radius, y);
  ctx.quadraticCurveTo(x + width, y, x + width, y + radius);
  ctx.lineTo(x + width, y + height - radius);
  ctx.quadraticCurveTo(
    x + width,
    y + height,
    x + width - radius,
    y + height
  );
  ctx.lineTo(x + radius, y + height);
  ctx.quadraticCurveTo(x, y + height, x, y + height - radius);
  ctx.lineTo(x, y + radius);
  ctx.quadraticCurveTo(x, y, x + radius, y);
  ctx.closePath();
}

function getDistance(x1, y1, x2, y2) {
  const dx = x2 - x1;
  const dy = y2 - y1;

  return Math.sqrt(dx * dx + dy * dy);
}

function randomNumber(min, max) {
  return Math.floor(Math.random() * (max - min + 1)) + min;
}