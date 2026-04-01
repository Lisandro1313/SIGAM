import { Injectable, Logger, OnModuleInit } from '@nestjs/common';
// eslint-disable-next-line @typescript-eslint/no-require-imports
const RssParser = require('rss-parser');

interface NoticiaItem {
  categoria: string;
  titulo: string;
  fuente: string;
  url: string;
}

const FEEDS: { url: string; categoria: string; fuente: string }[] = [
  { url: 'https://www.infobae.com/feeds/rss/', categoria: 'General', fuente: 'Infobae' },
  { url: 'https://www.infobae.com/economia/feeds/rss/', categoria: 'Economía', fuente: 'Infobae' },
  { url: 'https://www.infobae.com/deportes/feeds/rss/', categoria: 'Deportes', fuente: 'Infobae' },
  { url: 'https://www.lanacion.com.ar/economia/rss/', categoria: 'Economía', fuente: 'La Nación' },
];

const CACHE_TTL_MS = 30 * 60 * 1000; // 30 minutos
const ITEMS_PER_FEED = 4;

@Injectable()
export class NoticiasService implements OnModuleInit {
  private readonly logger = new Logger(NoticiasService.name);
  // eslint-disable-next-line @typescript-eslint/no-unsafe-call
  private readonly parser = new RssParser({ timeout: 8000 });
  private cache: NoticiaItem[] = [];
  private lastFetch = 0;

  async onModuleInit() {
    // Pre-cargar al inicio para evitar lentitud en la primera request
    await this.fetchNoticias();
  }

  async getNoticias(): Promise<NoticiaItem[]> {
    const now = Date.now();
    if (now - this.lastFetch < CACHE_TTL_MS && this.cache.length > 0) {
      return this.cache;
    }
    return this.fetchNoticias();
  }

  private async fetchNoticias(): Promise<NoticiaItem[]> {
    const resultados: NoticiaItem[] = [];

    await Promise.allSettled(
      FEEDS.map(async ({ url, categoria, fuente }) => {
        try {
          const feed = await this.parser.parseURL(url);
          const items = (feed.items ?? []).slice(0, ITEMS_PER_FEED);
          for (const item of items) {
            const titulo = item.title?.trim();
            const link = item.link ?? '';
            if (titulo) {
              resultados.push({ categoria, titulo, fuente, url: link });
            }
          }
        } catch (err) {
          this.logger.warn(`No se pudo obtener feed ${fuente} (${categoria}): ${err.message}`);
        }
      }),
    );

    if (resultados.length > 0) {
      // Mezclar para que no aparezcan todos de la misma fuente seguidos
      this.shuffle(resultados);
      this.cache = resultados;
      this.lastFetch = Date.now();
    }

    return this.cache;
  }

  private shuffle(arr: NoticiaItem[]) {
    for (let i = arr.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [arr[i], arr[j]] = [arr[j], arr[i]];
    }
  }
}
