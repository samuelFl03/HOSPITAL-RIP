# Hospital RIP 1.0

Sistema de planificación y autorización de guardias, desarrollado a partir de `Analisis_Sistema_Gestion_Hospitalario_FLOREZ_RIP (1).docx`. Conserva la estructura técnica de **Pharmaboost1**: HTML, CSS y JavaScript, servidor Node.js y MySQL. Tiene una identidad visual propia en azul oscuro y tonos cálidos.

## Abrir el proyecto

En este equipo, abre **iniciar.bat** y visita **http://localhost:3090**. Conserva la terminal abierta mientras utilizas el sistema. Si ya hay un servidor en ese puerto, utiliza el que está abierto; no inicies otra copia.

Requisitos para otro equipo Windows: Node.js 22 o superior, MySQL Server 8 instalado y conexión a Internet únicamente para instalar la dependencia `mysql2` la primera vez. No requiere React, Python, PHP, compilación ni servicios externos para funcionar.

La primera ejecución instala las dependencias e inicializa una instancia **independiente** de MySQL en `127.0.0.1:3310`, con archivos en `data/mysql`. La base es `hospital_rip`. No modifica MySQL80, Pharmaboost ni Pharmaboost1. Si MySQL está en otra ruta, define `MYSQLD_PATH` antes de iniciar. El servidor HTTP escucha solo en este equipo.

Las siguientes ejecuciones conservan la información. `configurar.ps1` prepara solo la base; `iniciar.ps1` prepara lo necesario e inicia el servidor. `npm start` inicia únicamente Node.js y requiere que MySQL ya esté funcionando. Para detener Node, cierra su terminal. La instancia local de MySQL continúa en segundo plano; `detener-mysql.ps1` la detiene de forma ordenada y conserva los datos.

## Cuentas iniciales

Las tres cuentas tienen la contraseña inicial **Hospital2026!**. Son cuentas de la aplicación, no de MySQL.

| Correo | Rol | Responsabilidad |
| --- | --- | --- |
| admin@hospital.local | Administrador | Usuarios, roles, reportes y auditoría |
| supervisor@hospital.local | Supervisor | Médicos, departamentos, disponibilidad y autorización |
| jefe@hospital.local | Médico jefe | Planificaciones, guardias y tareas prioritarias |

Puedes cambiar tu contraseña desde **Mi cuenta**. El administrador también puede crear, editar y desactivar cuentas. Desactivar un usuario o cambiar sus permisos revoca sus sesiones. No hay contraseñas, simuladores ni accesos por rol expuestos en la interfaz.

## Funciones

- Inicio de sesión con hash scrypt y sal individual, cookie HttpOnly, SameSite, sesiones de 12 horas y límite de intentos.
- Resumen con métricas, agenda semanal, cobertura, prioridades y planificaciones recientes.
- Médicos con identificación única, especialidad, departamento, contacto y estado activo.
- Departamentos con descripción y color de identificación en la agenda.
- Disponibilidad por intervalos de fecha y hora, incluida cobertura de turnos nocturnos.
- Planificaciones con período, turnos por cubrir y asignación de médicos compatibles.
- Tareas de prioridad alta o normal, asociadas a una planificación y a su guardia.
- Envío al supervisor, aprobación o rechazo con observaciones y registro de revisión.
- Usuarios, roles y registro de las últimas 250 acciones.
- Reportes por fecha de inicio de guardia; exportación CSV y opción **Imprimir / PDF** mediante el diálogo del navegador. Exportación adicional de médicos y departamentos.
- Diseño adaptable, navegación móvil y modo claro/oscuro persistente.

## Flujo de prueba

1. Entra como supervisor. Consulta los ocho médicos ficticios y la disponibilidad inicial. Puedes registrar nuevos médicos e intervalos.
2. Entra como médico jefe y abre **Planificación → Guardias · Semana de apertura**. Hay 28 guardias de muestra; dos necesitan médico.
3. Edita las dos guardias sin asignar del último día, una de Psicología y otra de Urgencias. El selector presenta solo médicos compatibles con departamento, disponibilidad y horario.
4. Revisa las tareas de alta prioridad. La carga inicial ya vincula las dos prioritarias; una tarea normal queda sin vincular.
5. Pulsa **Enviar a revisión**. La propuesta queda bloqueada mientras el supervisor decide.
6. Entra como supervisor, abre **Autorizaciones** y revisa el detalle. Rechaza con una observación para practicar la corrección, o autoriza la propuesta.
7. Una propuesta rechazada admite correcciones y un nuevo envío. Una autorizada permanece inmutable.
8. Entra como administrador, aplica el período en **Reportes** y exporta el resultado. Revisa **Actividad** para comprobar el registro de operaciones.

