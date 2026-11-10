import { HttpClient, HttpErrorResponse, provideHttpClient, withInterceptors } from '@angular/common/http';
import { provideHttpClientTesting, HttpTestingController } from '@angular/common/http/testing';
import { signal } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { ActivatedRouteSnapshot, provideRouter, Router, RouterStateSnapshot, UrlTree } from '@angular/router';
import { of, throwError } from 'rxjs';
import { vi } from 'vitest';
import { App } from './app';
import { authGuard, roleGuard } from './core/auth.guard';
import { authInterceptor } from './core/auth.interceptor';
import { LoginPage } from './pages/login/login';
import { RegistroPage } from './pages/registro/registro';
import { ClienteTurnosPage } from './pages/cliente-turnos/cliente-turnos';
import { AuthService } from './core/auth.service';
import { TurnosApiService } from './core/turnos-api.service';
import { routes } from './app.routes';

describe('TurnosApiService', () => {
  let api: TurnosApiService;
  let http: HttpTestingController;

  beforeEach(() => {
    TestBed.configureTestingModule({ providers: [provideHttpClient(), provideHttpClientTesting()] });
    api = TestBed.inject(TurnosApiService);
    http = TestBed.inject(HttpTestingController);
  });

  afterEach(() => http.verify());

  it('consulta las canchas activas del backend', () => {
    api.canchas().subscribe((canchas) => expect(canchas[0].nombre).toBe('Cancha 1'));
    const request = http.expectOne('/api/v1/canchas');
    expect(request.request.method).toBe('GET');
    request.flush([{ id: 1, nombre: 'Cancha 1', direccion: 'Centro', tipoSuperficie: 'Sintético', capacidadJugadores: 10, precioPorHora: 25000, activa: true }]);
  });

  it('envía los filtros de cancha y fecha al consultar reservas', () => {
    api.reservas(3, '2026-12-01').subscribe((reservas) => expect(reservas).toHaveLength(0));
    const request = http.expectOne((req) => req.url === '/api/v1/reservas' && req.params.get('canchaId') === '3' && req.params.get('fecha') === '2026-12-01');
    expect(request.request.method).toBe('GET');
    request.flush([]);
  });

  it('usa los endpoints de disponibilidad, cliente y reserva', () => {
    api.disponibilidad(2, '2026-12-01', 2).subscribe();
    let request = http.expectOne((req) => req.url === '/api/v1/disponibilidad' && req.params.get('duracionHoras') === '2');
    expect(request.request.method).toBe('GET'); request.flush([]);

    api.solicitarTurno({ canchaId: 2, fecha: '2026-12-01', horaInicio: '18:00', horaFin: '19:00' }).subscribe();
    request = http.expectOne('/api/v1/reservas/solicitudes');
    expect(request.request.method).toBe('POST'); request.flush({} as never);

    api.misReservas().subscribe();
    request = http.expectOne('/api/v1/reservas/mis-reservas');
    expect(request.request.method).toBe('GET'); request.flush([]);
  });

  it('expone los endpoints de administración para clientes, canchas y reservas', () => {
    api.clientes().subscribe(); http.expectOne('/api/v1/clientes').flush([]);
    api.crearCliente({ nombre: 'Ana', email: 'ana@test.local', telefono: '' }).subscribe();
    http.expectOne('/api/v1/clientes').flush({} as never);
    api.crearCancha({ nombre: 'A', direccion: 'B', tipoSuperficie: 'Sintético', capacidadJugadores: 10, precioPorHora: 1, horaApertura: '08:00', horaCierre: '23:00' }).subscribe();
    http.expectOne({ method: 'POST', url: '/api/v1/canchas' }).flush({} as never);
    api.actualizarCancha(1, { nombre: 'A', direccion: 'B', tipoSuperficie: 'Sintético', capacidadJugadores: 10, precioPorHora: 1, horaApertura: '08:00', horaCierre: '23:00' }).subscribe();
    http.expectOne({ method: 'PUT', url: '/api/v1/canchas/1' }).flush({} as never);
    api.crearReserva({ canchaId: 1, usuarioId: 2, fecha: '2026-12-01', horaInicio: '18:00', horaFin: '19:00', observaciones: '' }).subscribe();
    http.expectOne({ method: 'POST', url: '/api/v1/reservas' }).flush({} as never);
    api.cancelarReserva(3).subscribe();
    http.expectOne({ method: 'PATCH', url: '/api/v1/reservas/3/cancelar' }).flush({} as never);
  });
});

