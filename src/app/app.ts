import { CommonModule, isPlatformBrowser, registerLocaleData } from '@angular/common';
import localeEsAr from '@angular/common/locales/es-AR';
import { HttpErrorResponse } from '@angular/common/http';
import { Component, OnInit, PLATFORM_ID, computed, inject, signal } from '@angular/core';
import { AbstractControl, FormBuilder, FormsModule, ReactiveFormsModule, ValidationErrors, Validators } from '@angular/forms';
import { Router } from '@angular/router';
import { AuthService } from './core/auth.service';
import { Cancha, Cliente, Reserva } from './core/models';
import { TurnosApiService } from './core/turnos-api.service';

registerLocaleData(localeEsAr);

function validBookingRange(control: AbstractControl): ValidationErrors | null {
  const { horaInicio, horaFin } = control.value as { horaInicio?: string; horaFin?: string };
  return horaInicio && horaFin && horaFin <= horaInicio ? { invalidTimeRange: true } : null;
}

@Component({
  selector: 'app-root',
  standalone: true,
  imports: [CommonModule, FormsModule, ReactiveFormsModule],
  templateUrl: './app.html',
})
export class App implements OnInit {
  private readonly api = inject(TurnosApiService);
  private readonly fb = inject(FormBuilder);
  private readonly auth = inject(AuthService);
  private readonly router = inject(Router);
  private readonly platformId = inject(PLATFORM_ID);

  readonly today = this.dateKey(new Date());
  readonly canchas = signal<Cancha[]>([]);
  readonly clientes = signal<Cliente[]>([]);
  readonly reservas = signal<Reserva[]>([]);
  readonly fecha = signal(this.today);
  readonly canchaId = signal<number | null>(null);
  readonly loading = signal(false);
  readonly error = signal('');
  readonly notice = signal('');
  readonly showBooking = signal(false);
  readonly showClient = signal(false);
  readonly showCourt = signal(false);
  readonly editingCourtId = signal<number | null>(null);
  readonly selectedCourt = computed(() => this.canchas().find((court) => court.id === Number(this.canchaId())));
  readonly confirmedCount = computed(() => this.reservas().filter((r) => r.estado === 'CONFIRMADA').length);
  readonly pendingCount = computed(() => this.reservas().filter((r) => r.estado === 'PENDIENTE').length);
  readonly adminName = this.auth.nombre;
  readonly bookingForm = this.fb.nonNullable.group({ canchaId: [null as number | null, Validators.required], usuarioId: [null as number | null, Validators.required], fecha: [this.today, Validators.required], horaInicio: ['18:00', Validators.required], horaFin: ['19:00', Validators.required], observaciones: [''] }, { validators: validBookingRange });
  readonly clientForm = this.fb.nonNullable.group({ nombre: ['', [Validators.required, Validators.maxLength(100)]], email: ['', [Validators.required, Validators.email, Validators.maxLength(150)]], telefono: ['', Validators.maxLength(30)] });
  readonly courtForm = this.fb.nonNullable.group({ nombre: ['', [Validators.required, Validators.maxLength(100)]], direccion: ['', [Validators.required, Validators.maxLength(150)]], tipoSuperficie: ['Césped sintético', Validators.maxLength(30)], capacidadJugadores: [10, [Validators.required, Validators.min(2), Validators.max(30)]], precioPorHora: [35000, [Validators.required, Validators.min(1)]], horaApertura: ['08:00', Validators.required], horaCierre: ['23:00', Validators.required] });

  ngOnInit(): void { if (isPlatformBrowser(this.platformId)) this.loadBase(); }

  loadBase(): void {
    this.loading.set(true); this.error.set('');
    this.api.canchas().subscribe({
      next: (courts) => {
        this.canchas.set(courts);
        if (!this.canchaId() && courts.length) this.canchaId.set(courts[0].id);
        this.loadClients(); this.loadReservations();
      },
      error: (err: HttpErrorResponse) => { this.error.set(this.errorMessage(err)); this.loading.set(false); },
    });
  }

  loadClients(): void {
    this.api.clientes().subscribe({
      next: (clients) => this.clientes.set(clients),
      error: (err: HttpErrorResponse) => this.error.set(this.errorMessage(err)),
    });
  }

  loadReservations(): void {
    const canchaId = this.canchaId(); const fecha = this.fecha();
    if (!canchaId || !fecha) { this.reservas.set([]); this.loading.set(false); return; }
    this.loading.set(true);
    this.api.reservas(canchaId, fecha).subscribe({
      next: (bookings) => { this.reservas.set(bookings); this.loading.set(false); },
      error: (err: HttpErrorResponse) => { this.error.set(this.errorMessage(err)); this.loading.set(false); },
    });
  }

  createClient(): void {
    this.clientForm.markAllAsTouched();
    if (this.clientForm.invalid) return;
    this.error.set(''); this.notice.set('');
    this.api.crearCliente(this.clientForm.getRawValue()).subscribe({
      next: (created) => {
        this.clientes.update((clients) => [...clients, created]); this.bookingForm.controls.usuarioId.setValue(created.id);
        this.clientForm.reset(); this.showClient.set(false);
        this.notice.set('Cliente registrado. Ya podés asignarle un turno.');
      },
      error: (err: HttpErrorResponse) => this.error.set(this.errorMessage(err)),
    });
  }

