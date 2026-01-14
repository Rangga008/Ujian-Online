# Quick Start - Test Photo Options Right Now

## 1️⃣ Start Backend

```bash
cd backend
npm run start:dev
```

Wait sampai melihat:

```
[Nest] ... - NestJS application successfully started
```

## 2️⃣ Start Admin Panel

Di terminal baru:

```bash
cd admin-panel
npm run dev
```

Wait sampai melihat:

```
ready - started server on 0.0.0.0:3000
```

## 3️⃣ Test di Browser

1. Open: `http://localhost:3000`
2. Login (admin/teacher account)
3. Go to: **Exams** → **Create Exam** atau Edit existing exam
4. Add question with photos:

   - Type: "Multiple Choice"
   - Question: "What color is this?"
   - Options:
     - "Red" + upload red_car.jpg
     - (empty) + upload blue_car.jpg
     - "Green" + no image
   - Correct answer: "Red"
   - Points: 10
   - Click "Add Question"

5. Submit exam

## 4️⃣ Check Backend Logs

Dalam backend terminal, harus ada log seperti ini:

```
═══════════════════════════════════════════════════════════
🚀 [ExamsServiceSimplified] Creating exam...
═══════════════════════════════════════════════════════════
📝 Input: { title: "...", questionsCount: 1 }
📊 Totals: { totalScore: 10, totalQuestions: 1 }
✅ Exam saved: id=XX
💾 [QuestionPhotoService] Saving 1 questions...
📝 Q0 akan disave: { ..., optionImages: ["/uploads/...jpg", "/uploads/...jpg", ""], ... }
📝 Total questions to save: 1
✅ Questions saved successfully
✔️ Q0 saved: id=YY, optionImages=["/uploads/...","/uploads/...", ""]
═══════════════════════════════════════════════════════════
✨ Exam created successfully
═══════════════════════════════════════════════════════════
```

## 5️⃣ Check Browser Network Tab

1. Open DevTools (F12)
2. Go to Network tab
3. Add/Update exam
4. Look for request to:
   - `/api/exams` (POST untuk create) atau
   - `/api/exams/{id}` (PUT untuk update)
5. Click request → Payload tab
6. Should see:

```json
{
	"title": "...",
	"questions": [
		{
			"questionText": "...",
			"type": "multiple_choice",
			"options": ["Red", "", "Green"],
			"optionImages": ["/uploads/file1.jpg", "/uploads/file2.jpg", ""],
			"correctAnswer": "Red",
			"points": 10
		}
	]
}
```

## 6️⃣ Verify Database

1. Open MySQL client (Laragon PHPMyAdmin atau command line)
2. Query:

```sql
SELECT id, questionText, optionImages FROM questions WHERE id = XX ORDER BY id DESC LIMIT 1;
```

3. Should see:

```
id | questionText | optionImages
XX | "What color..." | ["/uploads/file1.jpg", "/uploads/file2.jpg", ""]
```

## 7️⃣ Load Exam in Edit Page

1. Go back to admin
2. Click edit on exam you just created
3. Should see:
   - Question text appears
   - Options appear with images showing
   - Images display in option boxes

## ✅ Success Indicators

- ✅ Images upload without error
- ✅ Backend logs show optionImages values
- ✅ Network request includes optionImages array
- ✅ Database saves JSON with URL paths
- ✅ Load in edit page shows images correctly
- ✅ All with console logs showing flow clearly

## ❌ If Something Fails

### Images not uploading?

- Check file size
- Check /public/uploads/ folder exists and writable
- Check backend console for upload errors

### optionImages null in backend?

- Check browser network tab - is it in the request?
- Check the buildQuestionPayload function - is it being set?
- Check logs in processQuestion function

### Database doesn't have values?

- Check if save is actually happening (look for "✅ Questions saved")
- Try manual query: `UPDATE questions SET optionImages = ... WHERE id = XX;`
- Restart backend to reload entities

### Images don't show in edit?

- Check if database query returns the values
- Check if frontend is trying to display them (browser network → image requests)
- Check console for any JS errors

## 🔍 Debugging Commands

### Backend (while running)

```typescript
// In backend terminal, you can see logs:
console.log output automatically appears

// Look for these patterns:
"═══════════════════════════════════════════════════════════"
"📸 Q0 akan disave:"
"✔️ Q0 saved:"
```

### Frontend (browser console)

```javascript
// Check what was sent:
// Look in Network tab for request
// Copy as cURL and paste to verify

// Or in browser console:
fetch("/api/exams/XX", { method: "GET" })
	.then((r) => r.json())
	.then((data) => {
		console.log("Questions:", data.questions);
		console.log("First Q images:", data.questions[0].optionImages);
	});
```

### Database

```sql
-- Check latest exam
SELECT * FROM exams ORDER BY id DESC LIMIT 1;

-- Check questions for that exam
SELECT id, examId, questionText, type, optionImages FROM questions
WHERE examId = XX
ORDER BY orderIndex;

-- Check if column exists
DESCRIBE questions;  -- should see optionImages column
```

## 📊 Test Scenarios

### Scenario 1: Simple Photo Options

- Q1: "What is 2+2?"
- Options: (photo of number 1) | (photo of number 2) | (photo of number 4)
- Correct: Option with photo of 4

### Scenario 2: Mixed Text and Photos

- Q2: "Select the animal"
- Options: "Dog" (no photo) | (photo only) | "Bird" (no photo)

### Scenario 3: Update Existing

- Create exam with photos
- Edit the exam
- Change one photo
- Save
- Verify new photo appears

## 🎯 Final Check

If all of these work:

1. ✅ Create exam with photo options
2. ✅ Backend logs show optionImages correctly
3. ✅ Network request has optionImages array
4. ✅ Database saves the JSON
5. ✅ Load in edit shows images
6. ✅ No console errors

Then **photo-based options feature is WORKING** 🎉

## 💬 Next Steps

- Test in student portal (can they see the options?)
- Test submissions (does system score correctly?)
- Test results (are images displayed in results?)
- Test editing (can change/remove photos?)
- Test deletion (when delete question, do photos go away?)

---

**Start time**: Now  
**Expected duration**: 5-10 minutes  
**Difficulty**: Easy  
**Risk**: None (test only, doesn't affect production)
