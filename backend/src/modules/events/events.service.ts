import { Injectable } from '@nestjs/common';
import { Observable, Subject } from 'rxjs';
import { finalize } from 'rxjs/operators';
import { randomBytes } from 'crypto';

export interface SigamEvent {
  tipo: string;
  data?: any;
  secretaria?: string | null;
  ts: number;
}

interface Ticket {
  usuarioId: number;
  secretaria: string | null;
  expiresAt: number;
}

@Injectable()
export class EventsService {
  /** Clientes SSE: ticket → Subject */
  private clients = new Map<string, { subject: Subject<MessageEvent>; secretaria: string | null }>();

  /** Tickets de un solo uso (TTL 30s) para auth de SSE sin token en URL */
  private tickets = new Map<string, Ticket>();

  // ── Tickets ───────────────────────────────────────────────────────────────

  /** Crea un ticket de corta duración para que el frontend abra SSE */
  crearTicket(usuarioId: number, secretaria: string | null): string {
    const token = randomBytes(24).toString('hex');
    this.tickets.set(token, {
      usuarioId,
      secretaria,
      expiresAt: Date.now() + 30_000, // 30 segundos
    });
    // Limpiar tickets viejos
    for (const [k, t] of this.tickets) {
      if (t.expiresAt < Date.now()) this.tickets.delete(k);
    }
    return token;
  }

  /** Valida y consume el ticket (un solo uso) */
  consumirTicket(token: string): Ticket | null {
    const ticket = this.tickets.get(token);
    if (!ticket) return null;
    this.tickets.delete(token); // un solo uso
    if (ticket.expiresAt < Date.now()) return null;
    return ticket;
  }

  // ── SSE ───────────────────────────────────────────────────────────────────

  subscribe(clientId: string, secretaria: string | null): Observable<MessageEvent> {
    const subject = new Subject<MessageEvent>();
    this.clients.set(clientId, { subject, secretaria });
    return subject.asObservable().pipe(
      finalize(() => this.clients.delete(clientId)),
    );
  }

  /** Broadcast filtrado por secretaría */
  broadcast(tipo: string, data?: any, secretaria?: string | null) {
    if (this.clients.size === 0) return;
    const payload: SigamEvent = { tipo, data, secretaria, ts: Date.now() };
    const msg = { data: JSON.stringify(payload) } as MessageEvent;

    for (const [, client] of this.clients) {
      // null = LOGISTICA/VISOR, ve todo; coincidencia exacta de secretaría
      if (secretaria === undefined || client.secretaria === null || client.secretaria === secretaria) {
        client.subject.next(msg);
      }
    }
  }

  get connectedClients(): number {
    return this.clients.size;
  }
}
