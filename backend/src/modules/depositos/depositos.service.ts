import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';

@Injectable()
export class DepositosService {
  constructor(private prisma: PrismaService) {}

  async findAll() {
    return await this.prisma.deposito.findMany({
      where: { activo: true },
      include: {
        stockItems: {
          include: {
            articulo: true,
          },
        },
      },
    });
  }

  async findOne(id: number) {
    return await this.prisma.deposito.findUnique({
      where: { id },
      include: {
        stockItems: {
          include: {
            articulo: true,
          },
        },
      },
    });
  }
}
