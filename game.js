const canvas = document.getElementById('gameCanvas');
if (!canvas) {
  console.error('❌ Canvas element not found!');
  throw new Error('Canvas element with id "gameCanvas" not found');
}
const ctx = canvas.getContext('2d');
if (!ctx) {
  console.error('❌ Canvas context failed!');
  throw new Error('Failed to get 2D context from canvas');
}
console.log('✓ Canvas initialized:', canvas.width, 'x', canvas.height);

const scoreEl = document.getElementById('score');
const waveEl = document.getElementById('wave');
const livesEl = document.getElementById('lives');
const killsEl = document.getElementById('kills');
const powerEl = document.getElementById('power');
const bossStatEl = document.getElementById('bossStat');
const bossHpEl = document.getElementById('bossHp');
const waveBannerEl = document.getElementById('waveBanner');
const megaBonusBannerEl = document.getElementById('megaBonusBanner');
const bonusListEl = document.getElementById('bonusList');
const pickupBannerEl = document.getElementById('pickupBanner');
const waveProgressCounterEl = document.getElementById('waveProgressCounter');
const startMenuEl = document.getElementById('startMenu');
const startButtonEl = document.getElementById('startButton');
const bonusInfoButtonEl = document.getElementById('bonusInfoButton');
const bonusGuidePanelEl = document.getElementById('bonusGuidePanel');
const bonusGuideListEl = document.getElementById('bonusGuideList');
const portraitEl = document.getElementById('portrait');
const statusTextEl = document.getElementById('statusText');
const timerEl = document.getElementById('timer');

const bonusQueueHudEl = document.getElementById('bonusQueueHud');
const menuButtonEl = document.getElementById('menuButton');
const volumeSliderEl = document.getElementById('volumeSlider');
const volumeValueEl = document.getElementById('volumeValue');
const rankingListEl = document.getElementById('rankingList');
const rankingNoticeEl = document.getElementById('rankingNotice');
const discordLoginButtonEl = document.getElementById('discordLoginButton');
const discordLogoutButtonEl = document.getElementById('discordLogoutButton');
const discordUserBadgeEl = document.getElementById('discordUserBadge');
const discordUserAvatarEl = document.getElementById('discordUserAvatar');
const discordUserNameEl = document.getElementById('discordUserName');

const lobbyMenuEl = document.getElementById('lobbyMenu');

const { clamp, rand, distSq, makeDistortionCurve } = window.GameUtils;
const MAX_LIVES = 5;
const MAP_WIDTH = 1240;
const MAP_HEIGHT = 760;

canvas.width = MAP_WIDTH;
canvas.height = MAP_HEIGHT;

const pipEls = [
  document.getElementById('pip1'),
  document.getElementById('pip2'),
  document.getElementById('pip3'),
  document.getElementById('pip4'),
  document.getElementById('pip5')
];

const portraitNormal = new Image();
portraitNormal.src = 'assets/anxpo1.png';

const portraitHit = new Image();
portraitHit.src = 'assets/anxpo 2.png';

const kimbaSpectroImage = new Image();
kimbaSpectroImage.src = 'assets/kimbaespectro.png';

const ultimateLogoImage = new Image();
ultimateLogoImage.src = 'assets/niveles audio/logo_oficial.png';

const realityBossImage = new Image();
realityBossImage.src = 'assets/jefinal.png';

const kimbaAudio = new Audio('assets/papa dios.wav');
kimbaAudio.preload = 'auto';
const kimbaPlusAudio = new Audio('assets/niveles audio/kimba plus.wav');
kimbaPlusAudio.preload = 'auto';
const plusMutadoAudio = new Audio('assets/niveles audio/plusmutacion.wav');
plusMutadoAudio.preload = 'auto';
const ultimoAtaqueAudio = new Audio('assets/niveles audio/ultimo ataque.wav');
ultimoAtaqueAudio.preload = 'auto';
const waveAudioPlayers = new Map();
const backgroundMusic = new Audio('assets/MUSICAFONDO.mp3');
backgroundMusic.preload = 'auto';
backgroundMusic.loop = true;
backgroundMusic.volume = 0.16;
const silalaMusic = new Audio('assets/Tema del Silala.mp3');
silalaMusic.preload = 'auto';
silalaMusic.loop = true;
silalaMusic.volume = 0.16;
let currentMusicTrack = 'normal';

let sfxContext = null;
let gameVolume = 0.55; // 0-1, applied to music and SFX
let kimbaBuffer = null;
let kimbaPlusBuffer = null;
let plusMutadoBuffer = null;
let ultimoAtaqueBuffer = null;
const waveAudioBuffers = new Map();
let sfxFxInput = null;
let kimbaPlusMediaSource = null;

const POWERUP_DEFS = {
  kimbaPlus: {
    type: 'kimbaPlus',
    src: 'assets/KIMBA PLUS.png',
    display: 'kimba plus',
    duration: 0,
    rarity: 1
  },
  double: {
    type: 'double',
    src: 'assets/conquistadorarmor.png',
    display: 'conquistadorarmor',
    duration: 28000,
    rarity: 1
  },
  bigBullets: {
    type: 'bigBullets',
    src: 'assets/eruditomor.png',
    display: 'eruditomor',
    duration: 28000,
    rarity: 1
  },
  speed: {
    type: 'speed',
    src: 'assets/exterminadorarmor.png',
    display: 'exterminadorarmor',
    duration: 28000,
    rarity: 1
  },
  navelo: {
    type: 'navelo',
    src: 'assets/navelo.png',
    display: 'navelo',
    duration: 12000,
    rarity: 1
  },
  pasmor: {
    type: 'pasmor',
    src: 'assets/pasmorr.png',
    display: 'pasmor',
    duration: 12000,
    rarity: 1
  },
  voculos: {
    type: 'voculos',
    src: 'assets/voculos.png',
    display: 'voculos',
    duration: 12000,
    rarity: 1
  },
  plebarmor: {
    type: 'plebarmor',
    src: 'assets/plelbarmor.png',
    display: 'plebarmor',
    duration: 0,
    rarity: 1
  }
};

const powerupSkins = Object.values(POWERUP_DEFS);

const powerupImages = powerupSkins.map((entry) => {
  const img = new Image();
  img.src = entry.src;
  return { type: entry.type, img };
});

const powerupImageByType = new Map(powerupImages.map((entry) => [entry.type, entry.img]));

const BONUS_DESCRIPTIONS = {
  kimbaPlus: 'Recupera una vida o da puntos si ya tienes vida maxima.',
  double: 'Disparo doble durante el efecto.',
  bigBullets: 'Balas mas grandes y con mejor impacto.',
  speed: 'Movimiento mas rapido temporal.',
  navelo: 'Se activa con R y dispara en todas direcciones.',
  pasmor: 'Se activa con R y aumenta el ritmo de fuego.',
  voculos: 'Se activa con R y dispara un rayo laser naranja.',
  plebarmor: 'Escudo de 1 impacto. Se pierde al primer disparo recibido.'
};

const state = {
  running: false,
  started: false,
  win: false,
  score: 0,
  kills: 0,
  wave: 1,
  waveLabel: '',
  lives: 3,
  keys: new Set(),
  bullets: [],
  enemies: [],
  enemyBullets: [],
  obstacles: [],
  powerups: [],
  boss: null,
  realityRays: [],
  mouse: { x: canvas.width * 0.5, y: canvas.height * 0.5 },
  mouseHeld: false,
  spawnTimer: 0,
  spawnInterval: 1.15,
  waveTimer: 0,
  waveDuration: 22,
  powerupTimer: 0,
  nextPowerupIn: rand(8, 18),
  enemyFireTimer: 0,
  bannerUntil: 0,
  waveBannerUntil: 0,
  waveBannerText: '',
  megaBonusUntil: 0,
  uiQuakeUntil: 0,
  hitFlashUntil: 0,
  iFramesUntil: 0,
  fireCooldown: 0,
  effectsUntil: {
    double: 0,
    bigBullets: 0,
    speed: 0,
    navelo: 0,
    pasmor: 0,
    voculos: 0
  },
  naveloCharges: 0,
  pasmorCharges: 0,
  voculosCharges: 0,
  playerLaserUntil: 0,
  playerLaserAngle: 0,
  kimbaPlusGoldUntil: 0,
  kimbaSpectroUntil: 0,
  ultimateUsed: false,
  ultimateUntil: 0,
  ultimateLogoUntil: 0,
  ultimateTickTimer: 0,
  shieldCharges: 0,
  damageCount: 0,
  shakeUntil: 0,
  shakePower: 0,
  startedAt: 0,
  endedAt: 0,
  resultPosted: false,
  resultPosting: false
};

const authState = {
  user: null
};

function escapeHtml(value) {
  return String(value || '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;');
}

function formatRankingTime(ms) {
  const total = Math.max(0, Math.floor((Number(ms) || 0) / 1000));
  const min = Math.floor(total / 60);
  const sec = total % 60;
  return `${String(min).padStart(2, '0')}:${String(sec).padStart(2, '0')}`;
}

async function apiJson(url, options = {}) {
  const response = await fetch(url, options);
  let data = null;
  try {
    data = await response.json();
  } catch (_) {
    data = null;
  }

  if (!response.ok) {
    const message = data && data.error ? data.error : 'Error de red';
    throw new Error(message);
  }

  return data;
}

function updateDiscordUi() {
  const user = authState.user;
  const isAuthed = Boolean(user && user.username);

  if (discordLoginButtonEl) {
    discordLoginButtonEl.classList.toggle('hidden', isAuthed);
  }
  if (discordLogoutButtonEl) {
    discordLogoutButtonEl.classList.toggle('hidden', !isAuthed);
  }

  if (discordUserBadgeEl && discordUserAvatarEl && discordUserNameEl) {
    discordUserBadgeEl.classList.toggle('hidden', !isAuthed);
    if (isAuthed) {
      discordUserAvatarEl.src = user.avatarUrl;
      discordUserNameEl.textContent = user.username;
    }
  }

  if (rankingNoticeEl) {
    rankingNoticeEl.textContent = isAuthed
      ? 'Listo. Tu resultado se guarda automaticamente al terminar la partida.'
      : 'Conecta Discord para guardar tu puntaje y tiempo en el ranking.';
  }
}

function renderRanking(ranking) {
  if (!rankingListEl) {
    return;
  }

  if (!Array.isArray(ranking) || ranking.length === 0) {
    rankingListEl.innerHTML = '<div class="ranking-empty">Aun no hay jugadores en el ranking.</div>';
    return;
  }

  rankingListEl.innerHTML = ranking.map((entry, idx) => {
    const pos = idx + 1;
    const name = escapeHtml(entry.username || 'Jugador');
    const score = Number(entry.score) || 0;
    const time = formatRankingTime(entry.elapsedMs);
    const avatar = escapeHtml(entry.avatarUrl || '');
    return `<article class="ranking-entry">
      <span class="ranking-pos">#${pos}</span>
      <img class="ranking-avatar" src="${avatar}" alt="Avatar ${name}">
      <div class="ranking-meta">
        <p class="ranking-name">${name}</p>
        <p class="ranking-sub">Tiempo ${time}</p>
      </div>
      <strong class="ranking-score">${score}</strong>
    </article>`;
  }).join('');
}

async function refreshRanking() {
  try {
    const data = await apiJson('/api/ranking');
    renderRanking(data.ranking || []);
  } catch (_) {
    if (rankingListEl) {
      rankingListEl.innerHTML = '<div class="ranking-empty">No se pudo cargar el ranking.</div>';
    }
  }
}

async function refreshDiscordSession() {
  try {
    const data = await apiJson('/api/discord/me');
    authState.user = data && data.authenticated ? data.user : null;
  } catch (_) {
    authState.user = null;
  }
  updateDiscordUi();
}

async function postResultOnce() {
  if (state.resultPosted || state.resultPosting || !state.started || state.running || !authState.user) {
    return;
  }

  const ended = state.endedAt || performance.now();
  const elapsedMs = Math.max(0, Math.floor(ended - state.startedAt));

  try {
    state.resultPosting = true;
    await apiJson('/api/ranking', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        score: state.score,
        elapsedMs
      })
    });
    state.resultPosted = true;
    await refreshRanking();
    if (rankingNoticeEl) {
      rankingNoticeEl.textContent = 'Puntaje guardado en el ranking.';
    }
  } catch (err) {
    if (rankingNoticeEl) {
      rankingNoticeEl.textContent = `No se pudo guardar: ${err.message}`;
    }
  } finally {
    state.resultPosting = false;
  }
}

const player = {
  x: canvas.width * 0.5,
  y: canvas.height * 0.5,
  radius: 12,
  speed: 182
};

const ROCK_COUNT = 10;

async function ensureKimbaAudioReady() {
  if (!sfxContext) {
    sfxContext = new (window.AudioContext || window.webkitAudioContext)();
  }

  if (!sfxFxInput) {
    const fxInput = sfxContext.createGain();
    const dryGain = sfxContext.createGain();
    const shaper = sfxContext.createWaveShaper();
    const postFilter = sfxContext.createBiquadFilter();
    const delay = sfxContext.createDelay(1.0);
    const feedback = sfxContext.createGain();
    const wetGain = sfxContext.createGain();

    shaper.curve = makeDistortionCurve(190);
    shaper.oversample = '4x';

    postFilter.type = 'bandpass';
    postFilter.frequency.value = 1500;
    postFilter.Q.value = 0.8;

    delay.delayTime.value = 0.2;
    feedback.gain.value = 0.28;
    wetGain.gain.value = 0.34;
    dryGain.gain.value = 0.86;

    fxInput.connect(dryGain);
    dryGain.connect(sfxContext.destination);

    fxInput.connect(shaper);
    shaper.connect(postFilter);
    postFilter.connect(delay);
    delay.connect(feedback);
    feedback.connect(delay);
    delay.connect(wetGain);
    wetGain.connect(sfxContext.destination);

    sfxFxInput = fxInput;
  }

  if (sfxContext.state === 'suspended') {
    await sfxContext.resume();
  }

  if (!kimbaBuffer) {
    const response = await fetch('assets/papa dios.wav');
    const arrayBuffer = await response.arrayBuffer();
    kimbaBuffer = await sfxContext.decodeAudioData(arrayBuffer);
  }

  if (!kimbaPlusBuffer) {
    let response = null;
    try {
      response = await fetch('assets/niveles audio/kimba plus.wav');
      if (!response.ok) {
        throw new Error('Primary WAV path failed');
      }
    } catch (_) {
      response = await fetch('assets/niveles%20audio/kimba%20plus.ogg');
    }
    const arrayBuffer = await response.arrayBuffer();
    kimbaPlusBuffer = await sfxContext.decodeAudioData(arrayBuffer);
  }

  if (!plusMutadoBuffer) {
    let response = null;
    try {
      response = await fetch('assets/niveles audio/plusmutacion.wav');
      if (!response.ok) {
        throw new Error('Primary plusmutacion path failed');
      }
    } catch (_) {
      response = await fetch('assets/niveles%20audio/plusmutacion.wav');
    }
    const arrayBuffer = await response.arrayBuffer();
    plusMutadoBuffer = await sfxContext.decodeAudioData(arrayBuffer);
  }

  if (!ultimoAtaqueBuffer) {
    let response = null;
    try {
      response = await fetch('assets/niveles audio/ultimo ataque.wav');
      if (!response.ok) {
        throw new Error('Primary ultimo ataque path failed');
      }
    } catch (_) {
      response = await fetch('assets/niveles%20audio/ultimo%20ataque.wav');
    }
    const arrayBuffer = await response.arrayBuffer();
    ultimoAtaqueBuffer = await sfxContext.decodeAudioData(arrayBuffer);
  }
}