describe('AuthService', () => {
  let auth: AuthService;
  let http: HttpTestingController;

  beforeEach(() => {
    localStorage.clear();
    TestBed.configureTestingModule({ providers: [provideHttpClient(), provideHttpClientTesting()] });
    auth = TestBed.inject(AuthService);
    http = TestBed.inject(HttpTestingController);
  });

  afterEach(() => { http.verify(); localStorage.clear(); });

  it('guarda los datos de sesión al iniciar sesión y los limpia al salir', () => {
    auth.login('ana@test.local', 'una-clave').subscribe();
    const request = http.expectOne('/api/v1/auth/login');
    expect(request.request.method).toBe('POST');
    request.flush({ token: 'jwt-demo', tipo: 'Bearer', expiraEnSegundos: 10, nombre: 'Ana', rol: 'CLIENTE', clienteId: 7 });
    expect(auth.isAuthenticated()).toBe(true);
    expect(auth.rol()).toBe('CLIENTE');
    expect(localStorage.getItem('gestion-turnos-token')).toBe('jwt-demo');

    auth.logout();
    expect(auth.isAuthenticated()).toBe(false);
    expect(localStorage.getItem('gestion-turnos-token')).toBeNull();
  });
});

describe('LoginPage', () => {
  beforeEach(() => TestBed.configureTestingModule({
    imports: [LoginPage],
    providers: [provideRouter([]), provideHttpClient(), provideHttpClientTesting()],
  }));

  afterEach(() => TestBed.inject(HttpTestingController).verify());

  it('valida correo y contraseña antes de habilitar el acceso', () => {
    const fixture = TestBed.createComponent(LoginPage);
    const component = fixture.componentInstance;
    expect(component.form.invalid).toBe(true);
    component.form.setValue({ email: 'admin@cancha.com', password: 'secreto' });
    expect(component.form.valid).toBe(true);
  });

  it('muestra validación y no envía un formulario incompleto', () => {
    const component = TestBed.createComponent(LoginPage).componentInstance;
    component.submit();
    expect(component.showError('email')).toBe(true);
    expect(component.loading()).toBe(false);
    TestBed.inject(HttpTestingController).expectNone('/api/v1/auth/login');
  });

  it('muestra un mensaje si las credenciales son rechazadas', () => {
    const component = TestBed.createComponent(LoginPage).componentInstance;
    component.form.setValue({ email: 'ana@test.local', password: 'incorrecta' });
    component.submit();
    TestBed.inject(HttpTestingController).expectOne('/api/v1/auth/login').flush({ error: 'Unauthorized' }, { status: 401, statusText: 'Unauthorized' });
    expect(component.error()).toBe('Correo o contraseña incorrectos.');
    expect(component.loading()).toBe(false);
  });
});

describe('RegistroPage', () => {
  beforeEach(() => TestBed.configureTestingModule({
    imports: [RegistroPage],
    providers: [provideRouter([]), provideHttpClient(), provideHttpClientTesting()],
  }));

  afterEach(() => TestBed.inject(HttpTestingController).verify());

  it('marca los campos inválidos y evita enviar un registro incompleto', () => {
    const component = TestBed.createComponent(RegistroPage).componentInstance;
    component.submit();
    expect(component.bad('nombre')).toBe(true);
    expect(component.bad('email')).toBe(true);
    TestBed.inject(HttpTestingController).expectNone('/api/v1/auth/register');
  });

  it('informa cuando el correo ya está registrado', () => {
    const component = TestBed.createComponent(RegistroPage).componentInstance;
    component.form.setValue({ nombre: 'Ana', email: 'ana@test.local', telefono: '', password: 'ClaveSegura123' });
    component.submit();
    TestBed.inject(HttpTestingController).expectOne('/api/v1/auth/register')
      .flush({ error: 'Conflict' }, { status: 409, statusText: 'Conflict' });
    expect(component.error()).toBe('Ese correo ya tiene una cuenta.');
    expect(component.loading()).toBe(false);
  });
});


