import { DataSource } from 'typeorm';
import * as bcrypt from 'bcrypt';
import { User, UserRole } from '../../users/user.entity';
import { Exam, ExamStatus } from '../../exams/exam.entity';
import { Question, QuestionType } from '../../questions/question.entity';

const AppDataSource = new DataSource({
  type: 'mysql',
  host: process.env.DB_HOST || 'localhost',
  port: parseInt(process.env.DB_PORT || '3306'),
  username: process.env.DB_USERNAME || 'root',
  password: process.env.DB_PASSWORD || '',
  database: process.env.DB_DATABASE || 'ujian_online',
  entities: [User, Exam, Question],
  synchronize: true,
});

async function seed() {
  try {
    await AppDataSource.initialize();
    console.log('Data Source initialized');

    const userRepo = AppDataSource.getRepository(User);
    const examRepo = AppDataSource.getRepository(Exam);
    const questionRepo = AppDataSource.getRepository(Question);

    // Create Admin
    const hashedAdminPassword = await bcrypt.hash('admin123', 10);
    const admin = userRepo.create({
      email: 'admin@ujian.com',
      password: hashedAdminPassword,
      name: 'Administrator',
      role: UserRole.ADMIN,
    });
    await userRepo.save(admin);
    console.log('Admin created');

    // Create Demo Students
    const hashedStudentPassword = await bcrypt.hash('siswa123', 10);
    
    const students = [
      {
        email: 'siswa1@test.com',
        nis: '12345',
        password: hashedStudentPassword,
        name: 'Budi Santoso',
        role: UserRole.STUDENT,
        kelas: '12 IPA 1',
        jurusan: 'IPA',
      },
      {
        email: 'siswa2@test.com',
        nis: '12346',
        password: hashedStudentPassword,
        name: 'Siti Nurhaliza',
        role: UserRole.STUDENT,
        kelas: '12 IPA 1',
        jurusan: 'IPA',
      },
      {
        email: 'siswa3@test.com',
        nis: '12347',
        password: hashedStudentPassword,
        name: 'Ahmad Fauzi',
        role: UserRole.STUDENT,
        kelas: '12 IPS 1',
        jurusan: 'IPS',
      },
    ];

    for (const studentData of students) {
      const student = userRepo.create(studentData);
      await userRepo.save(student);
    }
    console.log('Students created');

    // Create Sample Exam
    const startTime = new Date();
    startTime.setHours(startTime.getHours() - 1); // Started 1 hour ago
    
    const endTime = new Date();
    endTime.setDate(endTime.getDate() + 7); // Ends in 7 days

    const exam = examRepo.create({
      title: 'Ujian Matematika - Semester Genap',
      description: 'Ujian tengah semester untuk mata pelajaran Matematika kelas 12',
      duration: 90,
      startTime,
      endTime,
      status: ExamStatus.PUBLISHED,
      totalQuestions: 5,
      totalScore: 100,
      randomizeQuestions: true,
      showResultImmediately: false,
    });
    await examRepo.save(exam);
    console.log('Exam created');

    // Create Sample Questions
    const questions = [
      {
        examId: exam.id,
        questionText: 'Berapakah hasil dari 15 + 25?',
        type: QuestionType.MULTIPLE_CHOICE,
        options: ['30', '35', '40', '45'],
        correctAnswer: '40',
        points: 20,
        orderIndex: 0,
      },
      {
        examId: exam.id,
        questionText: 'Jika x = 5, maka 2x + 3 = ?',
        type: QuestionType.MULTIPLE_CHOICE,
        options: ['10', '13', '15', '8'],
        correctAnswer: '13',
        points: 20,
        orderIndex: 1,
      },
      {
        examId: exam.id,
        questionText: 'Apakah 2 + 2 = 4?',
        type: QuestionType.TRUE_FALSE,
        options: ['Benar', 'Salah'],
        correctAnswer: 'Benar',
        points: 20,
        orderIndex: 2,
      },
      {
        examId: exam.id,
        questionText: 'Luas persegi dengan sisi 10 cm adalah?',
        type: QuestionType.MULTIPLE_CHOICE,
        options: ['100 cm²', '50 cm²', '200 cm²', '40 cm²'],
        correctAnswer: '100 cm²',
        points: 20,
        orderIndex: 3,
      },
      {
        examId: exam.id,
        questionText: 'Berapakah akar kuadrat dari 144?',
        type: QuestionType.MULTIPLE_CHOICE,
        options: ['10', '11', '12', '13'],
        correctAnswer: '12',
        points: 20,
        orderIndex: 4,
      },
    ];

    for (const questionData of questions) {
      const question = questionRepo.create(questionData);
      await questionRepo.save(question);
    }
    console.log('Questions created');

    console.log('\n✅ Seeding completed successfully!');
    console.log('\nLogin Credentials:');
    console.log('==================');
    console.log('Admin:');
    console.log('  Email: admin@ujian.com');
    console.log('  Password: admin123');
    console.log('\nStudent:');
    console.log('  NIS: 12345');
    console.log('  Password: siswa123');
    console.log('==================\n');

    await AppDataSource.destroy();
  } catch (error) {
    console.error('Error during seeding:', error);
    process.exit(1);
  }
}

seed();