## Reglas importantes

Un médico debe estar activo, pertenecer al departamento del turno y tener un intervalo registrado que cubra toda la guardia. No puede tener asignaciones superpuestas, incluso entre borradores distintos. Los turnos contiguos son válidos. La fecha final de una planificación incluye todo ese día.

Para enviar o aprobar se exige al menos una guardia, todas las guardias asignadas y todas las tareas de alta prioridad vinculadas a guardias cubiertas del mismo departamento. La revisión vuelve a validar la cobertura. Las escrituras operativas se serializan en una transacción para evitar que dos usuarios asignen simultáneamente al mismo médico.

El supervisor no puede retirar una disponibilidad que tenga asignaciones, ni desactivar o cambiar de departamento a un médico con guardias futuras. Los planes en revisión y autorizados no admiten edición. El rechazo exige una observación de al menos cinco caracteres. Debe permanecer al menos un administrador activo.

## MySQL Workbench

Para consultar la instancia del proyecto crea una conexión TCP/IP con host `127.0.0.1`, puerto `3310` y el usuario `DB_USER` de tu archivo local `.env`. Introduce localmente el valor `DB_PASSWORD`, sin copiarlo a documentos ni compartirlo. Esta cuenta tiene permisos de lectura y escritura limitados a `hospital_rip`.

Ejecuta `database/consultas_workbench.sql` para consultar médicos, disponibilidad, guardias, revisiones y actividad. Para ver el modelo usa **Database → Reverse Engineer** y selecciona `hospital_rip`. Las relaciones están definidas mediante claves foráneas.

La instalación guarda las credenciales de administración de esta instancia solo en `data/local-admin.json`, excluido del repositorio y de la entrega comprimida. Para una copia lógica utiliza **Server → Data Export**, con esa conexión administrativa local, y guarda estructura y datos. No compartas `.env`, `data` ni exportaciones de una base con información real.

### Usar otro servidor MySQL

Antes del primer inicio copia `.env.example` a `.env` y configura host, puerto y credenciales propias. Ejecuta `npm ci` y `npm run setup` con una cuenta que pueda crear el esquema `hospital_rip`. Luego utiliza una cuenta de aplicación con permisos SELECT, INSERT, UPDATE y DELETE sobre ese esquema y ejecuta `npm start`. El inicializador conserva datos cuando ya existen usuarios. La configuración automática local se omite cuando existe `.env`.

## Estructura

```text
web/          Interfaz HTML, CSS, JavaScript y marca SVG
server/       API HTTP, seguridad, reglas de negocio y conexión MySQL
database/     Esquema y consultas para Workbench
scripts/      Instalación local y datos iniciales ficticios
tests/        Pruebas unitarias y de integración
docs/         Manual Word, requisitos y decisiones
examples/     Ejemplos de planificación
data/         MySQL local y configuración privada (no distribuir)
```

## Pruebas

`npm test`: cuatro pruebas unitarias sobre fechas, cruces de horario, contraseñas y permisos.

`npm run test:integration`: 41 comprobaciones HTTP y MySQL. Crea una base desechable `hospital_rip_test_<marca de tiempo>` en la instancia local, inicia un servidor temporal en 3091 y elimina esa base al terminar. Requiere la configuración local generada, puerto 3091 libre y acceso a `data/local-admin.json`. No modifica la base de trabajo.

Validación en Edge realizada con los tres roles, navegación, formularios, cancelación, descarga CSV, modo oscuro y pantalla móvil de 390 píxeles. Los datos del navegador y los resultados de revisión están excluidos de la entrega.

## Alcance de esta versión

Proyecto académico funcional con datos ficticios. El documento menciona variables Java como ejemplo; se mantiene la tecnología JavaScript solicitada por continuidad con Pharmaboost1. No gestiona pacientes, historia clínica, facturación ni medicamentos, porque no forman parte del análisis.

Requiere conexión al servidor para leer y guardar; no incluye sincronización offline de guardias. Las planificaciones autorizadas no se reabren ni cancelan en esta versión. No se aplican reglas de descanso mínimo, máximo de horas o especialidad por guardia, porque el documento no define esos criterios. No se envían notificaciones por correo.

Los reportes cuentan guardias, sin calcular nómina ni horas trabajadas. Las disponibilidades iniciales son intervalos amplios ficticios para probar el sistema, no recomendaciones de carga laboral. No se publicó en Internet. Un despliegue institucional requiere configuración de HTTPS, copias programadas, revisión de permisos y definición de las reglas operativas del hospital.
#   H O S P I T A L - R I P  
 