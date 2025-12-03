# Admin Panel - New Features Documentation

## 🎯 Overview

Sistem ujian online telah diperluas dengan fitur manajemen sekolah yang komprehensif untuk admin panel.

## 📚 New Entities & Features

### 1. Semester Management (Sistem Semester)

**Endpoint:** `/semesters`

**Features:**

- Manajemen semester akademik (Ganjil/Genap)
- Satu semester aktif pada satu waktu
- Tracking tahun akademik

**Fields:**

- `name`: Nama semester (contoh: "Semester Genap 2023/2024")
- `year`: Tahun (contoh: 2024)
- `type`: Tipe semester (`ganjil` atau `genap`)
- `startDate`: Tanggal mulai
- `endDate`: Tanggal selesai
- `isActive`: Status aktif (hanya 1 semester yang bisa aktif)

**API Endpoints:**

```
POST   /semesters              - Create semester (Admin only)
GET    /semesters              - Get all semesters (Admin, Teacher)
GET    /semesters/active       - Get active semester (All)
GET    /semesters/:id          - Get one semester (Admin, Teacher)
PATCH  /semesters/:id          - Update semester (Admin only)
PATCH  /semesters/:id/activate - Set semester as active (Admin only)
DELETE /semesters/:id          - Delete semester (Admin only)
```

---

### 2. Subject Management (Mata Pelajaran)

**Endpoint:** `/subjects`

**Features:**

- Manajemen mata pelajaran
- Assignment guru ke mata pelajaran (ManyToMany)
- Color coding untuk identifikasi visual
- Tag untuk kategorisasi

**Fields:**

- `name`: Nama mata pelajaran (contoh: "Matematika")
- `code`: Kode mata pelajaran (contoh: "MTK")
- `description`: Deskripsi
- `color`: Hex color untuk UI (contoh: "#3B82F6")
- `isActive`: Status aktif
- `teachers`: Relasi ManyToMany dengan User (role: TEACHER)

**API Endpoints:**

```
POST   /subjects                    - Create subject (Admin only)
GET    /subjects                    - Get all subjects (Admin, Teacher)
GET    /subjects/teacher/:teacherId - Get subjects by teacher (Admin, Teacher)
GET    /subjects/:id                - Get one subject (Admin, Teacher)
PATCH  /subjects/:id                - Update subject (Admin only)
PATCH  /subjects/:id/teachers       - Assign teachers (Admin only)
DELETE /subjects/:id                - Delete subject (Admin only)
```

---

### 3. Class Management (Manajemen Kelas)

**Endpoint:** `/classes`

**Features:**

- Manajemen kelas sekolah
- Assignment guru ke kelas (ManyToMany)
- Tracking kapasitas siswa
- Organisasi berdasarkan grade dan jurusan

**Fields:**

- `name`: Nama kelas (contoh: "12 IPA 1")
- `grade`: Tingkat kelas (10, 11, 12)
- `major`: Jurusan (IPA, IPS, Bahasa)
- `academicYear`: Tahun akademik (contoh: 2024)
- `capacity`: Kapasitas maksimal siswa
- `isActive`: Status aktif
- `students`: Relasi OneToMany dengan User (role: STUDENT)
- `teachers`: Relasi ManyToMany dengan User (role: TEACHER)

**API Endpoints:**

```
POST   /classes                    - Create class (Admin only)
GET    /classes                    - Get all classes (Admin, Teacher)
GET    /classes/grade/:grade       - Get classes by grade (Admin, Teacher)
GET    /classes/teacher/:teacherId - Get classes by teacher (Admin, Teacher)
GET    /classes/:id                - Get one class (Admin, Teacher)
GET    /classes/:id/student-count  - Get student count (Admin, Teacher)
PATCH  /classes/:id                - Update class (Admin only)
PATCH  /classes/:id/teachers       - Assign teachers (Admin only)
DELETE /classes/:id                - Delete class (Admin only)
```

---

### 4. Question Bank (Bank Soal)

**Endpoint:** `/question-bank`

**Features:**

- Library soal yang dapat digunakan ulang
- Filter berdasarkan subject, difficulty, type, tags
- Tracking usage count
- Support multiple question types
- Pembahasan soal

**Fields:**

