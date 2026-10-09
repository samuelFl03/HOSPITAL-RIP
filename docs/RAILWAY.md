# Instalación en Railway

## Versión 1.5

El error ER_NO_SUCH_TABLE indica que la conexión MySQL funciona pero faltan las tablas. `npm run setup` crea las tablas en DB_NAME, incluida la nómina, sin borrar datos existentes. Antes el instalador seleccionaba siempre hospital_rip aunque DB_NAME apuntara a railway.

En el servicio HOSPITAL-RIP configurar las referencias DB_HOST, DB_PORT, DB_NAME, DB_USER y DB_PASSWORD al servicio MySQL. Mantener HOST=0.0.0.0, NODE_ENV=production y APP_ORIGIN como la URL HTTPS pública sin barra final.

Para una base nueva definir INITIAL_ADMIN_EMAIL, INITIAL_ADMIN_PASSWORD (de 10 a 128 caracteres) y opcionalmente INITIAL_ADMIN_NAME. El instalador crea una cuenta administradora solo si no existen usuarios; no cambia cuentas existentes ni carga datos de demostración en producción. No guardar contraseñas en el repositorio.

En Settings / Deploy configurar Pre-Deploy Command como `npm run setup`. Mantener Start Command como `npm start`. Aplicar cambios y desplegar la versión corregida desde GitHub. Si el instalador falla, revisar los registros de predespliegue. Tras la instalación, iniciar sesión con el correo y la contraseña configurados; las variables INITIAL_ADMIN_EMAIL e INITIAL_ADMIN_PASSWORD pueden retirarse después.
