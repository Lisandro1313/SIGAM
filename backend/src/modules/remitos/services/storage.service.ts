import { Injectable } from '@nestjs/common';
import { createClient, SupabaseClient } from '@supabase/supabase-js';
import { existsSync, mkdirSync, writeFileSync } from 'fs';
import { join } from 'path';

@Injectable()
export class StorageService {
  private supabase: SupabaseClient | null = null;
  private bucket: string;

  constructor() {
    this.bucket = process.env.SUPABASE_STORAGE_BUCKET || 'remitos';
    if (process.env.SUPABASE_URL && process.env.SUPABASE_SERVICE_KEY) {
      this.supabase = createClient(
        process.env.SUPABASE_URL,
        process.env.SUPABASE_SERVICE_KEY,
      );
    } else {
      console.warn('[StorageService] SUPABASE_URL/SUPABASE_SERVICE_KEY no configuradas — usando almacenamiento local');
    }
  }

  async uploadFoto(buffer: Buffer, filename: string, mimetype: string): Promise<string> {
    // Supabase Storage (producción)
    if (this.supabase) {
      const { error } = await this.supabase.storage
        .from(this.bucket)
        .upload(filename, buffer, { contentType: mimetype, upsert: true });
      if (error) throw new Error(`Error subiendo foto a Supabase: ${error.message}`);
      const { data } = this.supabase.storage.from(this.bucket).getPublicUrl(filename);
      return data.publicUrl;
    }

    // Fallback local (desarrollo)
    const uploadsDir = join(process.cwd(), 'uploads', 'remitos');
    if (!existsSync(uploadsDir)) mkdirSync(uploadsDir, { recursive: true });
    writeFileSync(join(uploadsDir, filename), buffer);
    return `uploads/remitos/${filename}`;
  }
}
