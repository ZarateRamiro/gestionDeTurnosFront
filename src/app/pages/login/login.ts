import { CommonModule } from '@angular/common';
import { HttpErrorResponse } from '@angular/common/http';
import { Component, inject, signal } from '@angular/core';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { Router, RouterLink } from '@angular/router';
import { AuthService } from '../../core/auth.service';

@Component({
  standalone: true,
  selector: 'app-login',
  imports: [CommonModule, ReactiveFormsModule, RouterLink],
  template: `
    <main class="login-page">
      <section class="login-card">
        <a class="login-brand" href="/"><span class="brand-mark">PJ</span><span><strong>punto de juego</strong><small>GESTIÓN DEPORTIVA</small></span></a>
        <div class="login-intro"><span class="eyebrow">PANEL DE ADMINISTRACIÓN</span><h1>Qué bueno verte</h1><p>Ingresá con tu cuenta para administrar los turnos.</p></div>
        @if (error()) { <div class="login-error" role="alert">{{ error() }}</div> }
        <form [formGroup]="form" (ngSubmit)="submit()" novalidate>
          <label>Correo electrónico<input type="email" formControlName="email" autocomplete="username" placeholder="admin@tucancha.com" [class.invalid]="showError('email')"></label>
          @if (showError('email')) { <small class="field-error">Ingresá un correo válido.</small> }
          <label>Contraseña<input type="password" formControlName="password" autocomplete="current-password" placeholder="Tu contraseña" [class.invalid]="showError('password')"></label>
          @if (showError('password')) { <small class="field-error">La contraseña es obligatoria.</small> }
          <button class="login-submit" type="submit" [disabled]="form.invalid || loading()">{{ loading() ? 'Ingresando…' : 'Ingresar al panel' }}</button>
        </form>
        <p class="login-hint">¿Querés reservar una cancha? <a routerLink="/registro">Creá tu cuenta</a></p>
      </section>
    </main>
  `,
  styles: [`
    :host{display:block;min-height:100vh}.login-page{min-height:100vh;display:grid;place-items:center;padding:24px;background:radial-gradient(ellipse at 50% 0%,#e9f2dc,transparent 58%),#f4f7f2}.login-card{width:min(100%,410px);background:#fff;border:1px solid #e9eee8;border-radius:14px;padding:34px;box-shadow:0 18px 55px #243a2b12}.login-brand{display:flex;align-items:center;gap:11px;text-decoration:none;color:#20352b}.brand-mark{width:38px;height:38px;border-radius:12px;background:#b8e469;color:#173427;display:grid;place-items:center;font-size:13px;font-weight:900}.login-brand strong,.login-brand small{display:block}.login-brand strong{font-size:14px}.login-brand small{color:#91a59c;font-size:8px;font-weight:700;letter-spacing:1.2px;margin-top:4px}.login-intro{margin:37px 0 22px}.eyebrow{color:#7b9c56;font-size:9px;font-weight:800;letter-spacing:1.4px}.login-intro h1{font-size:27px;letter-spacing:-.8px;margin:9px 0 7px}.login-intro p,.login-hint{font-size:11px;color:#849089;margin:0}.login-card form{display:flex;flex-direction:column;gap:12px}.login-card label{display:flex;flex-direction:column;gap:7px;font-size:10px;font-weight:700;color:#526158}.login-card input{border:1px solid #e1e7e1;border-radius:6px;padding:11px 12px;font-size:12px;outline:none}.login-card input:focus{border-color:#9fc76c;box-shadow:0 0 0 3px #a9d85d20}.login-card input.invalid{border-color:#d99588}.field-error{font-size:9px;color:#a0493d;margin-top:-7px}.login-error{margin-bottom:14px;padding:10px;border-radius:6px;background:#fff0ed;color:#a0493d;font-size:10px}.login-submit{margin-top:7px;border:0;border-radius:7px;padding:12px;background:#a9d85d;color:#203622;font-size:11px;font-weight:800;cursor:pointer}.login-submit:disabled{opacity:.55;cursor:not-allowed}.login-hint{text-align:center;margin-top:18px;font-size:9px}
  `],
})
export class LoginPage {
  private readonly fb = inject(FormBuilder);
  private readonly auth = inject(AuthService);
  private readonly router = inject(Router);
  readonly loading = signal(false);
  readonly error = signal('');
  readonly form = this.fb.nonNullable.group({ email: ['', [Validators.required, Validators.email]], password: ['', Validators.required] });
  showError(control: 'email' | 'password'): boolean {
    const field = this.form.controls[control];
    return field.invalid && (field.touched || field.dirty);
  }
  submit(): void {
    this.form.markAllAsTouched();
    if (this.form.invalid) return;
    this.error.set(''); this.loading.set(true);
    const credentials = this.form.getRawValue();
    this.auth.login(credentials.email, credentials.password).subscribe({
      next: (response) => { this.loading.set(false); void this.router.navigateByUrl(response.rol === 'CLIENTE' ? '/turnos' : '/'); },
      error: (err: HttpErrorResponse) => {
        this.loading.set(false);
        this.error.set(err.status === 0 ? 'No se pudo conectar con el servidor.' : 'Correo o contraseña incorrectos.');
      },
    });
  }
}
