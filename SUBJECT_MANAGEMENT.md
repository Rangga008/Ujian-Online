# Fitur Manajemen Mata Pelajaran

## Deskripsi
Fitur **Manajemen Mata Pelajaran** telah ditambahkan ke halaman **Pengaturan** di Admin Panel. Ini memungkinkan administrator untuk menambah, mengedit, mengaktifkan/menonaktifkan, dan menghapus mata pelajaran yang tersedia dalam sistem.

## Lokasi Fitur
- **File**: `/admin-panel/src/pages/settings.tsx`
- **Tab**: "Mata Pelajaran" (📚) di halaman Pengaturan
- **URL**: `http://localhost:3000/settings` (untuk development)

## Fitur-fitur

### 1. Melihat Daftar Mata Pelajaran
- Menampilkan tabel lengkap semua mata pelajaran
- Kolom yang ditampilkan:
  - **Warna**: Indikator visual warna mata pelajaran
  - **Nama Mata Pelajaran**: Nama lengkap
  - **Kode**: Kode unik (maksimal 10 karakter)
  - **Deskripsi**: Penjelasan singkat
  - **Status**: Aktif/Nonaktif
  - **Aksi**: Tombol Edit dan Hapus

### 2. Menambah Mata Pelajaran
**Langkah:**
1. Klik tombol "Tambah Mata Pelajaran"
2. Isi form modal:
   - **Nama Mata Pelajaran** (wajib diisi)
   - **Kode Mata Pelajaran** (wajib diisi, max 10 karakter, otomatis huruf besar)
   - **Deskripsi** (opsional)
   - **Warna** (pilih dari color picker atau input hex)
   - **Status Aktif** (checkbox)
3. Klik "Tambah Mata Pelajaran"
4. Toast notification akan menampilkan status

**Contoh Data:**
```
Nama: Matematika
Kode: MTK
Deskripsi: Mata pelajaran matematika untuk semua tingkat
Warna: #FF5733
Status: Aktif
```

### 3. Mengedit Mata Pelajaran
**Langkah:**
1. Klik tombol "Edit" di baris mata pelajaran yang ingin diubah
2. Ubah informasi sesuai kebutuhan
3. Klik "Simpan Perubahan"
4. Notifikasi akan muncul setelah berhasil disimpan

### 4. Mengaktifkan/Menonaktifkan Mata Pelajaran
**Langkah:**
1. Klik tombol status (Aktif/Nonaktif) di tabel
2. Status akan berubah otomatis
3. Toast notification menampilkan konfirmasi
4. Mata pelajaran yang nonaktif tidak bisa dipilih saat membuat kelas atau ujian

### 5. Menghapus Mata Pelajaran
**Langkah:**
1. Klik tombol "Hapus" di baris mata pelajaran
2. Konfirmasi akan muncul
3. Klik "OK" untuk mengonfirmasi penghapusan
4. Mata pelajaran akan dihapus dari sistem

## State Management

### Component State
```typescript
// Mata pelajaran
const [subjects, setSubjects] = useState<Subject[]>([]);
const [loadingSubjects, setLoadingSubjects] = useState(false);

// Modal dan Form
const [showSubjectModal, setShowSubjectModal] = useState(false);
const [editingSubject, setEditingSubject] = useState<Subject | null>(null);
const [subjectFormData, setSubjectFormData] = useState({
  name: "",
  code: "",
  description: "",
  color: "#3B82F6",
  isActive: true,
});
const [savingSubject, setSavingSubject] = useState(false);
```

## API Endpoints yang Digunakan

### Get All Subjects
```
GET /api/subjects
```
Mendapatkan semua mata pelajaran

### Get Subject by ID
```
GET /api/subjects/:id
```
Mendapatkan detail mata pelajaran tertentu

### Create Subject
```
POST /api/subjects
Body: {
  name: string,
  code: string,
  description?: string,
  color?: string,
  isActive?: boolean
}
```
Membuat mata pelajaran baru

### Update Subject
```
PATCH /api/subjects/:id
Body: {
  name?: string,
  code?: string,
  description?: string,
  color?: string,
  isActive?: boolean
}
```
Memperbarui data mata pelajaran

### Delete Subject
```
DELETE /api/subjects/:id
```
Menghapus mata pelajaran

## Validasi

### Frontend Validasi
- ✅ Nama mata pelajaran harus diisi
- ✅ Kode mata pelajaran harus diisi
- ✅ Kode otomatis diubah ke huruf besar
- ✅ Kode maksimal 10 karakter
- ✅ Warna harus valid hex color
- ✅ Konfirmasi untuk penghapusan

### Backend Validasi
- Sesuai dengan aturan di `backend/src/subjects/dto/`
- Validasi uniqueness kode mata pelajaran
- Validasi format color hex

## Error Handling
- Semua request dilengkapi dengan try-catch
- Toast notifications untuk feedback:
  - Success: "Mata pelajaran berhasil [operasi]!"
  - Error: Menampilkan pesan dari server atau default message
- Loading states untuk mencegah double-click
- Disabled buttons saat proses berlangsung

## Styling
- Menggunakan Tailwind CSS dan class utility yang sudah ada
- Modal dialog dengan overlay
- Form inputs dengan focus states
- Buttons dengan state disabled
- Color preview box untuk visual feedback
- Status badge dengan warna berbeda (green untuk aktif, gray untuk nonaktif)

## Integrasi dengan Fitur Lain

### Halaman Kelas
- Ketika membuat kelas, guru dapat memilih mata pelajaran aktif
- Hanya mata pelajaran dengan `isActive: true` yang ditampilkan

### Halaman Ujian
- Saat membuat ujian, dapat memilih mata pelajaran
- Hanya mata pelajaran aktif yang tersedia

### Halaman Soal
- Soal dapat dikategorikan berdasarkan mata pelajaran
- Mata pelajaran aktif yang dipilih saat filtering soal

## Catatan Penting
1. **Kode Harus Unik**: Setiap mata pelajaran harus memiliki kode yang unik
2. **Status Aktif Penting**: Hanya mata pelajaran aktif yang bisa dipilih di fitur lain
3. **Warna Optional**: Jika tidak memilih warna, gunakan default #3B82F6
4. **Backups**: Pastikan tidak ada data soal yang tertaut sebelum menghapus mata pelajaran
5. **Case Insensitive Code**: Kode selalu disimpan dalam huruf besar

## Testing Checklist
- [ ] Menambah mata pelajaran baru
- [ ] Menampilkan daftar mata pelajaran
- [ ] Mengedit informasi mata pelajaran
- [ ] Mengubah status (aktif/nonaktif)
- [ ] Menghapus mata pelajaran
- [ ] Verifikasi kode mata pelajaran otomatis menjadi huruf besar
- [ ] Verifikasi warna preview muncul dengan benar
- [ ] Test error handling (network error, validation error)
- [ ] Test dengan mata pelajaran yang banyak (pagination jika diperlukan)
- [ ] Verifikasi integrasi dengan halaman kelas dan ujian