describe('Panel de administración', () => {
  const api = {
    canchas: vi.fn(() => of([])), clientes: vi.fn(() => of([])), reservas: vi.fn(() => of([])),
    crearCliente: vi.fn(() => of({ id: 8, nombre: 'Ana', email: 'ana@test.local' })),
    crearCancha: vi.fn(() => of({ id: 4, nombre: 'Cancha nueva', direccion: 'Centro', tipoSuperficie: 'Sintético', capacidadJugadores: 10, precioPorHora: 30000, activa: true, horaApertura: '08:00', horaCierre: '23:00' })),
    actualizarCancha: vi.fn(() => of({ id: 4, nombre: 'Cancha editada', direccion: 'Centro', tipoSuperficie: 'Sintético', capacidadJugadores: 10, precioPorHora: 30000, activa: true, horaApertura: '08:00', horaCierre: '23:00' })),
    crearReserva: vi.fn(() => of({})), cancelarReserva: vi.fn(() => of({})),
  };
  const auth = { nombre: signal('Admin'), logout: vi.fn() };

  beforeEach(() => {
    vi.clearAllMocks();
    TestBed.configureTestingModule({
      imports: [App],
      providers: [
        provideRouter([]), provideHttpClient(), provideHttpClientTesting(),
        { provide: TurnosApiService, useValue: api },
        { provide: AuthService, useValue: auth },
      ],
    });
  });

  function page() { return TestBed.createComponent(App).componentInstance; }

  it('carga datos de inicio y limpia reservas cuando faltan filtros', () => {
    const component = page();
    component.loadBase();
    expect(api.canchas).toHaveBeenCalled();
    component.loadReservations();
    expect(component.reservas()).toEqual([]);
    expect(component.loading()).toBe(false);
  });

  it('valida cliente nuevo antes de enviarlo y actualiza el formulario al crearlo', () => {
    const component = page();
    component.createClient();
    expect(api.crearCliente).not.toHaveBeenCalled();
    component.clientForm.setValue({ nombre: 'Ana', email: 'ana@test.local', telefono: '' });
    component.createClient();
    expect(api.crearCliente).toHaveBeenCalled();
    expect(component.clientes()).toHaveLength(1);
    expect(component.bookingForm.controls.usuarioId.value).toBe(8);
    expect(component.showClient()).toBe(false);
  });

  it('rechaza horarios de atención invertidos y permite crear una cancha válida', () => {
    const component = page();
    component.courtForm.setValue({ nombre: 'Nueva', direccion: 'Centro', tipoSuperficie: 'Sintético', capacidadJugadores: 10, precioPorHora: 30000, horaApertura: '22:00', horaCierre: '08:00' });
    component.createCourt();
    expect(component.courtForm.controls.horaCierre.errors).toEqual({ invalidRange: true });
    expect(api.crearCancha).not.toHaveBeenCalled();

    component.courtForm.setValue({ nombre: 'Nueva', direccion: 'Centro', tipoSuperficie: 'Sintético', capacidadJugadores: 10, precioPorHora: 30000, horaApertura: '08:00', horaCierre: '23:00' });
    component.createCourt();
    expect(api.crearCancha).toHaveBeenCalled();
    expect(component.canchaId()).toBe(4);
    expect(component.notice()).toContain('Cancha creada');
  });

  it('abre la edición de cancha y reinicia el formulario al cerrarlo', () => {
    const component = page();
    component.openCourtForm({ id: 4, nombre: 'Cancha 4', direccion: 'Centro', tipoSuperficie: 'Pasto', capacidadJugadores: 10, precioPorHora: 25000, activa: true, horaApertura: '08:00:00', horaCierre: '22:00:00' });
    expect(component.editingCourtId()).toBe(4);
    expect(component.courtForm.controls.horaCierre.value).toBe('22:00');
    component.closeCourtForm();
    expect(component.showCourt()).toBe(false);
    expect(component.editingCourtId()).toBeNull();
  });

  it('crea una reserva y calcula su duración en horas y minutos', () => {
    const component = page();
    const fecha = new Date(Date.now() + 86400000).toISOString().slice(0, 10);
    component.bookingForm.setValue({ canchaId: 4, usuarioId: 8, fecha, horaInicio: '18:00', horaFin: '19:00', observaciones: '' });
    component.createBooking();
    expect(api.crearReserva).toHaveBeenCalled();
    expect(component.notice()).toContain('reservó correctamente');
    expect(component.duration({ horaInicio: '18:00:00', horaFin: '20:00:00' } as never)).toBe('2 h');
    expect(component.duration({ horaInicio: '18:00:00', horaFin: '19:30:00' } as never)).toBe('1 h 30 min');
  });

  it('solo cancela después de confirmar y permite cerrar sesión', () => {
    const component = page();
    const confirmation = vi.spyOn(window, 'confirm').mockReturnValue(false);
    const reserva = { id: 3, cliente: 'Ana', horaInicio: '18:00:00' } as never;
    component.cancelBooking(reserva);
    expect(api.cancelarReserva).not.toHaveBeenCalled();
    confirmation.mockReturnValue(true);
    component.cancelBooking(reserva);
    expect(api.cancelarReserva).toHaveBeenCalledWith(3);
    const router = TestBed.inject(Router);
    vi.spyOn(router, 'navigateByUrl').mockResolvedValue(true);
    component.logout();
    expect(auth.logout).toHaveBeenCalled();
    expect(router.navigateByUrl).toHaveBeenCalledWith('/login');
  });
});