  createCourt(): void {
    this.courtForm.markAllAsTouched();
    if (this.courtForm.invalid) return;
    const data = this.courtForm.getRawValue();
    if (data.horaCierre <= data.horaApertura) {
      this.courtForm.controls.horaCierre.setErrors({ invalidRange: true });
      return;
    }
    this.error.set(''); this.notice.set('');
    const editingId = this.editingCourtId();
    const save = editingId ? this.api.actualizarCancha(editingId, data) : this.api.crearCancha(data);
    save.subscribe({
      next: (saved) => {
        if (editingId) this.canchas.update((courts) => courts.map((court) => court.id === saved.id ? saved : court));
        else this.canchas.update((courts) => [...courts, saved]);
        this.canchaId.set(saved.id); this.bookingForm.controls.canchaId.setValue(saved.id);
        this.resetCourtForm();
        this.showCourt.set(false); this.notice.set(editingId ? 'Cancha y horario actualizados.' : 'Cancha creada. Ya podés agendar turnos.'); this.loadReservations();
      },
      error: (err: HttpErrorResponse) => this.error.set(this.errorMessage(err)),
    });
  }

  openCourtForm(court?: Cancha): void {
    this.editingCourtId.set(court?.id ?? null);
    this.courtForm.reset(court ? {
      nombre: court.nombre, direccion: court.direccion, tipoSuperficie: court.tipoSuperficie ?? '',
      capacidadJugadores: court.capacidadJugadores, precioPorHora: court.precioPorHora,
      horaApertura: court.horaApertura?.slice(0, 5) ?? '08:00', horaCierre: court.horaCierre?.slice(0, 5) ?? '23:00',
    } : { nombre: '', direccion: '', tipoSuperficie: 'Césped sintético', capacidadJugadores: 10, precioPorHora: 35000, horaApertura: '08:00', horaCierre: '23:00' });
    this.showCourt.set(true);
  }

  closeCourtForm(): void { this.showCourt.set(false); this.resetCourtForm(); }

  private resetCourtForm(): void {
    this.editingCourtId.set(null);
    this.courtForm.reset({ nombre: '', direccion: '', tipoSuperficie: 'Césped sintético', capacidadJugadores: 10, precioPorHora: 35000, horaApertura: '08:00', horaCierre: '23:00' });
  }

  createBooking(): void {
    this.bookingForm.markAllAsTouched();
    if (this.bookingForm.invalid) return;
    const { canchaId, usuarioId, fecha, horaInicio, horaFin, observaciones } = this.bookingForm.getRawValue();
    if (!canchaId || !usuarioId || !fecha) return;
    this.error.set(''); this.notice.set('');
    this.api.crearReserva({ canchaId, usuarioId, fecha, horaInicio, horaFin, observaciones }).subscribe({
      next: () => {
        this.showBooking.set(false); this.canchaId.set(canchaId); this.fecha.set(fecha);
        this.bookingForm.reset({ canchaId, usuarioId: null, fecha, horaInicio: '18:00', horaFin: '19:00', observaciones: '' });
        this.notice.set('El turno se reservó correctamente.'); this.loadReservations();
      },
      error: (err: HttpErrorResponse) => this.error.set(this.errorMessage(err)),
    });
  }

  cancelBooking(reservation: Reserva): void {
    if (!confirm(`¿Cancelar el turno de ${reservation.cliente} a las ${reservation.horaInicio.slice(0, 5)}?`)) return;
    this.error.set(''); this.notice.set('');
    this.api.cancelarReserva(reservation.id).subscribe({
      next: () => { this.notice.set('El turno fue cancelado y el horario quedó libre.'); this.loadReservations(); },
      error: (err: HttpErrorResponse) => this.error.set(this.errorMessage(err)),
    });
  }

  logout(): void { this.auth.logout(); void this.router.navigateByUrl('/login'); }

  openBooking(): void {
    this.bookingForm.reset({ canchaId: this.canchaId(), usuarioId: null, fecha: this.fecha(), horaInicio: '18:00', horaFin: '19:00', observaciones: '' });
    this.showBooking.set(true);
  }

  duration(reservation: Reserva): string {
    const [startHour, startMinute] = reservation.horaInicio.split(':').map(Number);
    const [endHour, endMinute] = reservation.horaFin.split(':').map(Number);
    const minutes = (endHour * 60 + endMinute) - (startHour * 60 + startMinute);
    const hours = Math.floor(minutes / 60); const remainder = minutes % 60;
    return remainder ? `${hours} h ${remainder} min` : `${hours} h`;
  }

  private errorMessage(error: HttpErrorResponse): string {
    if (error.status === 0) return 'No se pudo conectar con el backend. Verificá que Spring Boot esté ejecutándose.';
    if (error.status === 401) return 'La sesión venció. Volvé a ingresar.';
    if (error.status === 403) return 'Tu cuenta no tiene permisos para esta operación.';
    return error.error?.error ?? 'Ocurrió un error. Revisá los datos e intentá nuevamente.';
  }
  private dateKey(date: Date): string {
    const local = new Date(date.getTime() - date.getTimezoneOffset() * 60000);
    return local.toISOString().slice(0, 10);
  }
}