function playSfxBuffer(buffer, outputGain = 1) {
  if (!sfxContext || !buffer) {
    return;
  }

  const source = sfxContext.createBufferSource();
  source.buffer = buffer;
  const outGain = sfxContext.createGain();
  outGain.gain.value = outputGain;
  source.connect(outGain);
  outGain.connect(sfxFxInput || sfxContext.destination);
  source.start();
}

function playKimbaDistortedAudio() {
  if (!sfxContext || !kimbaBuffer) {
    ensureKimbaAudioReady().then(() => {
      if (sfxContext && kimbaBuffer) {
        playKimbaDistortedAudio();
      }
    }).catch(() => {
      kimbaAudio.currentTime = 0;
      kimbaAudio.volume = 1;
      kimbaAudio.play().catch(() => {});
    });
    return;
  }

  const source = sfxContext.createBufferSource();
  source.buffer = kimbaBuffer;

  const preGain = sfxContext.createGain();
  preGain.gain.value = 1.7;

  const shaper = sfxContext.createWaveShaper();
  shaper.curve = makeDistortionCurve(780);
  shaper.oversample = '4x';

  const filter = sfxContext.createBiquadFilter();
  filter.type = 'bandpass';
  filter.frequency.value = 1600;
  filter.Q.value = 1.1;

  const outGain = sfxContext.createGain();
  outGain.gain.value = 2.1;

  source.connect(preGain);
  preGain.connect(shaper);
  shaper.connect(filter);
  filter.connect(outGain);
  outGain.connect(sfxFxInput || sfxContext.destination);
  source.start();
}

function playKimbaPlusAudio() {
  const fallbackPlay = () => {
    kimbaPlusAudio.currentTime = 0;
    kimbaPlusAudio.play().catch(() => {});
  };

  if (!sfxContext || !kimbaPlusBuffer) {
    ensureKimbaAudioReady().then(() => {
      if (sfxContext) {
        playKimbaPlusAudio();
      }
    }).catch(() => {
      fallbackPlay();
    });
    return;
  }

  if (!sfxFxInput) {
    playSfxBuffer(kimbaPlusBuffer, 1.15);
    return;
  }

  if (!kimbaPlusMediaSource) {
    try {
      kimbaPlusMediaSource = sfxContext.createMediaElementSource(kimbaPlusAudio);
      const kimbaPlusGain = sfxContext.createGain();
      kimbaPlusGain.gain.value = 1.1;
      kimbaPlusMediaSource.connect(kimbaPlusGain);
      kimbaPlusGain.connect(sfxFxInput);
    } catch (_) {
      playSfxBuffer(kimbaPlusBuffer, 1.15);
      return;
    }
  }

  kimbaPlusAudio.currentTime = 0;
  kimbaPlusAudio.play().catch(() => {
    playSfxBuffer(kimbaPlusBuffer, 1.15);
  });
}

function playPlusMutadoAudio() {
  const fallbackPlay = () => {
    plusMutadoAudio.currentTime = 0;
    plusMutadoAudio.play().catch(() => {});
  };

  if (!sfxContext || !plusMutadoBuffer) {
    ensureKimbaAudioReady().then(() => {
      if (sfxContext) {
        playPlusMutadoAudio();
      }
    }).catch(() => {
      fallbackPlay();
    });
    return;
  }

  playSfxBuffer(plusMutadoBuffer, 1.12);
}

function playUltimoAtaqueAudio() {
  const fallbackPlay = () => {
    ultimoAtaqueAudio.currentTime = 0;
    ultimoAtaqueAudio.play().catch(() => {});
  };

  if (!sfxContext || !ultimoAtaqueBuffer) {
    ensureKimbaAudioReady().then(() => {
      if (sfxContext) {
        playUltimoAtaqueAudio();
      }
    }).catch(() => {
      fallbackPlay();
    });
    return;
  }

  playSfxBuffer(ultimoAtaqueBuffer, 1.2);
}

function triggerUltimateAttack(now) {
  if (!state.started || !state.running) {
    return;
  }

  if (state.ultimateUsed) {
    showPickupBanner('ULTIMO ATAQUE YA FUE USADO', now);
    return;
  }

  state.ultimateUsed = true;
  state.ultimateUntil = now + 5000;
  state.ultimateLogoUntil = now + 3000;
  state.ultimateTickTimer = 0;
  playUltimoAtaqueAudio();
  showPickupBanner('ULTIMO ATAQUE ACTIVADO (Q)', now);
  statusTextEl.textContent = 'Estado: ULTIMO ATAQUE en ejecucion';
}

function applyGameVolume() {
  backgroundMusic.volume = gameVolume * 0.3;
  silalaMusic.volume = gameVolume * 0.3;
  if (sfxFxInput) {
    sfxFxInput.gain.value = clamp(gameVolume * 1.2, 0, 1.5);
  }
}

function goToMenu() {
  state.running = false;
  state.started = false;
  state.mouseHeld = false;
  backgroundMusic.pause();
  backgroundMusic.currentTime = 0;
  silalaMusic.pause();
  silalaMusic.currentTime = 0;
  currentMusicTrack = 'normal';
  if (document.pointerLockElement === canvas) {
    document.exitPointerLock();
  }
  document.body.classList.remove('boss-mode', 'navelo-mode', 'voculos-mode', 'kimba-plus-mode', 'ultimate-mode', 'wave-quake');
  if (startMenuEl) {
    startMenuEl.classList.remove('hidden');
  }
  if (lobbyMenuEl) {
    lobbyMenuEl.classList.add('hidden');
  }
  if (bonusQueueHudEl) {
    bonusQueueHudEl.classList.add('hidden');
  }
  refreshRanking();
  refreshDiscordSession();
}

function getNextRBonuses() {
  const queue = [];
  if (state.voculosCharges > 0 && !hasEffect('voculos')) {
    queue.push({ type: 'voculos', charges: state.voculosCharges });
  }
  if (state.pasmorCharges > 0 && !hasEffect('pasmor')) {
    queue.push({ type: 'pasmor', charges: state.pasmorCharges });
  }
  if (state.naveloCharges > 0 && !hasEffect('navelo')) {
    queue.push({ type: 'navelo', charges: state.naveloCharges });
  }
  return queue;
}

function renderBonusQueueHud() {
  if (!bonusQueueHudEl) {
    return;
  }

  if (!state.started || !state.running) {
    bonusQueueHudEl.classList.add('hidden');
    return;
  }

  const queue = getNextRBonuses();
  if (queue.length === 0) {
    bonusQueueHudEl.classList.add('hidden');
    return;
  }

  bonusQueueHudEl.classList.remove('hidden');
  const rows = queue.slice(0, 2).map((entry, idx) => {
    const def = POWERUP_DEFS[entry.type];
    const imgSrc = def ? def.src : '';
    const label = idx === 0 ? 'ACTIVA CON R' : 'SIGUIENTE';
    const cls = idx === 0 ? 'bq-item' : 'bq-item bq-upcoming';
    return `<div class="${cls}">
      <img src="${imgSrc}" alt="${entry.type}">
      <div class="bq-info">
        <span class="bq-label">${label}</span>
        <span class="bq-name">${def ? def.display : entry.type}</span>
      </div>
      <span class="bq-count">x${entry.charges}</span>
    </div>`;
  });

  bonusQueueHudEl.innerHTML = rows.join('');
}

function jumpToBoss(now) {
  if (!state.started) {
    startGame();
  }

  state.running = true;
  state.win = false;
  state.wave = 10;
  state.waveLabel = '';
  state.kills = Math.max(state.kills, 270);
  state.enemies = [];
  state.enemyBullets = [];
  state.powerups = [];
  state.boss = null;
  state.realityRays = [];

  startWave(10, now || performance.now());
  statusTextEl.textContent = 'Estado: Salto de prueba al JEFE FINAL';
}

function playShootSound() {
  if (!sfxContext) {
    return;
  }

  const now = sfxContext.currentTime;
  const osc = sfxContext.createOscillator();
  const gain = sfxContext.createGain();
  const filter = sfxContext.createBiquadFilter();

  osc.type = 'square';
  osc.frequency.setValueAtTime(820, now);
  osc.frequency.exponentialRampToValueAtTime(280, now + 0.05);

  filter.type = 'highpass';
  filter.frequency.value = 240;

  gain.gain.setValueAtTime(0.0001, now);
  gain.gain.exponentialRampToValueAtTime(0.08, now + 0.003);
  gain.gain.exponentialRampToValueAtTime(0.0001, now + 0.065);

  osc.connect(filter);
  filter.connect(gain);
  gain.connect(sfxFxInput || sfxContext.destination);
  osc.start(now);
  osc.stop(now + 0.07);
}

function playHurtSound() {
  if (!sfxContext) {
    return;
  }

  const now = sfxContext.currentTime;
  const osc = sfxContext.createOscillator();
  const gain = sfxContext.createGain();
  const tremolo = sfxContext.createOscillator();
  const tremGain = sfxContext.createGain();

  osc.type = 'sawtooth';
  osc.frequency.setValueAtTime(260, now);
  osc.frequency.exponentialRampToValueAtTime(88, now + 0.22);

  tremolo.type = 'square';
  tremolo.frequency.value = 24;
  tremGain.gain.value = 0.012;

  gain.gain.setValueAtTime(0.0001, now);
  gain.gain.exponentialRampToValueAtTime(0.09, now + 0.01);
  gain.gain.exponentialRampToValueAtTime(0.0001, now + 0.25);

  tremolo.connect(tremGain);
  tremGain.connect(gain.gain);

  osc.connect(gain);
  gain.connect(sfxFxInput || sfxContext.destination);

  tremolo.start(now);
  osc.start(now);
  tremolo.stop(now + 0.26);
  osc.stop(now + 0.26);
}

function playWaveTensionSound() {
  if (!sfxContext) {
    return;
  }

  const now = sfxContext.currentTime;
  const lead = sfxContext.createOscillator();
  const harmony = sfxContext.createOscillator();
  const gain = sfxContext.createGain();
  const filter = sfxContext.createBiquadFilter();

  lead.type = 'sawtooth';
  lead.frequency.setValueAtTime(120, now);
  lead.frequency.exponentialRampToValueAtTime(260, now + 1.8);

  harmony.type = 'triangle';
  harmony.frequency.setValueAtTime(180, now);
  harmony.frequency.exponentialRampToValueAtTime(360, now + 1.8);
  harmony.detune.value = -8;

  filter.type = 'lowpass';
  filter.frequency.setValueAtTime(520, now);
  filter.frequency.exponentialRampToValueAtTime(1700, now + 1.8);

  gain.gain.setValueAtTime(0.0001, now);
  gain.gain.exponentialRampToValueAtTime(0.12, now + 0.1);
  gain.gain.exponentialRampToValueAtTime(0.0001, now + 1.9);

  lead.connect(filter);
  harmony.connect(filter);
  filter.connect(gain);
  gain.connect(sfxFxInput || sfxContext.destination);

  lead.start(now);
  harmony.start(now);
  lead.stop(now + 2);
  harmony.stop(now + 2);
}

async function getWaveAudioBuffer(wave) {
  const w = clamp(Math.floor(wave), 1, 10);
  if (waveAudioBuffers.has(w)) {
    return waveAudioBuffers.get(w);
  }

  let response = null;
  try {
    response = await fetch(`assets/niveles audio/oleada${w}.wav`);
    if (!response.ok) {
      throw new Error('Primary wave path failed');
    }
  } catch (_) {
    response = await fetch(`assets/niveles%20audio/oleada${w}.wav`);
  }
  const arrayBuffer = await response.arrayBuffer();
  const decoded = await sfxContext.decodeAudioData(arrayBuffer);
  waveAudioBuffers.set(w, decoded);
  return decoded;
}

function playWaveLevelAudioHtml(wave) {
  const w = clamp(Math.floor(wave), 1, 10);
  if (!waveAudioPlayers.has(w)) {
    const audio = new Audio(`assets/niveles audio/oleada${w}.wav`);
    audio.preload = 'auto';
    audio.volume = 1;
    waveAudioPlayers.set(w, audio);
  }

  const player = waveAudioPlayers.get(w);
  if (!player) {
    return;
  }

  player.currentTime = 0;
  player.play().catch(() => {});
}

function playWaveLevelAudio(wave) {
  ensureKimbaAudioReady().then(async () => {
    if (!sfxContext) {
      playWaveLevelAudioHtml(wave);
      return;
    }
    try {
      const buffer = await getWaveAudioBuffer(wave);
      playSfxBuffer(buffer, 1.05);
    } catch (_) {
      playWaveLevelAudioHtml(wave);
    }
  }).catch(() => {
    playWaveLevelAudioHtml(wave);
  });
}

function resizeCanvas() {
  if (canvas.width !== MAP_WIDTH || canvas.height !== MAP_HEIGHT) {
    canvas.width = MAP_WIDTH;
    canvas.height = MAP_HEIGHT;

    if (state.obstacles.length === 0) {
      generateObstacles();
    }
  }

  player.x = clamp(player.x, player.radius, canvas.width - player.radius);
  player.y = clamp(player.y, player.radius, canvas.height - player.radius);
}

