# Panduan Setup Aplikasi Ujian Online

## Prerequisites

Pastikan sudah terinstall:

- Node.js (v18 atau lebih baru)
- MySQL (sudah termasuk di Laragon)
- npm atau yarn

## Langkah-Langkah Instalasi

### 1. Setup Database

Buka phpMyAdmin atau MySQL CLI di Laragon dan buat database:

```sql
CREATE DATABASE ujian_online;
```

### 2. Konfigurasi Environment

Copy file `.env.example` ke `.env` di root folder dan di folder backend:

```bash
# Di root folder
cp .env.example .env

# Di folder backend
cd backend
cp .env .env
```

Edit file `.env` sesuai dengan konfigurasi Laragon Anda:

```env
DB_HOST=localhost
DB_PORT=3306
DB_USERNAME=root
DB_PASSWORD=
DB_DATABASE=ujian_online

JWT_SECRET=your-secret-key-change-this-in-production
JWT_EXPIRES_IN=7d

API_PORT=3001
```

### 3. Install Dependencies

#### Install semua dependencies sekaligus

```bash
npm run install:all
```

#### Atau install satu per satu:

**Backend:**

```bash
cd backend
npm install
```

**Admin Panel:**

```bash
cd admin-panel
npm install
```

**Student Portal:**

```bash
cd student-portal
npm install
```

### 4. Setup Database dan Seed Data

Dari folder backend, jalankan:

```bash
cd backend
npm run seed
```

Ini akan membuat tabel dan mengisi data demo:

- Admin: admin@ujian.com / admin123
- Siswa: NIS 12345 / siswa123

### 5. Menjalankan Aplikasi

Anda perlu membuka 3 terminal terpisah:

**Terminal 1 - Backend API (Port 3001):**

```bash
cd backend
npm run start:dev
```

**Terminal 2 - Admin Panel (Port 3000):**

```bash
cd admin-panel
npm run dev
```

**Terminal 3 - Student Portal (Port 3002):**

```bash
cd student-portal
npm run dev
```

### 6. Akses Aplikasi

- **Admin Panel**: http://localhost:3000

  - Email: admin@ujian.com
  - Password: admin123

- **Student Portal**: http://localhost:3002

  - NIS: 12345
  - Password: siswa123

- **Backend API**: http://localhost:3001/api

## Mengubah Port

Jika port default sudah digunakan, Anda bisa mengubahnya di file `.env`:

```env
API_PORT=3001                    # Port Backend
NEXT_PUBLIC_ADMIN_PORT=3000      # Port Admin Panel
NEXT_PUBLIC_STUDENT_PORT=3002    # Port Student Portal
```

Aplikasi ini menggunakan routing template dinamis, jadi API URL akan otomatis menyesuaikan dengan port yang Anda set di environment variables.

## Troubleshooting

### Error: Port already in use

Ubah port di file `.env` atau hentikan aplikasi yang menggunakan port tersebut.

### Error: Cannot connect to database

- Pastikan MySQL di Laragon sudah running
- Cek konfigurasi database di file `.env`
- Pastikan database `ujian_online` sudah dibuat

### Error: Module not found

Jalankan `npm install` lagi di folder yang bermasalah.

### Error: TypeORM sync failed

Hapus database dan buat ulang, lalu jalankan seed lagi:

```sql
DROP DATABASE ujian_online;
CREATE DATABASE ujian_online;
```

Lalu jalankan: `cd backend && npm run seed`

## Fitur Utama

### Admin Panel

- ✅ Login admin
- ✅ Dashboard statistik
- ✅ Kelola siswa (tambah, edit, hapus)
- ✅ Kelola ujian (buat, edit, hapus, publish)
- ✅ Kelola soal ujian
- ✅ Lihat hasil ujian siswa

### Student Portal

- ✅ Login siswa dengan NIS
- ✅ Lihat daftar ujian yang tersedia
- ✅ Mengerjakan ujian dengan timer
- ✅ Navigasi antar soal
- ✅ Auto-save jawaban
- ✅ Submit ujian
- ✅ Lihat riwayat ujian

### Backend API

- ✅ RESTful API
- ✅ JWT Authentication
- ✅ Role-based access control
- ✅ Auto grading untuk pilihan ganda
- ✅ Real-time timer

## Production Deployment

Untuk deploy ke production:

1. Build semua aplikasi:

```bash
npm run build:all
```

2. Set environment variables untuk production
3. Jalankan dengan PM2 atau sejenisnya:

```bash
# Backend
cd backend && pm2 start npm --name "ujian-backend" -- run start:prod

# Admin Panel
cd admin-panel && pm2 start npm --name "ujian-admin" -- start

# Student Portal
cd student-portal && pm2 start npm --name "ujian-student" -- start
```

## Support

Jika ada pertanyaan atau masalah, silakan buat issue di repository ini.
