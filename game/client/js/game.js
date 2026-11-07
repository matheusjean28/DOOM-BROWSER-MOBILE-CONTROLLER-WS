/**
 * DOOM-like raycaster game engine
 * Weapons: 0=Pistol, 1=Shotgun, 2=Plasma
 * Enemies: 0=Zombie, 1=Imp, 2=Demon, 3=Spectre, 4=Baron (boss)
 * Stages: 1,2,3  — bosses appear at end of stage 1 and stage 2
 */

'use strict';

// ── Constants ─────────────────────────────────────────────────────────────
const SCREEN_W   = 640;
const SCREEN_H   = 400;
const HALF_H     = SCREEN_H / 2;
const FOV        = Math.PI / 3;       // 60°
const NUM_RAYS   = SCREEN_W;
const MAX_DEPTH  = 20;
const CELL       = 64;
const MOVE_SPEED = 0.05;
const ROT_SPEED  = 0.035;
const TWO_PI     = Math.PI * 2;

// Colour palette (CSS strings)
const COLOURS = {
  SKY:      '#1a0a2e',
  FLOOR:    '#2a1a1a',
  WALL_N:   '#8b2323',
  WALL_S:   '#6b1a1a',
  WALL_E:   '#a02828',
  WALL_W:   '#5a1212',
  HUD_BG:   'rgba(0,0,0,0.75)',
};

// ── Weapon definitions ────────────────────────────────────────────────────
const WEAPONS = [
  { name: 'Pistol',  damage: 15, fireRate: 500,  ammoMax: 50,  ammo: 50,  spread: 0.02, color: '#aaa' },
  { name: 'Shotgun', damage: 45, fireRate: 900,  ammoMax: 20,  ammo: 20,  spread: 0.08, color: '#c84' },
  { name: 'Plasma',  damage: 30, fireRate: 200,  ammoMax: 100, ammo: 100, spread: 0.01, color: '#4cf' },
];

// ── Enemy definitions ─────────────────────────────────────────────────────
const ENEMY_DEFS = [
  { type: 0, name: 'Zombie',  hp: 40,  speed: 0.012, dmg: 8,  score: 100, color: '#7a6',   size: 0.5, isBoss: false },
  { type: 1, name: 'Imp',     hp: 60,  speed: 0.018, dmg: 12, score: 200, color: '#d84',   size: 0.5, isBoss: false },
  { type: 2, name: 'Demon',   hp: 90,  speed: 0.022, dmg: 20, score: 350, color: '#d44',   size: 0.6, isBoss: false },
  { type: 3, name: 'Spectre', hp: 80,  speed: 0.025, dmg: 18, score: 300, color: '#999',   size: 0.55, isBoss: false },
  { type: 4, name: 'Baron',   hp: 500, speed: 0.010, dmg: 40, score: 2000, color: '#f44',  size: 1.0,  isBoss: true  },
];