function formatElapsedTime(ms) {
  const totalSeconds = Math.max(0, Math.floor(ms / 1000));
  const minutes = Math.floor(totalSeconds / 60);
  const seconds = totalSeconds % 60;
  return `${String(minutes).padStart(2, '0')}:${String(seconds).padStart(2, '0')}`;
}

function updatePips() {
  pipEls.forEach((pip, i) => {
    pip.classList.toggle('on', i < state.lives);
    pip.classList.toggle('off', i >= state.lives);
  });
}

function setPortraitHit() {
  portraitEl.src = portraitHit.src;
  state.hitFlashUntil = performance.now() + 280;
}

function updatePortrait(now) {
  if (state.lives <= 0) {
    portraitEl.src = portraitHit.src;
    return;
  }

  if (now > state.hitFlashUntil) {
    portraitEl.src = portraitNormal.src;
  }
}

function scoreScale() {
  return 1 + Math.floor(state.kills / 35) * 0.08;
}

function bulletsPerShot() {
  return hasEffect('double') ? 2 : 1;
}

function playerRadiusByScore() {
  return 12;
}

function bulletRadiusByPower() {
  return hasEffect('bigBullets') ? 6 : 3;
}

function playerSpeed() {
  const scoreTier = Math.floor(state.score / 50);
  const scoreBoost = 1 + Math.min(0.9, scoreTier * 0.08);
  const speedBonus = hasEffect('speed') ? 1.48 : 1;
  return player.speed * scoreBoost * speedBonus;
}

function hasEffect(type) {
  return performance.now() < (state.effectsUntil[type] || 0);
}

function effectSecondsLeft(type, now) {
  const left = (state.effectsUntil[type] || 0) - now;
  return Math.max(0, Math.ceil(left / 1000));
}

function showPickupBanner(text, now) {
  if (!pickupBannerEl) {
    return;
  }

  pickupBannerEl.textContent = text;
  pickupBannerEl.classList.add('show');
  state.bannerUntil = now + 2200;
}

function showMegaBonusBanner(text, now) {
  if (!megaBonusBannerEl) {
    return;
  }

  megaBonusBannerEl.textContent = text;
  megaBonusBannerEl.classList.add('show');
  state.megaBonusUntil = now + 1700;
}

function formatBonusDuration(def) {
  return window.GamePowerupSystem.formatBonusDuration(def);
}

function renderBonusGuide() {
  window.GamePowerupSystem.renderBonusGuide({
    bonusGuideListEl,
    defs: [
      POWERUP_DEFS.kimbaPlus,
      POWERUP_DEFS.double,
      POWERUP_DEFS.bigBullets,
      POWERUP_DEFS.speed,
      POWERUP_DEFS.navelo,
      POWERUP_DEFS.pasmor,
      POWERUP_DEFS.voculos,
      POWERUP_DEFS.plebarmor
    ],
    descriptions: BONUS_DESCRIPTIONS
  });
}

function getDistortionAmount(now) {
  const lifeLoss = 3 - state.lives;
  const byDamage = state.damageCount * 0.32;
  const base = 0.08 + lifeLoss * 0.22 + byDamage;
  const hitBoost = now < state.hitFlashUntil ? 0.22 : 0;
  return clamp(base + hitBoost, 0, 0.98);
}

function applyDamage(now, amount = 1) {
  if (now <= state.iFramesUntil || !state.running) {
    return;
  }

  if (state.shieldCharges > 0) {
    state.shieldCharges -= 1;
    state.iFramesUntil = now + 220;
    showPickupBanner('ESCUDO BLOQUEO UN DISPARO', now);
    statusTextEl.textContent = 'Estado: Escudo consumido';
    return;
  }

  playHurtSound();

  state.lives -= amount;
  state.damageCount += 1;
  state.iFramesUntil = now + 1200;
  setPortraitHit();
  updatePips();
  state.shakeUntil = now + 420;
  state.shakePower = 12 + state.damageCount * 1.5;

  if (state.lives <= 0) {
    state.running = false;
    state.endedAt = now;
    setBackgroundTrack('normal', true);
    statusTextEl.textContent = 'Estado: Has caido. Presiona R para reiniciar';
  }
}

function generateObstacles() {
  state.obstacles = [];

  const count = 9;
  let attempts = 0;

  while (state.obstacles.length < count && attempts < 900) {
    attempts += 1;

    const x = rand(100, canvas.width - 100);
    const y = rand(100, canvas.height - 100);
    const size = rand(34, 66);
    const points = [];
    const pointCount = Math.floor(rand(6, 9));
    const rotation = rand(0, Math.PI * 2);

    for (let i = 0; i < pointCount; i += 1) {
      const angle = rotation + (Math.PI * 2 * i) / pointCount;
      const radius = size * rand(0.72, 1.18);
      points.push({
        x: x + Math.cos(angle) * radius,
        y: y + Math.sin(angle) * radius
      });
    }

    const obstacle = {
      x,
      y,
      size,
      polygon: points
    };

    const tooCloseToPlayer = distSq(obstacle, player) < Math.pow(size + 120, 2);
    if (tooCloseToPlayer) {
      continue;
    }

    const overlapsOther = state.obstacles.some((other) => {
      const minDist = size + other.size + 28;
      return distSq(obstacle, other) < minDist * minDist;
    });

    if (overlapsOther) {
      continue;
    }

    state.obstacles.push(obstacle);
  }
}

function getObstaclePolygon(obstacle) {
  return obstacle.polygon;
}

function pointInPolygon(px, py, polygon) {
  let inside = false;

  for (let i = 0, j = polygon.length - 1; i < polygon.length; j = i, i += 1) {
    const xi = polygon[i].x;
    const yi = polygon[i].y;
    const xj = polygon[j].x;
    const yj = polygon[j].y;

    const intersect = yi > py !== yj > py && px < ((xj - xi) * (py - yi)) / ((yj - yi) || 1) + xi;
    if (intersect) {
      inside = !inside;
    }
  }

  return inside;
}

function nearestPointOnSegment(px, py, ax, ay, bx, by) {
  const abx = bx - ax;
  const aby = by - ay;
  const abLen2 = abx * abx + aby * aby || 1;
  const t = clamp(((px - ax) * abx + (py - ay) * aby) / abLen2, 0, 1);
  return {
    x: ax + abx * t,
    y: ay + aby * t
  };
}

function nearestPointOnPolygon(px, py, polygon) {
  let closest = null;
  let closestDist = Infinity;

  for (let i = 0; i < polygon.length; i += 1) {
    const a = polygon[i];
    const b = polygon[(i + 1) % polygon.length];
    const point = nearestPointOnSegment(px, py, a.x, a.y, b.x, b.y);
    const dist = Math.hypot(px - point.x, py - point.y);
    if (dist < closestDist) {
      closestDist = dist;
      closest = point;
    }
  }

  return { point: closest, distance: closestDist };
}

function circleIntersectsPolygon(cx, cy, radius, polygon) {
  if (pointInPolygon(cx, cy, polygon)) {
    return true;
  }

  const nearest = nearestPointOnPolygon(cx, cy, polygon);
  return nearest.distance < radius;
}

function resolveCircleObstacle(entity, radius, obstacle) {
  const polygon = getObstaclePolygon(obstacle);
  if (!circleIntersectsPolygon(entity.x, entity.y, radius, polygon)) {
    return false;
  }

  const nearest = nearestPointOnPolygon(entity.x, entity.y, polygon);
  if (!nearest.point) {
    return false;
  }

  const dx = entity.x - nearest.point.x;
  const dy = entity.y - nearest.point.y;
  const dist = Math.hypot(dx, dy) || 1;
  const overlap = radius - nearest.distance + 1;
  entity.x += (dx / dist) * overlap;
  entity.y += (dy / dist) * overlap;
  return true;
}

function drawObstacle(obstacle) {
  const polygon = getObstaclePolygon(obstacle);
  ctx.save();
  ctx.beginPath();
  ctx.moveTo(polygon[0].x, polygon[0].y);
  for (let i = 1; i < polygon.length; i += 1) {
    ctx.lineTo(polygon[i].x, polygon[i].y);
  }
  ctx.closePath();

  const fill = ctx.createLinearGradient(obstacle.x - obstacle.size, obstacle.y - obstacle.size, obstacle.x + obstacle.size, obstacle.y + obstacle.size);
  fill.addColorStop(0, '#ffe45a');
  fill.addColorStop(0.55, '#f2cf2d');
  fill.addColorStop(1, '#b98f00');
  ctx.fillStyle = fill;
  ctx.strokeStyle = '#8a6a00';
  ctx.lineWidth = 3;
  ctx.fill();
  ctx.stroke();

  ctx.fillStyle = 'rgba(255, 255, 255, 0.18)';
  for (let i = 0; i < 3; i += 1) {
    const px = obstacle.x + rand(-obstacle.size * 0.35, obstacle.size * 0.35);
    const py = obstacle.y + rand(-obstacle.size * 0.35, obstacle.size * 0.35);
    ctx.beginPath();
    ctx.arc(px, py, rand(1.2, 2.2), 0, Math.PI * 2);
    ctx.fill();
  }
  ctx.restore();
}

function spawnEnemy() {
  const side = Math.floor(rand(0, 4));
  const scale = scoreScale();
  const baseR = rand(8, 13) * scale;
  const maxTier = clamp(1 + Math.floor((state.wave - 1) / 3), 1, 4);
  const tier = 1 + Math.floor(rand(0, maxTier));
  const hpMap = [1, 2, 3, 8];

  const enemy = {
    x: 0,
    y: 0,
    radius: baseR * (1 + (tier - 1) * 0.06),
    speed: rand(45, 75) + state.wave * 4 - (tier - 1) * 3,
    tier,
    hp: hpMap[tier - 1],
    maxHp: hpMap[tier - 1]
  };

  if (side === 0) {
    enemy.x = -enemy.radius;
    enemy.y = rand(0, canvas.height);
  } else if (side === 1) {
    enemy.x = canvas.width + enemy.radius;
    enemy.y = rand(0, canvas.height);
  } else if (side === 2) {
    enemy.x = rand(0, canvas.width);
    enemy.y = -enemy.radius;
  } else {
    enemy.x = rand(0, canvas.width);
    enemy.y = canvas.height + enemy.radius;
  }

  state.enemies.push(enemy);
}

function spawnMiniBoss() {
  const side = Math.floor(rand(0, 4));
  const radius = 34;
  const boss = {
    x: 0,
    y: 0,
    radius,
    speed: rand(32, 46) + state.wave * 1.6,
    kind: 'miniBoss',
    hp: 20,
    maxHp: 20,
    fireTimer: 0,
    fireInterval: 10,
    scoreValue: 50
  };

  if (side === 0) {
    boss.x = -boss.radius;
    boss.y = rand(0, canvas.height);
  } else if (side === 1) {
    boss.x = canvas.width + boss.radius;
    boss.y = rand(0, canvas.height);
  } else if (side === 2) {
    boss.x = rand(0, canvas.width);
    boss.y = -boss.radius;
  } else {
    boss.x = rand(0, canvas.width);
    boss.y = canvas.height + boss.radius;
  }

  state.enemies.push(boss);
}

function spawnSmallEye() {
  const side = Math.floor(rand(0, 4));
  const eye = {
    x: 0,
    y: 0,
    radius: 16,
    speed: rand(22, 30),
    kind: 'smallEye',
    hp: 10,
    maxHp: 10,
    scoreValue: 12
  };

  if (side === 0) {
    eye.x = -eye.radius;
    eye.y = rand(0, canvas.height);
  } else if (side === 1) {
    eye.x = canvas.width + eye.radius;
    eye.y = rand(0, canvas.height);
  } else if (side === 2) {
    eye.x = rand(0, canvas.width);
    eye.y = -eye.radius;
  } else {
    eye.x = rand(0, canvas.width);
    eye.y = canvas.height + eye.radius;
  }

  state.enemies.push(eye);
}

function spawnSmallEyes(count = 2) {
  for (let i = 0; i < count; i += 1) {
    spawnSmallEye();
  }
}

function spawnViperMiniBoss() {
  const side = Math.floor(rand(0, 4));
  const heading = rand(0, Math.PI * 2);
  const viper = {
    x: 0,
    y: 0,
    radius: 22,
    speed: 220,
    kind: 'viperBoss',
    hp: 6,
    maxHp: 6,
    scoreValue: 40,
    vx: Math.cos(heading),
    vy: Math.sin(heading),
    tackleTimer: 0,
    tackleUntil: 0
  };

  if (side === 0) {
    viper.x = -viper.radius;
    viper.y = rand(0, canvas.height);
  } else if (side === 1) {
    viper.x = canvas.width + viper.radius;
    viper.y = rand(0, canvas.height);
  } else if (side === 2) {
    viper.x = rand(0, canvas.width);
    viper.y = -viper.radius;
  } else {
    viper.x = rand(0, canvas.width);
    viper.y = canvas.height + viper.radius;
  }

  state.enemies.push(viper);
}

function pickRandomPowerupType() {
  return window.GamePowerupSystem.pickRandomPowerupType(rand);
}

function spawnPowerup() {
  window.GamePowerupSystem.spawnPowerup({
    state,
    rand,
    canvas,
    getObstaclePolygon,
    circleIntersectsPolygon,
    distSq,
    player,
    powerupImageByType,
    POWERUP_DEFS
  });
}

function playWaveAnnouncement(wave, now) {
  state.waveBannerText = `OLEADA ${wave}`;
  state.waveBannerUntil = now + 3200;

  if (waveBannerEl) {
    waveBannerEl.textContent = state.waveBannerText;
    waveBannerEl.classList.add('show', 'pulse');
  }

  playWaveLevelAudio(wave);
}

function setBackgroundTrack(track, restartFromStart = false) {
  const normal = backgroundMusic;
  const silala = silalaMusic;

  if (track === 'silala') {
    if (currentMusicTrack !== 'silala' || restartFromStart) {
      normal.pause();
      normal.currentTime = 0;
      if (restartFromStart) {
        silala.currentTime = 0;
      }
      silala.play().catch(() => {});
      currentMusicTrack = 'silala';
    }
    return;
  }

  if (currentMusicTrack !== 'normal' || restartFromStart) {
    silala.pause();
    silala.currentTime = 0;
    if (restartFromStart) {
      normal.currentTime = 0;
    }
    normal.play().catch(() => {});
    currentMusicTrack = 'normal';
  }
}

