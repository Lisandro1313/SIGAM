import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import * as webpush from 'web-push';

@Injectable()
export class PushService {
  private readonly logger = new Logger(PushService.name);
  private enabled = false;

  constructor(private config: ConfigService) {
    const publicKey = this.config.get('VAPID_PUBLIC_KEY');
    const privateKey = this.config.get('VAPID_PRIVATE_KEY');
    const subject = this.config.get('VAPID_SUBJECT') || 'mailto:admin@sigam.com';

    if (publicKey && privateKey) {
      webpush.setVapidDetails(subject, publicKey, privateKey);
      this.enabled = true;
      this.logger.log('Web Push configurado correctamente');
    } else {
      this.logger.warn('VAPID keys no configuradas — push notifications deshabilitadas');
    }
  }

  async send(subscriptionJson: string, payload: { title: string; body: string; url?: string }) {
    if (!this.enabled) return;
    try {
      const subscription = JSON.parse(subscriptionJson);
      await webpush.sendNotification(subscription, JSON.stringify(payload));
      this.logger.log(`Push enviado: ${payload.title}`);
    } catch (err: any) {
      if (err.statusCode === 410 || err.statusCode === 404) {
        this.logger.warn('Suscripción expirada o inválida');
        return { expired: true };
      }
      this.logger.error(`Error enviando push: ${err.message}`);
    }
    return { expired: false };
  }

  getPublicKey(): string | undefined {
    return this.config.get('VAPID_PUBLIC_KEY');
  }
}
