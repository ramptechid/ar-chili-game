const cameraView = document.getElementById("cameraView");
const gameArea = document.getElementById("gameArea");

const introScreen = document.getElementById("introScreen");
const resultScreen = document.getElementById("resultScreen");
const gameHud = document.getElementById("gameHud");

const startBtn = document.getElementById("startBtn");
const playAgainBtn = document.getElementById("playAgainBtn");
const shareBtn = document.getElementById("shareBtn");

const scoreText = document.getElementById("scoreText");
const timerText = document.getElementById("timerText");
const finalScoreText = document.getElementById("finalScoreText");
const leaderboardList = document.getElementById("leaderboardList");

const GAME_DURATION = 60;
const SPAWN_SPEED = 700;
const CHILI_LIFETIME = 1400;
const LEADERBOARD_KEY = "chili_hunt_leaderboard";

let score = 0;
let timeLeft = GAME_DURATION;
let gameRunning = false;

let timerInterval = null;
let spawnInterval = null;

let cameraStarted = false;
let cameraStream = null;

startBtn.addEventListener("click", startGame);
playAgainBtn.addEventListener("click", backToIntro);
shareBtn.addEventListener("click", shareScoreImage);

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
      "Camera permission is required to play this game. Please allow camera access."
    );

    return false;
  }
}

async function startGame() {
  const cameraReady = await startCamera();

  if (!cameraReady) {
    return;
  }

  resetGameData();

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

  spawnInterval = setInterval(() => {
    if (!gameRunning) return;

    spawnChili();
  }, SPAWN_SPEED);
}

function spawnChili() {
  const chili = document.createElement("img");

  chili.src = "assets/images/chili-green.png";
  chili.className = "chili";
  chili.alt = "Green Chili";

  const size = randomNumber(58, 92);

  chili.style.width = `${size}px`;

  const safeTop = 130;
  const safeBottom = 165;
  const safeSide = 24;

  const maxX = window.innerWidth - size - safeSide;
  const maxY = window.innerHeight - size - safeBottom;

  const x = randomNumber(safeSide, Math.max(safeSide, maxX));
  const y = randomNumber(safeTop, Math.max(safeTop, maxY));

  chili.style.left = `${x}px`;
  chili.style.top = `${y}px`;

  const rotate = randomNumber(-18, 18);
  chili.style.rotate = `${rotate}deg`;

  gameArea.appendChild(chili);

  const collectHandler = () => {
    collectChili(chili, x, y);
  };

  chili.addEventListener("click", collectHandler);
  chili.addEventListener("touchstart", collectHandler, { passive: true });

  setTimeout(() => {
    if (chili.parentElement) {
      chili.remove();
    }
  }, CHILI_LIFETIME);
}

function collectChili(chili, x, y) {
  if (!gameRunning) return;

  if (!chili || !chili.parentElement) return;

  score++;
  scoreText.textContent = score;

  createHitEffect(x, y);
  createPlusOne(x, y);

  chili.remove();
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

  resultScreen.classList.add("active");
}

function backToIntro() {
  gameRunning = false;

  clearInterval(timerInterval);
  clearInterval(spawnInterval);

  gameArea.innerHTML = "";

  resultScreen.classList.remove("active");
  gameHud.classList.add("hidden");
  introScreen.classList.add("active");

  score = 0;
  timeLeft = GAME_DURATION;

  scoreText.textContent = score;
  timerText.textContent = timeLeft;
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
      "chili-hunt-score.png",
      {
        type: "image/png"
      }
    );

    if (navigator.canShare && navigator.canShare({ files: [file] })) {
      await navigator.share({
        title: "Chili Hunt AR Score",
        text: `I scored ${score} points in Chili Hunt AR!`,
        files: [file]
      });

      return;
    }

    if (navigator.share) {
      await navigator.share({
        title: "Chili Hunt AR Score",
        text: `I scored ${score} points in Chili Hunt AR!`
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
    gradient.addColorStop(0, "#17451f");
    gradient.addColorStop(0.5, "#07130a");
    gradient.addColorStop(1, "#020502");

    ctx.fillStyle = gradient;
    ctx.fillRect(0, 0, canvas.width, canvas.height);

    ctx.fillStyle = "rgba(185, 255, 106, 0.12)";
    ctx.beginPath();
    ctx.arc(540, 360, 330, 0, Math.PI * 2);
    ctx.fill();

    ctx.fillStyle = "rgba(185, 255, 106, 0.08)";
    ctx.beginPath();
    ctx.arc(120, 1600, 280, 0, Math.PI * 2);
    ctx.fill();

    ctx.font = "900 82px Arial";
    ctx.fillStyle = "#caff72";
    ctx.textAlign = "center";
    ctx.fillText("CHILI HUNT AR", 540, 300);

    ctx.font = "400 44px Arial";
    ctx.fillStyle = "rgba(255, 255, 255, 0.78)";
    ctx.fillText("My Final Score", 540, 520);

    ctx.font = "900 220px Arial";
    ctx.fillStyle = "#ffffff";
    ctx.fillText(scoreValue.toString(), 540, 780);

    ctx.font = "900 180px Arial";
    ctx.fillText("🌶️", 540, 1060);

    ctx.font = "500 44px Arial";
    ctx.fillStyle = "rgba(255, 255, 255, 0.84)";
    ctx.fillText("Can you beat my score?", 540, 1270);

    ctx.fillStyle = "rgba(255, 255, 255, 0.12)";
    roundRect(ctx, 160, 1410, 760, 140, 42);
    ctx.fill();

    ctx.font = "700 38px Arial";
    ctx.fillStyle = "#ffffff";
    ctx.fillText("Play now and collect more chilies!", 540, 1495);

    ctx.font = "400 30px Arial";
    ctx.fillStyle = "rgba(255, 255, 255, 0.55)";
    ctx.fillText("Share your score", 540, 1690);

    canvas.toBlob((blob) => {
      resolve(blob);
    }, "image/png");
  });
}

function downloadScoreImage(blob) {
  const url = URL.createObjectURL(blob);

  const link = document.createElement("a");
  link.href = url;
  link.download = "chili-hunt-score.png";

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

function randomNumber(min, max) {
  return Math.floor(Math.random() * (max - min + 1)) + min;
}