function startWave(wave, now) {
  const safeWave = clamp(Math.floor(wave), 1, 10);
  const prevWave = state.wave;
  state.wave = safeWave;
  if (safeWave > 5) {
    setBackgroundTrack('silala');
  } else {
    setBackgroundTrack('normal');
  }
  if (safeWave > 1 && safeWave < 10) {
    generateObstacles();
  }
  if (safeWave > prevWave) {
    state.uiQuakeUntil = now + 3000;
    document.body.classList.add('wave-quake');
  }
  playWaveAnnouncement(safeWave, now);

  if ((safeWave === 5 || safeWave === 8) && !state.boss) {
    spawnMiniBoss();
    spawnMiniBoss();
    statusTextEl.textContent = 'Estado: MINIJEFES EN CAMPO';
  }

  if ((safeWave === 4 || safeWave === 7) && !state.boss) {
    spawnViperMiniBoss();
    statusTextEl.textContent = 'Estado: VIBORA EN CAMPO';
  }

  if ((safeWave === 6 || safeWave === 9) && !state.boss) {
    spawnSmallEyes(2);
    statusTextEl.textContent = 'Estado: OJITOS EN CAMPO';
  }

  if (safeWave >= 10 && !state.boss) {
    spawnBoss();
  }
}

function checkWaveProgression(now) {
  const targetWave = clamp(Math.floor(state.kills / 30) + 1, 1, 10);
  if (targetWave > state.wave && !state.boss) {
    startWave(targetWave, now);
    return;
  }

  if (state.wave >= 10 && !state.boss && state.running) {
    spawnBoss();
  }
}

function activatePower(type, now) {
  window.GamePowerupSystem.activatePower({
    POWERUP_DEFS,
    MAX_LIVES,
    state,
    updatePips,
    showPickupBanner,
    showMegaBonusBanner,
    statusTextEl,
    playKimbaDistortedAudio,
    playKimbaPlusAudio,
    playPlusMutadoAudio,
    documentRef: document
  }, type, now);
}

function fireViculosLaser(targetX, targetY, now) {
  const dx = targetX - player.x;
  const dy = targetY - player.y;
  const len = Math.hypot(dx, dy) || 1;
  const ux = dx / len;
  const uy = dy / len;
  const laserLen = Math.max(canvas.width, canvas.height) * 1.2;
  const lx = player.x + ux * laserLen;
  const ly = player.y + uy * laserLen;

  state.playerLaserAngle = Math.atan2(uy, ux);
  state.playerLaserUntil = now + 150;

  for (let i = state.enemies.length - 1; i >= 0; i -= 1) {
    const e = state.enemies[i];
    if (!e) {
      continue;
    }
    const beamDist = pointSegmentDistance(e.x, e.y, player.x, player.y, lx, ly);
    if (beamDist <= e.radius + 6) {
      e.hp -= 4;
      if (e.hp <= 0) {
        state.enemies.splice(i, 1);
        state.score += 1;
        state.kills += 1;
        checkWaveProgression(now);
        if (state.boss) {
          break;
        }
      }
    }
  }

  if (state.boss) {
    const distToBoss = pointSegmentDistance(state.boss.x, state.boss.y, player.x, player.y, lx, ly);
    if (distToBoss <= state.boss.radius + 8) {
      state.boss.hp -= 6;
      if (state.boss.hp <= 0) {
        resolveBossDefeat(now);
      }
    }
  }
}

function createRandomRealityRay(now) {
  const cx = rand(120, canvas.width - 120);
  const cy = rand(100, canvas.height - 100);
  const angle = rand(0, Math.PI * 2);
  const len = Math.max(canvas.width, canvas.height) * 1.25;
  const ux = Math.cos(angle);
  const uy = Math.sin(angle);

  return {
    x1: cx - ux * len,
    y1: cy - uy * len,
    x2: cx + ux * len,
    y2: cy + uy * len,
    warnUntil: now + 1300,
    strikeUntil: now + 2100,
    damage: 2
  };
}

function spawnRealityBoss(now) {
  state.wave = 11;
  state.waveLabel = 'LA TRELAIDAD';
  state.enemies = [];
  state.enemyBullets = [];
  state.powerups = [];
  state.realityRays = [];
  state.boss = {
    kind: 'realityBoss',
    x: canvas.width * 0.5,
    y: canvas.height * 0.28,
    radius: 82,
    hp: 300,
    maxHp: 300,
    fireTimer: 0,
    rayTimer: 0,
    distortTick: 0,
    driftAngle: rand(0, Math.PI * 2)
  };

  state.waveBannerText = 'LA TRELAIDAD';
  state.waveBannerUntil = now + 3500;
  if (waveBannerEl) {
    waveBannerEl.textContent = state.waveBannerText;
    waveBannerEl.classList.add('show', 'pulse');
  }
  statusTextEl.textContent = 'Estado: LA TRELAlDAD DESPIERTA';
}

function resolveBossDefeat(now) {
  if (!state.boss) {
    return;
  }

  if (state.boss.kind === 'realityBoss') {
    state.boss = null;
    state.realityRays = [];
    state.running = false;
    state.win = true;
    state.endedAt = now;
    statusTextEl.textContent = 'Estado: Victoria total';
    return;
  }

  spawnRealityBoss(now);
}

function spawnBoss() {
  if (state.boss || !state.started) {
    return;
  }

  state.enemies = [];
  state.enemyBullets = [];
  state.powerups = [];
  state.boss = {
    kind: 'finalBoss',
    x: canvas.width * 0.5,
    y: -120,
    radius: 86,
    speed: 48,
    hp: 420,
    maxHp: 420,
    fireTimer: 0,
    homingTimer: 0,
    modeTimer: 0,
    mode: 'slow',
    modeUntil: 0,
    vx: 0,
    vy: 0,
    heading: rand(0, Math.PI * 2),
    laserAngle: 0,
    laserUntil: 0,
    laserTick: 0,
    rot: 0,
    pupilJitter: 0
  };
  statusTextEl.textContent = 'Estado: JEFE FINAL DETECTADO';
}

function fireBullet(targetX, targetY) {
  if (!state.running || state.fireCooldown > 0) {
    return;
  }

  playShootSound();
  
  const bulletsCountBefore = state.bullets.length;

  if (hasEffect('voculos')) {
    fireViculosLaser(targetX, targetY, performance.now());
    state.fireCooldown = 0.16;
  } else if (hasEffect('navelo')) {
    const radialShots = 16;
    for (let i = 0; i < radialShots; i += 1) {
      const angle = (Math.PI * 2 * i) / radialShots;
      state.bullets.push({
        x: player.x,
        y: player.y,
        vx: Math.cos(angle) * 540,
        vy: Math.sin(angle) * 540,
        r: bulletRadiusByPower()
      });
    }
    state.fireCooldown = 0.13;
  } else {
    const dx = targetX - player.x;
    const dy = targetY - player.y;
    const len = Math.hypot(dx, dy) || 1;

    const amount = bulletsPerShot();
    const extraShots = hasEffect('pasmor') ? 2 : 0;
    const totalShots = amount + extraShots;

    for (let i = 0; i < totalShots; i += 1) {
      const spread = (i - (totalShots - 1) / 2) * (hasEffect('pasmor') ? 0.16 : 0.12);
      const cos = Math.cos(spread);
      const sin = Math.sin(spread);

      const nx = (dx / len) * cos - (dy / len) * sin;
      const ny = (dx / len) * sin + (dy / len) * cos;

      state.bullets.push({
        x: player.x,
        y: player.y,
        vx: nx * 540,
        vy: ny * 540,
        r: bulletRadiusByPower()
      });
    }

    state.fireCooldown = hasEffect('pasmor') ? 0.075 : 0.11;
  }
}

function updateUltimateAttack(dt, now) {
  if (now > state.ultimateUntil) {
    return;
  }

  const beamHalfWidth = 24;
  state.ultimateTickTimer += dt;
  if (state.ultimateTickTimer < 0.1) {
    return;
  }
  state.ultimateTickTimer = 0;

  for (let i = state.enemies.length - 1; i >= 0; i -= 1) {
    const e = state.enemies[i];
    if (!e) {
      continue;
    }
    const inHorizontal = Math.abs(e.y - player.y) <= beamHalfWidth + e.radius;
    const inVertical = Math.abs(e.x - player.x) <= beamHalfWidth + e.radius;
    if (!inHorizontal && !inVertical) {
      continue;
    }

    e.hp -= 3;
    if (e.hp <= 0) {
      state.enemies.splice(i, 1);
      state.score += 1;
      state.kills += 1;
      checkWaveProgression(now);
      if (state.boss) {
        break;
      }
    }
  }

  if (state.boss) {
    const b = state.boss;
    const inHorizontal = Math.abs(b.y - player.y) <= beamHalfWidth + b.radius;
    const inVertical = Math.abs(b.x - player.x) <= beamHalfWidth + b.radius;
    if (inHorizontal || inVertical) {
      b.hp -= 4;
      if (b.hp <= 0) {
        resolveBossDefeat(now);
      }
    }
  }

  for (let i = state.enemyBullets.length - 1; i >= 0; i -= 1) {
    const b = state.enemyBullets[i];
    if (!b.destructible) {
      continue;
    }
    const inHorizontal = Math.abs(b.y - player.y) <= beamHalfWidth + b.r;
    const inVertical = Math.abs(b.x - player.x) <= beamHalfWidth + b.r;
    if (inHorizontal || inVertical) {
      state.enemyBullets.splice(i, 1);
    }
  }
}

function setupInput() {
  window.GameInputSystem.setupInputHandlers({
    state,
    canvas,
    hasEffect,
    startGame,
    restartGame,
    goToMenu,
    triggerUltimateAttack,
    fireBullet,
    showPickupBanner,
    statusTextEl,
    POWERUP_DEFS,
    clamp,
    documentRef: document,
    body: document.body
  });
}

function restartGame() {
  state.running = true;
  state.started = true;
  state.win = false;
  state.score = 0;
  state.kills = 0;
  state.wave = 1;
  state.waveLabel = '';
  state.lives = 3;
  state.keys.clear();
  state.mouseHeld = false;
  state.bullets = [];
  state.enemies = [];
  state.enemyBullets = [];
  state.p2Bullets = [];
  state.powerups = [];
  state.boss = null;
  state.realityRays = [];
  state.obstacles = [];
  state.spawnTimer = 0;
  state.spawnInterval = 1.15;
  state.waveTimer = 0;
  state.powerupTimer = 0;
  state.nextPowerupIn = rand(8, 18);
  state.enemyFireTimer = 0;
  state.bannerUntil = 0;
  state.waveBannerUntil = 0;
  state.waveBannerText = '';
  state.megaBonusUntil = 0;
  state.uiQuakeUntil = 0;
  state.fireCooldown = 0;
  state.iFramesUntil = 0;
  state.hitFlashUntil = 0;
  state.effectsUntil.double = 0;
  state.effectsUntil.bigBullets = 0;
  state.effectsUntil.speed = 0;
  state.effectsUntil.navelo = 0;
  state.effectsUntil.pasmor = 0;
  state.effectsUntil.voculos = 0;
  state.naveloCharges = 0;
  state.pasmorCharges = 0;
  state.voculosCharges = 0;
  state.playerLaserUntil = 0;
  state.playerLaserAngle = 0;
  state.kimbaPlusGoldUntil = 0;
  state.kimbaSpectroUntil = 0;
  state.ultimateUsed = false;
  state.ultimateUntil = 0;
  state.ultimateLogoUntil = 0;
  state.ultimateTickTimer = 0;
  state.shieldCharges = 0;
  state.damageCount = 0;
  state.shakeUntil = 0;
  state.shakePower = 0;
  state.startedAt = performance.now();
  state.endedAt = 0;
  state.resultPosted = false;
  state.resultPosting = false;

  player.x = canvas.width * 0.5;
  player.y = canvas.height * 0.5;
  player.radius = 12;

  statusTextEl.textContent = 'Estado: En combate';
  if (pickupBannerEl) {
    pickupBannerEl.textContent = '';
    pickupBannerEl.classList.remove('show');
  }
  if (waveBannerEl) {
    waveBannerEl.textContent = '';
    waveBannerEl.classList.remove('show', 'pulse');
  }
  if (megaBonusBannerEl) {
    megaBonusBannerEl.textContent = '';
    megaBonusBannerEl.classList.remove('show');
  }
  document.body.classList.remove('navelo-mode');
  document.body.classList.remove('voculos-mode');
  document.body.classList.remove('kimba-plus-mode');
  document.body.classList.remove('ultimate-mode');
  document.body.classList.remove('wave-quake');
  updatePips();
  generateObstacles();
}

function startGame() {
  console.log('🎮 startGame() called');
  restartGame();
  console.log('✓ restartGame() completed, obstacles count:', state.obstacles.length);
  if (startMenuEl) {
    startMenuEl.classList.add('hidden');
    console.log('✓ Menu hidden');
  }
  setBackgroundTrack('normal', true);
  ensureKimbaAudioReady().catch(() => {});
  startWave(1, performance.now());
  console.log('✓ Wave 1 started');
}

function movePlayer(dt) {
  let dirX = 0;
  let dirY = 0;

  if (state.keys.has('w')) dirY -= 1;
  if (state.keys.has('s')) dirY += 1;
  if (state.keys.has('a')) dirX -= 1;
  if (state.keys.has('d')) dirX += 1;

  if (dirX || dirY) {
    const mag = Math.hypot(dirX, dirY);
    dirX /= mag;
    dirY /= mag;
  }

  const currentSpeed = playerSpeed();
  player.x += dirX * currentSpeed * dt;
  player.y += dirY * currentSpeed * dt;

  player.x = clamp(player.x, player.radius, canvas.width - player.radius);
  player.y = clamp(player.y, player.radius, canvas.height - player.radius);

  // P2 collision - empujarse mutuamente
  if (state.isMultiplayer && state.p2) {
    const dx = player.x - state.p2.x;
    const dy = player.y - state.p2.y;
    const dist = Math.hypot(dx, dy) || 1;
    const minDist = player.radius + 10;
    if (dist < minDist) {
      const overlap = minDist - dist;
      const ux = dx / dist;
      const uy = dy / dist;
      player.x += ux * overlap * 0.5;
      player.y += uy * overlap * 0.5;
    }
  }

  for (const obstacle of state.obstacles) {
    if (resolveCircleObstacle(player, player.radius, obstacle)) {
      player.x = clamp(player.x, player.radius, canvas.width - player.radius);
      player.y = clamp(player.y, player.radius, canvas.height - player.radius);
    }
  }
}

