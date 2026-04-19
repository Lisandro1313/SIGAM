import { Injectable, UnauthorizedException } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import * as bcrypt from 'bcrypt';
import { PrismaService } from '../../prisma/prisma.service';

const ACCESS_EXPIRES = process.env.JWT_ACCESS_EXPIRES || '2h';
const REFRESH_EXPIRES = process.env.JWT_REFRESH_EXPIRES || '30d';

@Injectable()
export class AuthService {
  constructor(
    private prisma: PrismaService,
    private jwtService: JwtService,
  ) {}

  async validateUser(email: string, password: string): Promise<any> {
    const user = await this.prisma.usuario.findUnique({
      where: { email },
      include: { programa: true, deposito: true },
    });

    if (!user) {
      throw new UnauthorizedException('Credenciales inválidas');
    }

    if (!user.activo) {
      throw new UnauthorizedException('Usuario inactivo');
    }

    const isPasswordValid = await bcrypt.compare(password, user.password);

    if (!isPasswordValid) {
      throw new UnauthorizedException('Credenciales inválidas');
    }

    const { password: _, ...result } = user;
    return result;
  }

  private buildTokens(user: any) {
    const base = {
      email: user.email,
      sub: user.id,
      rol: user.rol,
      programaId: user.programaId,
      depositoId: user.depositoId,
    };
    const access_token = this.jwtService.sign(
      { ...base, type: 'access' },
      { expiresIn: ACCESS_EXPIRES },
    );
    const refresh_token = this.jwtService.sign(
      { sub: user.id, type: 'refresh' },
      { expiresIn: REFRESH_EXPIRES },
    );
    return { access_token, refresh_token };
  }

  async login(user: any) {
    const tokens = this.buildTokens(user);
    return {
      ...tokens,
      user: {
        id: user.id,
        nombre: user.nombre,
        email: user.email,
        rol: user.rol,
        programa: user.programa,
        depositoId: user.depositoId,
        deposito: user.deposito,
      },
    };
  }

  async refresh(refreshToken: string) {
    let payload: any;
    try {
      payload = this.jwtService.verify(refreshToken);
    } catch {
      throw new UnauthorizedException('Refresh token inválido o expirado');
    }
    if (payload?.type !== 'refresh' || !payload?.sub) {
      throw new UnauthorizedException('Refresh token inválido');
    }
    const user = await this.prisma.usuario.findUnique({
      where: { id: payload.sub },
      include: { programa: true, deposito: true },
    });
    if (!user || !user.activo) {
      throw new UnauthorizedException('Usuario inactivo');
    }
    const { password: _, ...safe } = user;
    return this.buildTokens(safe);
  }

  async validateUserById(userId: number) {
    const user = await this.prisma.usuario.findUnique({
      where: { id: userId },
      include: { programa: true, deposito: true },
    });

    if (!user || !user.activo) {
      throw new UnauthorizedException();
    }

    const { password: _, ...result } = user;
    return result;
  }
}
