# API Documentation

Base URL: `http://localhost:3001/api`

## Authentication

All protected endpoints require a Bearer token in the Authorization header:

```
Authorization: Bearer <token>
```

---

## Auth Endpoints

### Login Admin

```http
POST /auth/login/admin
Content-Type: application/json

{
  "email": "admin@ujian.com",
  "password": "admin123"
}

Response:
{
  "access_token": "jwt-token",
  "user": {
    "id": 1,
    "email": "admin@ujian.com",
    "name": "Administrator",
    "role": "admin"
  }
}
```

### Login Student

```http
POST /auth/login/student
Content-Type: application/json

{
  "nis": "12345",
  "password": "siswa123"
}

Response:
{
  "access_token": "jwt-token",
  "user": {
    "id": 2,
    "name": "Budi Santoso",
    "nis": "12345",
    "kelas": "12 IPA 1",
    "jurusan": "IPA",
    "role": "student"
  }
}
```

---

## Users Endpoints

### Get All Users

```http
GET /users
Authorization: Bearer <admin-token>

Query Parameters:
- role: 'admin' | 'student' (optional)

Response:
[
  {
    "id": 1,
    "email": "user@example.com",
    "name": "User Name",
    "role": "student",
    "nis": "12345",
    "kelas": "12 IPA 1",
    "jurusan": "IPA",
    "isActive": true
  }
]
```

### Create User

```http
POST /users
Authorization: Bearer <admin-token>
Content-Type: application/json

{
  "email": "student@example.com",
  "password": "password123",
  "name": "Student Name",
  "role": "student",
  "nis": "12346",
  "kelas": "12 IPA 1",
  "jurusan": "IPA"
}
```

### Get User by ID

```http
GET /users/:id
Authorization: Bearer <token>
```

### Update User

```http
PUT /users/:id
Authorization: Bearer <admin-token>
Content-Type: application/json

{
  "name": "Updated Name",
  "kelas": "12 IPA 2",
  "isActive": true
}
```

### Delete User

```http
DELETE /users/:id
Authorization: Bearer <admin-token>
```

---

## Exams Endpoints

### Get All Exams

```http
GET /exams
Authorization: Bearer <token>

Query Parameters:
- status: 'draft' | 'published' | 'ongoing' | 'closed' (optional)
```

### Get Active Exams (Student)

```http
GET /exams/active
Authorization: Bearer <student-token>

Response: List of published exams within start/end time
```

### Get Exam by ID

```http
GET /exams/:id
Authorization: Bearer <token>

Response:
{
  "id": 1,
  "title": "Ujian Matematika",
  "description": "Ujian tengah semester",
  "duration": 90,
  "startTime": "2025-01-01T08:00:00Z",
  "endTime": "2025-01-07T17:00:00Z",
  "status": "published",
  "totalQuestions": 10,
  "totalScore": 100,
  "randomizeQuestions": true,
  "showResultImmediately": false,
  "questions": [...]
}
```

### Create Exam

```http
POST /exams
Authorization: Bearer <admin-token>
Content-Type: application/json

{
  "title": "Ujian Matematika",
  "description": "Ujian tengah semester",
  "duration": 90,
  "startTime": "2025-01-01T08:00:00Z",
  "endTime": "2025-01-07T17:00:00Z",
  "status": "draft",
  "totalScore": 100,
  "randomizeQuestions": true,
  "showResultImmediately": false
}
```

### Update Exam

```http
PUT /exams/:id
Authorization: Bearer <admin-token>
Content-Type: application/json

{
  "title": "Updated Title",
  "status": "published"
}
```

### Update Exam Status

```http
PATCH /exams/:id/status
Authorization: Bearer <admin-token>
Content-Type: application/json

{
  "status": "published"
}
```

### Delete Exam

```http
DELETE /exams/:id
Authorization: Bearer <admin-token>
```

---

## Questions Endpoints

### Get Questions by Exam

```http
GET /questions/exam/:examId
Authorization: Bearer <token>

Response:
[
  {
    "id": 1,
    "examId": 1,
    "questionText": "Berapakah 2 + 2?",
    "type": "multiple_choice",
    "options": ["2", "3", "4", "5"],
    "correctAnswer": "4",
    "points": 10,
    "orderIndex": 0
  }
]
```

### Create Question

