import { CommonModule } from '@angular/common';
import { HttpErrorResponse } from '@angular/common/http';
import { Component, inject, signal } from '@angular/core';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { Router, RouterLink } from '@angular/router';
import { AuthService } from '../../core/auth.service';

@Component({
  standalone: true, selector: 'app-registro', imports: [CommonModule, ReactiveFormsModule, RouterLink],
  template: `<main class="page"><section class="card"><a class="brand" routerLink="/login"><b>PJ</b><span><strong>punto de juego</strong><small>RESERVAS DEPORTIVAS</small></span></a><span class="eyebrow">RESERVÁ ONLINE</span><h1>Creá tu cuenta</h1><p>Registrate para consultar horarios y solicitar tu turno.</p>@if(error()){<div class="error" role="alert">{{error()}}</div>}<form [formGroup]="form" (ngSubmit)="submit()" novalidate>
  <label>Nombre completo<input formControlName="nombre" autocomplete="name" placeholder="Tu nombre"></label>@if(bad('nombre')){<small>Ingresá tu nombre.</small>}
  <label>Correo electrónico<input type="email" formControlName="email" autocomplete="email" placeholder="nombre@correo.com"></label>@if(bad('email')){<small>Ingresá un correo válido.</small>}
  <label>Teléfono (opcional)<input type="tel" formControlName="telefono" autocomplete="tel" placeholder="11 1234 5678"></label>
  <label>Contraseña<input type="password" formControlName="password" autocomplete="new-password" placeholder="Mínimo 12 caracteres"></label>@if(bad('password')){<small>Usá al menos 12 caracteres.</small>}
  <button [disabled]="form.invalid || loading()">{{loading()?'Creando cuenta…':'Crear cuenta'}}</button></form><footer>¿Ya tenés cuenta? <a routerLink="/login">Iniciá sesión</a></footer></section></main>`,
  styles: [`:host{display:block;min-height:100vh}.page{min-height:100vh;display:grid;place-items:center;padding:22px;background:radial-gradient(ellipse at 50% 0%,#e9f2dc,transparent 58%),#f4f7f2}.card{width:min(100%,430px);padding:32px;background:white;border:1px solid #e9eee8;border-radius:14px;box-shadow:0 18px 55px #243a2b12}.brand{display:flex;align-items:center;gap:11px;color:#20352b;text-decoration:none;margin-bottom:28px}.brand b{width:38px;height:38px;border-radius:12px;background:#b8e469;display:grid;place-items:center}.brand strong,.brand small{display:block}.brand strong{font-size:14px}.brand small{margin-top:4px;color:#91a59c;font-size:8px;letter-spacing:1.2px}.eyebrow{font-size:9px;font-weight:800;letter-spacing:1.4px;color:#7b9c56}.card h1{font-size:27px;margin:8px 0}.card p,footer{font-size:11px;color:#849089}.card form{display:grid;gap:12px}.card label{display:grid;gap:6px;font-size:10px;font-weight:700;color:#526158}.card input{box-sizing:border-box;width:100%;border:1px solid #e1e7e1;border-radius:6px;padding:11px 12px;font-size:12px;outline:none}.card input:focus{border-color:#9fc76c}.card small{font-size:9px;color:#a0493d;margin-top:-8px}.card button{margin-top:5px;border:0;border-radius:7px;padding:12px;background:#a9d85d;color:#203622;font-weight:800;cursor:pointer}.card button:disabled{opacity:.55;cursor:not-allowed}.error{padding:10px;margin-bottom:12px;background:#fff0ed;color:#a0493d;font-size:11px;border-radius:6px}footer{text-align:center;margin-top:18px}a:not(.brand){color:#567d2d;font-weight:700}`],
})
export class RegistroPage {
  private readonly fb=inject(FormBuilder); private readonly auth=inject(AuthService); private readonly router=inject(Router);
  readonly loading=signal(false); readonly error=signal('');
  readonly form=this.fb.nonNullable.group({nombre:['',[Validators.required,Validators.maxLength(100)]],email:['',[Validators.required,Validators.email,Validators.maxLength(150)]],telefono:['',Validators.maxLength(30)],password:['',[Validators.required,Validators.minLength(12),Validators.maxLength(72)]]});
  bad(control:'nombre'|'email'|'password'):boolean{const c=this.form.controls[control];return c.invalid&&(c.dirty||c.touched);}
  submit():void{this.form.markAllAsTouched();if(this.form.invalid)return;this.loading.set(true);this.error.set('');this.auth.register(this.form.getRawValue()).subscribe({next:()=>{this.loading.set(false);void this.router.navigateByUrl('/turnos');},error:(e:HttpErrorResponse)=>{this.loading.set(false);this.error.set(e.status===409?'Ese correo ya tiene una cuenta.':e.status===0?'No se pudo conectar con el servidor.':e.error?.message??'No se pudo crear la cuenta. Revisá los datos.');}});}
}
