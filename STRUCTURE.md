# 📁 Struktur Folder Project

```
Ujian-Online/
│
├── backend/                          # Backend API (NestJS) - Port 3001
│   ├── src/
│   │   ├── auth/                     # Authentication & Authorization
│   │   │   ├── decorators/           # Custom decorators (Roles)
│   │   │   ├── guards/               # Auth guards (JWT, Local, Roles)
│   │   │   ├── strategies/           # Passport strategies
│   │   │   ├── auth.controller.ts    # Auth endpoints
│   │   │   ├── auth.service.ts       # Auth logic
│   │   │   └── auth.module.ts
│   │   │
│   │   ├── users/                    # User management
│   │   │   ├── dto/                  # Data Transfer Objects
│   │   │   ├── user.entity.ts        # User database model
│   │   │   ├── users.controller.ts   # User CRUD endpoints
│   │   │   ├── users.service.ts      # User business logic
│   │   │   └── users.module.ts
│   │   │
│   │   ├── exams/                    # Exam management
│   │   │   ├── dto/
│   │   │   ├── exam.entity.ts
│   │   │   ├── exams.controller.ts
│   │   │   ├── exams.service.ts
│   │   │   └── exams.module.ts
│   │   │
│   │   ├── questions/                # Question management
│   │   │   ├── dto/
│   │   │   ├── question.entity.ts
│   │   │   ├── questions.controller.ts
│   │   │   ├── questions.service.ts
│   │   │   └── questions.module.ts
│   │   │
│   │   ├── submissions/              # Exam submissions & answers
│   │   │   ├── dto/
│   │   │   ├── submission.entity.ts
│   │   │   ├── answer.entity.ts
│   │   │   ├── submissions.controller.ts
│   │   │   ├── submissions.service.ts
│   │   │   └── submissions.module.ts
│   │   │
│   │   ├── database/
│   │   │   └── seeds/
│   │   │       └── seed.ts           # Database seeder
│   │   │
│   │   ├── app.module.ts             # Main app module
│   │   └── main.ts                   # Bootstrap file
│   │
│   ├── .env                          # Environment variables
│   ├── package.json
│   ├── tsconfig.json
│   └── nest-cli.json
│
├── admin-panel/                      # Admin Panel (Next.js) - Port 3000
│   ├── src/
│   │   ├── components/
│   │   │   └── Layout.tsx            # Admin layout dengan sidebar
│   │   │
│   │   ├── lib/
│   │   │   └── api.ts                # Axios instance dengan interceptors
│   │   │
│   │   ├── store/
│   │   │   └── authStore.ts          # Zustand store untuk auth
│   │   │
│   │   ├── styles/
│   │   │   └── globals.css           # Global styles + Tailwind
│   │   │
│   │   └── pages/
│   │       ├── _app.tsx              # App wrapper
│   │       ├── _document.tsx         # HTML document
│   │       ├── index.tsx             # Redirect to login
│   │       ├── login.tsx             # Admin login page
│   │       ├── dashboard.tsx         # Dashboard statistik
│   │       ├── students.tsx          # Kelola siswa
│   │       ├── results.tsx           # Lihat hasil ujian
│   │       └── exams/
│   │           └── index.tsx         # Kelola ujian
│   │
│   ├── .env.local                    # Environment variables
│   ├── package.json
│   ├── tsconfig.json
│   ├── next.config.js
│   ├── tailwind.config.js
│   └── postcss.config.js
│
├── student-portal/                   # Student Portal (Next.js) - Port 3002
│   ├── src/
│   │   ├── components/
│   │   │   └── Layout.tsx            # Student layout dengan header
│   │   │
│   │   ├── lib/
│   │   │   └── api.ts                # Axios instance
│   │   │
│   │   ├── store/
│   │   │   └── authStore.ts          # Auth store
│   │   │
│   │   ├── styles/
│   │   │   └── globals.css
│   │   │
│   │   └── pages/
│   │       ├── _app.tsx
│   │       ├── _document.tsx
│   │       ├── index.tsx             # Redirect to login
│   │       ├── login.tsx             # Student login (NIS)
│   │       ├── dashboard.tsx         # Dashboard siswa
│   │       └── exam/
│   │           └── [id].tsx          # Halaman mengerjakan ujian
│   │
│   ├── .env.local
│   ├── package.json
│   ├── tsconfig.json
│   ├── next.config.js
│   ├── tailwind.config.js
│   └── postcss.config.js
│
├── .env.example                      # Template environment variables
├── .gitignore                        # Git ignore file
├── package.json                      # Root package.json
├── README.md                         # Dokumentasi utama
├── SETUP-GUIDE.md                    # Panduan setup lengkap
├── QUICK-START.md                    # Quick start guide
├── API-DOCUMENTATION.md              # API reference
├── STRUCTURE.md                      # File ini
│
└── Scripts (PowerShell)
    ├── install-all.ps1               # Install semua dependencies
    ├── start-backend.ps1             # Start backend
    ├── start-admin.ps1               # Start admin panel
    └── start-student.ps1             # Start student portal
```

---

## 🗄️ Database Schema

### Tables

#### **users**

- id (PK)
- email (unique)
- nis (Nomor Induk Siswa)
- password (hashed)
- name
- role (admin | student)
- kelas
- jurusan
- isActive
- createdAt
- updatedAt

#### **exams**

- id (PK)
- title
- description
- duration (minutes)
- startTime
- endTime
- status (draft | published | ongoing | closed)
- totalQuestions
- totalScore
- randomizeQuestions
- showResultImmediately
- createdAt
- updatedAt

#### **questions**

