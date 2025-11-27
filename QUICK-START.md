# 🚀 Quick Start Guide

## Cara Tercepat untuk Memulai

### 1️⃣ Persiapan (5 menit)

**a. Buat Database**

- Buka Laragon, klik "Database" atau buka phpMyAdmin
- Buat database baru dengan nama `ujian_online`

**b. Install Dependencies**
Buka PowerShell di folder root project, lalu jalankan:

```powershell
.\install-all.ps1
```

Atau install manual:

```powershell
# Backend
cd backend
npm install

# Admin Panel
cd ..\admin-panel
npm install

# Student Portal
cd ..\student-portal
npm install
```

### 2️⃣ Setup Database & Data Demo (2 menit)

```powershell
cd backend
npm run seed
```

Ini akan membuat tabel dan mengisi data demo:

- ✅ Admin: admin@ujian.com / admin123
- ✅ 3 Siswa demo (NIS: 12345, 12346, 12347 / Password: siswa123)
- ✅ 1 Ujian matematika dengan 5 soal

### 3️⃣ Jalankan Aplikasi (Buka 3 Terminal)

**Terminal 1 - Backend (Port 3001):**

```powershell
.\start-backend.ps1
```

Atau:

```powershell
cd backend
npm run start:dev
```

**Terminal 2 - Admin Panel (Port 3000):**

```powershell
.\start-admin.ps1
```

Atau:

```powershell
cd admin-panel
npm run dev
```

**Terminal 3 - Student Portal (Port 3002):**

```powershell
.\start-student.ps1
```

Atau:

```powershell
cd student-portal
npm run dev
```

### 4️⃣ Akses Aplikasi

#### 👨‍💼 Admin Panel: http://localhost:3000

```
Email: admin@ujian.com
Password: admin123
```

**Fitur:**

- Dashboard statistik
- Kelola siswa
- Buat & kelola ujian
- Buat & kelola soal
- Lihat hasil ujian

#### 👨‍🎓 Student Portal: http://localhost:3002

```
NIS: 12345
Password: siswa123
```

**Fitur:**

- Lihat ujian tersedia
- Kerjakan ujian dengan timer
- Auto-save jawaban
- Lihat riwayat ujian

---

## 📋 Checklist Setup

- [ ] MySQL di Laragon sudah running
- [ ] Database `ujian_online` sudah dibuat
- [ ] Dependencies sudah terinstall (backend, admin-panel, student-portal)
- [ ] Seed data sudah dijalankan
- [ ] Backend API running di port 3001
- [ ] Admin Panel running di port 3000
- [ ] Student Portal running di port 3002

---

## 🎯 Test Flow

1. **Login sebagai Admin** (port 3000)

   - Lihat dashboard
   - Cek data siswa
   - Cek ujian yang sudah ada
   - Tambah siswa baru (optional)
   - Buat ujian baru (optional)

2. **Login sebagai Siswa** (port 3002)

   - Lihat daftar ujian
   - Klik "Mulai Ujian"
   - Jawab soal-soal
   - Klik "Kumpulkan Ujian"
   - Lihat hasil (jika diset langsung tampil)

3. **Cek Hasil di Admin** (port 3000)
   - Klik menu "Hasil Ujian"
   - Pilih ujian
   - Lihat daftar siswa yang sudah mengerjakan

---

## ⚙️ Mengubah Port

Edit file `.env` di root folder:

```env
# Backend API
API_PORT=3001

# Admin Panel
NEXT_PUBLIC_ADMIN_PORT=3000

# Student Portal
NEXT_PUBLIC_STUDENT_PORT=3002

# Database
DB_PORT=3306
```

Setelah edit `.env`, restart semua service.

---

## 🔧 Troubleshooting Cepat

### Error: Port already in use

```powershell
# Cek port yang digunakan
netstat -ano | findstr :3000
netstat -ano | findstr :3001
netstat -ano | findstr :3002

# Atau ubah port di .env
```

### Error: Cannot connect to database

```powershell
# Pastikan MySQL running
# Buka Laragon -> Start All

# Cek database sudah dibuat
# phpMyAdmin -> cek database ujian_online
```

### Error: Module not found

```powershell
# Install ulang dependencies
cd backend
npm install

cd ..\admin-panel
npm install

cd ..\student-portal
npm install
```

### Error: Seed failed

```powershell
# Drop dan buat ulang database
# Di phpMyAdmin atau MySQL CLI:
DROP DATABASE ujian_online;
CREATE DATABASE ujian_online;

# Lalu jalankan seed lagi
cd backend
npm run seed
```

---

## 📱 Akses dari HP/Device Lain

Ganti `localhost` dengan IP komputer Anda:

1. Cari IP komputer:

```powershell
ipconfig
# Cari IPv4 Address, misal: 192.168.1.100
```

2. Update `.env` di `admin-panel/.env.local` dan `student-portal/.env.local`:

```env
NEXT_PUBLIC_API_URL=http://192.168.1.100:3001/api
```

3. Akses dari HP:
   - Admin: http://192.168.1.100:3000
   - Student: http://192.168.1.100:3002

---

## 📚 Dokumentasi Lengkap

- [README.md](README.md) - Overview aplikasi
- [SETUP-GUIDE.md](SETUP-GUIDE.md) - Setup detail
- [API-DOCUMENTATION.md](API-DOCUMENTATION.md) - API Reference

---

## 💡 Tips

1. **Gunakan 3 browser berbeda** untuk testing:

   - Chrome: Admin Panel
   - Firefox: Student Portal
   - Edge: Student Portal (siswa lain)

2. **Hot Reload aktif**, tidak perlu restart saat edit kode

3. **Data auto-save**, jawaban siswa tersimpan otomatis

4. **Timer otomatis**, ujian submit otomatis saat waktu habis

5. **Admin bisa lihat real-time** siswa yang sedang mengerjakan

---

Selamat mencoba! 🎉