// ── Stage maps (16×16 tile 0=empty 1=wall) ───────────────────────────────
const STAGE_MAPS = [
  // Stage 1
  [
    [1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1],
    [1,0,0,0,0,0,0,0,0,0,0,0,0,0,0,1],
    [1,0,1,1,0,1,1,1,0,1,1,0,1,0,0,1],
    [1,0,1,0,0,0,0,1,0,0,1,0,1,0,0,1],
    [1,0,0,0,1,0,0,0,0,0,0,0,0,0,0,1],
    [1,0,1,0,1,1,0,1,1,1,0,1,1,0,0,1],
    [1,0,1,0,0,0,0,0,0,1,0,0,1,0,0,1],
    [1,0,0,0,1,0,1,0,0,0,0,0,0,0,0,1],
    [1,0,1,0,1,0,1,1,0,1,1,0,1,0,0,1],
    [1,0,1,0,0,0,0,0,0,0,1,0,0,0,0,1],
    [1,0,0,0,1,1,0,1,0,0,0,0,1,0,0,1],
    [1,0,1,1,1,0,0,1,1,0,1,0,1,0,0,1],
    [1,0,0,0,0,0,0,0,0,0,0,0,0,0,0,1],
    [1,0,1,0,1,0,1,1,1,0,1,1,0,1,0,1],
    [1,0,0,0,0,0,0,0,0,0,0,0,0,0,0,1],
    [1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1],
  ],
  // Stage 2
  [
    [1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1],
    [1,0,0,0,0,0,0,1,0,0,0,0,0,0,0,1],
    [1,0,1,1,1,0,0,1,0,1,1,1,0,1,0,1],
    [1,0,1,0,1,0,0,0,0,0,1,0,0,1,0,1],
    [1,0,1,0,0,0,1,0,1,0,0,0,1,0,0,1],
    [1,0,0,0,1,0,1,1,1,0,1,0,1,0,0,1],
    [1,0,1,0,1,0,0,0,0,0,1,0,0,0,0,1],
    [1,0,1,1,0,0,1,0,1,0,0,0,1,1,0,1],
    [1,0,0,0,0,1,1,0,1,1,0,0,0,0,0,1],
    [1,0,1,0,0,0,0,0,0,0,0,1,0,1,0,1],
    [1,0,1,1,0,1,0,1,0,1,0,1,0,1,0,1],
    [1,0,0,0,0,1,0,0,0,1,0,0,0,0,0,1],
    [1,0,1,0,1,0,0,1,0,0,1,0,1,0,0,1],
    [1,0,1,0,0,0,1,1,1,0,0,0,1,0,0,1],
    [1,0,0,0,0,0,0,0,0,0,0,0,0,0,0,1],
    [1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1],
  ],
  // Stage 3
  [
    [1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1],
    [1,0,0,0,0,1,0,0,0,0,0,1,0,0,0,1],
    [1,0,1,1,0,1,0,1,1,1,0,1,0,1,0,1],
    [1,0,1,0,0,0,0,0,0,1,0,0,0,1,0,1],
    [1,0,0,0,1,0,1,0,1,0,0,1,0,0,0,1],
    [1,1,0,1,1,0,1,0,1,1,0,1,1,0,0,1],
    [1,0,0,0,0,0,0,0,0,0,0,0,0,0,0,1],
    [1,0,1,0,1,0,1,1,1,0,1,0,1,0,0,1],
    [1,0,1,0,1,0,0,0,0,0,1,0,1,0,0,1],
    [1,0,0,0,0,0,1,0,1,0,0,0,0,0,0,1],
    [1,0,1,1,0,1,1,0,1,1,0,1,1,0,0,1],
    [1,0,0,0,0,0,0,0,0,0,0,0,0,0,0,1],
    [1,0,1,0,1,1,0,1,0,1,1,0,1,0,0,1],
    [1,0,1,0,0,0,0,0,0,0,0,0,1,0,0,1],
    [1,0,0,0,0,0,0,0,0,0,0,0,0,0,0,1],
    [1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1],
  ],
];

// ── Stage enemy spawn configs ─────────────────────────────────────────────
const STAGE_ENEMIES = [
  // Stage 1: zombies, imps + 1 Baron boss at (13,13)
  [
    { type:0, x:3.5, y:3.5 }, { type:0, x:7.5, y:2.5 }, { type:1, x:5.5, y:8.5 },
    { type:1, x:11.5, y:5.5}, { type:2, x:9.5, y:9.5 }, { type:0, x:2.5, y:11.5},
    { type:4, x:13.5, y:13.5, boss: true },
  ],
  // Stage 2: imps, demons, spectres + 1 Baron boss
  [
    { type:1, x:3.5, y:2.5 }, { type:2, x:6.5, y:5.5 }, { type:3, x:10.5, y:3.5 },
    { type:1, x:5.5, y:10.5}, { type:3, x:12.5, y:8.5}, { type:2, x:8.5, y:12.5},
    { type:4, x:13.5, y:13.5, boss: true },
  ],
  // Stage 3: all types + no additional boss (stage 3 is the final)
  [
    { type:2, x:3.5, y:2.5 }, { type:3, x:7.5, y:3.5 }, { type:4, x:5.5, y:7.5  },
    { type:1, x:11.5,y:6.5 }, { type:0, x:9.5, y:11.5}, { type:3, x:13.5, y:9.5 },
    { type:2, x:2.5, y:13.5}, { type:4, x:13.5, y:13.5, boss: true },
  ],
];

