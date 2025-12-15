# Perbaikan Fitur Upload Logo dan Favicon

## Ringkasan Perbaikan

Telah dilakukan perbaikan dan peningkatan pada fitur upload logo dan favicon di halaman settings admin panel, serta implementasi dynamic meta tags untuk favicon, title, dan preview di seluruh aplikasi.

## Perubahan yang Dilakukan

### 1. **Admin Panel - Settings Page** (`admin-panel/src/pages/settings.tsx`)

#### Perbaikan Handler Upload Logo

- ✅ Menggunakan full URL path dari backend (bukan relative path)
- ✅ Memperbaiki konstruksi URL dengan menghapus `/api` dari `NEXT_PUBLIC_API_URL`
- ✅ Update database terlebih dahulu sebelum update UI
- ✅ Menampilkan toast notification yang sesuai
- ✅ Preview image berfungsi dengan benar

```typescript
const handleLogoUpload = async (file: File) => {
	// Upload file
	const result = await settingsApi.uploadLogo(file);

	// Construct full URL: https://api.cybersmkn2bandung.my.id/uploads/logo-xxx.png
	const backendUrl = process.env.NEXT_PUBLIC_API_URL?.replace("/api", "");
	const fullPath = `${backendUrl}${result.path}`;

	// Update database
	await settingsApi.updateByKey("app.logo", { value: fullPath });

	// Refresh settings
	await fetchSettings();
};
```

#### Perbaikan Handler Upload Favicon

- ✅ Sama seperti logo, menggunakan full URL path
- ✅ Force update favicon di browser secara real-time dengan cache busting
- ✅ Update link element di DOM untuk langsung menampilkan favicon baru

```typescript
const handleFaviconUpload = async (file: File) => {
	// Upload dan update database
	const fullPath = `${backendUrl}${result.path}`;
	await settingsApi.updateByKey("app.favicon", { value: fullPath });

	// Force update favicon in browser (cache busting)
	const link = document.querySelector("link[rel~='icon']");
	if (link) {
		link.href = fullPath + "?v=" + Date.now();
	}
};
```

### 2. **Admin Panel - App Component** (`admin-panel/src/pages/_app.tsx`)

#### Implementasi Dynamic Head

- ✅ Fetch settings dari API saat aplikasi load
- ✅ Update favicon, title, dan meta tags secara dinamis
- ✅ Support untuk Open Graph (OG) tags untuk preview di social media
- ✅ Apple touch icon untuk iOS devices

```typescript
// Fetch settings
const [appSettings, setAppSettings] = useState({
	name: "Admin Panel",
	favicon: "/favicon.ico",
	logo: "/images/logo.png",
	description: "Sistem Ujian Online - Admin Panel",
});

useEffect(() => {
	const fetchAppSettings = async () => {
		const settings = await settingsApi.getPublic();
		// Update appSettings state
	};
	fetchAppSettings();
}, []);

// Dynamic Head
<Head>
	<title>{appSettings.name} - Admin Panel</title>
	<link rel="icon" href={appSettings.favicon} />
	<meta property="og:image" content={appSettings.logo} />
</Head>;
```

### 3. **Student Portal - Settings API** (`student-portal/src/lib/settingsApi.ts`)

#### File Baru

- ✅ Buat API client untuk fetch public settings
- ✅ Support untuk mengambil settings by key
- ✅ Type-safe dengan TypeScript interfaces

### 4. **Student Portal - App Component** (`student-portal/src/pages/_app.tsx`)

#### Implementasi Dynamic Head

- ✅ Sama seperti admin panel
- ✅ Fetch public settings tanpa auth
- ✅ Update favicon dan title secara real-time
- ✅ Full support untuk meta tags dan OG tags

### 5. **Backend - Settings Controller** (`backend/src/settings/settings.controller.ts`)

#### Upload Endpoints (Sudah Ada, Verified)

- ✅ `/settings/upload/logo` - Upload logo dengan validasi file type
- ✅ `/settings/upload/favicon` - Upload favicon dengan validasi file type
- ✅ File disimpan di `public/uploads/` dengan unique filename
- ✅ Return path: `/uploads/filename.ext`

#### Static File Serving (Sudah Configured)

- ✅ ServeStaticModule sudah dikonfigurasi di AppModule
- ✅ Serve dari folder `public/` di root backend
- ✅ URL: `https://api.cybersmkn2bandung.my.id/uploads/file.png`

## Cara Kerja

### Flow Upload Logo/Favicon

1. **User memilih file** di halaman Settings → Appearance
2. **File diupload** ke backend endpoint `/settings/upload/logo` atau `/settings/upload/favicon`
3. **Backend menyimpan** file ke `backend/public/uploads/` dengan nama unik
4. **Backend return** path relatif: `/uploads/logo-1234567890.png`
5. **Frontend construct** full URL: `https://api.cybersmkn2bandung.my.id/uploads/logo-1234567890.png`
6. **Frontend update** setting di database dengan full URL
7. **Frontend refresh** settings dan update preview
8. **Untuk favicon**, force update link element di DOM dengan cache busting

