import {
	Controller,
	Get,
	Post,
	Body,
	Patch,
	Param,
	Delete,
	UseGuards,
} from "@nestjs/common";
import { SemestersService } from "./semesters.service";
import { CreateSemesterDto } from "./dto/create-semester.dto";
import { UpdateSemesterDto } from "./dto/update-semester.dto";
import { JwtAuthGuard } from "../auth/guards/jwt-auth.guard";
import { RolesGuard } from "../auth/guards/roles.guard";
import { Roles } from "../auth/decorators/roles.decorator";
import { UserRole } from "../users/user.entity";

@Controller("semesters")
@UseGuards(JwtAuthGuard, RolesGuard)
export class SemestersController {
	constructor(private readonly semestersService: SemestersService) {}

	@Post()
	@Roles(UserRole.ADMIN)
	create(@Body() createSemesterDto: CreateSemesterDto) {
		return this.semestersService.create(createSemesterDto);
	}

	@Get()
	@Roles(UserRole.ADMIN, UserRole.TEACHER)
	findAll() {
		return this.semestersService.findAll();
	}

	@Get("active")
	@Roles(UserRole.ADMIN, UserRole.TEACHER, UserRole.STUDENT)
	findActive() {
		return this.semestersService.findActive();
	}

	@Get(":id")
	@Roles(UserRole.ADMIN, UserRole.TEACHER)
	findOne(@Param("id") id: string) {
		return this.semestersService.findOne(+id);
	}

	@Patch(":id")
	@Roles(UserRole.ADMIN)
	update(
		@Param("id") id: string,
		@Body() updateSemesterDto: UpdateSemesterDto
	) {
		return this.semestersService.update(+id, updateSemesterDto);
	}

	@Patch(":id/activate")
	@Roles(UserRole.ADMIN)
	setActive(@Param("id") id: string) {
		return this.semestersService.setActive(+id);
	}

	@Delete(":id")
	@Roles(UserRole.ADMIN)
	remove(@Param("id") id: string) {
		return this.semestersService.remove(+id);
	}
}
