import { Injectable } from '@nestjs/common';
import { createClient, SupabaseClient } from '@supabase/supabase-js';
import { existsSync, mkdirSync, writeFileSync, unlinkSync } from 'fs';
import { join } from 'path';

@Injectable()
export class StorageService {
  private supabase: SupabaseClient | null = null;
  private bucket: string;

  constructor() {
    this.bucket = process.env.SUPABASE_STORAGE_BUCKET || 'sigam';
    if (process.env.SUPABASE_URL && process.env.SUPABASE_SERVICE_KEY) {
      this.supabase = createClient(
        process.env.SUPABASE_URL,
        process.env.SUPABASE_SERVICE_KEY,
      );
    } else {
      console.warn('[StorageService] SUPABASE_URL/SUPABASE_SERVICE_KEY no configuradas — usando almacenamiento local');
    }
  }

  async upload(buffer: Buffer, path: string, mimetype: string): Promise<string> {
    if (this.supabase) {
      const { error } = await this.supabase.storage
        .from(this.bucket)
        .upload(path, buffer, { contentType: mimetype, upsert: true });
      if (error) throw new Error(`Error subiendo archivo a Supabase: ${error.message}`);
      const { data } = this.supabase.storage.from(this.bucket).getPublicUrl(path);
      return data.publicUrl;
    }

    // Fallback local (desarrollo)
    const dir = join(process.cwd(), 'uploads', path.split('/').slice(0, -1).join('/'));
    if (!existsSync(dir)) mkdirSync(dir, { recursive: true });
    writeFileSync(join(process.cwd(), 'uploads', path), buffer);
    return `uploads/${path}`;
  }

  async delete(path: string): Promise<void> {
    if (this.supabase) {
      await this.supabase.storage.from(this.bucket).remove([path]);
      return;
    }
    const localPath = join(process.cwd(), 'uploads', path);
    if (existsSync(localPath)) unlinkSync(localPath);
  }

  // Alias para compatibilidad con remitos
  async uploadFoto(buffer: Buffer, filename: string, mimetype: string): Promise<string> {
    return this.upload(buffer, `remitos/${filename}`, mimetype);
  }
}
