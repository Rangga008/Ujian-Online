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
import { SettingsModule } from "./settings/settings.module";
import { StudentsModule } from "./students/students.module";

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
			useFactory: (configService: ConfigService) => ({
				type: "mysql",
				host: configService.get("DB_HOST", "localhost"),
				port: configService.get("DB_PORT", 3306),
				username: configService.get("DB_USERNAME", "root"),
				password: configService.get("DB_PASSWORD", ""),
				database: configService.get("DB_DATABASE", "ujian_online"),
				entities: [__dirname + "/**/*.entity{.ts,.js}"],
				synchronize: true, // Set to false in production
				logging: false,
			}),
			inject: [ConfigService],
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
		SettingsModule,
		StudentsModule,
	],
})
export class AppModule {}