- `subjectId`: ID mata pelajaran
- `questionText`: Teks soal
- `type`: Tipe soal (multiple_choice, true_false, essay, multiple_response)
- `options`: Array pilihan jawaban
- `correctAnswers`: Array jawaban benar
- `explanation`: Pembahasan soal
- `difficulty`: Tingkat kesulitan (easy, medium, hard)
- `tags`: Array tag untuk kategorisasi
- `points`: Nilai poin
- `imageUrl`: URL gambar (optional)
- `createdById`: ID pembuat soal
- `usageCount`: Jumlah penggunaan
- `isActive`: Status aktif

**API Endpoints:**

```
POST   /question-bank                   - Create question (Admin, Teacher)
GET    /question-bank                   - Get all questions with filters (Admin, Teacher)
GET    /question-bank/subject/:subjectId - Get questions by subject (Admin, Teacher)
GET    /question-bank/subject/:subjectId/stats - Get statistics (Admin, Teacher)
GET    /question-bank/:id               - Get one question (Admin, Teacher)
PATCH  /question-bank/:id               - Update question (Admin, Teacher)
DELETE /question-bank/:id               - Delete question (Admin, Teacher)
```

**Query Filters:**

```
?subjectId=1
?difficulty=easy|medium|hard
?type=multiple_choice|true_false|essay|multiple_response
?tags=algebra,geometry
?isActive=true|false
```

---

### 5. Enhanced User Entity

**New Features:**

- Added `TEACHER` role
- Class assignment for students (`classId`)
- NIP field for teachers
- ManyToMany relationship with subjects (for teachers)
- ManyToMany relationship with classes (for teachers)
- Enhanced profile fields (gender, dateOfBirth, phone, address, parent info)

**User Roles:**

- `ADMIN`: Full access to all features
- `TEACHER`: Access to teaching-related features (subjects, classes, question bank)
- `STUDENT`: Access to taking exams

---

### 6. Enhanced Exam Entity

**New Features:**

- `semesterId`: Link to semester
- `subjectId`: Link to subject

---

## 🔐 Authentication & Authorization

### Role-Based Access Control (RBAC)

**Admin Role:**

- Full CRUD access to all entities
- Can manage semesters, subjects, classes, users
- Can create and manage question bank
- Can create and manage exams

**Teacher Role:**

- Can view semesters and subjects
- Can create and manage question bank
- Can view assigned classes
- Can view assigned subjects
- Limited exam management

**Student Role:**

- Can view active semester
- Can take exams
- Can view own results

---

## 📊 Database Seed Data

After running `npm run seed`, the following data will be created:

### Semester

- Semester Genap 2023/2024 (Active)

### Subjects

1. Matematika (MTK) - Blue
2. Bahasa Indonesia (BIND) - Green
3. Bahasa Inggris (BING) - Purple

### Classes

1. 12 IPA 1 (Capacity: 36)
2. 12 IPA 2 (Capacity: 36)
3. 12 IPS 1 (Capacity: 36)

### Users

**Admin:**

- Email: admin@ujian.com
- Password: admin123

**Teachers (2):**

1. Dr. Siti Rahmawati (guru.matematika@sekolah.com)

   - NIP: 198501012010011001
   - Teaches: Matematika
   - Classes: 12 IPA 1, 12 IPA 2
   - Password: guru123

2. Ahmad Subarjo, S.Pd (guru.bindonesia@sekolah.com)
   - NIP: 198701012012011002
   - Teaches: Bahasa Indonesia
   - Classes: 12 IPS 1
   - Password: guru123

**Students (3):**

1. Budi Santoso

   - NIS: 12345
   - Class: 12 IPA 1
   - Password: siswa123

2. Siti Nurhaliza

   - NIS: 12346
   - Class: 12 IPA 1
   - Password: siswa123

3. Ahmad Fauzi
   - NIS: 12347
   - Class: 12 IPS 1
   - Password: siswa123

### Question Bank

- 2 sample questions (Mathematics, varying difficulty)

### Exam

- 1 active exam: "Ujian Matematika - Semester Genap" with 5 questions

---

## 🚀 Next Steps for Admin Panel UI

### Priority 1: Semester Management Page

Create pages in `admin-panel/src/pages/`:

```
/semesters/
  index.tsx      - List all semesters
  create.tsx     - Create new semester
  [id]/edit.tsx  - Edit semester
```

### Priority 2: Subject Management Page

```
/subjects/
  index.tsx      - List all subjects
  create.tsx     - Create new subject
  [id]/edit.tsx  - Edit subject & assign teachers
```

### Priority 3: Class Management Page

```
/classes/
  index.tsx      - List all classes
  create.tsx     - Create new class
  [id]/edit.tsx  - Edit class & assign teachers
  [id]/students.tsx - View/manage class students
```

