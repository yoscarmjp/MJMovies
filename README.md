# 🎬 MJMovies

**Plataforma de streaming privada tipo Netflix** — Soporta 1–200 usuarios simultáneos, panel de administración, transcodificación HLS automática, y APK de control remoto estilo Smart TV.

---

## 🌟 Características

| Categoría | Detalles |
|-----------|---------|
| **Streaming** | HLS adaptativo (360p/720p/1080p), hasta 200 viewers simultáneos sin lag |
| **Subida** | MP4 drag-and-drop, transcodificación automática con FFmpeg |
| **Seguridad** | Prisma ORM (0 SQL raw), JWT RS256, Rate Limiting Redis, Helmet, CSRF, validación Zod, magic bytes check |
| **UI** | Modo oscuro premium, glassmorphism, animaciones, responsive, modo Smart TV |
| **Admin** | Dashboard de estadísticas, gestión de usuarios y roles, jobs en tiempo real |
| **Control Remoto** | APK Android con D-pad, play/pause/seek, pairing por código de 6 dígitos |
| **Deploy** | Docker Compose listo para Ubuntu Linux |

---

## 🚀 Instalación Rápida (Ubuntu Linux)

### Requisitos
- Ubuntu 20.04+ / Debian 11+
- Docker 24+
- Docker Compose v2+
- Al menos 4GB RAM y 50GB disco libre

### 1. Instalar Docker

```bash
curl -fsSL https://get.docker.com | sh
sudo usermod -aG docker $USER
newgrp docker
```

### 2. Clonar el proyecto

```bash
git clone <tu-repo> mjmovies
cd mjmovies
```

### 3. Configurar variables de entorno

```bash
cp .env.example .env
nano .env
```

**Campos OBLIGATORIOS a cambiar:**
```env
DB_PASSWORD=tu_password_mysql_seguro
DB_ROOT_PASSWORD=tu_password_root_mysql
REDIS_PASSWORD=tu_password_redis
JWT_ACCESS_SECRET=$(openssl rand -hex 64)
JWT_REFRESH_SECRET=$(openssl rand -hex 64)
COOKIE_SECRET=$(openssl rand -hex 32)
ADMIN_EMAIL=tu@email.com
ADMIN_PASSWORD=TuPasswordAdmin@2024!
ALLOWED_ORIGINS=http://TU-IP-DEL-SERVIDOR
```

### 4. Levantar el sistema

```bash
docker compose up -d --build
```

La primera vez ejecuta migraciones y crea el admin automáticamente.

### 5. Verificar que funciona

```bash
docker compose ps          # Todos los servicios deben estar "healthy"
curl http://localhost/api/health  # Debe responder {"status":"ok"}
```

### 6. Acceder

| Servicio | URL |
|---------|-----|
| **Frontend** | `http://TU-IP` |
| **API** | `http://TU-IP/api` |
| **Admin** | `http://TU-IP/admin` |

**Credenciales admin por defecto:**
- Email: el que pusiste en `ADMIN_EMAIL`
- Password: el que pusiste en `ADMIN_PASSWORD`

---

## 🎬 Subir Películas

1. Entra a `http://TU-IP/admin` con tu cuenta admin
2. Ve a **"Subir Película"**
3. Arrastra tu archivo MP4 (desde Telegram, disco local, etc.)
4. Completa los metadatos (título, año, géneros, etc.)
5. Haz click en **"Subir y Procesar"**
6. El sistema transcodifica automáticamente a HLS (360p/720p/1080p)
7. Puedes ver el progreso en tiempo real en **"Transcodificación"**
8. Cuando dice ✅ Lista, la película aparece en el catálogo

---

## 📱 APK Control Remoto

### Compilar APK

```bash
cd remote-app
npm install
npm install -g eas-cli

# Configurar EAS (requiere cuenta Expo)
eas login
eas build:configure

# Generar APK
npm run build:apk
```

### Usar el control remoto

1. Abre MJMovies en la TV/PC y entra a una película
2. Haz click en el botón **"📱 Generar código remoto"** en el reproductor
3. Abre la APK en tu teléfono
4. Ingresa la IP de tu servidor y el código de 6 dígitos
5. ¡Listo! Controla la reproducción desde tu teléfono

### Controles disponibles
| Botón | Función |
|-------|---------|
| **▲▼◀▶** | Navegar menú |
| **OK** | Seleccionar |
| **▶/⏸** | Play/Pause |
| **⏪/⏩** | Retroceder/Adelantar 10s |
| **🔉/🔊** | Volumen |
| **⛶** | Pantalla completa |
| **↩** | Volver |

---

## 🖥 Modo Smart TV (Ubuntu WebApp)

Para usar MJMovies como Smart TV en una PC con Ubuntu:

1. Abre Chromium/Chrome
2. Ve a `http://localhost` (si es local) o `http://TU-IP`
3. Click en el menú → **"Instalar aplicación"** (PWA)
4. O presiona `F11` para pantalla completa