describe('Portal de cliente', () => {
  const api = {
    canchas: vi.fn(() => of([
      { id: 1, nombre: 'Cancha 1', direccion: 'Centro', tipoSuperficie: 'Sintético', capacidadJugadores: 10, precioPorHora: 30000, activa: true, horaApertura: '08:00', horaCierre: '23:00' },
      { id: 2, nombre: 'Inactiva', direccion: 'Centro', tipoSuperficie: 'Pasto', capacidadJugadores: 10, precioPorHora: 1, activa: false, horaApertura: '08:00', horaCierre: '23:00' },
    ])),
    misReservas: vi.fn(() => of([])),
    disponibilidad: vi.fn(() => of([{ horaInicio: '20:00:00', horaFin: '21:00:00', precioTotal: 30000 }])),
    solicitarTurno: vi.fn(() => of({})),
  };
  const auth = { nombre: signal('Ana'), logout: vi.fn() };

  beforeEach(() => {
    vi.clearAllMocks();
    TestBed.configureTestingModule({
      imports: [ClienteTurnosPage],
      providers: [provideRouter([]), provideHttpClient(), provideHttpClientTesting(),
        { provide: TurnosApiService, useValue: api }, { provide: AuthService, useValue: auth }],
    });
  });

  function mount() {
    const fixture = TestBed.createComponent(ClienteTurnosPage);
    fixture.detectChanges();
    return { fixture, component: fixture.componentInstance };
  }

  it('carga solo canchas activas y las reservas propias', () => {
    const { component } = mount();
    expect(component.canchas().map((court) => court.id)).toEqual([1]);
    expect(component.form.controls.canchaId.value).toBe(1);
    expect(component.cargandoCanchas()).toBe(false);
    expect(component.cargandoReservas()).toBe(false);
  });

  it('consulta las franjas con los filtros elegidos', () => {
    const { component } = mount();
    component.form.controls.fecha.setValue('2026-12-01');
    component.buscar();
    expect(api.disponibilidad).toHaveBeenCalledWith(1, '2026-12-01', 1);
    expect(component.horarios()).toHaveLength(1);
    expect(component.busquedaRealizada()).toBe(true);
  });

  it('solicita el turno, muestra confirmación y refresca la disponibilidad', () => {
    const { component } = mount();
    component.form.controls.fecha.setValue('2026-12-01');
    component.solicitar({ horaInicio: '20:00:00', horaFin: '21:00:00', precioTotal: 30000 });
    expect(api.solicitarTurno).toHaveBeenCalledWith({ canchaId: 1, fecha: '2026-12-01', horaInicio: '20:00:00', horaFin: '21:00:00' });
    expect(component.notice()).toContain('Solicitud enviada');
    expect(api.misReservas).toHaveBeenCalledTimes(2);
  });

  it('presenta un mensaje si falla la consulta de horarios', () => {
    api.disponibilidad.mockReturnValueOnce(throwError(() => new HttpErrorResponse({ status: 0 })));
    const { component } = mount();
    component.buscar();
    expect(component.error()).toContain('No se pudo conectar');
    expect(component.loading()).toBe(false);
  });

  it('limpia la sesión y navega al salir', () => {
    const { component } = mount();
    const router = TestBed.inject(Router);
    vi.spyOn(router, 'navigateByUrl').mockResolvedValue(true);
    component.logout();
    expect(auth.logout).toHaveBeenCalled();
    expect(router.navigateByUrl).toHaveBeenCalledWith('/login');
  });
});


