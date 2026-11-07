'use strict';

/**
 * WebSocket client for the game page.
 * Connects as role=game, receives controller inputs, forwards them to DoomGame.
 */
class GameWS {
  constructor(game) {
    this.game      = game;
    this.sessionId = null;
    this.ws        = null;
    this._statusEl = document.getElementById('ws-status');
    this._qrEl     = document.getElementById('qr-container');
    this._connect();
  }

  _connect() {
    const proto = location.protocol === 'https:' ? 'wss' : 'ws';
    const url   = `${proto}://${location.host}/ws?role=game`;
    this.ws     = new WebSocket(url);
    this.game.ws = this.ws;

    this.ws.addEventListener('open', () => {
      this._setStatus('Connected — waiting for session…', '#4f4');
    });

    this.ws.addEventListener('message', e => {
      const msg = JSON.parse(e.data);

      if (msg.type === 'session') {
        this.sessionId = msg.sessionId;
        this._setStatus(`Session: ${msg.sessionId} — scan QR to join`, '#ff0');
        this._showQR();
      }

      if (msg.type === 'controller_connected') {
        this._setStatus('Controller connected!', '#4f4');
        document.getElementById('qr-container').style.display = 'none';
      }

      if (msg.type === 'controller_disconnected') {
        this._setStatus('Controller disconnected', '#f84');
      }

      if (msg.type === 'input') {
        this.game.applyControllerInput(msg);
      }
    });

    this.ws.addEventListener('close', () => {
      this._setStatus('Disconnected — retrying…', '#f44');
      setTimeout(() => this._connect(), 3000);
    });

    this.ws.addEventListener('error', () => {
      this.ws.close();
    });
  }

  _setStatus(text, color) {
    if (!this._statusEl) return;
    this._statusEl.textContent = text;
    this._statusEl.style.color = color;
  }

  _showQR() {
    if (!this._qrEl) return;
    const sid = this.sessionId;

    // 1. Try tunnel URL; if none, fall back to the LAN IP reported by the server.
    fetch('/tunnel-url')
      .then(r => r.json())
      .then(async tunnelData => {
        let base = tunnelData.url;
        if (!base) {
          // No tunnel — use the server's own LAN IP so phones on the same
          // WiFi can reach the server (localhost would only work on the
          // same machine).
          const netData = await fetch('/network-info').then(r => r.json());
          base = `http://${netData.ip}:${netData.port}`;
        }

        const controllerUrl = `${base}/controller.html?sid=${sid}`;

        // QR image — server encodes the full URL including the SID
        const img = document.createElement('img');
        img.src   = `/qr?url=${encodeURIComponent(base)}&sid=${encodeURIComponent(sid)}`;
        img.alt   = 'QR Code — scan with smartphone';
        img.style.cssText = 'width:200px;height:200px;display:block;margin:0 auto';

        // Human-readable link below the QR
        const p = document.createElement('p');
        p.textContent = `Join: ${controllerUrl}`;
        p.style.cssText = 'color:#fff;font-size:11px;text-align:center;word-break:break-all;margin-top:6px';

        this._qrEl.innerHTML = '';
        this._qrEl.appendChild(img);
        this._qrEl.appendChild(p);
        this._qrEl.style.display = 'block';
      });
  }
}

window.GameWS = GameWS;