function updateBullets(dt) {
  for (let i = state.bullets.length - 1; i >= 0; i -= 1) {
    const b = state.bullets[i];
    b.x += b.vx * dt;
    b.y += b.vy * dt;

    let remove = false;

    if (b.x < -20 || b.x > canvas.width + 20 || b.y < -20 || b.y > canvas.height + 20) {
      remove = true;
    }

    if (!remove) {
      for (const obstacle of state.obstacles) {
        const polygon = getObstaclePolygon(obstacle);
        if (circleIntersectsPolygon(b.x, b.y, b.r, polygon)) {
          remove = true;
          break;
        }
      }
    }

    if (!remove) {
      for (let j = state.enemyBullets.length - 1; j >= 0; j -= 1) {
        const eb = state.enemyBullets[j];
        if (!eb.destructible) {
          continue;
        }
        if (distSq(b, eb) < (b.r + eb.r) ** 2) {
          remove = true;
          if ((eb.hp || 1) > 1) {
            eb.hp -= 1;
          } else {
            state.enemyBullets.splice(j, 1);
          }
          break;
        }
      }
    }

    if (remove) {
      state.bullets.splice(i, 1);
    }
  }
}

function updateEnemyBullets(dt, now) {
  for (let i = state.enemyBullets.length - 1; i >= 0; i -= 1) {
    const b = state.enemyBullets[i];

    if (b.homing) {
      const dx = player.x - b.x;
      const dy = player.y - b.y;
      const d = Math.hypot(dx, dy) || 1;
      const speed = b.homingSpeed || 175;
      const targetVx = (dx / d) * speed;
      const targetVy = (dy / d) * speed;
      const turn = clamp((b.turnRate || 2.6) * dt, 0, 1);
      b.vx += (targetVx - b.vx) * turn;
      b.vy += (targetVy - b.vy) * turn;
    }

    b.x += b.vx * dt;
    b.y += b.vy * dt;

    let remove = false;
    if (b.ttl && now - (b.bornAt || 0) > b.ttl) {
      remove = true;
    }

    if (b.x < -20 || b.x > canvas.width + 20 || b.y < -20 || b.y > canvas.height + 20) {
      remove = true;
    }

    if (!remove && !b.ignoreObstacles) {
      for (const obstacle of state.obstacles) {
        const polygon = getObstaclePolygon(obstacle);
        if (circleIntersectsPolygon(b.x, b.y, b.r, polygon)) {
          remove = true;
          break;
        }
      }
    }

    if (!remove && distSq(b, player) < (b.r + player.radius) ** 2) {
      remove = true;
      applyDamage(now, b.damageAmount || 1);
    }

    if (remove) {
      state.enemyBullets.splice(i, 1);
    }
  }
}

function updatePowerups(dt, now) {
  window.GamePowerupSystem.updatePowerups({
    state,
    rand,
    spawnPowerup,
    distSq,
    player,
    activatePower,
    pickupBannerEl,
    waveBannerEl,
    hasEffect,
    statusTextEl,
    documentRef: document,
    isBossActive: () => Boolean(state.boss)
  }, dt, now);
}

function enemyShootFrom(entity, speed, radius) {
  const dx = player.x - entity.x;
  const dy = player.y - entity.y;
  const len = Math.hypot(dx, dy) || 1;
  state.enemyBullets.push({
    x: entity.x,
    y: entity.y,
    vx: (dx / len) * speed,
    vy: (dy / len) * speed,
    r: radius,
    destructible: false
  });
}

function pointSegmentDistance(px, py, ax, ay, bx, by) {
  const abx = bx - ax;
  const aby = by - ay;
  const apx = px - ax;
  const apy = py - ay;
  const abLen2 = abx * abx + aby * aby || 1;
  const t = clamp((apx * abx + apy * aby) / abLen2, 0, 1);
  const cx = ax + abx * t;
  const cy = ay + aby * t;
  return Math.hypot(px - cx, py - cy);
}

function raySegmentHitDistance(ax, ay, ux, uy, x1, y1, x2, y2) {
  const sx = x2 - x1;
  const sy = y2 - y1;
  const cross = ux * sy - uy * sx;
  if (Math.abs(cross) < 1e-8) {
    return Infinity;
  }

  const qx = x1 - ax;
  const qy = y1 - ay;
  const t = (qx * sy - qy * sx) / cross;
  const u = (qx * uy - qy * ux) / cross;
  if (t >= 0 && u >= 0 && u <= 1) {
    return t;
  }
  return Infinity;
}

function getLaserEndpointAgainstObstacles(ax, ay, angle, maxLen) {
  const ux = Math.cos(angle);
  const uy = Math.sin(angle);
  let closest = maxLen;

  for (const obstacle of state.obstacles) {
    const polygon = getObstaclePolygon(obstacle);
    for (let i = 0; i < polygon.length; i += 1) {
      const a = polygon[i];
      const b = polygon[(i + 1) % polygon.length];
      const hitDist = raySegmentHitDistance(ax, ay, ux, uy, a.x, a.y, b.x, b.y);
      if (hitDist < closest) {
        closest = hitDist;
      }
    }
  }

  return {
    x: ax + ux * closest,
    y: ay + uy * closest,
    distance: closest
  };
}

function updateEnemies(dt, now) {
  if (state.boss) {
    const b = state.boss;

    if (b.kind === 'realityBoss') {
      b.fireTimer += dt;
      b.rayTimer += dt;
      b.distortTick += dt;
      b.driftAngle += dt * 0.9;

      b.x = canvas.width * 0.5 + Math.cos(b.driftAngle) * 160;
      b.y = canvas.height * 0.26 + Math.sin(b.driftAngle * 1.4) * 56;
      b.x = clamp(b.x, b.radius, canvas.width - b.radius);
      b.y = clamp(b.y, b.radius, canvas.height * 0.45);

      if (b.fireTimer >= 1.45) {
        b.fireTimer = 0;
        const baseAngle = Math.atan2(player.y - b.y, player.x - b.x);
        for (let k = 0; k < 2; k += 1) {
          const spread = (k - 0.5) * 0.18;
          const angle = baseAngle + spread;
          state.enemyBullets.push({
            x: b.x,
            y: b.y,
            vx: Math.cos(angle) * 95,
            vy: Math.sin(angle) * 95,
            r: 17,
            destructible: true,
            hp: 10,
            damageAmount: 2
          });
        }
      }

      if (b.rayTimer >= 10) {
        b.rayTimer = 0;
        state.realityRays.push(createRandomRealityRay(now));
        state.realityRays.push(createRandomRealityRay(now));
      }

      for (let i = state.realityRays.length - 1; i >= 0; i -= 1) {
        const ray = state.realityRays[i];
        if (now > ray.strikeUntil) {
          state.realityRays.splice(i, 1);
          continue;
        }

        if (now >= ray.warnUntil) {
          const dBeam = pointSegmentDistance(player.x, player.y, ray.x1, ray.y1, ray.x2, ray.y2);
          if (dBeam <= player.radius + 12) {
            applyDamage(now, ray.damage || 2);
          }
        }
      }

      for (let j = state.bullets.length - 1; j >= 0; j -= 1) {
        const bullet = state.bullets[j];
        if (distSq(bullet, b) < (bullet.r + b.radius) ** 2) {
          state.bullets.splice(j, 1);
          b.hp -= 1;
          if (b.hp <= 0) {
            resolveBossDefeat(now);
            return;
          }
        }
      }

      if (distSq(b, player) < (b.radius + player.radius) ** 2) {
        applyDamage(now, 2);
      }

      return;
    }

    const dx = player.x - b.x;
    const dy = player.y - b.y;
    const d = Math.hypot(dx, dy) || 1;

    b.modeTimer += dt;
    if (now > b.modeUntil) {
      const roll = Math.random();
      if (roll < 0.34) {
        b.mode = 'burst';
        b.modeUntil = now + 640;
        b.vx = (dx / d) * 185;
        b.vy = (dy / d) * 185;
      } else if (roll < 0.68) {
        b.mode = 'orbit';
        b.modeUntil = now + 1450;
        b.heading = rand(0, Math.PI * 2);
      } else {
        b.mode = 'slow';
        b.modeUntil = now + 1350;
      }
    }

    if (b.mode === 'burst') {
      b.x += b.vx * dt;
      b.y += b.vy * dt;
    } else if (b.mode === 'orbit') {
      b.heading += 2.8 * dt;
      b.x += Math.cos(b.heading) * 110 * dt;
      b.y += Math.sin(b.heading) * 110 * dt;
    } else {
      b.x += (dx / d) * 34 * dt;
      b.y += (dy / d) * 34 * dt;
    }

    b.x = clamp(b.x, b.radius, canvas.width - b.radius);
    b.y = clamp(b.y, b.radius, canvas.height - b.radius);
    b.rot += dt;
    b.fireTimer += dt;
    b.homingTimer += dt;
    b.laserTick += dt;

    if (b.fireTimer >= 0.68) {
      b.fireTimer = 0;
      enemyShootFrom(b, 270, 6);

      for (let k = 0; k < 8; k += 1) {
        const a = (Math.PI * 2 * k) / 8 + b.rot * 0.7;
        state.enemyBullets.push({
          x: b.x,
          y: b.y,
          vx: Math.cos(a) * rand(180, 260),
          vy: Math.sin(a) * rand(180, 260),
          r: 5,
          destructible: true
        });
      }
    }

    if (b.homingTimer >= 1.35) {
      b.homingTimer = 0;
      for (let n = 0; n < 2; n += 1) {
        const spread = (n - 0.5) * 0.28;
        const angle = Math.atan2(player.y - b.y, player.x - b.x) + spread;
        const speed = rand(160, 195);
        state.enemyBullets.push({
          x: b.x,
          y: b.y,
          vx: Math.cos(angle) * speed,
          vy: Math.sin(angle) * speed,
          r: 7,
          destructible: true,
          homing: true,
          homingSpeed: speed,
          turnRate: 2.9,
          bornAt: now,
          ttl: 5200
        });
      }
    }

    if (b.laserTick >= 2.3) {
      b.laserTick = 0;
      b.laserUntil = now + 1450;
      b.laserAngle = rand(0, Math.PI * 2);
    }

    if (now < b.laserUntil) {
      b.laserAngle += 2.8 * dt;
      const laserLen = Math.max(canvas.width, canvas.height) * 1.2;
      const hit = getLaserEndpointAgainstObstacles(b.x, b.y, b.laserAngle, laserLen);
      const distanceToBeam = pointSegmentDistance(player.x, player.y, b.x, b.y, hit.x, hit.y);
      if (distanceToBeam < player.radius + 10) {
        applyDamage(now);
      }
    }

    for (let j = state.bullets.length - 1; j >= 0; j -= 1) {
      const bullet = state.bullets[j];
      if (distSq(bullet, b) < (bullet.r + b.radius) ** 2) {
        state.bullets.splice(j, 1);
        b.hp -= 1;
        if (b.hp <= 0) {
          resolveBossDefeat(now);
          return;
        }
      }
    }

    if (distSq(b, player) < (b.radius + player.radius) ** 2) {
      applyDamage(now);
    }

    return;
  }

  state.spawnTimer += dt;
  const waveFactor = 1 + (state.wave - 1) * 0.08;

  if (state.spawnTimer >= state.spawnInterval / waveFactor) {
    state.spawnTimer = 0;
    spawnEnemy();
  }

  for (const e of state.enemies) {
    if (e.kind === 'miniBoss') {
      e.fireTimer += dt;
      if (e.fireTimer >= e.fireInterval) {
        e.fireTimer = 0;
        state.enemyBullets.push({
          x: e.x,
          y: e.y,
          vx: 0,
          vy: 0,
          r: 14,
          destructible: true,
          homing: true,
          homingSpeed: 160,
          turnRate: 2.5,
          bornAt: now,
          ignoreObstacles: true
        });
      }
    }
  }

  if (state.kills >= 50) {
    state.enemyFireTimer += dt;
    if (state.enemyFireTimer >= 1.5 && state.enemies.length > 0) {
      state.enemyFireTimer = 0;
      const shooters = Math.min(1 + Math.floor(state.kills / 90), state.enemies.length);
      for (let s = 0; s < shooters; s += 1) {
        const pick = state.enemies[Math.floor(rand(0, state.enemies.length))];
        enemyShootFrom(pick, 220, 4);
      }
    }
  }

  for (let i = state.enemies.length - 1; i >= 0; i -= 1) {
    const e = state.enemies[i];
    if (!e) {
      continue;
    }
    if (e.kind === 'viperBoss') {
      e.tackleTimer += dt;
      if (e.tackleTimer >= 6) {
        e.tackleTimer = 0;
        e.tackleUntil = now + 850;
        const tdx = player.x - e.x;
        const tdy = player.y - e.y;
        const td = Math.hypot(tdx, tdy) || 1;
        e.vx = tdx / td;
        e.vy = tdy / td;
      }

      const activeTackle = now < e.tackleUntil;
      const moveSpeed = activeTackle ? 420 : e.speed;
      e.x += e.vx * moveSpeed * dt;
      e.y += e.vy * moveSpeed * dt;

      if (e.x <= e.radius || e.x >= canvas.width - e.radius) {
        e.vx *= -1;
      }
      if (e.y <= e.radius || e.y >= canvas.height - e.radius) {
        e.vy *= -1;
      }
    } else {
      const dx = player.x - e.x;
      const dy = player.y - e.y;
      const d = Math.hypot(dx, dy) || 1;

      e.x += (dx / d) * e.speed * dt;
      e.y += (dy / d) * e.speed * dt;

      for (const obstacle of state.obstacles) {
        resolveCircleObstacle(e, e.radius, obstacle);
      }
    }

    e.x = clamp(e.x, e.radius, canvas.width - e.radius);
    e.y = clamp(e.y, e.radius, canvas.height - e.radius);

    for (let j = state.bullets.length - 1; j >= 0; j -= 1) {
      const b = state.bullets[j];
      if (distSq(b, e) < (b.r + e.radius) ** 2) {
        e.hp -= 1;
        state.bullets.splice(j, 1);

        if (e.hp <= 0) {
          const value = e.scoreValue || 1;
          state.enemies.splice(i, 1);
          state.score += value;
          state.kills += 1;
          checkWaveProgression(now);
          if (state.boss) {
            return;
          }
          break;
        }
      }
    }

    if (i >= state.enemies.length) {
      continue;
    }

    const aliveEnemy = state.enemies[i];
    if (!aliveEnemy) {
      continue;
    }

    const touch = distSq(aliveEnemy, player) < (aliveEnemy.radius + player.radius) ** 2;
    if (touch) {
      const touchDamage = aliveEnemy.kind === 'viperBoss' && now < aliveEnemy.tackleUntil ? 2 : 1;
      applyDamage(now, touchDamage);
      if (aliveEnemy.kind !== 'miniBoss' && aliveEnemy.kind !== 'viperBoss') {
        state.enemies.splice(i, 1);
      }
    }
  }
}

