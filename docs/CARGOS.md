# Cargos de trabajadores versión 1.7

El campo Cargo de Registrar trabajador y Editar trabajador es una lista obligatoria suministrada por la API. Incluye Administrador, Auxiliar, Auxiliar de enfermería, Camillero, Enfermero, Médico general, Médico especialista, Médico jefe, Personal de laboratorio, Personal de limpieza, Personal de mantenimiento, Psicólogo, Recepcionista y Supervisor, además de los cargos que ya existan en trabajadores.

Los cargos se ordenan alfabéticamente y no se duplican. Los trabajadores existentes conservan sus cargos. El servidor rechaza cargos vacíos o que no pertenezcan a las opciones disponibles. La lista no representa vacantes ni cupos laborales. El cargo laboral no asigna permisos: estos dependen del rol de la cuenta de usuario.

No requiere cambios de tablas, reinstalación ni importación de datos. Subir la versión al repositorio conectado a Railway y esperar el despliegue. Recargar la aplicación para actualizar las opciones.
