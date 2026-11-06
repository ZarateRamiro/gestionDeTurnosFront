# Frontend de Gestión de Turnos

Aplicación Angular 22 con componentes standalone. Incluye login por rol, registro de clientes, catálogo público de canchas, consulta de disponibilidad y solicitud de turnos; el administrador gestiona horarios de atención, agenda, clientes y reservas.

## Requisitos y ejecución

1. Iniciá el backend Spring Boot en `http://localhost:8080`.
2. Instalá dependencias con `npm install`.
3. Ejecutá `npm start` y abrí `http://localhost:4200`.

El proxy de desarrollo definido en `proxy.conf.json` envía `/api` a `http://localhost:8080`. Cambiá `target` si el backend usa otro puerto.

El primer acceso requiere la cuenta administradora configurada por `ADMIN_EMAIL` y `ADMIN_PASSWORD` en el backend. El login conserva el JWT en el navegador; el interceptor lo envía en las llamadas protegidas y la ruta del panel exige sesión.

## Verificación

```bash
npm test -- --watch=false
npm run build
```
