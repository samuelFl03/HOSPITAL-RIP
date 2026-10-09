USE hospital_rip;
SELECT id,name,email,role,active FROM users;
SELECT d.name departamento,m.name medico,m.specialty especialidad,m.active activo FROM doctors m JOIN departments d ON d.id=m.department_id;
SELECT m.name medico,a.starts_at desde,a.ends_at hasta FROM availability a JOIN doctors m ON m.id=a.doctor_id;
SELECT p.name planificacion,p.status estado,s.label guardia,s.starts_at inicio,s.ends_at fin,d.name departamento,m.name medico FROM shifts s JOIN plans p ON p.id=s.plan_id JOIN departments d ON d.id=s.department_id LEFT JOIN doctors m ON m.id=s.doctor_id ORDER BY s.starts_at;
SELECT t.title tarea,t.priority prioridad,t.shift_id guardia,p.name planificacion FROM tasks t JOIN plans p ON p.id=t.plan_id;
SELECT p.name,p.status,u.name supervisor,p.review_note FROM plans p LEFT JOIN users u ON u.id=p.reviewer_id;
SELECT a.created_at,u.name usuario,a.action accion,a.entity entidad,a.entity_id registro FROM audit a LEFT JOIN users u ON u.id=a.user_id ORDER BY a.id DESC;