// ── Item spawn positions ──────────────────────────────────────────────────
const STAGE_ITEMS = [
  [{ x:7.5, y:7.5 }],
  [{ x:8.5, y:7.5 }],
  [{ x:7.5, y:8.5 }],
];

// ── Main Game Class ───────────────────────────────────────────────────────
class DoomGame {
  constructor(canvas) {
    this.canvas  = canvas;
    this.ctx     = canvas.getContext('2d');
    this.running = false;
    this.paused  = false;

    // Player state
    this.player = { x: 1.5, y: 1.5, angle: 0, hp: 100, maxHp: 100 };
    this.score   = 0;
    this.stage   = 0;   // index 0-2

    // Weapons
    this.weapons     = WEAPONS.map(w => ({ ...w, ammo: w.ammoMax }));
    this.weaponIndex = 0;
    this.lastShot    = 0;
    this.muzzleFlash = 0;

    // World
    this.map     = null;
    this.enemies = [];
    this.items   = [];
    this.bullets = [];

    // Keys
    this.keys = {};
    this._bindKeys();

    // WebSocket input (from controller)
    this.ws = null;
    this._controllerState = {};

    // Animation
    this._raf = null;
    this._lastTime = 0;

    // Message overlay
    this._message = '';
    this._messageTimer = 0;

    // Game over / win flags
    this.gameOver = false;
    this.gameWon  = false;

    // Damage flash
    this._dmgFlash = 0;
  }

  // ── Lifecycle ─────────────────────────────────────────────────────────
  start() {
    this.loadStage(this.stage);
    this.running = true;
    this._raf = requestAnimationFrame(ts => this._loop(ts));
  }

  loadStage(idx) {
    this.stage   = idx;
    this.map     = STAGE_MAPS[idx];
    this.player  = { x: 1.5, y: 1.5, angle: 0, hp: this.player.hp, maxHp: 100 };
    this.enemies = STAGE_ENEMIES[idx].map(e => ({
      ...ENEMY_DEFS[e.type],
      x: e.x, y: e.y,
      alive: true,
      alertRange: e.boss ? 18 : 10,
      attackTimer: 0,
    }));
    this.items   = STAGE_ITEMS[idx].map(i => ({ x: i.x, y: i.y, collected: false }));
    this.bullets = [];
    this._message = `STAGE ${idx + 1}`;
    this._messageTimer = 120;
  }

  pause()  { this.paused = !this.paused; }

  saveState() {
    const state = {
      stage:   this.stage,
      score:   this.score,
      hp:      this.player.hp,
      weapons: this.weapons.map(w => ({ ammo: w.ammo })),
      weaponIndex: this.weaponIndex,
    };
    try { localStorage.setItem('doomSave', JSON.stringify(state)); } catch {}
    if (this.ws?.readyState === 1) {
      this.ws.send(JSON.stringify({ type: 'save', payload: state }));
    }
    this._message = 'GAME SAVED';
    this._messageTimer = 90;
  }

  loadState() {
    try {
      const raw = localStorage.getItem('doomSave');
      if (!raw) return;
      const state = JSON.parse(raw);
      this.score   = state.score   || 0;
      this.weaponIndex = state.weaponIndex || 0;
      state.weapons?.forEach((w, i) => { if (this.weapons[i]) this.weapons[i].ammo = w.ammo; });
      this.loadStage(state.stage || 0);
      this.player.hp = state.hp || 100;
      this._message = 'STATE LOADED';
      this._messageTimer = 90;
    } catch {}
  }

  // ── Main loop ─────────────────────────────────────────────────────────
  _loop(ts) {
    const dt = Math.min((ts - this._lastTime) / 16.67, 3);
    this._lastTime = ts;

    if (!this.paused && !this.gameOver && !this.gameWon) {
      this._update(dt);
    }
    this._render();

    this._raf = requestAnimationFrame(t => this._loop(t));
  }

