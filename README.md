# DOOM Browser Game — Documentation

## Table of Contents

1. [Project Overview](#1-project-overview)
2. [Requirements](#2-requirements)
3. [Installation](#3-installation)
4. [Starting the Game Server](#4-starting-the-game-server)
5. [Exposing via Web Tunnel (for smartphones)](#5-exposing-via-web-tunnel-for-smartphones)
6. [Playing the Game (Browser)](#6-playing-the-game-browser)
7. [Smartphone Controller (QR Code)](#7-smartphone-controller-qr-code)
8. [Game Reference](#8-game-reference)
9. [Project Structure](#9-project-structure)
10. [Troubleshooting — Smartphone Connection Refused](#10-troubleshooting--smartphone-connection-refused)
11. [Installing on Ubuntu](#11-installing-on-ubuntu)

---

## 1. Project Overview

A DOOM-like raycaster shooter running entirely in a web browser.

| Feature | Details |
|---|---|
| Renderer | Canvas 2D raycaster (60° FOV, 640×400) |
| Stages | 3 stages |
| Bosses | 2 bosses (end of Stage 1 and Stage 2) |
| Weapons | Pistol · Shotgun · Plasma Gun |
| Enemies | Zombie · Imp · Demon · Spectre · Baron |
| Health item | Medkit (+50 HP, 1 per stage) |
| Controls | Keyboard **or** smartphone over WebSocket |
| Multiplayer | 1 game client + 1 smartphone controller per session |
| Save/Load | Browser localStorage + server-side relay |
| Tunnel | `localtunnel` — expose server to the internet via HTTPS |

---

## 2. Requirements

| Dependency | Minimum version |
|---|---|
| **Node.js** | 18.x or newer |
| **npm** | 8.x or newer |
| A modern browser | Chrome 90+, Firefox 90+, Edge 90+, Safari 15+ |
| Smartphone | Any browser that supports WebSocket (Android/iOS) |

> No other global installs are required. All Node packages are installed locally.

---

## 3. Installation

### 3.1 Clone / download the project

If you have the files locally:

```
cd ibm-gaming-shot/game
```

If cloning from a repository:

```bash
git clone <repo-url>
cd <repo>/game
```

### 3.2 Install dependencies

```bash
npm install
```

This installs:
- **express** — static file server for the game client
- **ws** — WebSocket server
- **qrcode** — generates QR codes for smartphone joining
- **localtunnel** — creates a public HTTPS URL that forwards to your local server

---

## 4. Starting the Game Server

### 4.1 Local network only

```bash
npm start
```

Or equivalently:

```bash
node server/index.js
```

You will see:

```
🎮  DOOM Browser Game
   Server : http://localhost:3000
   WS     : ws://localhost:3000/ws
```

Open your browser at **http://localhost:3000** to play.

### 4.2 Custom port

```bash
PORT=8080 node server/index.js
```

On Windows PowerShell:

```powershell
$env:PORT=8080; node server/index.js
```

---

## 5. Exposing via Web Tunnel (for smartphones)

To control the game with a **smartphone on a different network** (e.g., mobile data), the server must be reachable from the internet.

### 5.1 Start with tunnel

```bash
node server/index.js --tunnel
```

Or:

```bash
npm run tunnel
```

Output will look like:

```
🎮  DOOM Browser Game
   Server : http://localhost:3000
   WS     : ws://localhost:3000/ws

🌐  Tunnel URL : https://random-name.loca.lt
   Controller : https://random-name.loca.lt/controller.html

▄▄▄▄▄▄▄▄▄
█  ██████  █   ← ASCII QR code in terminal
█  ██████  █
▀▀▀▀▀▀▀▀▀
```

The **tunnel URL** is printed to the terminal and also displayed as a **QR code overlay** on the game canvas.

### 5.2 How it works

- `localtunnel` creates an HTTPS tunnel from a public subdomain (`*.loca.lt`) to your local port 3000.
- WebSocket connections work transparently through the tunnel.
- The tunnel URL is valid as long as the server process is running.

> **Note:** `loca.lt` tunnels may occasionally require you to visit the tunnel URL in a browser once and click "Continue" to bypass a warning page. This is a localtunnel quirk.

---

## 6. Playing the Game (Browser)

Open **http://localhost:3000** (or the tunnel URL) in a desktop browser.

### Keyboard Controls

| Key | Action |
|---|---|
| `W` / `↑` | Move forward |
| `S` / `↓` | Move backward |
| `A` / `←` | Rotate left |
| `D` / `→` | Rotate right |
| `Space` / `Ctrl` | Fire |
| `1` | Switch to Pistol |
| `2` | Switch to Shotgun |
| `3` | Switch to Plasma Gun |
| `P` / `Esc` | Pause / Resume |
| `F5` / `Ctrl+S` | Save game state |
| `F9` / `Ctrl+L` | Load saved state |
| `R` | Restart (after Game Over or Victory) |

### HUD

- **HP bar** (bottom-left) — current health out of 100
- **Weapon + ammo** (bottom-center) — active weapon name and remaining ammo
- **Score + Stage** (bottom-right)
- **Crosshair** — centre of screen

### Saving & Loading

- Save is written to **browser localStorage** and also relayed to the server for the current session.
- Load restores the last saved stage, score, HP, and ammo.
- State persists between browser refreshes (localStorage).

---

## 7. Smartphone Controller (QR Code)

### 7.1 Joining a session

1. Start the server (with `--tunnel` if on a different network).
2. Open the game in a browser — a **Session ID** (7-character code) is assigned.
3. A **QR code** is shown on the game canvas overlay.
4. **Scan the QR code** with your smartphone camera.
   - This opens `https://<tunnel>/controller.html?sid=<SESSION_ID>`.
   - The session ID is auto-filled.
5. Tap **JOIN**.
6. The QR overlay disappears and the game receives controller input.

### 7.2 Manual join (same local network)

If both devices are on the same WiFi:

1. Open `http://<your-computer-ip>:3000/controller.html` on the smartphone.
2. Type the Session ID shown on the game screen.
3. Tap **JOIN**.

### 7.3 Controller layout

```
┌─────────────────────────────┐
│  1:PISTOL  2:SHOTGUN 3:PLASMA│   ← weapon strip
│                              │
│         ▲                    │
│      ◀  ✛  ▶               │   ← D-pad
│         ▼                    │
│                              │
│  ⏸PAUSE   🔥FIRE   💾SAVE  │   ← action buttons
└─────────────────────────────┘
```

- **D-pad** — move and rotate the player
- **FIRE** — shoot with the selected weapon (hold to auto-fire for Plasma)
- **PAUSE** — pause / resume the game
- **SAVE** — save game state
- **Weapon strip** — tap 1/2/3 to switch weapons

---

## 8. Game Reference

### Weapons

| # | Name | Damage | Fire Rate | Ammo |
|---|---|---|---|---|
| 1 | Pistol | 15 HP | 500 ms | 50 |
| 2 | Shotgun | 45 HP (×5 pellets) | 900 ms | 20 |
| 3 | Plasma Gun | 30 HP | 200 ms | 100 |

### Enemies

| Name | HP | Speed | Damage | Score |
|---|---|---|---|---|
| Zombie | 40 | slow | 8 | 100 |
| Imp | 60 | medium | 12 | 200 |
| Demon | 90 | medium | 20 | 350 |
| Spectre | 80 | fast | 18 | 300 |
| **Baron** *(boss)* | 500 | slow | 40 | 2000 |

### Health Item

| Item | Restore | Location |
|---|---|---|
| Medkit | +50 HP | 1 per stage (centre area) |

### Stages

| Stage | New enemies | Boss |
|---|---|---|
| 1 | Zombies, Imps, 1 Demon | Baron of Hell |
| 2 | Imps, Demons, Spectres | Baron of Hell |
| 3 | All types + 2 Barons | Final Boss (Baron) |

A stage is cleared when **all enemies are dead** (or the stage boss is dead).
After Stage 3 the victory screen is shown.

---

## 9. Project Structure

```
game/
├── package.json            ← Node dependencies & npm scripts
├── server/
│   └── index.js            ← Express HTTP + WebSocket server + QR endpoint + tunnel
└── client/
    ├── index.html          ← Main game page
    ├── controller.html     ← Smartphone controller page
    ├── css/
    │   └── style.css       ← Styles for both pages
    └── js/
        ├── game.js         ← Raycaster engine, enemy AI, weapons, HUD, save/load
        └── ws-client.js    ← WebSocket bridge (game ↔ server ↔ controller)
```

### Data flow

```
[Desktop Browser]  ←─ WebSocket (role=game)  ─→  [Node.js Server]
                                                        │
[Smartphone]       ←─ WebSocket (role=controller) ─→   │
                                                        │
                   Input messages forwarded:            │
  controller.html ──→ server/index.js ──→ game.js ──────┘
```

---

## 10. Troubleshooting — Smartphone Connection Refused

This section covers every known reason why the smartphone controller shows
**"Connection Refused"**, **"WebSocket error"**, or the QR code leads to a
blank/error page.

---

### 10.1 Server was only listening on `localhost`

**Symptom:** The game works on the desktop (`localhost:3000`) but the phone
gets "Connection refused" or a timeout when opening the controller URL.

**Root cause:** By default some server setups bind only to `127.0.0.1`.
A phone on the same WiFi cannot reach that address — it is only reachable
from the same machine.

**Fix (already applied):** The server now calls:

```js
server.listen(PORT, '0.0.0.0', ...)
```

This makes it reachable from any network interface (LAN, tunnel, etc.).
The startup log now shows the correct LAN URL:

```
LAN : http://192.168.1.42:3000  ← use this on same WiFi
```

---

### 10.2 QR code did not include the Session ID

**Symptom:** Scanning the QR opens the controller page but the Session ID
field is empty. Tapping JOIN with no ID shows an error.

**Root cause:** The QR code URL was `controller.html` without `?sid=…`.

**Fix (already applied):** The QR image endpoint now accepts a `sid`
parameter and the game page passes it:

```
/qr?url=<base>&sid=<sessionId>
```

The phone opens `controller.html?sid=AB3X7F2` and auto-joins without
requiring manual input.

---

### 10.3 Windows Firewall blocking inbound connections on port 3000

**Symptom:** The LAN IP is correct, the phone is on the same WiFi, but
the connection still times out.

**Fix:** Allow Node.js through Windows Firewall.

**Option A — using the Windows Security GUI:**
1. Open **Windows Security → Firewall & network protection → Allow an app through Firewall**.
2. Click **Change settings → Allow another app**.
3. Browse to `C:\Program Files\nodejs\node.exe` and add it.
4. Check both **Private** and **Public** network types.

**Option B — PowerShell (run as Administrator):**

```powershell
New-NetFirewallRule -DisplayName "Node.js Game Server" `
  -Direction Inbound -Protocol TCP -LocalPort 3000 `
  -Action Allow -Profile Any
```

---

### 10.4 localtunnel "Click to Continue" nag page blocks WebSocket

**Symptom:** Tunnel URL works in a browser but the WebSocket connection
from the smartphone fails immediately.

**Root cause:** `localtunnel` (v1 especially) shows a browser warning page
on first visit. A phone that has never visited the URL will have that
warning intercept the WebSocket upgrade.

**Fixes (already applied):**

1. **`localtunnel` upgraded to v2.0.2** — which supports the bypass header.
2. **`allow_invalid_cert: true`** passed to `localtunnel({ port, allow_invalid_cert: true })`.
3. **`Bypass-Tunnel-Reminder: true`** header injected on every HTTP Upgrade
   request — this signals localtunnel's proxy to skip the nag page.

**Manual step still required on first use:**  
Open the tunnel base URL (e.g. `https://xyz.loca.lt`) in the phone's
browser **once**, tap **"Click to Continue"**, then scan the QR code.
After that first approval the phone's browser will not show the wall again.

---

### 10.5 Phone and PC on different networks (no tunnel running)

**Symptom:** Phone is on mobile data, PC is on WiFi. LAN IP unreachable.

**Fix:** Start the server with `--tunnel`:

```bash
node server/index.js --tunnel
```

The tunnel creates a public HTTPS URL that forwards to your local port.
The QR code will automatically use this URL.

---

### 10.6 Wrong URL in QR — using `localhost` instead of the LAN/tunnel IP

**Symptom:** QR code text shows `localhost:3000/controller.html`, which
only works on the same machine.

**Root cause (old bug, fixed):** The server was using `req.hostname`
(which resolves to `localhost` when accessed locally) as the QR base.

**Fix (already applied):** The server now calls `os.networkInterfaces()`
to detect the real LAN IP and uses it as the QR base when no tunnel is
active:

```js
function getLocalIP() {
  // Returns first non-loopback IPv4, e.g. 192.168.1.42
}
```

The `/network-info` endpoint exposes this to the game page client-side.

---

### 10.7 Quick diagnostic checklist

Run through this list when the phone can't connect:

| # | Check | How |
|---|---|---|
| 1 | Is the server running? | Terminal should show `🎮 DOOM Browser Game` |
| 2 | PC and phone on same WiFi? | Check router / WiFi name on both devices |
| 3 | Firewall allows port 3000? | See §10.3 |
| 4 | LAN IP correct? | Server log shows `LAN : http://<ip>:3000` — type it manually on phone |
| 5 | Tunnel started? | Run `node server/index.js --tunnel`; look for `🌐 Tunnel URL` |
| 6 | Visited tunnel URL once in phone browser? | Open `https://xyz.loca.lt` → tap Continue |
| 7 | Session ID in QR / link? | URL should contain `?sid=XXXXXXX` |
| 8 | Game tab still open? | Session is destroyed when the game page closes |

---

## 11. Installing on Ubuntu

This section covers a full Ubuntu installation from a clean system — no
prior Node.js or project files required.

---

### 11.1 Requirements

| Package | Minimum version |
|---|---|
| Ubuntu | 20.04 LTS or newer (22.04 / 24.04 recommended) |
| Node.js | 18.x or newer |
| npm | 8.x or newer (bundled with Node.js) |
| git | any recent version (optional, for cloning) |

---

### 11.2 Install Node.js 18 via NodeSource

Ubuntu's default `apt` repository ships an older Node.js version.
Use the official NodeSource script to get Node.js 18:

```bash
# Download and run the NodeSource setup script
curl -fsSL https://deb.nodesource.com/setup_18.x | sudo -E bash -

# Install Node.js (includes npm)
sudo apt-get install -y nodejs

# Verify
node --version   # should print v18.x.x or higher
npm --version    # should print 8.x.x or higher
```

> **Alternative — Node Version Manager (nvm):**
> ```bash
> curl -o- https://raw.githubusercontent.com/nvm-sh/nvm/v0.39.7/install.sh | bash
> source ~/.bashrc
> nvm install 18
> nvm use 18
> ```

---

### 11.3 Get the project files

**Option A — clone from a repository:**

```bash
git clone <your-repo-url>
cd <repo-folder>/game
```

**Option B — copy files manually (e.g. via SCP or USB):**

```bash
# From Windows to Ubuntu over SSH:
scp -r "C:\Users\<you>\Documents\ibm-gaming-shot\game" user@ubuntu-host:~/doom-game

cd ~/doom-game
```

---

### 11.4 Install dependencies

```bash
cd game          # make sure you are inside the game/ directory
npm install
```

Expected output:

```
added 110 packages, and audited 111 packages in 9s
```

---

### 11.5 Open the firewall (ufw)

Ubuntu ships with `ufw` (Uncomplicated Firewall). If it is active, allow
port 3000 before starting the server:

```bash
# Check if ufw is active
sudo ufw status

# If active, allow port 3000
sudo ufw allow 3000/tcp
sudo ufw reload
```

If the output of `sudo ufw status` is `Status: inactive`, no action is needed.

---

### 11.6 Start the server

**Local network only (phone and PC on same WiFi):**

```bash
node server/index.js
```

Expected startup output:

```
🎮  DOOM Browser Game
   Local     : http://localhost:3000
   LAN       : http://192.168.1.42:3000  ← use this on same WiFi
   WS        : ws://192.168.1.42:3000/ws

   Controller (same WiFi): http://192.168.1.42:3000/controller.html
```

**With internet tunnel (smartphone on mobile data):**

```bash
node server/index.js --tunnel
```

Expected startup output:

```
🎮  DOOM Browser Game
   Local     : http://localhost:3000
   LAN       : http://192.168.1.42:3000
   WS        : ws://192.168.1.42:3000/ws

🌐  Tunnel URL : https://random-name.loca.lt
   Controller : https://random-name.loca.lt/controller.html
```

---

### 11.7 Keep the server running with `systemd` (optional)

To run the game server automatically on boot without a terminal open:

**Create the service file:**

```bash
sudo nano /etc/systemd/system/doom-game.service
```

Paste the following (adjust the paths to match your setup):

```ini
[Unit]
Description=DOOM Browser Game Server
After=network.target

[Service]
Type=simple
User=YOUR_USERNAME
WorkingDirectory=/home/YOUR_USERNAME/doom-game
ExecStart=/usr/bin/node server/index.js
Restart=on-failure
RestartSec=5
Environment=PORT=3000

[Install]
WantedBy=multi-user.target
```

**Enable and start:**

```bash
sudo systemctl daemon-reload
sudo systemctl enable doom-game
sudo systemctl start doom-game

# Check status
sudo systemctl status doom-game

# View live logs
sudo journalctl -u doom-game -f
```

**Stop / restart:**

```bash
sudo systemctl stop doom-game
sudo systemctl restart doom-game
```

---

### 11.8 Quick reference — Ubuntu commands

| Task | Command |
|---|---|
| Install Node.js 18 | `curl -fsSL https://deb.nodesource.com/setup_18.x \| sudo -E bash - && sudo apt-get install -y nodejs` |
| Install dependencies | `npm install` |
| Start server (local) | `node server/index.js` |
| Start server (tunnel) | `node server/index.js --tunnel` |
| Allow firewall port | `sudo ufw allow 3000/tcp && sudo ufw reload` |
| Check firewall | `sudo ufw status` |
| Enable auto-start | `sudo systemctl enable doom-game` |
| View server logs | `sudo journalctl -u doom-game -f` |