describe('Rutas protegidas', () => {
  const auth = { isAuthenticated: vi.fn(), rol: signal(''), token: signal<string | null>(null), logout: vi.fn() };

  beforeEach(() => {
    vi.clearAllMocks();
    TestBed.configureTestingModule({ providers: [provideRouter([]), { provide: AuthService, useValue: auth }] });
  });

  const routeSnapshot = {} as ActivatedRouteSnapshot;
  const routerSnapshot = {} as RouterStateSnapshot;

  it('redirige a login si no hay sesión', () => {
    auth.isAuthenticated.mockReturnValue(false);
    const result = TestBed.runInInjectionContext(() => authGuard(routeSnapshot, routerSnapshot));
    expect(result instanceof UrlTree).toBe(true);
    expect(TestBed.inject(Router).serializeUrl(result as UrlTree)).toBe('/login');
  });

  it('autoriza el rol esperado y devuelve a cada perfil a su sección', () => {
    auth.isAuthenticated.mockReturnValue(true);
    auth.rol.set('CLIENTE');
    expect(TestBed.runInInjectionContext(() => roleGuard('CLIENTE')(routeSnapshot, routerSnapshot))).toBe(true);
    const redirect = TestBed.runInInjectionContext(() => roleGuard('ADMINISTRADOR')(routeSnapshot, routerSnapshot)) as UrlTree;
    expect(TestBed.inject(Router).serializeUrl(redirect)).toBe('/turnos');
  });

  it('declara páginas lazy con guardas por perfil', () => {
    expect(routes.find((route) => route.path === 'turnos')?.canActivate).toBeDefined();
    expect(routes.find((route) => route.path === '')?.canActivate).toBeDefined();
    expect(routes.find((route) => route.path === 'login')?.loadComponent).toBeTypeOf('function');
  });
});

describe('Interceptor JWT', () => {
  const auth = { token: signal<string | null>('jwt-de-prueba'), logout: vi.fn() };
  const router = { navigateByUrl: vi.fn(() => Promise.resolve(true)) };
  let http: HttpTestingController;

  beforeEach(() => {
    auth.token.set('jwt-de-prueba');
    auth.logout.mockClear();
    router.navigateByUrl.mockClear();
    TestBed.configureTestingModule({
      providers: [provideHttpClient(withInterceptors([authInterceptor])), provideHttpClientTesting(),
        { provide: AuthService, useValue: auth }, { provide: Router, useValue: router }],
    });
    http = TestBed.inject(HttpTestingController);
  });

  afterEach(() => http.verify());

  it('adjunta el token a peticiones protegidas y lo omite para login', () => {
    TestBed.inject(HttpClient).get('/api/v1/clientes').subscribe();
    let request = http.expectOne('/api/v1/clientes');
    expect(request.request.headers.get('Authorization')).toBe('Bearer jwt-de-prueba');
    request.flush([]);

    TestBed.inject(HttpClient).post('/api/v1/auth/login', {}).subscribe();
    request = http.expectOne('/api/v1/auth/login');
    expect(request.request.headers.has('Authorization')).toBe(false);
    request.flush({});
  });

  it('limpia la sesión si el backend responde 401', () => {
    const client = TestBed.inject(HttpClient);
    client.get('/api/v1/clientes').subscribe({ error: (error: HttpErrorResponse) => expect(error.status).toBe(401) });
    http.expectOne('/api/v1/clientes').flush({}, { status: 401, statusText: 'Unauthorized' });
    expect(auth.logout).toHaveBeenCalled();
    expect(router.navigateByUrl).toHaveBeenCalledWith('/login');
  });
});