La UI detecta automáticamente pantallas >= 1920px y activa el **modo TV** con:
- Focus extra prominente en elementos
- Navegación completa por teclado (←→↑↓ Enter)
- Tipografía y controles más grandes

---

## ⌨️ Atajos del Reproductor

| Tecla | Acción |
|-------|--------|
| `Espacio` / `K` | Play/Pause |
| `←` / `J` | -10 segundos |
| `→` / `L` | +10 segundos |
| `↑` | +10% volumen |
| `↓` | -10% volumen |
| `F` | Pantalla completa |
| `M` | Silenciar |
| `Escape` | Salir pantalla completa |

---

## 🔒 Seguridad Implementada

| Amenaza | Protección |
|---------|-----------|
| SQL Injection | Prisma ORM — 0 SQL raw |
| XSS | Helmet CSP + sanitización Zod |
| CSRF | SameSite=Strict cookies + double submit |
| Brute Force | Rate limit Redis (5 intentos/15min en login) |
| Session Hijacking | JWT RS256 + refresh token rotation |
| File Upload | Magic bytes validation + nombres aleatorios |
| Path Traversal | path.resolve() en todas las rutas de archivo |
| IDOR | Verificación de ownership en cada endpoint |
| DDoS | Nginx rate limit + connection limits por IP |
| Data Leak | Bcrypt factor 12 + logs sin datos sensibles |
| Enumeración | Respuestas auth genéricas (mismo mensaje si falla) |
| Clickjacking | X-Frame-Options: DENY |
| MIME Sniffing | X-Content-Type-Options: nosniff |

---

## 🛠 Comandos útiles

```bash
# Ver logs
docker compose logs -f backend
docker compose logs -f nginx

# Reiniciar un servicio
docker compose restart backend

# Crear backup de MySQL
docker compose exec mysql mysqldump -u root -p mjmovies > backup.sql

# Ver espacio usado por videos
docker volume inspect mjmovies_backend_streams

# Detener todo
docker compose down

# Detener y eliminar datos (¡PELIGROSO!)
docker compose down -v
```

---

## 📁 Estructura del Proyecto

```
MJMovies/
├── backend/          # Node.js + Express + Prisma (MySQL)
│   ├── src/
│   │   ├── config/   # DB, Redis
│   │   ├── middleware/  # auth, security, rate-limit, upload
│   │   ├── routes/   # auth, movies, admin, remote, stream
│   │   ├── controllers/
│   │   ├── services/ # FFmpeg HLS, authService
│   │   ├── jobs/     # Bull transcode queue
│   │   ├── socket/   # Socket.io handler
│   │   └── utils/    # logger, validators (Zod)
│   └── prisma/       # schema.prisma, migrations, seed
│
├── frontend/         # Vue 3 + Vite + Pinia
│   └── src/
│       ├── views/    # Home, Catalog, Movie, Player, Admin, Auth
│       ├── components/  # Navbar, MovieCard, Toast
│       ├── stores/   # auth, toast (Pinia)
│       ├── services/ # api.js (Axios)
│       └── assets/css/  # Design system completo
│
├── remote-app/       # React Native + Expo (APK Android)
│   └── src/
│       ├── screens/  # Pairing, Remote, Settings
│       └── store/    # Zustand + Socket.io
│
├── nginx/            # Reverse proxy config
├── docker/           # MySQL config
├── docker-compose.yml
└── .env.example
```

---

## 🔧 Variables de Entorno Completas

Revisa [.env.example](.env.example) para la lista completa con descripciones.

---

## 📊 Escalabilidad

El sistema soporta 200 usuarios simultáneos gracias a:

1. **HLS estático**: Los segmentos de video se sirven directamente desde Nginx como archivos estáticos — Node.js no procesa el streaming
2. **Redis cache**: Metadatos cacheados 5 minutos para no saturar MySQL
3. **Bull queues**: La transcodificación es asíncrona y no bloquea la API
4. **Nginx worker_connections 4096**: Configurado para muchas conexiones simultáneas
5. **MySQL connection pooling**: Prisma maneja el pool automáticamente

---

## 🆘 Solución de Problemas

**El video no carga:**
- Verifica que la película tenga estado "READY" en el admin
- Revisa los logs: `docker compose logs backend`

**Error de CORS:**
- Asegúrate de que `ALLOWED_ORIGINS` en `.env` incluye la URL exacta desde donde accedes

**FFmpeg no transcodifica:**
- En el contenedor Docker, FFmpeg viene instalado. Si corres sin Docker, instala: `sudo apt install ffmpeg`

**No puedo conectar el control remoto:**
- Teléfono y servidor deben estar en la misma red Wi-Fi
- Verifica la IP del servidor: `hostname -I`
- El código de pairing expira en 5 minutos, genera uno nuevo

---

Hecho con ❤️ por MJStudios
