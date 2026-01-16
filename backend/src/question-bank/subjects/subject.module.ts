import { Module } from "@nestjs/common";
import { TypeOrmModule } from "@nestjs/typeorm";
import { Subject } from "./subject.entity";
import { SubjectsController } from "./subjects.controller";
import { SubjectsService } from "./subjects.service";
import { User } from "../users/user.entity";

@Module({
	imports: [TypeOrmModule.forFeature([Subject, User])],
	controllers: [SubjectsController],
	providers: [SubjectsService],
	exports: [SubjectsService],
})
export class SubjectsModule {}
