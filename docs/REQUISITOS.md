# Trazabilidad del análisis del Hospital RIP

Fuente: `Analisis_Sistema_Gestion_Hospitalario_FLOREZ_RIP (1).docx`, proporcionado por el usuario. Las descripciones del documento se usaron como requisitos del producto; sus ejemplos de Java no cambian la elección de HTML, CSS, JavaScript, Node.js y MySQL de Pharmaboost1.

| Requisito | Implementación |
| --- | --- |
| RF01 a RF03 | Login, sesión y permisos verificados por la API; navegación según rol |
| RF04 a RF06 | Alta, consulta y edición de médicos por supervisor |
| RF07 y RF08 | Departamentos y asociación obligatoria del médico |
| RF09 y RF10 | Registro, consulta y retiro validado de disponibilidad |
| RF11 a RF13 | Guardias, planes y edición antes de enviar; correcciones tras rechazo |
| RF14 | Tareas prioritarias con vínculo obligatorio a guardia cubierta antes de envío |
| RF15 y RF16 | Envío a revisión, autorización y rechazo con observación |
| RF17 | Creación de usuarios, asignación de rol y desactivación por administrador |
| RF18 | Reportes filtrados de guardias y planes, directorio de médicos y departamentos |

## Decisiones

Los permisos de escritura son específicos: el administrador administra cuentas y reportes; el supervisor administra personal y disponibilidad; el médico jefe planifica. Todos consultan el directorio y las planificaciones. Solo el administrador consulta la auditoría.

Los borradores reservan el horario de sus médicos para evitar propuestas incompatibles. Una propuesta rechazada conserva sus guardias, tareas y observación; al corregir se convierte en borrador. El estado autorizado es final. Una revisión comprueba la versión y vuelve a validar las asignaciones.

La disponibilidad es un intervalo positivo explícito. La ausencia de disponibilidad bloquea la asignación. Los turnos pueden cruzar medianoche si están dentro del período del plan. Se conserva la información histórica al desactivar médicos en lugar de eliminarlos.

La vista de reportes filtra por inicio de guardia, con ambas fechas incluidas. El directorio exportable es el estado actual, sin filtro temporal. CSV protege las celdas con caracteres de fórmula; PDF utiliza la impresión del navegador.

## Modelo de datos

## Nómina por horas versión 1.4

El administrador registra trabajadores de cualquier cargo, su tarifa por hora en COP y sus jornadas efectivamente trabajadas en hora de Colombia. Salario del período = suma de horas por tarifa histórica de cada jornada, redondeando cada jornada al centavo. No se agregan automáticamente salario fijo, deducciones ni recargos. Las guardias planificadas no se consideran horas trabajadas automáticamente.

El servidor rechaza tarifas no positivas, jornadas futuras, intervalos superiores a 24 horas y jornadas superpuestas. La liquidación toma jornadas completas pendientes dentro del período inclusivo y las vincula atómicamente para impedir su doble liquidación. Una jornada liquidada no se elimina. El registro de pago exige una referencia y rechaza pagos repetidos; registra un pago realizado fuera del sistema, sin ejecutar transferencias bancarias. Las tarifas históricas y el nombre e identificación de cada liquidación se conservan. Solo el administrador consulta y modifica la nómina; toda escritura queda auditada.

Ejecutar `npm run setup` para crear las nuevas tablas conservando los datos existentes. Ejecutar `npm test` y `npm run test:integration`; la integración utiliza exclusivamente una base temporal.

Usuarios se relaciona con sesiones, autores y revisores de planes y auditoría. Departamentos se relaciona con médicos, guardias y tareas. Médicos tiene intervalos de disponibilidad y asignaciones. Planificaciones contiene guardias y tareas. Una tarea puede vincularse a una guardia del mismo plan y departamento. `locks` contiene el registro usado para serializar las escrituras.
