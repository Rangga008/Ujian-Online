import { Injectable, NotFoundException, BadRequestException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Grade } from './grade.entity';
import { CreateGradeDto } from './dto/create-grade.dto';
import { UpdateGradeDto } from './dto/update-grade.dto';

@Injectable()
export class GradesService {
  constructor(
    @InjectRepository(Grade)
    private gradesRepository: Repository<Grade>,
  ) {}

  async create(createGradeDto: CreateGradeDto): Promise<Grade> {
    // Check if grade with same level and section already exists
    const existing = await this.gradesRepository.findOne({
      where: {
        level: createGradeDto.level,
        section: createGradeDto.section,
      },
    });

    if (existing) {
      throw new BadRequestException(
        `Angkatan ${createGradeDto.name} untuk ${createGradeDto.section} sudah ada`,
      );
    }

    const grade = this.gradesRepository.create({
      ...createGradeDto,
      isActive: createGradeDto.isActive !== undefined ? createGradeDto.isActive : true,
    });
    return this.gradesRepository.save(grade);
  }

  async findAll(section?: string, isActive?: boolean): Promise<Grade[]> {
    const query = this.gradesRepository.createQueryBuilder('grade');

    if (section) {
      query.andWhere('grade.section = :section', { section });
    }

    if (isActive !== undefined) {
      query.andWhere('grade.isActive = :isActive', { isActive });
    }

    query.orderBy('grade.section', 'ASC').addOrderBy('grade.level', 'ASC');

    return query.getMany();
  }

  async findOne(id: number): Promise<Grade> {
    const grade = await this.gradesRepository.findOne({ where: { id } });
    if (!grade) {
      throw new NotFoundException(`Angkatan dengan ID ${id} tidak ditemukan`);
    }
    return grade;
  }

  async update(id: number, updateGradeDto: UpdateGradeDto): Promise<Grade> {
    const grade = await this.findOne(id);

    // If updating level or section, check for duplicates
    if (updateGradeDto.level || updateGradeDto.section) {
      const level = updateGradeDto.level || grade.level;
      const section = updateGradeDto.section || grade.section;

      const existing = await this.gradesRepository.findOne({
        where: { level, section },
      });

      if (existing && existing.id !== id) {
        throw new BadRequestException(
          `Angkatan dengan level ${level} dan section ${section} sudah ada`,
        );
      }
    }

    Object.assign(grade, updateGradeDto);
    return this.gradesRepository.save(grade);
  }

  async remove(id: number): Promise<void> {
    const grade = await this.findOne(id);
    await this.gradesRepository.remove(grade);
  }
}
