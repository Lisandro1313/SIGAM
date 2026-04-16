import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { CreatePersonalDto } from './dto/create-personal.dto';
import { UpdatePersonalDto } from './dto/update-personal.dto';

@Injectable()
export class PersonalService {
  constructor(private prisma: PrismaService) {}

  async create(dto: CreatePersonalDto) {
    return this.prisma.personal.create({ data: dto });
  }

  async findAll(includeInactive = false) {
    return this.prisma.personal.findMany({
      where: includeInactive ? {} : { activo: true },
      orderBy: { nombre: 'asc' },
    });
  }

  async findOne(id: number) {
    const personal = await this.prisma.personal.findUnique({
      where: { id },
      include: { tareas: { orderBy: { createdAt: 'desc' }, take: 10 } },
    });
    if (!personal) throw new NotFoundException('Personal no encontrado');
    return personal;
  }

  async update(id: number, dto: UpdatePersonalDto) {
    await this.findOne(id);
    return this.prisma.personal.update({ where: { id }, data: dto });
  }

  async remove(id: number) {
    await this.findOne(id);
    return this.prisma.personal.update({
      where: { id },
      data: { activo: false },
    });
  }

  async savePushSubscription(id: number, subscription: string) {
    return this.prisma.personal.update({
      where: { id },
      data: { pushSubscription: subscription },
    });
  }
}
