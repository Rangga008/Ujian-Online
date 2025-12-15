# Refactoring Exam Management - Migration Guide

## 📋 Overview

Refactoring ini memperbaiki masalah data persistence dan memperpendek file create/edit exam dengan memecah ke components & hooks yang reusable.

## 🐛 Masalah yang Diperbaiki

### 1. **Data Tidak Tersimpan/Muncul dari Database**

**Root Cause:**

- Backend `create()` method tidak menggunakan transaction
- ID exam tidak reliable setelah save: `(savedExam as any).id || savedExam[0]?.id`
- Questions bisa gagal tersimpan jika exam save berhasil tapi questions gagal

**Solusi:**

- Wrap semua operasi dalam transaction di `exams.service.ts`
- Gunakan `transactionalEntityManager` untuk semua operasi
- Rollback otomatis jika ada error

### 2. **File Terlalu Panjang**

- `create.tsx`: **1430 baris** → **200 baris** (85% reduction)
- `edit.tsx`: **969 baris** → **280 baris** (71% reduction)

## 📁 Struktur Baru

```
admin-panel/src/
├── components/
│   └── exam/
│       ├── ExamForm.tsx          # Form info ujian (250 lines)
│       ├── QuestionList.tsx      # List soal (95 lines)
│       └── QuestionSummary.tsx   # Summary & actions (95 lines)
├── hooks/
│   └── useExamSubmit.ts          # Submit logic reusable (250 lines)
├── types/
│   └── exam.ts                   # Type definitions
└── pages/exams/
    ├── create-new.tsx            # New create page (200 lines)
    └── [id]/
        └── edit-new.tsx          # New edit page (280 lines)
```

## 🔄 Migration Steps

### Step 1: Test New Files

```bash
# Navigate to admin panel
cd /var/www/Ujian-Online/admin-panel

# Test create page
# Open: http://localhost:3000/exams/create-new

# Test edit page
# Open: http://localhost:3000/exams/[id]/edit-new
```

### Step 2: Verify Backend Changes

```bash
cd /var/www/Ujian-Online/backend

# Rebuild
npm run build

# Restart
pm2 restart ujian-online-backend
```

### Step 3: Backup & Replace

```bash
# Backup old files
cd /var/www/Ujian-Online/admin-panel/src/pages/exams
cp create.tsx create.tsx.backup
cp [id]/edit.tsx [id]/edit.tsx.backup

# Replace with new files
mv create-new.tsx create.tsx
mv [id]/edit-new.tsx [id]/edit.tsx
```

## ✅ Testing Checklist

### Create Exam

- [ ] Form loads with active semester pre-selected
- [ ] Can select class or grade
- [ ] Can add multiple questions
- [ ] Can upload exam image
- [ ] Questions image compression works
- [ ] Validation shows proper errors
- [ ] Submit creates exam with all questions
- [ ] Data appears in database correctly
- [ ] Redirects to exam list after success

### Edit Exam

- [ ] Loads existing exam data correctly
- [ ] Questions load from database
- [ ] Can edit exam information
- [ ] Can add new questions
- [ ] Can edit existing questions
- [ ] Can delete questions
- [ ] Submit updates exam + questions atomically
- [ ] Changes reflect in database
- [ ] Redirects to detail page after success

### Database Verification

```sql
-- Check exam saved
SELECT * FROM exams WHERE id = [NEW_EXAM_ID];

-- Check questions saved
SELECT * FROM questions WHERE examId = [NEW_EXAM_ID];

-- Check total score matches
SELECT SUM(points) as total FROM questions WHERE examId = [NEW_EXAM_ID];
-- Should equal exam.totalScore (100)
```

## 🎯 Benefits

### 1. **Better Data Integrity**

- ✅ Transaction ensures atomic operations
- ✅ All-or-nothing: exam + questions saved together
- ✅ No orphaned exams without questions

### 2. **Code Maintainability**

- ✅ Components reusable across create/edit
- ✅ Logic separated in custom hooks
- ✅ Types centralized
- ✅ Easier to debug and test

### 3. **Performance**

- ✅ Image compression before upload
- ✅ Proper validation prevents unnecessary API calls
- ✅ Clean error handling

### 4. **Developer Experience**

- ✅ Shorter files, easier to navigate
- ✅ Clear separation of concerns
- ✅ TypeScript types for better autocomplete
- ✅ Reusable hooks reduce duplication

## 🚨 Breaking Changes

**None!** The new implementation is backward compatible:

- Same API endpoints
- Same data structure
- Same user experience
- Only internal refactoring

## 📝 Notes

### Component Props

All components use TypeScript interfaces for type safety:

```typescript
interface ExamFormProps {
	formData: ExamFormData;
	setFormData: (data: any) => void;
	semesters: Semester[];
	classes: Class[];
	subjects: Subject[];
	grades: Grade[];
	// ... more props
}
```

### Custom Hook

`useExamSubmit()` handles:

- Form validation
- Image upload & compression
- Questions processing (normalize points to 100)
- API submission
- Error handling
- Loading states

### Backend Transaction

```typescript
return await this.examsRepository.manager.transaction(
	async (transactionalEntityManager) => {
		// 1. Create exam
		// 2. Create questions
		// 3. Auto rollback if error
		return exam;
	}
);
```

## 🔍 Troubleshooting

### Issue: Questions not saving

**Check:**

1. Backend logs: `pm2 logs ujian-online-backend`
2. Network tab: verify payload includes `questions` array
3. Database: check if transaction rolled back

### Issue: Images not uploading

**Check:**

1. File size < 5MB
2. Compression working (check toast messages)
3. `/settings/upload` endpoint working
4. `public/uploads` folder writable

### Issue: Validation errors

**Check:**

1. All required fields filled
2. startTime < endTime
3. At least 1 question added
4. Questions have valid answers

## 📞 Support

If issues persist:

1. Check browser console for errors
2. Check backend logs: `pm2 logs ujian-online-backend`
3. Verify database connections
4. Check file permissions for uploads folder