  // ── Update ────────────────────────────────────────────────────────────
  _update(dt) {
    this._handleInput(dt);
    this._updateBullets(dt);
    this._updateEnemies(dt);
    this._checkItems();
    this._checkStageComplete();
    if (this._messageTimer > 0) this._messageTimer -= dt;
    if (this._dmgFlash > 0) this._dmgFlash -= dt;
    if (this.muzzleFlash > 0) this.muzzleFlash -= dt;
  }

  _handleInput(dt) {
    const p = this.player;
    const cs = this._controllerState;

    const fwd  = this.keys['ArrowUp']    || this.keys['w'] || this.keys['W'] || cs.up;
    const bwd  = this.keys['ArrowDown']  || this.keys['s'] || this.keys['S'] || cs.down;
    const left = this.keys['ArrowLeft']  || this.keys['a'] || this.keys['A'] || cs.left;
    const right= this.keys['ArrowRight'] || this.keys['d'] || this.keys['D'] || cs.right;
    const fire = this.keys[' '] || this.keys['Control'] || cs.fire;
    const sw1  = this.keys['1'] || cs.weapon0;
    const sw2  = this.keys['2'] || cs.weapon1;
    const sw3  = this.keys['3'] || cs.weapon2;

    if (left)  p.angle -= ROT_SPEED * dt;
    if (right) p.angle += ROT_SPEED * dt;

    const nx = p.x + Math.cos(p.angle) * MOVE_SPEED * dt;
    const ny = p.y + Math.sin(p.angle) * MOVE_SPEED * dt;
    if (fwd)  { if (!this._wallAt(nx, p.y)) p.x = nx; if (!this._wallAt(p.x, ny)) p.y = ny; }
    if (bwd)  { if (!this._wallAt(p.x - Math.cos(p.angle)*MOVE_SPEED*dt, p.y)) p.x -= Math.cos(p.angle)*MOVE_SPEED*dt;
                if (!this._wallAt(p.x, p.y - Math.sin(p.angle)*MOVE_SPEED*dt)) p.y -= Math.sin(p.angle)*MOVE_SPEED*dt; }

    if (sw1) this.weaponIndex = 0;
    if (sw2) this.weaponIndex = 1;
    if (sw3) this.weaponIndex = 2;

    if (fire) this._shoot();
  }

  _wallAt(x, y) {
    const mx = Math.floor(x), my = Math.floor(y);
    if (mx < 0 || my < 0 || mx >= 16 || my >= 16) return true;
    return this.map[my][mx] === 1;
  }

  _shoot() {
    const now = performance.now();
    const gun = this.weapons[this.weaponIndex];
    if (gun.ammo <= 0) { this._message = 'NO AMMO!'; this._messageTimer = 60; return; }
    if (now - this.lastShot < gun.fireRate) return;
    this.lastShot = now;
    gun.ammo--;
    this.muzzleFlash = 6;

    const pellets = this.weaponIndex === 1 ? 5 : 1;
    for (let p = 0; p < pellets; p++) {
      const spread = (Math.random() - 0.5) * gun.spread;
      this.bullets.push({
        x: this.player.x,
        y: this.player.y,
        angle: this.player.angle + spread,
        speed: 0.35,
        dmg: gun.damage,
        life: 60,
      });
    }
  }

  _updateBullets(dt) {
    for (let i = this.bullets.length - 1; i >= 0; i--) {
      const b = this.bullets[i];
      b.life -= dt;
      b.x += Math.cos(b.angle) * b.speed * dt;
      b.y += Math.sin(b.angle) * b.speed * dt;
      if (b.life <= 0 || this._wallAt(b.x, b.y)) { this.bullets.splice(i, 1); continue; }
      // Hit enemies
      for (const e of this.enemies) {
        if (!e.alive) continue;
        const dx = e.x - b.x, dy = e.y - b.y;
        if (Math.sqrt(dx*dx+dy*dy) < e.size * 0.7) {
          e.hp -= b.dmg;
          if (e.hp <= 0) { e.alive = false; this.score += e.score; }
          this.bullets.splice(i, 1);
          break;
        }
      }
    }
  }

