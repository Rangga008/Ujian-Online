import { Module, forwardRef } from "@nestjs/common";
import { TypeOrmModule } from "@nestjs/typeorm";
import { Semester } from "./semester.entity";
import { SemestersController } from "./semesters.controller";
import { SemestersService } from "./semesters.service";
import { StudentsModule } from "../students/students.module";

@Module({
	imports: [
		TypeOrmModule.forFeature([Semester]),
		forwardRef(() => StudentsModule),
	],
	controllers: [SemestersController],
	providers: [SemestersService],
	exports: [SemestersService],
})
export class SemestersModule {}
