# Aplikasi Ujian Online

Aplikasi ujian online berbasis web seperti ANBK dengan arsitektur multi-port.

## Struktur Aplikasi

```
├── backend/           # API Backend (Nest.js) - Port 3001
├── admin-panel/       # Panel Admin (Next.js) - Port 3000
├── student-portal/    # Portal Siswa (Next.js) - Port 3002
└── shared/           # Shared types & utilities
```

## Fitur Utama

### Admin Panel (Port 3000)

- Manajemen data siswa/mahasiswa
- Manajemen soal ujian
- Manajemen jadwal ujian
- Monitoring hasil ujian
- Dashboard statistik

### Student Portal (Port 3002)

- Login siswa
- Daftar ujian yang tersedia
- Mengerjakan ujian
- Melihat hasil ujian

### Backend API (Port 3001)

- RESTful API
- Authentication & Authorization
- Database management
- Real-time monitoring

## Teknologi

- **Backend**: Nest.js, TypeORM, MySQL/PostgreSQL
- **Frontend**: Next.js 14, React, TailwindCSS
- **Authentication**: JWT
- **Database**: MySQL (via Laragon)

## Instalasi

### 1. Setup Database

```bash
# Buat database di phpMyAdmin atau MySQL
CREATE DATABASE ujian_online;
```

### 2. Setup Environment

```bash
cp .env.example .env
# Edit .env sesuai konfigurasi Anda
```

### 3. Install Dependencies

#### Backend

```bash
cd backend
npm install
npm run migration:run
npm run seed
npm run start:dev
```

#### Admin Panel

```bash
cd admin-panel
npm install
npm run dev
```

#### Student Portal

```bash
cd student-portal
npm install
npm run dev
```

## Port Configuration

Aplikasi menggunakan routing template dinamis yang membaca port dari environment variables:

- Backend API: `http://localhost:3001`
- Admin Panel: `http://localhost:3000`
- Student Portal: `http://localhost:3002`

Untuk mengubah port, cukup edit file `.env` tanpa perlu mengubah kode.

## Default Login

### Admin

- Email: admin@ujian.com
- Password: admin123

### Siswa Demo

- NIS: 12345
- Password: siswa123

## Development

```bash
# Run all services
npm run dev:all

# Run individual service
npm run dev:backend
npm run dev:admin
npm run dev:student
```

## Production Build

```bash
# Backend
cd backend && npm run build && npm run start:prod

# Admin Panel
cd admin-panel && npm run build && npm run start

# Student Portal
cd student-portal && npm run build && npm run start
```
