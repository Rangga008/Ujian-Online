import { Module } from "@nestjs/common";
import { ConfigModule, ConfigService } from "@nestjs/config";
import { TypeOrmModule } from "@nestjs/typeorm";
import { ServeStaticModule } from "@nestjs/serve-static";
import { join } from "path";
import { AuthModule } from "./auth/auth.module";
import { UsersModule } from "./users/users.module";
import { ExamsModule } from "./exams/exams.module";
import { QuestionsModule } from "./questions/questions.module";
import { SubmissionsModule } from "./submissions/submissions.module";
import { SemestersModule } from "./semesters/semester.module";
import { SubjectsModule } from "./subjects/subject.module";
import { ClassesModule } from "./classes/class.module";
import { QuestionBankModule } from "./question-bank/question-bank.module";
import { ActivityModule } from "./activity/activity.module";
import { SettingsModule } from "./settings/settings.module";
import { StudentsModule } from "./students/students.module";
import { GradesModule } from "./grades/grades.module";

@Module({
	imports: [
		ConfigModule.forRoot({
			isGlobal: true,
		}),
		ServeStaticModule.forRoot({
			rootPath: join(__dirname, "..", "..", "public"),
			serveRoot: "/",
		}),
		TypeOrmModule.forRootAsync({
			imports: [ConfigModule],
			inject: [ConfigService],
			useFactory: (config: ConfigService) => ({
				type: "mysql",
				host: config.get<string>("DB_HOST"),
				port: config.get<number>("DB_PORT", 3306),
				username: config.get<string>("DB_USERNAME"),
				password: config.get<string>("DB_PASSWORD"),
				database: config.get<string>("DB_DATABASE"),
				entities: [__dirname + "/**/*.entity{.ts,.js}"],
				synchronize: config.get<string>("DB_SYNCHRONIZE", "false") === "true",
				logging: false,
			}),
		}),
		AuthModule,
		UsersModule,
		ExamsModule,
		QuestionsModule,
		SubmissionsModule,
		SemestersModule,
		SubjectsModule,
		ClassesModule,
		QuestionBankModule,
		ActivityModule,
		SettingsModule,
		StudentsModule,
		GradesModule,
	],
})
export class AppModule {}
