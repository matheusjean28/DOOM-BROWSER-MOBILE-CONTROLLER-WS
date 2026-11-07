#!/usr/bin/env node
'use strict';

const http        = require('http');
const path        = require('path');
const os          = require('os');
const express     = require('express');
const { WebSocketServer } = require('ws');
const QRCode      = require('qrcode');

const PORT = process.env.PORT || 3000;
const USE_TUNNEL = process.argv.includes('--tunnel');

// ── Helpers ────────────────────────────────────────────────────────────────
/** Return the first non-loopback IPv4 address on this machine */
function getLocalIP() {
  const ifaces = os.networkInterfaces();
  for (const name of Object.keys(ifaces)) {
    for (const iface of ifaces[name]) {
      if (iface.family === 'IPv4' && !iface.internal) return iface.address;
    }
  }
  return '127.0.0.1';
}

// ── Express static server ──────────────────────────────────────────────────
const app = express();
const CLIENT_DIR = path.join(__dirname, '..', 'client');
app.use(express.static(CLIENT_DIR));

// QR-code image endpoint  (?url=<base>&sid=<sessionId>)
app.get('/qr', async (req, res) => {
  const baseUrl = req.query.url || `http://${getLocalIP()}:${PORT}`;
  const sid     = req.query.sid  || '';
  const controllerUrl = `${baseUrl}/controller.html${sid ? `?sid=${sid}` : ''}`;
  try {
    const png = await QRCode.toBuffer(controllerUrl, { width: 300, errorCorrectionLevel: 'H' });
    res.set('Content-Type', 'image/png');
    res.send(png);
  } catch (err) {
    res.status(500).send('QR generation failed');
  }
});

// Expose tunnel URL + LAN IP so the game page picks the right QR base
app.get('/tunnel-url', (req, res) => {
  res.json({ url: global.tunnelUrl || null });
});

// LAN IP for local-network joining (no tunnel)
app.get('/network-info', (req, res) => {
  res.json({ ip: getLocalIP(), port: PORT });
});

// ── HTTP + WebSocket server ────────────────────────────────────────────────
const server = http.createServer(app);

// localtunnel v2 requires this header to bypass the browser nag page.
// We inject it on every WebSocket Upgrade request so the tunnel proxy
// passes the connection through without showing the "click Continue" wall.
server.on('upgrade', (req, _socket, _head) => {
  req.headers['bypass-tunnel-reminder'] = 'true';
});

const wss = new WebSocketServer({ server, path: '/ws' });

/** Map: sessionId → { gameSocket, controllerSocket } */
const sessions = new Map();

function generateId() {
  return Math.random().toString(36).slice(2, 9).toUpperCase();
}

function broadcast(session, msg) {
  const data = JSON.stringify(msg);
  if (session.gameSocket?.readyState === 1)       session.gameSocket.send(data);
  if (session.controllerSocket?.readyState === 1) session.controllerSocket.send(data);
}

