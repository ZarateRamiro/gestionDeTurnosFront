export interface Cancha {
  id: number; nombre: string; direccion: string; tipoSuperficie: string;
  capacidadJugadores: number; precioPorHora: number; activa: boolean;
  horaApertura: string; horaCierre: string;
}
export interface Cliente { id: number; nombre: string; email: string; telefono?: string; }
export interface Reserva {
  id: number; canchaId: number; cancha: string; usuarioId: number; cliente: string;
  fecha: string; horaInicio: string; horaFin: string; estado: 'PENDIENTE' | 'CONFIRMADA' | 'CANCELADA';
  precioTotal: number; observaciones?: string;
}
export interface LoginResponse { token: string; tipo: string; expiraEnSegundos: number; nombre: string; rol: 'ADMINISTRADOR' | 'CLIENTE'; clienteId: number | null; }
export interface HorarioDisponible { horaInicio: string; horaFin: string; precioTotal: number; }
