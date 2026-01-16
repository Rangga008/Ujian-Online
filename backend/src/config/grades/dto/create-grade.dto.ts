import { IsInt, IsString, IsEnum, IsBoolean, IsOptional, Min, Max } from 'class-validator';

export class CreateGradeDto {
  @IsInt()
  @Min(1)
  @Max(12)
  level: number;

  @IsString()
  name: string;

  @IsEnum(['SD', 'SMP', 'SMA'])
  section: 'SD' | 'SMP' | 'SMA';

  @IsBoolean()
  @IsOptional()
  isActive?: boolean = true;
}