wss.on('connection', (ws, req) => {
  const url    = new URL(req.url, `http://localhost`);
  const role   = url.searchParams.get('role');   // 'game' | 'controller'
  const sid    = url.searchParams.get('sid');    // session id

  // ── Game client connecting (creates a session) ──────────────────────────
  if (role === 'game') {
    const sessionId = generateId();
    sessions.set(sessionId, { gameSocket: ws, controllerSocket: null, state: {} });
    ws.sessionId = sessionId;
    ws.send(JSON.stringify({ type: 'session', sessionId }));
    console.log(`[WS] Game connected → session ${sessionId}`);

    ws.on('message', raw => {
      const msg = safeJson(raw);
      if (!msg) return;
      const session = sessions.get(ws.sessionId);
      if (!session) return;

      // Save game state relayed from the game client
      if (msg.type === 'save') {
        session.state = msg.payload;
        console.log(`[WS] State saved for session ${ws.sessionId}`);
      }
    });

    ws.on('close', () => {
      console.log(`[WS] Game disconnected → session ${ws.sessionId}`);
      const session = sessions.get(ws.sessionId);
      if (session?.controllerSocket?.readyState === 1) {
        session.controllerSocket.send(JSON.stringify({ type: 'game_disconnected' }));
      }
      sessions.delete(ws.sessionId);
    });
    return;
  }

  // ── Controller (smartphone) connecting ──────────────────────────────────
  if (role === 'controller') {
    if (!sid || !sessions.has(sid)) {
      ws.send(JSON.stringify({ type: 'error', message: 'Invalid session ID' }));
      ws.close();
      return;
    }
    const session = sessions.get(sid);
    session.controllerSocket = ws;
    ws.sessionId = sid;

    // Send saved state so the controller knows the current game situation
    ws.send(JSON.stringify({ type: 'joined', state: session.state }));
    // Notify the game that a controller is now connected
    if (session.gameSocket?.readyState === 1) {
      session.gameSocket.send(JSON.stringify({ type: 'controller_connected' }));
    }
    console.log(`[WS] Controller joined session ${sid}`);

    ws.on('message', raw => {
      const msg = safeJson(raw);
      if (!msg) return;
      const s = sessions.get(ws.sessionId);
      if (!s) return;
      // Forward controller input to the game
      if (s.gameSocket?.readyState === 1) {
        s.gameSocket.send(JSON.stringify(msg));
      }
    });

    ws.on('close', () => {
      console.log(`[WS] Controller disconnected from session ${ws.sessionId}`);
      const s = sessions.get(ws.sessionId);
      if (s) {
        s.controllerSocket = null;
        if (s.gameSocket?.readyState === 1) {
          s.gameSocket.send(JSON.stringify({ type: 'controller_disconnected' }));
        }
      }
    });
    return;
  }

  // Unknown role
  ws.send(JSON.stringify({ type: 'error', message: 'Unknown role' }));
  ws.close();
});

function safeJson(raw) {
  try { return JSON.parse(raw); } catch { return null; }
}

// ── Start — bind to ALL interfaces so LAN devices can reach the server ─────
server.listen(PORT, '0.0.0.0', async () => {
  const localIP = getLocalIP();
  console.log(`\n🎮  DOOM Browser Game`);
  console.log(`   Local     : http://localhost:${PORT}`);
  console.log(`   LAN       : http://${localIP}:${PORT}  ← use this on same WiFi`);
  console.log(`   WS        : ws://${localIP}:${PORT}/ws\n`);

  if (USE_TUNNEL) {
    await startTunnel();
  } else {
    console.log(`   Controller (same WiFi): http://${localIP}:${PORT}/controller.html`);
    console.log('   Tip: run with --tunnel to expose over the internet\n');
  }
});

async function startTunnel() {
  try {
    const localtunnel = require('localtunnel');
    // allow_invalid_cert: true avoids the localtunnel password/nag page on the
    // tunnel host side; the Bypass-Tunnel-Reminder header covers WS upgrades.
    const tunnel = await localtunnel({ port: PORT, allow_invalid_cert: true });
    global.tunnelUrl = tunnel.url;
    console.log(`🌐  Tunnel URL : ${tunnel.url}`);
    console.log(`   Controller : ${tunnel.url}/controller.html\n`);
    console.log('   ⚠  First visit — open the tunnel URL in a browser once');
    console.log('      and click "Click to Continue" if a warning page appears.\n');

    // Print QR to terminal as ASCII (without SID — game page will embed it)
    QRCode.toString(`${tunnel.url}/controller.html`, { type: 'terminal', small: true }, (err, qr) => {
      if (!err) console.log(qr);
    });

    tunnel.on('close', () => {
      console.warn('Tunnel closed. Restart with --tunnel to reconnect.');
      global.tunnelUrl = null;
    });
  } catch (err) {
    console.error('Tunnel failed:', err.message);
    console.error('Make sure you have internet access and try again.');
  }
}
