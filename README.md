# MJMovies — Private Streaming Platform

> A self-hosted, Netflix-style streaming platform with an admin panel, HLS video transcoding, and a **mobile remote control app** for Smart TVs.

---

## 📋 Table of Contents

- [What is MJMovies?](#-what-is-mjmovies)
- [Key Features](#-key-features)
- [System Architecture](#️-system-architecture)
- [Tech Stack](#️-tech-stack)
- [Prerequisites](#-prerequisites)
- [Installation & Setup](#-installation--setup)
  - [Option A: Docker (Production)](#option-a-docker-production--recommended)
  - [Option B: Local Development](#option-b-local-development)
- [Database](#️-database)
- [Remote App (Android)](#-remote-app-android)
- [Management Scripts (Windows)](#️-management-scripts-windows)
- [Admin Panel](#️-admin-panel)

---

## 🎯 What is MJMovies?

MJMovies is a complete **private, self-hosted** movie streaming system designed for personal or local network use. It allows you to upload, organize, and stream movies in HLS (adaptive streaming) format, with user accounts, watch history, and a **digital remote control via Android app** that connects to the web player on your TV via QR code.

---

## ✨ Key Features

| Category | Features |
|---|---|
| 🎥 **Streaming** | HLS playback with `hls.js`, adaptive quality, progress tracking |
| 🔐 **Authentication** | Registration, JWT login (access + refresh tokens), signed cookies, CSRF protection |
| 👤 **Users** | Profile, avatar, watch history, roles (`USER` / `ADMIN`) |
| 🛠️ **Admin** | Full panel: manage movies, users, genres, and transcoding jobs |
| ⚙️ **Transcoding** | Automatic HLS conversion with `ffmpeg`, job queue via `Bull` + Redis |
| 📱 **Remote Control** | React Native (Expo) app that controls the web player via QR + WebSocket |
| 🌐 **External Movies** | Support for movies via external URL (no file upload needed) |
| 🔒 **Security** | Helmet, Redis-based rate limiting, configurable CORS, Zod validation |
| 🐳 **Docker-Ready** | Full stack with Docker Compose: Nginx, MySQL, Redis, Backend, Frontend |

---

## 🏗️ System Architecture

```
┌─────────────────────────────────────────────────────────────┐
│                          CLIENT                             │
│  ┌──────────────────┐        ┌──────────────────────────┐   │
│  │  Web Frontend     │        │  Remote App (Android)    │   │
│  │  React + Vite     │        │  React Native + Expo     │   │
│  │  (Port 3000)      │        │  QR Remote Control       │   │
│  └────────┬─────────┘        └────────────┬─────────────┘   │
└───────────┼──────────────────────────────┼─────────────────┘
            │ HTTP / WebSocket              │ WebSocket
            ▼                              ▼
┌─────────────────────────────────────────────────────────────┐
│                    NGINX (Reverse Proxy)                     │
│               Port 80 (HTTP) / 443 (HTTPS)                  │
└──────────────────────────┬──────────────────────────────────┘
                           │
                           ▼
┌─────────────────────────────────────────────────────────────┐
│               Backend API — Node.js + Express               │
│                         Port 5000                           │
│                                                             │
│  ┌──────────┐  ┌──────────┐  ┌──────────┐  ┌───────────┐  │
│  │   Auth   │  │  Movies  │  │  Stream  │  │  Remote   │  │
│  │  /auth   │  │ /movies  │  │ /streams │  │  /remote  │  │
│  └──────────┘  └──────────┘  └──────────┘  └───────────┘  │
│                                                             │
│  ┌─────────────────┐     ┌──────────────────────────────┐  │
│  │  Socket.IO      │     │  Transcoding Queue           │  │
│  │  (Real-Time)    │     │  Bull + FFmpeg + Redis       │  │
│  └─────────────────┘     └──────────────────────────────┘  │
└──────────┬────────────────────────────┬─────────────────────┘
           │                            │
           ▼                            ▼
┌────────────────────┐      ┌────────────────────────────────┐
│  MySQL (Prisma)    │      │  Redis                         │
│  Database          │      │  Cache + Job Queue             │
└────────────────────┘      └────────────────────────────────┘
```

---

## 🛠️ Tech Stack

### Backend (`/backend`)
| Technology | Purpose |
|---|---|
| **Node.js + Express** | HTTP server and REST API |
| **Prisma ORM** | Database access (MySQL / SQLite) |
| **MySQL** | Primary database in production |
| **Redis + Bull** | Job queue for transcoding |
| **Socket.IO** | Real-time communication (remote control) |
| **FFmpeg (`fluent-ffmpeg`)** | Video transcoding to HLS |
| **JWT + bcryptjs** | Secure authentication |
| **Helmet + csrf-csrf** | HTTP security |
| **Zod + express-validator** | Data validation |
| **Sharp** | Image processing (posters) |
| **Winston + Morgan** | Logging |

### Web Frontend (`/frontend`)
| Technology | Purpose |
|---|---|
| **React 18 + Vite** | UI and build tool |
| **React Router v6** | SPA navigation |
| **hls.js** | HLS stream playback in the browser |
| **Zustand** | Global state management |
| **Axios** | HTTP requests to the API |
| **Socket.IO Client** | Receives remote control commands |
| **TailwindCSS** | Utility-first styling |
| **Lucide React** | Icon library |

### Remote App (`/remote-app`)
| Technology | Purpose |
|---|---|
| **React Native + Expo** | Cross-platform mobile app |
| **Expo Camera / Barcode Scanner** | QR code scanning for pairing |
| **Socket.IO Client** | Sends commands to the web player |
| **Zustand** | Remote session state |
| **EAS Build** | Android APK compilation |

### Infrastructure
| Technology | Purpose |
|---|---|
| **Docker + Docker Compose** | Full stack containerization |
| **Nginx** | Reverse proxy, serving frontend and streams |

---

## ✅ Prerequisites

### For production with Docker:
- [Docker Desktop](https://www.docker.com/products/docker-desktop/) installed and running
- Ports **80** and **443** available on your machine

### For local development:
- **Node.js** v18 or higher
- **pnpm** — `npm install -g pnpm`
- **Redis** running locally (or via Docker)
- **FFmpeg** installed and available in the system `PATH`
- For the remote app: the **Expo Go** app on your Android/iOS device

---

## 🚀 Installation & Setup

### Option A: Docker (Production — Recommended)

> Spins up the entire stack (Backend, Frontend, MySQL, Redis, Nginx) with a single command.

**1. Clone the repository:**
```bash
git clone <repo-url>
cd MJMovies
```

**2. Configure environment variables:**
```bash
copy .env.example .env
# Edit .env with your own passwords and secrets
```

**3. Start the stack:**
```bash
docker compose up -d --build
```
Or using the Windows script:
```
iniciar_proyecto.cmd → Option [1]
```

**4. Access the app:**

| Service | URL |
|---|---|
| 🌐 Web App | `http://localhost` |
| ⚙️ Backend API | `http://localhost/api` |
| ❤️ Health Check | `http://localhost/api/health` |

> Database migrations and the admin user are created automatically on first startup.

---

### Option B: Local Development

**1. Install dependencies:**
```bash
cd backend && pnpm install && pnpm run db:generate
cd ../frontend && pnpm install
cd ../remote-app && pnpm install
```
Or with the script: `iniciar_proyecto.cmd → Option [6]`

**2. Apply the database schema:**
```bash
cd backend
pnpm run db:push   # Applies schema (SQLite by default in dev)
pnpm run db:seed   # Creates the initial admin user
```

**3. Start the services:**
```bash

cd backend && pnpm run dev
cd frontend && pnpm run dev
cd remote-app && pnpm start

```
Or with the script: `iniciar_proyecto.cmd → Option [2]`

---

## 🗄️ Database

Supports **MySQL** (production) and **SQLite** (local development). Prisma selects the schema automatically.

### Main Models

```
User               → System users
  ├── RefreshToken → Session refresh tokens
  ├── WatchHistory → Watch progress per movie
  └── RemoteSession → Remote control sessions (QR ↔ TV)

Movie              → Movie catalog
  ├── MovieGenre   → Relationship with genres (N:M)
  └── TranscodeJob → HLS transcoding jobs

Genre              → Movie categories
```

### Movie Status Lifecycle
```
PENDING → PROCESSING → READY
                    ↘ ERROR
```

### Database Commands
```bash
cd backend
pnpm run db:push       # Apply schema without migrations (dev)
pnpm run db:migrate    # Apply formal migrations (production)
pnpm run db:seed       # Insert initial data (admin user)
pnpm run db:studio     # Open Prisma Studio (visual DB GUI)
pnpm run db:generate   # Regenerate the Prisma client
```
---

## 📱 Remote App (Android)

The app acts as a **physical remote control** for the web player via WebSocket.

### Usage flow:
```
1. Open a movie in the browser (PC or Smart TV)
2. Click "Remote Control" → a QR code appears
3. Open the app on your phone and scan the QR
4. Both devices sync via WebSocket
5. Control from your phone: ▶ Play · ⏸ Pause · ⏩ Seek · 🔊 Volume
```

### Building the Android APK

**Using the Windows script:**
```
compilar_app.cmd
```
or `iniciar_proyecto.cmd → Option [3]`

**Manually (requires a free account at [expo.dev](https://expo.dev)):**
```bash
cd remote-app
npx eas-cli login
npx eas-cli build --platform android --profile preview
# You will receive a download link when the build finishes
```

**Test without building using Expo Go:**
```bash
cd remote-app
pnpm start
# Scan the QR with the "Expo Go" app on your phone
```

> 📌 Cloud builds with EAS are **free** and do not require Android Studio.

---

## 🖥️ Management Scripts (Windows)

The `iniciar_proyecto.cmd` file is the main project manager.

```
iniciar_proyecto.cmd
═══════════════════════════════════════════════════
  MJMOVIES — NETFLIX-STYLE STREAMING PLATFORM

  [1] Start everything with Docker Compose
  [2] Start in Local Dev Mode (3 windows)
  [3] Build Remote App APK (Android EAS)
  [4] Start Remote App with Expo Go (no build)
  [5] Build Web Frontend for Production
  [6] Install/Update All Dependencies
  [7] Stop Docker containers
  [0] Exit
═══════════════════════════════════════════════════
```

---

## 🛡️ Admin Panel

Access at: `http://localhost/admin` using the credentials defined in `.env`.

| Section | Description |
|---|---|
| 📊 **Dashboard** | Stats: total movies, users, and pending jobs |
| 🎬 **Movies** | View, edit, delete and manage the full catalog |
| ⬆️ **Upload Movie** | Upload a video file — automatically transcoded to HLS |
| 👥 **Users** | View, enable/disable, and change user roles |
| ⚙️ **Jobs** | Real-time monitor of the transcoding job queue |