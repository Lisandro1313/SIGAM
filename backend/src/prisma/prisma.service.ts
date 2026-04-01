import { Injectable, OnModuleInit, OnModuleDestroy } from '@nestjs/common';
import { PrismaClient } from '@prisma/client';

// Supabase session-mode pooler tiene máximo de clientes limitado.
// connection_limit=3 evita saturar el pool cuando hay múltiples requests paralelas.
function buildDatasourceUrl(): string {
  const url = process.env.DATABASE_URL ?? '';
  if (!url || url.includes('connection_limit')) return url;
  const sep = url.includes('?') ? '&' : '?';
  return `${url}${sep}connection_limit=3&pool_timeout=20`;
}

@Injectable()
export class PrismaService extends PrismaClient implements OnModuleInit, OnModuleDestroy {
  constructor() {
    super({
      datasources: { db: { url: buildDatasourceUrl() } },
    });
  }

  async onModuleInit() {
    await this.$connect();
  }

  async onModuleDestroy() {
    await this.$disconnect();
  }
}