- id (PK)
- examId (FK → exams)
- questionText
- type (multiple_choice | true_false | essay)
- options (JSON array)
- correctAnswer
- points
- imageUrl
- orderIndex

#### **submissions**

- id (PK)
- userId (FK → users)
- examId (FK → exams)
- status (in_progress | submitted | graded)
- startedAt
- submittedAt
- score
- totalAnswered
- createdAt
- updatedAt

#### **answers**

- id (PK)
- submissionId (FK → submissions)
- questionId (FK → questions)
- answer
- isCorrect
- points

---

## 🔄 Data Flow

### Student mengerjakan ujian:

```
1. Student login → JWT token
2. GET /exams/active → List ujian tersedia
3. POST /submissions/start/:examId → Buat submission baru
4. GET /questions/exam/:examId → Ambil soal-soal
5. POST /submissions/:id/answer → Save jawaban (auto-graded)
6. POST /submissions/:id/submit → Submit ujian (calculate score)
7. GET /submissions/my-submissions → Lihat hasil
```

### Admin membuat ujian:

```
1. Admin login → JWT token
2. POST /exams → Buat ujian baru
3. POST /questions/bulk/:examId → Tambah soal sekaligus
4. PATCH /exams/:id/status → Publish ujian
5. GET /submissions/exam/:examId → Lihat hasil siswa
```

---

## 🎨 Tech Stack Detail

### Backend

- **Framework**: NestJS 10
- **Database**: MySQL (via TypeORM)
- **Authentication**: JWT + Passport
- **Validation**: class-validator, class-transformer
- **ORM**: TypeORM

### Frontend

- **Framework**: Next.js 14 (Pages Router)
- **UI**: TailwindCSS 3
- **State**: Zustand (persist auth)
- **HTTP**: Axios (dengan interceptors)
- **Forms**: React Hook Form
- **Notifications**: React Hot Toast
- **Date**: date-fns

---

## 🔐 Security Features

1. **JWT Authentication**

   - Token expires: 7 days (configurable)
   - Auto refresh on API calls
   - Stored in localStorage

2. **Role-Based Access Control (RBAC)**

   - Admin: Full access
   - Student: Limited to own data

3. **Password Hashing**

   - bcrypt with salt rounds 10

4. **API Interceptors**

   - Auto add token to requests
   - Auto logout on 401
   - Error handling

5. **Input Validation**
   - DTO validation on backend
   - Frontend form validation

---

## 📊 API Endpoints Summary

### Auth (Public)

- POST /auth/login/admin
- POST /auth/login/student

### Users (Admin only create/update/delete)

- GET /users
- POST /users
- GET /users/:id
- PUT /users/:id
- DELETE /users/:id

### Exams

- GET /exams (all users)
- GET /exams/active (students)
- POST /exams (admin)
- GET /exams/:id
- PUT /exams/:id (admin)
- PATCH /exams/:id/status (admin)
- DELETE /exams/:id (admin)

### Questions (Admin manage, all can view)

- GET /questions/exam/:examId
- POST /questions (admin)
- POST /questions/bulk/:examId (admin)
- PUT /questions/:id (admin)
- DELETE /questions/:id (admin)

### Submissions (Student own, Admin all)

- POST /submissions/start/:examId
- POST /submissions/:id/answer
- POST /submissions/:id/submit
- GET /submissions/my-submissions (student)
- GET /submissions/exam/:examId (admin)
- GET /submissions/:id

---

## 🎯 Key Features

### ✅ Implemented

- Multi-port architecture dengan routing dinamis
- JWT authentication terpisah (admin & student)
- Role-based access control
- Auto-grading untuk multiple choice
- Real-time timer dengan auto-submit
- Auto-save jawaban siswa
- Dashboard statistik
- CRUD lengkap (users, exams, questions)
- Responsive design
- Environment-based configuration

### 🚧 Bisa Dikembangkan

- Upload gambar untuk soal
- Export hasil ke Excel/PDF
- Email notification
- Real-time monitoring (WebSocket)
- Grading manual untuk essay
- Import soal dari Excel
- Multi-language support
- Dark mode
- Mobile app (React Native)

---

## 📦 Dependencies Summary

### Backend (NestJS)

```json
{
	"core": "@nestjs/core, @nestjs/common, @nestjs/platform-express",
	"database": "@nestjs/typeorm, typeorm, mysql2",
	"auth": "@nestjs/jwt, @nestjs/passport, passport, passport-jwt, passport-local, bcrypt",
	"validation": "class-validator, class-transformer",
	"config": "@nestjs/config"
}
```

### Frontend (Next.js)

```json
{
	"core": "react, react-dom, next",
	"http": "axios",
	"state": "zustand",
	"ui": "tailwindcss, autoprefixer, postcss",
	"forms": "react-hook-form",
	"utils": "date-fns, react-hot-toast"
}
```

---

## 🌐 Ports Configuration

| Service        | Default Port | Environment Variable     | Purpose           |
| -------------- | ------------ | ------------------------ | ----------------- |
| Backend API    | 3001         | API_PORT                 | REST API Server   |
| Admin Panel    | 3000         | NEXT_PUBLIC_ADMIN_PORT   | Admin Dashboard   |
| Student Portal | 3002         | NEXT_PUBLIC_STUDENT_PORT | Student Interface |
| MySQL          | 3306         | DB_PORT                  | Database          |

**Keuntungan Multi-Port:**

- Separation of concerns
- Independent deployment
- Different security rules per port
- Easy to scale horizontally
- Port forwarding untuk akses remote

---

Semua port bisa diubah melalui file `.env` tanpa perlu ubah kode! 🎉
