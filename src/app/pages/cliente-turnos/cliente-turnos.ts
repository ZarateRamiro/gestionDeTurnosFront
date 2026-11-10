import { CommonModule } from '@angular/common';
import { HttpErrorResponse } from '@angular/common/http';
import { Component, OnInit, inject, signal } from '@angular/core';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { Router } from '@angular/router';
import { TimeoutError, finalize, timeout } from 'rxjs';
import { AuthService } from '../../core/auth.service';
import { Cancha, HorarioDisponible, Reserva } from '../../core/models';
import { TurnosApiService } from '../../core/turnos-api.service';

@Component({
  standalone: true,
  selector: 'app-cliente-turnos',
  imports: [CommonModule, ReactiveFormsModule],
  templateUrl: './cliente-turnos.html',
  styleUrl: './cliente-turnos.css',
})
/** Pantalla del cliente: busca disponibilidad y permite solicitar sus propios turnos. */
export class ClienteTurnosPage implements OnInit {
  private readonly api = inject(TurnosApiService);
  private readonly fb = inject(FormBuilder);
  private readonly router = inject(Router);
  readonly auth = inject(AuthService);
  // Signals representan datos visibles y estados de carga/error para la plantilla.
  readonly today = this.dateKey(new Date());
  readonly canchas = signal<Cancha[]>([]);
  readonly horarios = signal<HorarioDisponible[]>([]);
  readonly reservas = signal<Reserva[]>([]);
  readonly loading = signal(false);
  readonly solicitando = signal(false);
  readonly cargandoCanchas = signal(true);
  readonly cargandoReservas = signal(true);
  readonly busquedaRealizada = signal(false);
  readonly error = signal('');
  readonly notice = signal('');
  readonly form = this.fb.nonNullable.group({
    canchaId: [null as number | null, Validators.required],
    fecha: [this.today, Validators.required],
    duracionHoras: [1, Validators.required],
  });
  ngOnInit(): void {
    this.api
      .canchas()
      .pipe(
        timeout(15000),
        finalize(() => this.cargandoCanchas.set(false)),
      )
      .subscribe({
        next: (list) => {
          const active = list.filter((c) => c.activa);
          this.canchas.set(active);
          if (active.length) this.form.controls.canchaId.setValue(active[0].id);
        },
        error: (e) => this.error.set(this.message(e)),
      });
    this.cargarReservas();
  }
  // Valida filtros, consulta el servicio y garantiza quitar el indicador al completar o fallar.
  buscar(): void {
    this.form.markAllAsTouched();
    if (this.form.invalid) return;
    const { canchaId, fecha, duracionHoras } = this.form.getRawValue();
    if (canchaId === null) return;
    this.loading.set(true);
    this.error.set('');
    this.busquedaRealizada.set(true);
    this.api
      .disponibilidad(canchaId, fecha, duracionHoras)
      .pipe(
        timeout(15000),
        finalize(() => this.loading.set(false)),
      )
      .subscribe({
        next: (x) => this.horarios.set(x),
        error: (e) => this.error.set(this.message(e)),
      });
  }
  solicitar(s: HorarioDisponible): void {
    const { canchaId, fecha } = this.form.getRawValue();
    if (canchaId === null) return;
    this.solicitando.set(true);
    this.error.set('');
    this.api
      .solicitarTurno({ canchaId, fecha, horaInicio: s.horaInicio, horaFin: s.horaFin })
      .pipe(
        timeout(15000),
        finalize(() => this.solicitando.set(false)),
      )
      .subscribe({
        next: () => {
          this.notice.set('Solicitud enviada. Ya aparece en tus turnos.');
          this.buscar();
          this.cargarReservas();
        },
        error: (e) => {
          this.error.set(this.message(e));
          this.buscar();
        },
      });
  }
  cargarReservas(): void {
    this.cargandoReservas.set(true);
    this.api
      .misReservas()
      .pipe(
        timeout(15000),
        finalize(() => this.cargandoReservas.set(false)),
      )
      .subscribe({
        next: (x) => this.reservas.set(x),
        error: (e) => this.error.set(this.message(e)),
      });
  }
  logout(): void {
    this.auth.logout();
    void this.router.navigateByUrl('/login');
  }
  private message(error: unknown): string {
    if (error instanceof TimeoutError)
      return 'El servidor tardó más de 15 segundos. Verificá que el backend esté levantado y probá de nuevo.';
    const e = error as HttpErrorResponse;
    return e.status === 0
      ? 'No se pudo conectar con el servidor.'
      : e.status === 409
        ? 'Ese horario acaba de ocuparse. Elegí otro horario.'
        : (e.error?.error ?? e.error?.message ?? 'Ocurrió un error. Intentá nuevamente.');
  }
  private dateKey(d: Date): string {
    const local = new Date(d.getTime() - d.getTimezoneOffset() * 60000);
    return local.toISOString().slice(0, 10);
  }
}
