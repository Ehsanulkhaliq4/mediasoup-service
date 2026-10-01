# 🎥 ZoomCloud — Production Mediasoup Conference Engine

A scalable, production-ready WebRTC SFU video conferencing service modeled like Zoom and Google Meet, powered by **mediasoup v3**, **Express 5**, and **Socket.IO**.

---

## ✨ Features

- **Zoom / Google Meet UI**: Sleek, modern dark-themed web client served at root URL (`http://localhost:3000`).
- **Multi-Worker Mediasoup Pool**: Automatic load balancing across CPU cores for high-capacity multi-party meetings.
- **Audio & Video Streams**: Ultra-low latency SFU architecture with VP8, H.264, and Opus codecs.
- **HD Screen Sharing**: 1-click desktop/tab/window screen sharing with audio.
- **Active Speaker Detection**: Real-time speaking detection with animated green highlight rings.
- **Dynamic Video Grid**: Auto-responsive layout supporting 1 to 25+ simultaneous video streams.
- **In-Meeting Group Chat**: Real-time messaging with timestamps and unread message badges.
- **Interactive Controls**: Mic Mute/Unmute, Cam On/Off, Screen Share, Raise Hand ✋, Participants drawer.
- **Instant Invite Links**: 1-click copy meeting URL (`http://localhost:3000/?room=conf-xxxx-yyyy`) to share with friends/colleagues.
- **Complete REST & Socket.IO API**: Full API surface for programmatic room management and custom mobile/desktop clients.

---

## 🚀 Quick Start

### 1. Install Dependencies
```bash
npm install
```

### 2. (Optional) Rebuild Client Bundle
```bash
npm run build:client
```

### 3. Start the Server
```bash
npm start
```
Or for auto-reload during development:
```bash
npm run dev
```

### 4. Test in Browser
Open `http://localhost:3000` in two different browser tabs (or send the invite link to another machine on your local network).

---

## ⚙️ Environment Configuration (`.env`)

```ini
PORT=3000
HOST=0.0.0.0
CORS_ORIGIN=*

# Number of mediasoup workers (CPU cores)
MEDIASOUP_NUM_WORKERS=4
MEDIASOUP_LOG_LEVEL=warn

# Port range for WebRTC RTP media streams
MEDIASOUP_MIN_PORT=40000
MEDIASOUP_MAX_PORT=49999

# WebRTC Network Configuration
# For local development:
MEDIASOUP_LISTEN_IP=0.0.0.0
MEDIASOUP_ANNOUNCED_IP=127.0.0.1

# For Cloud / Production (AWS, GCP, VPS, Docker):
# Set MEDIASOUP_ANNOUNCED_IP to your public IP (e.g. 54.123.45.67)
```

---

## 🌐 Production Deployment Guide

When deploying to a public server (AWS, DigitalOcean, Hetzner, etc.):

1. **Firewall / Security Group Rules**:
   - Open TCP port `3000` (or `80`/`443` behind Nginx/Caddy).
   - Open UDP & TCP ports `40000-49999` for WebRTC media transport.

2. **Configure `.env`**:
   Set `MEDIASOUP_ANNOUNCED_IP=<YOUR_PUBLIC_SERVER_IP>`.

3. **HTTPS / SSL**:
   WebRTC `getUserMedia` (camera/mic/screen share) requires HTTPS when accessed outside of `localhost`. Set up Nginx or Caddy with Let's Encrypt:
   ```nginx
   server {
       server_name meet.yourdomain.com;

       location / {
           proxy_pass http://127.0.0.1:3000;
           proxy_http_version 1.1;
           proxy_set_header Upgrade $http_upgrade;
           proxy_set_header Connection "upgrade";
           proxy_set_header Host $host;
       }
   }
   ```

---

## 📖 API Documentation

See [API_DOCS.md](API_DOCS.md) for full REST endpoints and Socket.IO real-time event references.