### Flow Dynamic Meta Tags

1. **App load** di admin/student portal
2. **Fetch public settings** dari API `/settings/public`
3. **Parse settings** ke object key-value
4. **Update state** appSettings dengan nilai dari database
5. **Head component** re-render dengan nilai terbaru
6. **Browser update** favicon, title, dan meta tags secara otomatis

## Testing

### Test Upload Logo

1. Login ke admin panel
2. Buka Settings → Tampilan
3. Klik "Upload File" di bagian Logo
4. Pilih file gambar (PNG/JPG/SVG)
5. ✅ Verifikasi: Toast success muncul
6. ✅ Verifikasi: Preview gambar berubah
7. ✅ Verifikasi: Logo muncul di header/navigation
8. ✅ Verifikasi: Logo muncul di student portal juga

### Test Upload Favicon

1. Login ke admin panel
2. Buka Settings → Tampilan
3. Klik "Upload File" di bagian Favicon
4. Pilih file icon (ICO/PNG/SVG)
5. ✅ Verifikasi: Toast success muncul
6. ✅ Verifikasi: Preview icon berubah
7. ✅ Verifikasi: Browser tab icon berubah langsung
8. ✅ Verifikasi: Favicon muncul di student portal juga

### Test Dynamic Title

1. Update "Nama Aplikasi" di Settings → Umum
2. Simpan perubahan
3. ✅ Verifikasi: Browser tab title berubah (mungkin perlu refresh)
4. ✅ Verifikasi: Title muncul di search engine preview

## File yang Dimodifikasi

```
admin-panel/
  src/
    pages/
      _app.tsx              ✏️ Modified - Added dynamic Head
      settings.tsx          ✏️ Modified - Fixed upload handlers
    lib/
      settingsApi.ts        ✔️ Already exists

student-portal/
  src/
    pages/
      _app.tsx              ✏️ Modified - Added dynamic Head
    lib/
      settingsApi.ts        ➕ New - Created API client

backend/
  src/
    settings/
      settings.controller.ts ✔️ Already configured
      settings.service.ts    ✔️ Already configured
    app.module.ts           ✔️ ServeStaticModule configured
```

## Environment Variables

Pastikan environment variables sudah benar:

**Admin Panel** (`.env.local`)

```env
NEXT_PUBLIC_API_URL=https://api.cybersmkn2bandung.my.id/api
```

**Student Portal** (`.env.local`)

```env
NEXT_PUBLIC_API_URL=https://api.cybersmkn2bandung.my.id/api
```

**Backend** (`.env`)

```env
API_PORT=3001
```

## Troubleshooting

### Logo/Favicon tidak muncul

1. Cek network tab di browser DevTools
2. Pastikan URL gambar benar: `https://api.cybersmkn2bandung.my.id/uploads/...`
3. Cek CORS settings di backend
4. Pastikan file ada di `backend/public/uploads/`

### Preview tidak update

1. Hard refresh browser (Ctrl+Shift+R)
2. Clear browser cache
3. Cek console untuk error messages

### Favicon tidak berubah di tab

1. Favicon di-cache agresif oleh browser
2. Force update dengan cache busting (`?v=timestamp`)
3. Close dan open tab baru
4. Restart browser

## Fitur Tambahan

- ✅ **Cache Busting**: Favicon di-update dengan timestamp parameter
- ✅ **Error Handling**: Comprehensive error messages
- ✅ **Loading States**: Visual feedback saat upload
- ✅ **File Validation**: Backend validasi tipe file yang diperbolehkan
- ✅ **Unique Filenames**: Mencegah file overwrite
- ✅ **Type Safety**: Full TypeScript support
- ✅ **SEO Friendly**: Meta tags untuk search engines
- ✅ **Social Media Ready**: Open Graph tags untuk preview
- ✅ **Mobile Support**: Apple touch icon untuk iOS

## Next Steps (Optional)

Jika ingin enhancement lebih lanjut:

1. ⭐ Image compression sebelum upload
2. ⭐ Image cropping/resizing tool
3. ⭐ Multiple logo variants (light/dark mode)
4. ⭐ Logo preview di berbagai ukuran
5. ⭐ Bulk settings management
6. ⭐ Settings versioning/history
7. ⭐ Settings import/export

---

**Status**: ✅ **SELESAI - READY FOR TESTING**

Semua fitur upload logo dan favicon sudah diperbaiki dan siap untuk digunakan. Favicon, title, dan preview akan muncul dengan benar di browser tab dan social media share.