function drawGrid() {
  ctx.save();
  const sky = ctx.createLinearGradient(0, 0, 0, canvas.height);
  sky.addColorStop(0, 'rgba(12, 35, 20, 0.45)');
  sky.addColorStop(0.55, 'rgba(7, 21, 13, 0.3)');
  sky.addColorStop(1, 'rgba(2, 10, 6, 0.55)');
  ctx.fillStyle = sky;
  ctx.fillRect(0, 0, canvas.width, canvas.height);

  const fogLeft = ctx.createRadialGradient(
    canvas.width * 0.22,
    canvas.height * 0.28,
    40,
    canvas.width * 0.22,
    canvas.height * 0.28,
    canvas.width * 0.6
  );
  fogLeft.addColorStop(0, 'rgba(108, 255, 145, 0.08)');
  fogLeft.addColorStop(1, 'rgba(0, 0, 0, 0)');
  ctx.fillStyle = fogLeft;
  ctx.fillRect(0, 0, canvas.width, canvas.height);

  const fogRight = ctx.createRadialGradient(
    canvas.width * 0.8,
    canvas.height * 0.74,
    30,
    canvas.width * 0.8,
    canvas.height * 0.74,
    canvas.width * 0.52
  );
  fogRight.addColorStop(0, 'rgba(122, 255, 172, 0.06)');
  fogRight.addColorStop(1, 'rgba(0, 0, 0, 0)');
  ctx.fillStyle = fogRight;
  ctx.fillRect(0, 0, canvas.width, canvas.height);

  ctx.strokeStyle = 'rgba(137, 255, 173, 0.07)';
  ctx.lineWidth = 1;
  for (let y = 16; y < canvas.height; y += 22) {
    const wobble = Math.sin(y * 0.06) * 14;
    ctx.beginPath();
    ctx.moveTo(-30 + wobble, y);
    ctx.quadraticCurveTo(canvas.width * 0.5, y + 6, canvas.width + 30 - wobble, y);
    ctx.stroke();
  }

  ctx.restore();
}

function drawDistortion(now) {
  const amount = getDistortionAmount(now);
  if (amount <= 0.01) {
    return;
  }

  const totalAmount = clamp(amount, 0, 0.99);

  ctx.save();
  const scanAlpha = 0.08 + totalAmount * 0.22;
  ctx.fillStyle = `rgba(180,255,190,${scanAlpha})`;
  for (let y = 0; y < canvas.height; y += 6) {
    const wave = Math.sin((y + now * 0.03) * 0.08) * (totalAmount * 7);
    ctx.fillRect(wave, y, canvas.width, 1);
  }

  const noiseCount = Math.floor(90 + totalAmount * 380);
  for (let i = 0; i < noiseCount; i += 1) {
    const x = rand(0, canvas.width);
    const y = rand(0, canvas.height);
    const s = rand(1, 2.4 + totalAmount * 2.2);
    ctx.fillStyle = `rgba(190,255,210,${rand(0.03, 0.16 + totalAmount * 0.2)})`;
    ctx.fillRect(x, y, s, s);
  }

  const vignette = ctx.createRadialGradient(
    canvas.width * 0.5,
    canvas.height * 0.5,
    Math.min(canvas.width, canvas.height) * 0.15,
    canvas.width * 0.5,
    canvas.height * 0.5,
    Math.max(canvas.width, canvas.height) * 0.78
  );
  vignette.addColorStop(0, 'rgba(0, 0, 0, 0)');
  vignette.addColorStop(1, `rgba(0, 0, 0, ${0.15 + totalAmount * 0.5})`);
  ctx.fillStyle = vignette;
  ctx.fillRect(0, 0, canvas.width, canvas.height);

  if (totalAmount > 0.35) {
    ctx.fillStyle = `rgba(0,0,0,${0.08 + totalAmount * 0.28})`;
    ctx.fillRect(0, 0, canvas.width, canvas.height);
  }

  if (totalAmount > 0.62) {
    const cuts = Math.floor(8 + totalAmount * 16);
    for (let i = 0; i < cuts; i += 1) {
      const y = rand(0, canvas.height);
      const h = rand(6, 20);
      ctx.fillStyle = `rgba(0,0,0,${rand(0.12, 0.38)})`;
      ctx.fillRect(0, y, canvas.width, h);
    }
  }

  ctx.restore();
}

function drawObstacles() {
  if (state.obstacles.length === 0 && state.started) {
    console.warn('⚠️ drawObstacles: No obstacles to draw!');
  }
  for (const obstacle of state.obstacles) {
    drawObstacle(obstacle);
  }
}

function drawPlayer(now) {
  const dx = state.mouse.x - player.x;
  const dy = state.mouse.y - player.y;
  const angle = Math.atan2(dy, dx);
  const scale = player.radius / 12;
  const hurt = now < state.iFramesUntil;
  const navelo = hasEffect('navelo');
  const pulse = 0.86 + Math.sin(now * 0.02) * 0.14;
  const jitterX = Math.sin(now * 0.11) * 1.2;
  const jitterY = Math.cos(now * 0.09) * 0.9;

  ctx.save();
  ctx.translate(player.x, player.y);
  ctx.rotate(angle);

  const aura = ctx.createRadialGradient(0, 0, 2, 0, 0, 28 * scale);
  aura.addColorStop(0, navelo ? 'rgba(255,166,228,0.44)' : 'rgba(140,255,180,0.34)');
  aura.addColorStop(1, 'rgba(0,0,0,0)');
  ctx.fillStyle = aura;
  ctx.fillRect(-30 * scale, -30 * scale, 60 * scale, 60 * scale);

  ctx.save();
  ctx.translate(jitterX, jitterY);
  ctx.fillStyle = navelo ? 'rgba(255, 133, 210, 0.2)' : 'rgba(124, 255, 182, 0.18)';
  ctx.fillRect(-8 * scale, -10 * scale, 20 * scale, 4 * scale);
  ctx.fillRect(-10 * scale, 2 * scale, 22 * scale, 3 * scale);
  ctx.restore();

  ctx.fillStyle = hurt ? '#ff9f9f' : (navelo ? '#ff9bdd' : '#88ffb0');
  ctx.strokeStyle = hurt ? '#ffd3d3' : (navelo ? '#ffd8f3' : '#d8ffe4');
  ctx.lineWidth = 2;

  ctx.beginPath();
  ctx.moveTo(12 * scale, 0);
  ctx.lineTo(4 * scale, -7 * scale);
  ctx.lineTo(-3 * scale, -7 * scale);
  ctx.lineTo(-5 * scale, 0);
  ctx.lineTo(-3 * scale, 7 * scale);
  ctx.lineTo(4 * scale, 7 * scale);
  ctx.closePath();
  ctx.fill();
  ctx.stroke();

  ctx.fillStyle = navelo ? '#ffcbef' : '#c6ffd7';
  ctx.beginPath();
  ctx.moveTo(15 * scale, -2.5 * scale);
  ctx.lineTo(24 * scale, 0);
  ctx.lineTo(15 * scale, 2.5 * scale);
  ctx.closePath();
  ctx.fill();

  ctx.fillStyle = hurt ? '#ffbbbb' : (navelo ? '#ffb3e7' : '#9fffbc');
  ctx.fillRect(-12 * scale, -2.2 * scale, 7 * scale, 3 * scale);
  ctx.fillRect(-12 * scale, 1.2 * scale, 7 * scale, 3 * scale);

  ctx.strokeStyle = navelo ? 'rgba(255, 199, 239, 0.92)' : `rgba(181, 255, 205, ${0.7 + pulse * 0.28})`;
  ctx.lineWidth = 1.5;
  ctx.strokeRect(-2.5 * scale, -4 * scale, 8 * scale, 2.4 * scale);
  ctx.strokeRect(-2.5 * scale, 1.6 * scale, 8 * scale, 2.4 * scale);

  if (state.kimbaSpectroUntil > now && kimbaSpectroImage.complete && kimbaSpectroImage.naturalWidth > 0) {
    const timeLeft = state.kimbaSpectroUntil - now;
    const pulseAlpha = 0.58 + Math.sin(now * 0.024) * 0.16;
    const fadeAlpha = clamp(timeLeft / 3000, 0.2, 1);
    const alpha = clamp(pulseAlpha * fadeAlpha, 0.28, 0.82);
    const spectroSize = 52 * scale;
    ctx.save();
    ctx.globalAlpha = alpha;
    ctx.drawImage(kimbaSpectroImage, -spectroSize * 0.5, -spectroSize * 0.5, spectroSize, spectroSize);
    ctx.restore();
  }

  ctx.restore();
}

function drawBullets() {
  for (const b of state.bullets) {
    ctx.beginPath();
    ctx.fillStyle = '#cbffd6';
    ctx.arc(b.x, b.y, b.r, 0, Math.PI * 2);
    ctx.fill();
    ctx.strokeStyle = 'rgba(203, 255, 214, 0.5)';
    ctx.lineWidth = 1;
    ctx.stroke();
  }
}

function drawEnemyBullets() {
  for (const b of state.enemyBullets) {
    if ((b.hp || 0) >= 10) {
      ctx.beginPath();
      const orb = ctx.createRadialGradient(b.x - b.r * 0.2, b.y - b.r * 0.2, 2, b.x, b.y, b.r + 4);
      orb.addColorStop(0, '#ffe5c1');
      orb.addColorStop(0.65, '#ff8a4e');
      orb.addColorStop(1, '#8f2f18');
      ctx.fillStyle = orb;
      ctx.arc(b.x, b.y, b.r, 0, Math.PI * 2);
      ctx.fill();
      ctx.beginPath();
      ctx.strokeStyle = 'rgba(255, 228, 178, 0.9)';
      ctx.lineWidth = 2;
      ctx.arc(b.x, b.y, b.r + 1.5, 0, Math.PI * 2);
      ctx.stroke();
    } else if (b.homing) {
      ctx.beginPath();
      ctx.fillStyle = '#ff7f35';
      ctx.arc(b.x, b.y, b.r, 0, Math.PI * 2);
      ctx.fill();
      ctx.beginPath();
      ctx.strokeStyle = 'rgba(255, 230, 170, 0.9)';
      ctx.lineWidth = 1.2;
      ctx.arc(b.x, b.y, b.r + 2, 0, Math.PI * 2);
      ctx.stroke();
    } else if (b.destructible) {
      const s = b.r * 1.2;
      ctx.fillStyle = '#ffb169';
      ctx.fillRect(b.x - s * 0.5, b.y - s * 0.5, s, s);
      ctx.strokeStyle = '#ffe3b7';
      ctx.lineWidth = 1;
      ctx.strokeRect(b.x - s * 0.5, b.y - s * 0.5, s, s);
    } else {
      ctx.beginPath();
      ctx.fillStyle = '#ff8c8c';
      ctx.arc(b.x, b.y, b.r, 0, Math.PI * 2);
      ctx.fill();
    }
  }
}