  _updateEnemies(dt) {
    const p = this.player;
    for (const e of this.enemies) {
      if (!e.alive) continue;
      const dx = p.x - e.x, dy = p.y - e.y;
      const dist = Math.sqrt(dx*dx + dy*dy);
      if (dist < e.alertRange) {
        // Move towards player
        const nx = e.x + (dx/dist) * e.speed * dt;
        const ny = e.y + (dy/dist) * e.speed * dt;
        if (!this._wallAt(nx, ny)) { e.x = nx; e.y = ny; }
        // Attack
        if (dist < 0.7) {
          e.attackTimer -= dt;
          if (e.attackTimer <= 0) {
            p.hp -= e.dmg;
            e.attackTimer = 60;
            this._dmgFlash = 10;
            if (p.hp <= 0) { p.hp = 0; this.gameOver = true; }
          }
        }
      }
    }
  }

  _checkItems() {
    for (const item of this.items) {
      if (item.collected) continue;
      const dx = this.player.x - item.x, dy = this.player.y - item.y;
      if (Math.sqrt(dx*dx+dy*dy) < 0.6) {
        item.collected = true;
        this.player.hp = Math.min(this.player.maxHp, this.player.hp + 50);
        this._message = '+50 HEALTH';
        this._messageTimer = 90;
      }
    }
  }

  _checkStageComplete() {
    const aliveEnemies = this.enemies.filter(e => e.alive);
    const bossDead = this.enemies.filter(e => e.isBoss).every(e => !e.alive);
    if (aliveEnemies.length === 0 || bossDead) {
      if (this.stage < 2) {
        this._message = `STAGE ${this.stage + 1} CLEAR!`;
        this._messageTimer = 150;
        setTimeout(() => this.loadStage(this.stage + 1), 2500);
      } else {
        this.gameWon = true;
      }
    }
  }

  // ── Raycaster renderer ────────────────────────────────────────────────
  _render() {
    const ctx = this.ctx;
    ctx.clearRect(0, 0, SCREEN_W, SCREEN_H);

    // Sky / floor
    ctx.fillStyle = COLOURS.SKY;
    ctx.fillRect(0, 0, SCREEN_W, HALF_H);
    ctx.fillStyle = COLOURS.FLOOR;
    ctx.fillRect(0, HALF_H, SCREEN_W, HALF_H);

    const zBuffer = new Float32Array(NUM_RAYS);

    // Walls
    for (let ray = 0; ray < NUM_RAYS; ray++) {
      const rayAngle = this.player.angle - FOV / 2 + (ray / NUM_RAYS) * FOV;
      const { dist, side } = this._castRay(rayAngle);
      zBuffer[ray] = dist;

      const wallH   = Math.floor(SCREEN_H / dist);
      const wallTop = Math.floor(HALF_H - wallH / 2);
      const shade   = Math.max(0, 1 - dist / MAX_DEPTH);

      let baseColor;
      switch (side) {
        case 'N': baseColor = COLOURS.WALL_N; break;
        case 'S': baseColor = COLOURS.WALL_S; break;
        case 'E': baseColor = COLOURS.WALL_E; break;
        default:  baseColor = COLOURS.WALL_W;
      }
      ctx.fillStyle = this._shadeColor(baseColor, shade);
      ctx.fillRect(ray, wallTop, 1, wallH);
    }

    // Sprites (enemies + items)
    this._renderSprites(zBuffer);

    // HUD
    this._renderHUD();

    // Damage flash
    if (this._dmgFlash > 0) {
      ctx.fillStyle = `rgba(200,0,0,${this._dmgFlash / 20})`;
      ctx.fillRect(0, 0, SCREEN_W, SCREEN_H);
    }

    // Overlays
    if (this.paused)   this._renderOverlay('PAUSED', '#fff');
    if (this.gameOver) this._renderOverlay('GAME OVER\nPress R to restart', '#f44');
    if (this.gameWon)  this._renderOverlay(`YOU WIN!\nScore: ${this.score}\nPress R to restart`, '#4f4');
    if (this._messageTimer > 0) {
      ctx.fillStyle = 'rgba(255,220,0,0.95)';
      ctx.font      = 'bold 20px monospace';
      ctx.textAlign = 'center';
      ctx.fillText(this._message, SCREEN_W / 2, SCREEN_H / 2 - 60);
    }
  }

