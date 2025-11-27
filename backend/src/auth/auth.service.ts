import { Injectable, UnauthorizedException } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { UsersService } from '../users/users.service';
import * as bcrypt from 'bcrypt';

@Injectable()
export class AuthService {
  constructor(
    private usersService: UsersService,
    private jwtService: JwtService,
  ) {}

  async validateUser(email: string, password: string): Promise<any> {
    const user = await this.usersService.findByEmail(email);
    if (user && await bcrypt.compare(password, user.password)) {
      const { password, ...result } = user;
      return result;
    }
    return null;
  }

  async validateUserByNis(nis: string, password: string): Promise<any> {
    const user = await this.usersService.findByNis(nis);
    if (user && await bcrypt.compare(password, user.password)) {
      const { password, ...result } = user;
      return result;
    }
    return null;
  }

  async login(user: any) {
    const payload = { email: user.email, sub: user.id, role: user.role };
    return {
      access_token: this.jwtService.sign(payload),
      user: {
        id: user.id,
        email: user.email,
        name: user.name,
        role: user.role,
        nis: user.nis,
        kelas: user.kelas,
        jurusan: user.jurusan,
      },
    };
  }

  async loginStudent(nis: string, password: string) {
    const user = await this.validateUserByNis(nis, password);
    if (!user) {
      throw new UnauthorizedException('NIS atau password salah');
    }
    if (user.role !== 'student') {
      throw new UnauthorizedException('Akun ini bukan akun siswa');
    }
    return this.login(user);
  }

  async loginAdmin(email: string, password: string) {
    const user = await this.validateUser(email, password);
    if (!user) {
      throw new UnauthorizedException('Email atau password salah');
    }
    if (user.role !== 'admin') {
      throw new UnauthorizedException('Akun ini bukan akun admin');
    }
    return this.login(user);
  }
}
