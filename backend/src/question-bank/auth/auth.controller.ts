import { Controller, Post, Body, UseGuards, Request } from "@nestjs/common";
import { AuthService } from "./auth.service";
import { LocalAuthGuard } from "./guards/local-auth.guard";

@Controller("auth")
export class AuthController {
	constructor(private authService: AuthService) {}

	@Post("login/admin")
	async loginAdmin(@Body() loginDto: { email: string; password: string }) {
		return this.authService.loginAdmin(loginDto.email, loginDto.password);
	}

	@Post("login/admin-nip")
	async loginAdminByNip(@Body() loginDto: { nip: string; password: string }) {
		return this.authService.loginAdminByNip(loginDto.nip, loginDto.password);
	}

	@Post("login/student")
	async loginStudent(@Body() loginDto: { nis: string; password: string }) {
		return this.authService.loginStudent(loginDto.nis, loginDto.password);
	}

	@UseGuards(LocalAuthGuard)
	@Post("login")
	async login(@Request() req) {
		return this.authService.login(req.user);
	}
}