  _castRay(angle) {
    const cos = Math.cos(angle), sin = Math.sin(angle);
    let x = this.player.x, y = this.player.y;
    for (let d = 0; d < MAX_DEPTH; d += 0.02) {
      const tx = Math.floor(x + cos * d);
      const ty = Math.floor(y + sin * d);
      if (tx < 0 || ty < 0 || tx >= 16 || ty >= 16) return { dist: MAX_DEPTH, side: 'N' };
      if (this.map[ty][tx] === 1) {
        const dist = d * Math.cos(angle - this.player.angle); // fish-eye fix
        let side = 'N';
        const fx = (x + cos * d) - tx;
        const fy = (y + sin * d) - ty;
        if (Math.abs(fy) < Math.abs(fx)) side = fy > 0.5 ? 'S' : 'N';
        else                              side = fx > 0.5 ? 'E' : 'W';
        return { dist: Math.max(0.1, dist), side };
      }
    }
    return { dist: MAX_DEPTH, side: 'N' };
  }

  _renderSprites(zBuffer) {
    const p = this.player;
    const sprites = [];

    for (const e of this.enemies) {
      if (!e.alive) continue;
      sprites.push({ x: e.x, y: e.y, color: e.color, size: e.size, label: e.name, hp: e.hp, maxHp: ENEMY_DEFS[e.type].hp });
    }
    for (const item of this.items) {
      if (!item.collected) sprites.push({ x: item.x, y: item.y, color: '#0f0', size: 0.3, label: 'MEDKIT' });
    }

    sprites.sort((a, b) => {
      const da = (a.x - p.x) ** 2 + (a.y - p.y) ** 2;
      const db = (b.x - p.x) ** 2 + (b.y - p.y) ** 2;
      return db - da;
    });

    const ctx = this.ctx;
    for (const sp of sprites) {
      const dx = sp.x - p.x, dy = sp.y - p.y;
      const dist = Math.sqrt(dx * dx + dy * dy);
      if (dist < 0.2) continue;

      const sprAngle = Math.atan2(dy, dx) - p.angle;
      let normAngle = sprAngle;
      while (normAngle >  Math.PI) normAngle -= TWO_PI;
      while (normAngle < -Math.PI) normAngle += TWO_PI;
      if (Math.abs(normAngle) > FOV * 0.75) continue;

      const screenX = Math.floor((normAngle / FOV + 0.5) * SCREEN_W);
      const sprH    = Math.floor((SCREEN_H / dist) * sp.size);
      const sprW    = sprH;
      const drawTop = Math.floor(HALF_H - sprH / 2);
      const startX  = screenX - sprW / 2;

      for (let sx = 0; sx < sprW; sx++) {
        const col = Math.floor(startX + sx);
        if (col < 0 || col >= SCREEN_W) continue;
        if (zBuffer[col] < dist) continue;
        ctx.fillStyle = sp.color;
        ctx.fillRect(col, drawTop, 1, sprH);
      }

      // HP bar for enemies
      if (sp.hp !== undefined) {
        const barW = sprW;
        const ratio = sp.hp / sp.maxHp;
        ctx.fillStyle = '#444';
        ctx.fillRect(startX, drawTop - 6, barW, 4);
        ctx.fillStyle = ratio > 0.5 ? '#4f4' : ratio > 0.25 ? '#ff4' : '#f44';
        ctx.fillRect(startX, drawTop - 6, barW * ratio, 4);
      }
    }
  }