function drawEnemies() {
  for (const e of state.enemies) {
    if (e.kind === 'miniBoss') {
      const t = performance.now() * 0.003 + e.x * 0.01 + e.y * 0.008;
      const teethCount = 10;
      const eyeOffset = e.radius * 0.28;
      const eyeSize = e.radius * 0.18;

      ctx.save();
      ctx.translate(e.x, e.y);
      ctx.beginPath();
      const gradient = ctx.createRadialGradient(-e.radius * 0.25, -e.radius * 0.25, 2, 0, 0, e.radius);
      gradient.addColorStop(0, '#333');
      gradient.addColorStop(1, '#050505');
      ctx.fillStyle = gradient;
      ctx.shadowColor = 'rgba(0,0,0,0.45)';
      ctx.shadowBlur = 10;
      ctx.arc(0, 0, e.radius, 0, Math.PI * 2);
      ctx.fill();
      ctx.shadowBlur = 0;

      for (let i = 0; i < teethCount; i += 1) {
        const angle = (Math.PI + (Math.PI * i) / (teethCount - 1));
        const toothWidth = e.radius * 0.12;
        const tx = Math.cos(angle) * (e.radius * 0.74);
        const ty = Math.sin(angle) * (e.radius * 0.74);
        ctx.fillStyle = '#f7f7f7';
        ctx.beginPath();
        ctx.moveTo(tx, ty);
        ctx.lineTo(tx + Math.cos(angle - 0.12) * toothWidth, ty + Math.sin(angle - 0.12) * toothWidth);
        ctx.lineTo(tx + Math.cos(angle + 0.12) * toothWidth, ty + Math.sin(angle + 0.12) * toothWidth);
        ctx.closePath();
        ctx.fill();
      }

      ctx.beginPath();
      ctx.fillStyle = '#120f12';
      ctx.ellipse(0, e.radius * 0.12, e.radius * 0.84, e.radius * 0.44, 0, 0, Math.PI * 2);
      ctx.fill();

      const blink = Math.floor(performance.now() / 390) % 2 === 0;
      ctx.fillStyle = '#f5f5f5';
      ctx.beginPath();
      ctx.arc(-eyeOffset, -e.radius * 0.14, eyeSize, 0, Math.PI * 2);
      ctx.arc(eyeOffset, -e.radius * 0.14, eyeSize, 0, Math.PI * 2);
      ctx.fill();

      ctx.fillStyle = '#1f1f1f';
      ctx.beginPath();
      ctx.arc(-eyeOffset + (blink ? 0 : -eyeSize * 0.08), -e.radius * 0.16, eyeSize * 0.42, 0, Math.PI * 2);
      ctx.arc(eyeOffset + (blink ? 0 : eyeSize * 0.08), -e.radius * 0.16, eyeSize * 0.42, 0, Math.PI * 2);
      ctx.fill();

      ctx.strokeStyle = 'rgba(255,255,255,0.12)';
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.arc(0, 0, e.radius, 0, Math.PI * 2);
      ctx.stroke();
      ctx.restore();

      const barW = e.radius * 2.2;
      const barH = 5;
      const ratio = e.hp / e.maxHp;
      ctx.fillStyle = 'rgba(0, 0, 0, 0.55)';
      ctx.fillRect(e.x - barW / 2, e.y - e.radius - 14, barW, barH);
      ctx.fillStyle = '#ffcb53';
      ctx.fillRect(e.x - barW / 2, e.y - e.radius - 14, barW * ratio, barH);
      continue;
    }

    if (e.kind === 'viperBoss') {
      const tackleOn = performance.now() < e.tackleUntil;
      const angle = Math.atan2(e.vy || 0, e.vx || 1);
      ctx.save();
      ctx.translate(e.x, e.y);
      ctx.rotate(angle);

      const bodyGradient = ctx.createLinearGradient(-e.radius, 0, e.radius, 0);
      bodyGradient.addColorStop(0, '#2cf880');
      bodyGradient.addColorStop(0.6, '#0e8b42');
      bodyGradient.addColorStop(1, '#065425');
      ctx.fillStyle = bodyGradient;

      ctx.beginPath();
      ctx.moveTo(e.radius, 0);
      ctx.lineTo(e.radius * 0.1, -e.radius * 0.58);
      ctx.lineTo(-e.radius * 0.95, -e.radius * 0.42);
      ctx.lineTo(-e.radius * 1.1, 0);
      ctx.lineTo(-e.radius * 0.95, e.radius * 0.42);
      ctx.lineTo(e.radius * 0.1, e.radius * 0.58);
      ctx.closePath();
      ctx.fill();

      ctx.strokeStyle = tackleOn ? '#fff0a0' : '#91ffbe';
      ctx.lineWidth = tackleOn ? 4 : 2;
      ctx.stroke();

      ctx.fillStyle = '#e8ffef';
      ctx.beginPath();
      ctx.arc(e.radius * 0.36, -e.radius * 0.16, e.radius * 0.14, 0, Math.PI * 2);
      ctx.arc(e.radius * 0.36, e.radius * 0.16, e.radius * 0.14, 0, Math.PI * 2);
      ctx.fill();
      ctx.fillStyle = '#0b2d17';
      ctx.beginPath();
      ctx.arc(e.radius * 0.38, -e.radius * 0.16, e.radius * 0.07, 0, Math.PI * 2);
      ctx.arc(e.radius * 0.38, e.radius * 0.16, e.radius * 0.07, 0, Math.PI * 2);
      ctx.fill();

      if (tackleOn) {
        ctx.strokeStyle = 'rgba(255, 235, 150, 0.75)';
        ctx.lineWidth = 2;
        ctx.beginPath();
        ctx.moveTo(-e.radius * 1.25, 0);
        ctx.lineTo(-e.radius * 1.7, 0);
        ctx.stroke();
      }

      ctx.restore();

      const barW = e.radius * 2;
      const barH = 5;
      const ratio = e.hp / e.maxHp;
      ctx.fillStyle = 'rgba(0, 0, 0, 0.55)';
      ctx.fillRect(e.x - barW / 2, e.y - e.radius - 13, barW, barH);
      ctx.fillStyle = '#63ff99';
      ctx.fillRect(e.x - barW / 2, e.y - e.radius - 13, barW * ratio, barH);
      continue;
    }

    if (e.kind === 'smallEye') {
      const glare = Math.sin(performance.now() * 0.01) * 0.1 + 0.9;
      ctx.save();
      ctx.translate(e.x, e.y);
      ctx.beginPath();
      const eyeGrad = ctx.createRadialGradient(0, 0, 1, 0, 0, e.radius);
      eyeGrad.addColorStop(0, '#ffffff');
      eyeGrad.addColorStop(0.4, '#d8f8ff');
      eyeGrad.addColorStop(1, '#7fd8ff');
      ctx.fillStyle = eyeGrad;
      ctx.fillRect(-e.radius, -e.radius, e.radius * 2, e.radius * 2);
      ctx.beginPath();
      ctx.arc(0, 0, e.radius, 0, Math.PI * 2);
      ctx.fillStyle = eyeGrad;
      ctx.fill();
      ctx.strokeStyle = '#5ea5c4';
      ctx.lineWidth = 3;
      ctx.stroke();

      ctx.beginPath();
      ctx.fillStyle = '#1a1a1f';
      ctx.arc(0, 0, e.radius * 0.35, 0, Math.PI * 2);
      ctx.fill();

      ctx.beginPath();
      ctx.fillStyle = '#86d7ff';
      ctx.arc(0, 0, e.radius * 0.16, 0, Math.PI * 2);
      ctx.fill();

      ctx.beginPath();
      ctx.fillStyle = `rgba(255, 255, 255, ${0.46 * glare})`;
      ctx.arc(-e.radius * 0.18, -e.radius * 0.18, e.radius * 0.1, 0, Math.PI * 2);
      ctx.fill();
      ctx.restore();

      const barW = e.radius * 1.8;
      const barH = 4;
      const ratio = e.hp / e.maxHp;
      ctx.fillStyle = 'rgba(0, 0, 0, 0.45)';
      ctx.fillRect(e.x - barW / 2, e.y - e.radius - 12, barW, barH);
      ctx.fillStyle = '#8dd6ff';
      ctx.fillRect(e.x - barW / 2, e.y - e.radius - 12, barW * ratio, barH);
      continue;
    }

    const t = performance.now() * 0.005 + e.x * 0.015 + e.y * 0.012;
    const px = Math.max(2, Math.floor(e.radius * 0.22));

    ctx.save();
    ctx.translate(Math.round(e.x / px) * px, Math.round(e.y / px) * px);

    for (let k = 0; k < 8; k += 1) {
      const a = (Math.PI * 2 * k) / 8;
      const segments = 3 + (k % 2);
      let sx = Math.cos(a) * e.radius * 0.5;
      let sy = Math.sin(a) * e.radius * 0.5;

      for (let s = 0; s < segments; s += 1) {
        const pulse = 1 + Math.sin(t * 2.2 + k * 0.9 + s * 0.7) * 0.18;
        sx += Math.cos(a) * px * pulse;
        sy += Math.sin(a) * px * pulse;
        const gx = Math.round(sx / px) * px;
        const gy = Math.round(sy / px) * px;
        ctx.fillStyle = s === segments - 1 ? '#ffc1f0' : '#8f2ea6';
        ctx.fillRect(gx - px * 0.5, gy - px * 0.5, px, px);
      }
    }

    const rPix = Math.max(2, Math.round(e.radius / px));
    for (let yy = -rPix; yy <= rPix; yy += 1) {
      for (let xx = -rPix; xx <= rPix; xx += 1) {
        if (xx * xx + yy * yy > rPix * rPix) continue;
        const edge = xx * xx + yy * yy > (rPix - 1.2) * (rPix - 1.2);
        const color = edge ? '#5a176c' : (yy < -1 ? '#d667f2' : '#a53bc6');
        ctx.fillStyle = color;
        ctx.fillRect(xx * px - px * 0.5, yy * px - px * 0.5, px, px);
      }
    }

    ctx.restore();

    if (e.maxHp > 1) {
      const barW = e.radius * 2;
      const barH = 4;
      const ratio = e.hp / e.maxHp;

      ctx.fillStyle = 'rgba(0, 0, 0, 0.5)';
      ctx.fillRect(e.x - barW / 2, e.y - e.radius - 12, barW, barH);
      ctx.fillStyle = '#8fffaa';
      ctx.fillRect(e.x - barW / 2, e.y - e.radius - 12, barW * ratio, barH);
    }
  }
}

function drawPowerups(now) {
  for (const p of state.powerups) {
    const blinking = now > p.blinkAt;
    const visible = !blinking || Math.floor(now / 120) % 2 === 0;
    if (!visible) {
      continue;
    }

    const imgOk = p.img && p.img.complete && p.img.naturalWidth > 0;
    ctx.beginPath();
    ctx.strokeStyle = '#98ffb5';
    ctx.lineWidth = 2;
    ctx.arc(p.x, p.y, p.radius + 3, 0, Math.PI * 2);
    ctx.stroke();

    if (imgOk) {
      const size = p.radius * 1.8;
      ctx.drawImage(p.img, p.x - size * 0.5, p.y - size * 0.5, size, size);
    } else {
      ctx.beginPath();
      ctx.fillStyle = '#8dffab';
      ctx.arc(p.x, p.y, p.radius * 0.7, 0, Math.PI * 2);
      ctx.fill();
    }
  }
}

