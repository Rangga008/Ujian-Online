import { Module } from "@nestjs/common";
import { TypeOrmModule } from "@nestjs/typeorm";
import { QuestionBank } from "./question-bank.entity";
import { QuestionBankController } from "./question-bank.controller";
import { QuestionBankService } from "./question-bank.service";
import { Subject } from "../subjects/subject.entity";
import { User } from "../users/user.entity";
import { ActivityModule } from "../activity/activity.module";

@Module({
	imports: [
		TypeOrmModule.forFeature([QuestionBank, Subject, User]),
		ActivityModule,
	],
	controllers: [QuestionBankController],
	providers: [QuestionBankService],
	exports: [QuestionBankService],
})
export class QuestionBankModule {}