### Priority 4: Question Bank Page

```
/question-bank/
  index.tsx      - List questions with filters
  create.tsx     - Create new question
  [id]/edit.tsx  - Edit question
  [id]/preview.tsx - Preview question
```

### Priority 5: Enhanced User Management

```
/users/
  teachers/
    index.tsx    - List teachers
    create.tsx   - Create teacher
    [id]/edit.tsx - Edit teacher & assignments
  students/
    index.tsx    - List students (existing)
    import.tsx   - Bulk import students (CSV/Excel)
    export.tsx   - Export students
```

### Priority 6: Enhanced Exam Management

Update existing exam pages to support:

- Semester selection
- Subject selection
- Import questions from Question Bank
- Assign to specific classes

---

## 📦 Import/Export Features (Future)

### Student Import

- CSV format support
- Excel format support
- Bulk assignment to classes
- Validation and error reporting

### Student Export

- Export by class
- Export by grade
- Export all students
- Include parent information

### Question Bank Import/Export

- Share question banks between teachers
- Import from standardized formats
- Export for backup/sharing

---

## 🧪 Testing API with Credentials

### Admin Login

```bash
POST http://localhost:3001/auth/admin/login
{
  "email": "admin@ujian.com",
  "password": "admin123"
}
```

### Teacher Login

```bash
POST http://localhost:3001/auth/admin/login
{
  "email": "guru.matematika@sekolah.com",
  "password": "guru123"
}
```

### Student Login

```bash
POST http://localhost:3001/auth/student/login
{
  "nis": "12345",
  "password": "siswa123"
}
```

---

## 📝 Notes

1. **Database Migration**: TypeORM synchronize is enabled. In production, use migrations.
2. **Seed Data**: Run `npm run seed` to populate database with demo data.
3. **Foreign Keys**: User classId links to Class table.
4. **Many-to-Many**: Teachers can be assigned to multiple subjects and classes.
5. **Active Semester**: Only one semester can be active at a time.
6. **Question Bank**: Questions can be reused across multiple exams.
7. **Authentication**: All endpoints are protected with JWT auth + role guards.

---

## 🎨 UI Components Needed

### Common Components

- `<SemesterSelector />` - Dropdown for semester selection
- `<SubjectBadge />` - Colored badge for subjects
- `<ClassCard />` - Card display for class info
- `<TeacherAssignment />` - Component for assigning teachers
- `<QuestionBankFilter />` - Filter panel for question bank
- `<DifficultyBadge />` - Badge for difficulty levels
- `<StudentImporter />` - CSV/Excel import dialog

---

## 📖 API Response Examples

### Get All Classes

```json
[
  {
    "id": 1,
    "name": "12 IPA 1",
    "grade": 12,
    "major": "IPA",
    "academicYear": 2024,
    "capacity": 36,
    "isActive": true,
    "students": [...],
    "teachers": [...]
  }
]
```

### Get Question Bank with Filters

```json
[
	{
		"id": 1,
		"questionText": "Berapakah hasil dari 2 + 2?",
		"type": "multiple_choice",
		"difficulty": "easy",
		"points": 10,
		"tags": ["aritmatika", "dasar"],
		"usageCount": 5,
		"subject": {
			"id": 1,
			"name": "Matematika",
			"color": "#3B82F6"
		},
		"createdBy": {
			"id": 2,
			"name": "Dr. Siti Rahmawati"
		}
	}
]
```

---

## ✅ Completed Backend Features

- ✅ Semester entity, module, service, controller, DTOs
- ✅ Subject entity, module, service, controller, DTOs
- ✅ Class entity, module, service, controller, DTOs
- ✅ QuestionBank entity, module, service, controller, DTOs
- ✅ Enhanced User entity with TEACHER role
- ✅ Enhanced Exam entity with semester/subject relations
- ✅ Updated app.module.ts with new modules
- ✅ Comprehensive seed data with all new entities
- ✅ Role-based access control on all endpoints
- ✅ ManyToMany relationships (teachers-subjects, teachers-classes)

---

## 🚧 Pending Frontend Implementation

- ⏳ Admin panel pages for new features
- ⏳ UI components for management interfaces
- ⏳ Import/export functionality
- ⏳ Bulk operations UI
- ⏳ Enhanced exam creation with question bank
- ⏳ Teacher dashboard
- ⏳ Class roster management
- ⏳ Question bank browser/selector