function drawBoss() {
  if (!state.boss) {
    return;
  }

  const b = state.boss;

  if (b.kind === 'realityBoss') {
    const t = performance.now() * 0.0024;
    const wobble = 1 + Math.sin(t * 3.4) * 0.08;

    for (const ray of state.realityRays) {
      const active = performance.now() >= ray.warnUntil;
      ctx.beginPath();
      ctx.moveTo(ray.x1, ray.y1);
      ctx.lineTo(ray.x2, ray.y2);
      if (active) {
        ctx.strokeStyle = 'rgba(255, 110, 70, 0.92)';
        ctx.lineWidth = 14;
      } else {
        ctx.strokeStyle = 'rgba(255, 230, 130, 0.56)';
        ctx.lineWidth = 4;
      }
      ctx.stroke();

      if (active) {
        ctx.beginPath();
        ctx.moveTo(ray.x1, ray.y1);
        ctx.lineTo(ray.x2, ray.y2);
        ctx.strokeStyle = 'rgba(255, 255, 200, 0.64)';
        ctx.lineWidth = 3;
        ctx.stroke();
      }
    }

    ctx.save();
    ctx.translate(b.x, b.y);
    ctx.beginPath();
    for (let i = 0; i < 18; i += 1) {
      const a = (Math.PI * 2 * i) / 18;
      const r = b.radius * wobble * (0.9 + Math.sin(t * 7 + i * 0.8) * 0.1);
      const px = Math.cos(a) * r;
      const py = Math.sin(a) * r * 0.82;
      if (i === 0) {
        ctx.moveTo(px, py);
      } else {
        ctx.lineTo(px, py);
      }
    }
    ctx.closePath();
    const body = ctx.createRadialGradient(-24, -16, 8, 0, 0, b.radius);
    body.addColorStop(0, '#ffd2c8');
    body.addColorStop(0.65, '#cc4f66');
    body.addColorStop(1, '#6d1c35');
    ctx.fillStyle = body;
    ctx.fill();
    ctx.strokeStyle = 'rgba(255, 199, 210, 0.9)';
    ctx.lineWidth = 3;
    ctx.stroke();

    const eyeOffset = b.radius * 0.22;
    ctx.fillStyle = '#ffeccf';
    ctx.beginPath();
    ctx.arc(-eyeOffset, -8, b.radius * 0.14, 0, Math.PI * 2);
    ctx.arc(eyeOffset, -8, b.radius * 0.14, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = '#210f15';
    ctx.beginPath();
    ctx.arc(-eyeOffset, -8, b.radius * 0.07, 0, Math.PI * 2);
    ctx.arc(eyeOffset, -8, b.radius * 0.07, 0, Math.PI * 2);
    ctx.fill();
    ctx.restore();

    if (realityBossImage.complete && realityBossImage.naturalWidth > 0) {
      const w = Math.min(canvas.width * 0.36, 360);
      const h = w * (realityBossImage.naturalHeight / realityBossImage.naturalWidth);
      ctx.save();
      ctx.globalAlpha = 0.9;
      ctx.drawImage(realityBossImage, canvas.width * 0.5 - w * 0.5, 34, w, h);
      ctx.restore();
    }

    const barW = 280;
    const barH = 16;
    const ratio = b.hp / b.maxHp;
    const x = canvas.width * 0.5 - barW * 0.5;
    const y = 16;
    ctx.fillStyle = 'rgba(0,0,0,0.55)';
    ctx.fillRect(x, y, barW, barH);
    ctx.fillStyle = '#ff7895';
    ctx.fillRect(x, y, barW * ratio, barH);
    ctx.strokeStyle = '#ffd3dc';
    ctx.strokeRect(x, y, barW, barH);
    return;
  }

  const t = performance.now() * 0.003;
  const eyeDir = Math.atan2(player.y - b.y, player.x - b.x);
  const pupilOffset = b.radius * 0.22;
  const px = Math.cos(eyeDir) * pupilOffset;
  const py = Math.sin(eyeDir) * pupilOffset;

  ctx.save();
  ctx.translate(b.x, b.y);

  for (let i = 0; i < 10; i += 1) {
    const a = (Math.PI * 2 * i) / 10 + t * 0.9;
    const tx = Math.cos(a) * b.radius * 0.78;
    const ty = Math.sin(a) * b.radius * 0.78;
    ctx.beginPath();
    ctx.moveTo(tx, ty);
    ctx.lineTo(tx + Math.cos(a) * b.radius * 0.34, ty + Math.sin(a) * b.radius * 0.34);
    ctx.strokeStyle = 'rgba(255, 85, 85, 0.72)';
    ctx.lineWidth = 4;
    ctx.stroke();
  }

  ctx.beginPath();
  ctx.ellipse(0, 0, b.radius, b.radius * 0.78, 0, 0, Math.PI * 2);
  const sclera = ctx.createRadialGradient(-b.radius * 0.25, -b.radius * 0.2, 8, 0, 0, b.radius);
  sclera.addColorStop(0, '#ffe7e7');
  sclera.addColorStop(1, '#d94646');
  ctx.fillStyle = sclera;
  ctx.fill();

  ctx.beginPath();
  ctx.ellipse(0, 0, b.radius, b.radius * 0.78, 0, 0, Math.PI * 2);
  ctx.strokeStyle = '#ff9f9f';
  ctx.lineWidth = 4;
  ctx.stroke();

  ctx.beginPath();
  ctx.arc(px, py, b.radius * 0.32, 0, Math.PI * 2);
  const iris = ctx.createRadialGradient(px - b.radius * 0.1, py - b.radius * 0.1, 4, px, py, b.radius * 0.34);
  iris.addColorStop(0, '#ffd982');
  iris.addColorStop(1, '#ff7a00');
  ctx.fillStyle = iris;
  ctx.fill();

  ctx.beginPath();
  ctx.arc(px, py, b.radius * 0.16, 0, Math.PI * 2);
  ctx.fillStyle = '#190e08';
  ctx.fill();

  ctx.beginPath();
  ctx.arc(px - b.radius * 0.06, py - b.radius * 0.07, b.radius * 0.05, 0, Math.PI * 2);
  ctx.fillStyle = 'rgba(255,245,220,0.9)';
  ctx.fill();

  ctx.restore();

  const barW = 240;
  const barH = 14;
  const ratio = b.hp / b.maxHp;
  const x = canvas.width * 0.5 - barW * 0.5;
  const y = 16;

  ctx.fillStyle = 'rgba(0,0,0,0.55)';
  ctx.fillRect(x, y, barW, barH);
  ctx.fillStyle = '#ff6f6f';
  ctx.fillRect(x, y, barW * ratio, barH);
  ctx.strokeStyle = '#ffd1d1';
  ctx.strokeRect(x, y, barW, barH);

  if (performance.now() < b.laserUntil) {
    const laserLen = Math.max(canvas.width, canvas.height) * 1.2;
    const hit = getLaserEndpointAgainstObstacles(b.x, b.y, b.laserAngle, laserLen);
    const ex = hit.x;
    const ey = hit.y;

    ctx.beginPath();
    ctx.strokeStyle = 'rgba(255, 80, 50, 0.88)';
    ctx.lineWidth = 9;
    ctx.moveTo(b.x, b.y);
    ctx.lineTo(ex, ey);
    ctx.stroke();

    ctx.beginPath();
    ctx.strokeStyle = 'rgba(255, 224, 160, 0.88)';
    ctx.lineWidth = 2.4;
    ctx.moveTo(b.x, b.y);
    ctx.lineTo(ex, ey);
    ctx.stroke();
  }
}

function drawPlayerLaser(now) {
  if (now > state.playerLaserUntil) {
    return;
  }

  const laserLen = Math.max(canvas.width, canvas.height) * 1.2;
  const ex = player.x + Math.cos(state.playerLaserAngle) * laserLen;
  const ey = player.y + Math.sin(state.playerLaserAngle) * laserLen;

  ctx.beginPath();
  ctx.strokeStyle = 'rgba(255, 140, 30, 0.88)';
  ctx.lineWidth = 9;
  ctx.moveTo(player.x, player.y);
  ctx.lineTo(ex, ey);
  ctx.stroke();

  ctx.beginPath();
  ctx.strokeStyle = 'rgba(255, 235, 170, 0.9)';
  ctx.lineWidth = 2.5;
  ctx.moveTo(player.x, player.y);
  ctx.lineTo(ex, ey);
  ctx.stroke();
}

function drawUltimateAttack(now) {
  if (now > state.ultimateUntil) {
    return;
  }

  const pulse = 0.78 + Math.sin(now * 0.03) * 0.22;
  const beamWidth = 22;

  ctx.save();
  ctx.lineCap = 'round';

  ctx.strokeStyle = `rgba(255, 120, 40, ${0.36 + pulse * 0.22})`;
  ctx.lineWidth = beamWidth;
  ctx.beginPath();
  ctx.moveTo(0, player.y);
  ctx.lineTo(canvas.width, player.y);
  ctx.stroke();

  ctx.beginPath();
  ctx.moveTo(player.x, 0);
  ctx.lineTo(player.x, canvas.height);
  ctx.stroke();

  ctx.strokeStyle = `rgba(255, 235, 180, ${0.46 + pulse * 0.2})`;
  ctx.lineWidth = 7;
  ctx.beginPath();
  ctx.moveTo(0, player.y);
  ctx.lineTo(canvas.width, player.y);
  ctx.stroke();

  ctx.beginPath();
  ctx.moveTo(player.x, 0);
  ctx.lineTo(player.x, canvas.height);
  ctx.stroke();

  ctx.restore();
}

function drawUltimateLogo(now) {
  if (now > state.ultimateLogoUntil || !ultimateLogoImage.complete || ultimateLogoImage.naturalWidth <= 0) {
    return;
  }

  const left = state.ultimateLogoUntil - now;
  const alpha = clamp((left / 3000) * 0.9, 0.32, 0.9);
  const w = Math.min(canvas.width * 0.5, 360);
  const h = w * (ultimateLogoImage.naturalHeight / ultimateLogoImage.naturalWidth);

  ctx.save();
  ctx.globalAlpha = alpha;
  ctx.drawImage(ultimateLogoImage, canvas.width * 0.5 - w * 0.5, canvas.height * 0.18, w, h);
  ctx.restore();
}

function drawAimCursor(now) {
  const x = clamp(state.mouse.x, 0, canvas.width);
  const y = clamp(state.mouse.y, 0, canvas.height);
  const pulse = 0.8 + Math.sin(now * 0.016) * 0.2;
  const size = 10;

  ctx.save();
  ctx.strokeStyle = `rgba(196,255,211,${0.78 + pulse * 0.2})`;
  ctx.lineWidth = 1.6;

  ctx.beginPath();
  ctx.moveTo(x - size, y);
  ctx.lineTo(x - 3, y);
  ctx.moveTo(x + 3, y);
  ctx.lineTo(x + size, y);
  ctx.moveTo(x, y - size);
  ctx.lineTo(x, y - 3);
  ctx.moveTo(x, y + 3);
  ctx.lineTo(x, y + size);
  ctx.stroke();

  ctx.beginPath();
  ctx.arc(x, y, 2.2, 0, Math.PI * 2);
  ctx.fillStyle = 'rgba(220,255,228,0.9)';
  ctx.fill();

  ctx.restore();
}

function drawGameOver() {
  ctx.save();
  ctx.fillStyle = 'rgba(0, 0, 0, 0.55)';
  ctx.fillRect(0, 0, canvas.width, canvas.height);

  ctx.fillStyle = state.win ? '#c3ffd2' : '#9effb7';
  ctx.textAlign = 'center';
  ctx.font = 'bold 38px Consolas, monospace';
  ctx.fillText(state.win ? 'VICTORIA' : 'GAME OVER', canvas.width / 2, canvas.height / 2 - 24);

  ctx.font = '18px Consolas, monospace';
  ctx.fillText(`Puntos finales: ${state.score}`, canvas.width / 2, canvas.height / 2 + 8);
  ctx.fillText(state.win ? 'Has derrotado al jefe final y LA TRELAIDAD' : 'Presiona R para reiniciar · ESC menu', canvas.width / 2, canvas.height / 2 + 38);
  if (state.win) {
    ctx.fillText('Presiona R para jugar otra vez · ESC menu', canvas.width / 2, canvas.height / 2 + 66);
  }
  ctx.restore();
}

function renderBonusList(now) {
  if (!bonusListEl) {
    return;
  }

  const rows = [];
  const defs = [
    POWERUP_DEFS.double,
    POWERUP_DEFS.speed,
    POWERUP_DEFS.bigBullets,
    POWERUP_DEFS.navelo,
    POWERUP_DEFS.pasmor,
    POWERUP_DEFS.voculos
  ];

  for (const def of defs) {
    const left = effectSecondsLeft(def.type, now);
    if (left <= 0) {
      continue;
    }

    rows.push(`
      <div class="bonus-item">
        <img src="${def.src}" alt="${def.display}">
        <div class="name">${def.display}</div>
        <div class="time">${left}s</div>
      </div>
    `);
  }

  bonusListEl.innerHTML = rows.length > 0 ? rows.join('') : '';
}

function updateHUD(now) {
  scoreEl.textContent = String(state.score);
  waveEl.textContent = state.waveLabel || String(state.wave);
  livesEl.textContent = String(Math.max(0, state.lives));
  killsEl.textContent = String(state.kills);
  if (timerEl) {
    const endTime = state.running ? now : (state.endedAt || now);
    const elapsed = state.startedAt > 0 ? endTime - state.startedAt : 0;
    timerEl.textContent = formatElapsedTime(elapsed);
  }

  if (waveProgressCounterEl) {
    if (state.boss && state.boss.kind === 'realityBoss') {
      const left = Math.max(0, Math.ceil(10 - (state.boss.rayTimer || 0)));
      waveProgressCounterEl.textContent = `LA TRELAIDAD · RAYOS EN ${left}s`;
    } else if (state.wave >= 10) {
      waveProgressCounterEl.textContent = state.boss ? 'JEFE FINAL ACTIVO' : 'OLEADA 10: APARECE EL JEFE';
    } else {
      const killsForNextWave = state.wave * 30;
      const remaining = Math.max(0, killsForNextWave - state.kills);
      waveProgressCounterEl.textContent = `FALTAN ${remaining} PARA OLEADA ${state.wave + 1}`;
    }
  }

  const activeNames = [];
  if (hasEffect('double')) activeNames.push(POWERUP_DEFS.double.display);
  if (hasEffect('bigBullets')) activeNames.push(POWERUP_DEFS.bigBullets.display);
  if (hasEffect('speed')) activeNames.push(POWERUP_DEFS.speed.display);
  if (hasEffect('navelo')) activeNames.push('NAVELO-4D');
  if (hasEffect('pasmor')) activeNames.push('PASMOR-FURY');
  if (hasEffect('voculos')) activeNames.push('VOCULOS-LASER');
  if (state.shieldCharges > 0) activeNames.push('PLEBARMOR-SHIELD');
  if (state.naveloCharges > 0 && !hasEffect('navelo')) activeNames.push(`navelo listo x${state.naveloCharges}`);
  if (state.pasmorCharges > 0 && !hasEffect('pasmor')) activeNames.push(`pasmor listo x${state.pasmorCharges}`);
  if (state.voculosCharges > 0 && !hasEffect('voculos')) activeNames.push(`voculos listo x${state.voculosCharges}`);
  powerEl.textContent = activeNames.length > 0 ? activeNames.join(' + ') : 'ninguno';
  if (bossStatEl) {
    bossStatEl.style.display = state.boss ? 'block' : 'none';
  }
  document.body.classList.toggle('boss-mode', Boolean(state.boss));
  bossHpEl.textContent = state.boss ? String(Math.max(0, state.boss.hp)) : '--';
  renderBonusList(now);
  renderBonusQueueHud();
  updatePortrait(now);
  
  // Show latency if multiplayer
  if (state.isMultiplayer && state.latency > 0 && statusTextEl) {
    statusTextEl.textContent = `Estado: En combate | Ping: ${Math.round(state.latency)}ms`;
  }
}

let last = performance.now();

function tick(now) {
  resizeCanvas();

  document.body.classList.toggle('ultimate-mode', now < state.ultimateUntil);

  const dt = Math.min(0.033, (now - last) / 1000);
  last = now;

  state.fireCooldown = Math.max(0, state.fireCooldown - dt);

  if (state.running && state.mouseHeld && state.fireCooldown <= 0) {
    fireBullet(state.mouse.x, state.mouse.y);
  }

  if (state.uiQuakeUntil > 0 && now > state.uiQuakeUntil) {
    state.uiQuakeUntil = 0;
    document.body.classList.remove('wave-quake');
  }

  if (state.megaBonusUntil > 0 && now > state.megaBonusUntil) {
    state.megaBonusUntil = 0;
    if (megaBonusBannerEl) {
      megaBonusBannerEl.classList.remove('show');
    }
  }

  if (state.running) {
    if (state.wave >= 10 && !state.boss) {
      spawnBoss();
    }
    movePlayer(dt);
    updateBullets(dt);
    updateEnemyBullets(dt, now);
    updatePowerups(dt, now);
    updateEnemies(dt, now);
    updateUltimateAttack(dt, now);
  }

  if (!state.running && state.started) {
    postResultOnce();
  }

  ctx.clearRect(0, 0, canvas.width, canvas.height);

  let shakeX = 0;
  let shakeY = 0;
  if (now < state.shakeUntil) {
    const remaining = (state.shakeUntil - now) / 420;
    const amp = state.shakePower * clamp(remaining, 0, 1);
    shakeX = rand(-amp, amp);
    shakeY = rand(-amp, amp);
  }

  ctx.save();
  ctx.translate(shakeX, shakeY);
  drawGrid();
  drawObstacles();
  drawPowerups(now);
  drawBullets();
  drawEnemyBullets();
  drawEnemies();
  drawBoss();
  drawPlayer(now);
  drawPlayerLaser(now);
  drawUltimateAttack(now);
  drawUltimateLogo(now);
  drawAimCursor(now);
  drawDistortion(now);

  if (!state.running && state.started) {
    drawGameOver();
  }
  ctx.restore();

  updateHUD(now);
  
  requestAnimationFrame(tick);
}

function init() {
  console.log('🔧 init() called - Initializing game');
  resizeCanvas();
  setupInput();
  updatePips();
  renderBonusGuide();
  applyGameVolume();
  console.log('✓ init() completed');

  if (startButtonEl) {
    startButtonEl.addEventListener('click', startGame);
  }

  if (discordLoginButtonEl) {
    discordLoginButtonEl.addEventListener('click', () => {
      window.location.href = '/api/discord/login';
    });
  }

  if (discordLogoutButtonEl) {
    discordLogoutButtonEl.addEventListener('click', async () => {
      try {
        await apiJson('/api/discord/logout', { method: 'POST' });
      } catch (_) {}
      authState.user = null;
      updateDiscordUi();
      refreshRanking();
    });
  }

  if (bonusInfoButtonEl && bonusGuidePanelEl) {
    bonusInfoButtonEl.setAttribute('aria-expanded', 'false');
    bonusInfoButtonEl.addEventListener('click', () => {
      bonusGuidePanelEl.classList.toggle('hidden');
      const hidden = bonusGuidePanelEl.classList.contains('hidden');
      bonusInfoButtonEl.textContent = hidden ? 'VER BONUS' : 'OCULTAR BONUS';
      bonusInfoButtonEl.setAttribute('aria-expanded', hidden ? 'false' : 'true');
    });
  }

  if (menuButtonEl) {
    menuButtonEl.addEventListener('click', goToMenu);
  }

  if (volumeSliderEl) {
    volumeSliderEl.addEventListener('input', () => {
      gameVolume = Number(volumeSliderEl.value) / 100;
      if (volumeValueEl) {
        volumeValueEl.textContent = `${volumeSliderEl.value}%`;
      }
      applyGameVolume();
    });
  }

  statusTextEl.textContent = 'Estado: Esperando inicio';
  refreshDiscordSession();
  refreshRanking();
  requestAnimationFrame(tick);
}

window.addEventListener('resize', resizeCanvas);
window.addEventListener('load', init);
