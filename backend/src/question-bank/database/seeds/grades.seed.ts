import { DataSource } from 'typeorm';
import { Grade } from '../../grades/grade.entity';

export async function seedGrades(dataSource: DataSource) {
  const gradeRepository = dataSource.getRepository(Grade);

  // Check if grades already exist
  const count = await gradeRepository.count();
  if (count > 0) {
    console.log('Grades already seeded, skipping...');
    return;
  }

  const grades = [
    // SD (Sekolah Dasar) - Kelas 1-6
    { level: 1, name: 'Kelas 1 SD', section: 'SD' as const, isActive: true },
    { level: 2, name: 'Kelas 2 SD', section: 'SD' as const, isActive: true },
    { level: 3, name: 'Kelas 3 SD', section: 'SD' as const, isActive: true },
    { level: 4, name: 'Kelas 4 SD', section: 'SD' as const, isActive: true },
    { level: 5, name: 'Kelas 5 SD', section: 'SD' as const, isActive: true },
    { level: 6, name: 'Kelas 6 SD', section: 'SD' as const, isActive: true },

    // SMP (Sekolah Menengah Pertama) - Kelas 7-9
    { level: 7, name: 'Kelas 7 SMP', section: 'SMP' as const, isActive: true },
    { level: 8, name: 'Kelas 8 SMP', section: 'SMP' as const, isActive: true },
    { level: 9, name: 'Kelas 9 SMP', section: 'SMP' as const, isActive: true },

    // SMA (Sekolah Menengah Atas) - Kelas 10-12
    { level: 10, name: 'Kelas 10 SMA', section: 'SMA' as const, isActive: true },
    { level: 11, name: 'Kelas 11 SMA', section: 'SMA' as const, isActive: true },
    { level: 12, name: 'Kelas 12 SMA', section: 'SMA' as const, isActive: true },
  ];

  await gradeRepository.save(grades);
  console.log('✓ Grades seeded successfully');
}
