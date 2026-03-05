import { ConflictException, Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { JwtService } from '@nestjs/jwt';
import { User } from '@prisma/client';
import * as bcrypt from 'bcrypt';
import { Response } from 'express';
import { UsersService } from '../users/users.service';
import { RegisterDto } from './dto/register.dto';

type SafeUser = Omit<User, 'passwordHash'>;

@Injectable()
export class AuthService {
  constructor(
    private readonly usersService: UsersService,
    private readonly jwtService: JwtService,
    private readonly config: ConfigService,
  ) {}

  async register(dto: RegisterDto): Promise<SafeUser> {
    const existing = await this.usersService.findByEmail(dto.email);
    if (existing) throw new ConflictException('Email already registered');
    const passwordHash = await bcrypt.hash(dto.password, 10);
    const user = await this.usersService.create({ email: dto.email, passwordHash });
    const { passwordHash: _, ...safe } = user;
    return safe;
  }

  async validateUser(email: string, password: string): Promise<SafeUser | null> {
    const user = await this.usersService.findByEmail(email);
    if (!user || !user.passwordHash) return null;
    const match = await bcrypt.compare(password, user.passwordHash);
    if (!match) return null;
    const { passwordHash: _, ...safe } = user;
    return safe;
  }

  async validateOrCreateGoogleUser(googleId: string, email: string): Promise<SafeUser> {
    // 1. Find by googleId
    let user = await this.usersService.findByGoogleId(googleId);
    if (user) {
      const { passwordHash: _, ...safe } = user;
      return safe;
    }
    // 2. Find by email — link googleId to existing account
    user = await this.usersService.findByEmail(email);
    if (user) {
      user = await this.usersService.linkGoogleId(user.id, googleId);
      const { passwordHash: _, ...safe } = user;
      return safe;
    }
    // 3. Create new Google-only account
    const created = await this.usersService.create({ email, googleId });
    const { passwordHash: _, ...safe } = created;
    return safe;
  }

  setCookie(res: Response, user: SafeUser): void {
    const token = this.jwtService.sign({
      sub: user.id,
      email: user.email,
      role: user.role,
    });
    res.cookie('access_token', token, {
      httpOnly: true,
      sameSite: 'lax',
      secure: false,
      maxAge: 7 * 24 * 60 * 60 * 1000,
    });
  }
}