  _renderHUD() {
    const ctx = this.ctx;
    const gun = this.weapons[this.weaponIndex];

    // HUD bar
    ctx.fillStyle = COLOURS.HUD_BG;
    ctx.fillRect(0, SCREEN_H - 48, SCREEN_W, 48);

    // HP
    ctx.fillStyle = '#f44';
    ctx.font = 'bold 14px monospace';
    ctx.textAlign = 'left';
    ctx.fillText(`HP: ${this.player.hp}`, 10, SCREEN_H - 28);
    ctx.fillStyle = '#f44';
    ctx.fillRect(10, SCREEN_H - 20, (this.player.hp / this.player.maxHp) * 120, 10);

    // Weapon & ammo
    ctx.fillStyle = gun.color;
    ctx.font = 'bold 14px monospace';
    ctx.textAlign = 'center';
    ctx.fillText(`${gun.name}  ${gun.ammo}/${gun.ammoMax}`, SCREEN_W / 2, SCREEN_H - 20);

    // Score & stage
    ctx.fillStyle = '#fff';
    ctx.textAlign = 'right';
    ctx.fillText(`SCORE: ${this.score}  STAGE: ${this.stage + 1}`, SCREEN_W - 10, SCREEN_H - 20);

    // Weapon selector
    ctx.textAlign = 'left';
    ['1:PST','2:SHG','3:PLS'].forEach((label, i) => {
      ctx.fillStyle = i === this.weaponIndex ? '#ff0' : '#888';
      ctx.fillText(label, 10 + i * 60, SCREEN_H - 8);
    });

    // Crosshair
    ctx.strokeStyle = 'rgba(255,255,255,0.8)';
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.moveTo(SCREEN_W/2 - 8, SCREEN_H/2);
    ctx.lineTo(SCREEN_W/2 + 8, SCREEN_H/2);
    ctx.moveTo(SCREEN_W/2, SCREEN_H/2 - 8);
    ctx.lineTo(SCREEN_W/2, SCREEN_H/2 + 8);
    ctx.stroke();

    // Muzzle flash
    if (this.muzzleFlash > 0) {
      ctx.fillStyle = `rgba(255,220,0,${this.muzzleFlash / 8})`;
      ctx.fillRect(SCREEN_W/2 - 60, SCREEN_H/2 - 60, 120, 120);
    }
  }

  _renderOverlay(text, color) {
    const ctx = this.ctx;
    ctx.fillStyle = 'rgba(0,0,0,0.65)';
    ctx.fillRect(0, 0, SCREEN_W, SCREEN_H);
    ctx.fillStyle = color;
    ctx.font = 'bold 36px monospace';
    ctx.textAlign = 'center';
    text.split('\n').forEach((line, i) => {
      ctx.fillText(line, SCREEN_W / 2, SCREEN_H / 2 - 30 + i * 42);
    });
  }

  _shadeColor(hex, shade) {
    const r = parseInt(hex.slice(1,3),16), g = parseInt(hex.slice(3,5),16), b = parseInt(hex.slice(5,7),16);
    return `rgb(${Math.floor(r*shade)},${Math.floor(g*shade)},${Math.floor(b*shade)})`;
  }

  // ── Keyboard bindings ─────────────────────────────────────────────────
  _bindKeys() {
    document.addEventListener('keydown', e => {
      this.keys[e.key] = true;
      if (e.key === 'p' || e.key === 'P' || e.key === 'Escape') this.pause();
      if ((e.key === 'F5' || (e.key === 's' && e.ctrlKey))) { e.preventDefault(); this.saveState(); }
      if ((e.key === 'F9' || (e.key === 'l' && e.ctrlKey))) { e.preventDefault(); this.loadState(); }
      if ((e.key === 'r' || e.key === 'R') && (this.gameOver || this.gameWon)) {
        this.gameOver = false; this.gameWon = false;
        this.score = 0; this.player.hp = 100;
        this.weapons = WEAPONS.map(w => ({ ...w, ammo: w.ammoMax }));
        this.weaponIndex = 0;
        this.loadStage(0);
      }
    });
    document.addEventListener('keyup', e => { this.keys[e.key] = false; });
  }

  // ── WebSocket controller input ────────────────────────────────────────
  applyControllerInput(msg) {
    if (msg.type === 'input') {
      this._controllerState = msg.state || {};
    }
  }
}

// Export
if (typeof module !== 'undefined') module.exports = { DoomGame };
