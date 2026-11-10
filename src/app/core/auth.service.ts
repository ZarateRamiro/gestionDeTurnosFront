import { isPlatformBrowser } from '@angular/common';
import { HttpClient } from '@angular/common/http';
import { inject, Injectable, PLATFORM_ID, signal } from '@angular/core';
import { tap } from 'rxjs';
import { LoginResponse } from './models';

/** Mantiene la sesión del usuario y centraliza login, registro y logout. */
@Injectable({ providedIn: 'root' })
export class AuthService {
  private readonly http = inject(HttpClient);
  private readonly platformId = inject(PLATFORM_ID);
  private readonly storageKey = 'gestion-turnos-token';
  private readonly nameKey = 'gestion-turnos-admin-name';
  private readonly roleKey = 'gestion-turnos-role';
  // Signals notifican a los componentes cuando cambia la sesión.
  readonly token = signal(this.readStoredValue(this.storageKey));
  readonly nombre = signal(this.readStoredValue(this.nameKey) ?? '');
  readonly rol = signal(this.readStoredValue(this.roleKey) ?? '');

  // El token y los datos de perfil se guardan solo después de un login exitoso.
  login(email: string, password: string) {
    return this.http.post<LoginResponse>('/api/v1/auth/login', { email, password }).pipe(
      tap((response) => this.storeSession(response)),
    );
  }

  register(data: { nombre: string; email: string; telefono?: string; password: string }) {
    return this.http.post<LoginResponse>('/api/v1/auth/register', data).pipe(tap((response) => this.storeSession(response)));
  }

  // SSR no tiene localStorage; isPlatformBrowser evita accederlo fuera del navegador.
  logout(): void {
    if (isPlatformBrowser(this.platformId)) {
      localStorage.removeItem(this.storageKey);
      localStorage.removeItem(this.nameKey);
      localStorage.removeItem(this.roleKey);
    }
    this.token.set(null);
    this.nombre.set('');
    this.rol.set('');
  }

  isAuthenticated(): boolean { return !!this.token(); }

  private readStoredValue(key: string): string | null {
    return isPlatformBrowser(this.platformId) ? localStorage.getItem(key) : null;
  }

  private storeSession(response: LoginResponse): void {
    if (isPlatformBrowser(this.platformId)) {
      localStorage.setItem(this.storageKey, response.token);
      localStorage.setItem(this.nameKey, response.nombre);
      localStorage.setItem(this.roleKey, response.rol);
    }
    this.token.set(response.token); this.nombre.set(response.nombre); this.rol.set(response.rol);
  }
}
