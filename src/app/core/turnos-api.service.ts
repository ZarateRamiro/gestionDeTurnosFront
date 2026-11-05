import { HttpClient } from '@angular/common/http';
import { inject, Injectable } from '@angular/core';
import { Cancha, Cliente, HorarioDisponible, Reserva } from './models';

@Injectable({ providedIn: 'root' })
export class TurnosApiService {
  private readonly http = inject(HttpClient);
  private readonly base = '/api/v1';
  canchas() { return this.http.get<Cancha[]>(`${this.base}/canchas`); }
  disponibilidad(canchaId: number, fecha: string, duracionHoras: number) { return this.http.get<HorarioDisponible[]>(`${this.base}/disponibilidad`, { params: { canchaId, fecha, duracionHoras } }); }
  solicitarTurno(data: { canchaId: number; fecha: string; horaInicio: string; horaFin: string; observaciones?: string }) { return this.http.post<Reserva>(`${this.base}/reservas/solicitudes`, data); }
  misReservas() { return this.http.get<Reserva[]>(`${this.base}/reservas/mis-reservas`); }
  clientes() { return this.http.get<Cliente[]>(`${this.base}/clientes`); }
  reservas(canchaId: number, fecha: string) {
    return this.http.get<Reserva[]>(`${this.base}/reservas`, { params: { canchaId, fecha } });
  }
  crearCliente(cliente: { nombre: string; email: string; telefono: string }) {
    return this.http.post<Cliente>(`${this.base}/clientes`, cliente);
  }
  crearCancha(cancha: { nombre: string; direccion: string; tipoSuperficie: string; capacidadJugadores: number; precioPorHora: number }) {
    return this.http.post<Cancha>(`${this.base}/canchas`, cancha);
  }
  crearReserva(reserva: { canchaId: number; usuarioId: number; fecha: string; horaInicio: string; horaFin: string; observaciones: string }) {
    return this.http.post<Reserva>(`${this.base}/reservas`, reserva);
  }
  cancelarReserva(id: number) { return this.http.patch<Reserva>(`${this.base}/reservas/${id}/cancelar`, {}); }
}
