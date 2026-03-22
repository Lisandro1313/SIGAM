import { Injectable, BadRequestException, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { Role } from '@prisma/client';
import * as bcrypt from 'bcrypt';
import { CreateUsuarioDto } from './dto/create-usuario.dto';
import { UpdateUsuarioDto } from './dto/update-usuario.dto';

@Injectable()
export class UsuariosService {
  constructor(private prisma: PrismaService) {}

  async create(createUsuarioDto: CreateUsuarioDto) {
    const existingUser = await this.prisma.usuario.findUnique({
      where: { email: createUsuarioDto.email },
    });

    if (existingUser) {
      throw new BadRequestException('El email ya está registrado');
    }

    const hashedPassword = await bcrypt.hash(createUsuarioDto.password, 10);

    const { programaId, ...userData } = createUsuarioDto;

    const usuario = await this.prisma.usuario.create({
      data: {
        nombre: userData.nombre,
        email: userData.email,
        password: hashedPassword,
        rol: userData.rol as Role,
        ...(programaId && { programa: { connect: { id: programaId } } }),
        ...(userData.depositoId && { deposito: { connect: { id: userData.depositoId } } }),
      },
      include: { programa: true, deposito: true },
    });

    const { password: _, ...result } = usuario;
    return result;
  }

  async findAll() {
    const usuarios = await this.prisma.usuario.findMany({
      include: { programa: true, deposito: true },
    });

    return usuarios.map(({ password, ...user }) => user);
  }

  async findOne(id: number) {
    const usuario = await this.prisma.usuario.findUnique({
      where: { id },
      include: { programa: true, deposito: true },
    });

    if (!usuario) {
      throw new NotFoundException('Usuario no encontrado');
    }

    const { password: _, ...result } = usuario;
    return result;
  }

  async update(id: number, updateUsuarioDto: UpdateUsuarioDto) {
    const usuario = await this.prisma.usuario.findUnique({ where: { id } });

    if (!usuario) {
      throw new NotFoundException('Usuario no encontrado');
    }

    const { programaId, password, ...userData } = updateUsuarioDto;
    const data: any = { ...userData };

    if (userData.rol) {
      data.rol = userData.rol as Role;
    }

    if (password) {
      data.password = await bcrypt.hash(password, 10);
    }

    if (programaId !== undefined) {
      if (programaId === null) {
        data.programa = { disconnect: true };
      } else {
        data.programa = { connect: { id: programaId } };
      }
    }

    // depositoId puede venir en userData, manejarlo con connect/disconnect
    if ('depositoId' in updateUsuarioDto) {
      const depId = (updateUsuarioDto as any).depositoId;
      delete data.depositoId;
      if (depId === null || depId === undefined) {
        data.deposito = { disconnect: true };
      } else {
        data.deposito = { connect: { id: depId } };
      }
    }

    const updated = await this.prisma.usuario.update({
      where: { id },
      data,
      include: { programa: true, deposito: true },
    });

    const { password: _, ...result } = updated;
    return result;
  }

  async remove(id: number) {
    await this.prisma.usuario.update({ where: { id }, data: { activo: false } });
    return { success: true, message: 'Usuario desactivado' };
  }
}
