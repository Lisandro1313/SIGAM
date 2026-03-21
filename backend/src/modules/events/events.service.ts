import { Injectable } from '@nestjs/common';
import { Observable, Subject } from 'rxjs';
import { finalize } from 'rxjs/operators';

export interface SigamEvent {
  tipo: string;   // e.g. 'remito:confirmado', 'caso:nuevo'
  data?: any;
  ts: number;
}

@Injectable()
export class EventsService {
  private clients = new Set<Subject<MessageEvent>>();

  /** El usuario se suscribe al stream SSE */
  subscribe(): Observable<MessageEvent> {
    const subject = new Subject<MessageEvent>();
    this.clients.add(subject);
    return subject.asObservable().pipe(
      finalize(() => this.clients.delete(subject)),
    );
  }

  /** Emitir evento a todos los clientes conectados */
  broadcast(tipo: string, data?: any) {
    if (this.clients.size === 0) return;
    const payload: SigamEvent = { tipo, data, ts: Date.now() };
    const msg = { data: JSON.stringify(payload) } as MessageEvent;
    for (const client of this.clients) {
      client.next(msg);
    }
  }

  get connectedClients(): number {
    return this.clients.size;
  }
}