```http
POST /questions
Authorization: Bearer <admin-token>
Content-Type: application/json

{
  "examId": 1,
  "questionText": "Berapakah 2 + 2?",
  "type": "multiple_choice",
  "options": ["2", "3", "4", "5"],
  "correctAnswer": "4",
  "points": 10
}
```

### Bulk Create Questions

```http
POST /questions/bulk/:examId
Authorization: Bearer <admin-token>
Content-Type: application/json

[
  {
    "questionText": "Question 1",
    "type": "multiple_choice",
    "options": ["A", "B", "C", "D"],
    "correctAnswer": "A",
    "points": 10
  },
  {
    "questionText": "Question 2",
    "type": "true_false",
    "options": ["Benar", "Salah"],
    "correctAnswer": "Benar",
    "points": 10
  }
]
```

### Update Question

```http
PUT /questions/:id
Authorization: Bearer <admin-token>
Content-Type: application/json

{
  "questionText": "Updated question",
  "correctAnswer": "B"
}
```

### Delete Question

```http
DELETE /questions/:id
Authorization: Bearer <admin-token>
```

---

## Submissions Endpoints

### Start Exam

```http
POST /submissions/start/:examId
Authorization: Bearer <student-token>

Response:
{
  "id": 1,
  "userId": 2,
  "examId": 1,
  "status": "in_progress",
  "startedAt": "2025-01-01T08:00:00Z",
  "score": null,
  "totalAnswered": 0
}
```

### Submit Answer

```http
POST /submissions/:id/answer
Authorization: Bearer <student-token>
Content-Type: application/json

{
  "questionId": 1,
  "answer": "4"
}

Response:
{
  "id": 1,
  "submissionId": 1,
  "questionId": 1,
  "answer": "4",
  "isCorrect": true,
  "points": 10
}
```

### Submit Exam

```http
POST /submissions/:id/submit
Authorization: Bearer <student-token>

Response:
{
  "id": 1,
  "userId": 2,
  "examId": 1,
  "status": "submitted",
  "startedAt": "2025-01-01T08:00:00Z",
  "submittedAt": "2025-01-01T09:30:00Z",
  "score": 80,
  "totalAnswered": 10
}
```

### Get My Submissions

```http
GET /submissions/my-submissions
Authorization: Bearer <student-token>

Response: List of user's submissions with exam info
```

### Get Exam Submissions (Admin)

```http
GET /submissions/exam/:examId
Authorization: Bearer <admin-token>

Response: List of all submissions for an exam with user info
```

### Get Submission Detail

```http
GET /submissions/:id
Authorization: Bearer <token>

Response:
{
  "id": 1,
  "user": { ... },
  "exam": { ... },
  "status": "submitted",
  "score": 80,
  "totalAnswered": 10,
  "answers": [
    {
      "id": 1,
      "question": { ... },
      "answer": "4",
      "isCorrect": true,
      "points": 10
    }
  ]
}
```

---

## Question Types

### Multiple Choice

```json
{
	"type": "multiple_choice",
	"options": ["Option A", "Option B", "Option C", "Option D"],
	"correctAnswer": "Option A"
}
```

### True/False

```json
{
	"type": "true_false",
	"options": ["Benar", "Salah"],
	"correctAnswer": "Benar"
}
```

### Essay

```json
{
	"type": "essay",
	"correctAnswer": null
}
```

---

## Exam Status

- `draft`: Ujian masih dalam draft, belum bisa diakses siswa
- `published`: Ujian sudah dipublish dan bisa diakses siswa
- `ongoing`: Ujian sedang berlangsung
- `closed`: Ujian sudah ditutup

---

## Submission Status

- `in_progress`: Siswa sedang mengerjakan
- `submitted`: Siswa sudah submit
- `graded`: Ujian sudah dinilai (untuk essay)

---

## Error Responses

### 400 Bad Request

```json
{
	"statusCode": 400,
	"message": "Validation failed",
	"error": "Bad Request"
}
```

### 401 Unauthorized

```json
{
	"statusCode": 401,
	"message": "Unauthorized"
}
```

### 403 Forbidden

```json
{
	"statusCode": 403,
	"message": "Forbidden resource"
}
```

### 404 Not Found

```json
{
	"statusCode": 404,
	"message": "Resource not found"
}
```

### 500 Internal Server Error

```json
{
	"statusCode": 500,
	"message": "Internal server error"
}
```
