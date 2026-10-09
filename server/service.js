import {rows,transaction,audit} from './db.js';
import {payrollMutation} from './payroll.js';
import {availablePositions} from './positions.js';
import {Problem,text,id,date,interval,role,email,password,hashPassword} from './security.js';
const editable = p => {if(!['draft','rejected'].includes(p.status)) throw new Problem('Solo puedes editar borradores o planificaciones rechazadas.',409);};
async function plan(db,planId) {const p=(await rows(db,'SELECT * FROM plans WHERE id=?',[id(planId)]))[0]; if(!p)throw new Problem('Planificación no encontrada.',404);return p;}
async function activeDepartment(db,departmentId) {const d=(await rows(db,'SELECT * FROM departments WHERE id=? AND active=1',[id(departmentId)]))[0];if(!d)throw new Problem('Selecciona un departamento activo.');return d;}
async function validateShift(db,s,exclude=0){
 await activeDepartment(db,s.department_id);
 if(!s.doctor_id)return;
 const doctor=(await rows(db,'SELECT * FROM doctors WHERE id=?',[id(s.doctor_id)]))[0];
 if(!doctor||!doctor.active||doctor.department_id!==+s.department_id)throw new Problem('El médico debe estar activo y pertenecer al departamento de la guardia.');
 if(!(await rows(db,'SELECT id FROM availability WHERE doctor_id=? AND starts_at<=? AND ends_at>=?',[doctor.id,s.starts_at,s.ends_at])).length)throw new Problem('El médico no tiene disponibilidad registrada para todo el turno.');
 if((await rows(db,'SELECT s.id FROM shifts s WHERE s.doctor_id=? AND s.id<>? AND s.starts_at<? AND s.ends_at>?',[doctor.id,exclude,s.ends_at,s.starts_at])).length)throw new Problem('El médico ya tiene una guardia que se cruza con este horario.',409);
}
async function validatePlan(db,p){
 const shifts=await rows(db,'SELECT * FROM shifts WHERE plan_id=?',[p.id]);
 if(!shifts.length||shifts.some(s=>!s.doctor_id))throw new Problem('Asigna un médico a cada guardia antes de enviar o aprobar.');
 for(const s of shifts)await validateShift(db,s,s.id);
 const missing=await rows(db,"SELECT t.id FROM tasks t LEFT JOIN shifts s ON s.id=t.shift_id WHERE t.plan_id=? AND t.priority='high' AND (s.id IS NULL OR s.doctor_id IS NULL OR s.department_id<>t.department_id OR s.plan_id<>t.plan_id)",[p.id]);
 if(missing.length)throw new Problem('Todas las tareas de alta prioridad deben estar vinculadas a una guardia cubierta del mismo departamento.');
}
export async function snapshot(db,user){
 const result={};
 for(const [key,sql] of Object.entries({departments:'SELECT * FROM departments ORDER BY name',doctors:'SELECT * FROM doctors ORDER BY name',availability:'SELECT * FROM availability ORDER BY starts_at',plans:'SELECT p.*,u.name author_name,r.name reviewer_name FROM plans p JOIN users u ON u.id=p.author_id LEFT JOIN users r ON r.id=p.reviewer_id ORDER BY p.start_date DESC,p.id DESC',shifts:'SELECT * FROM shifts ORDER BY starts_at',tasks:'SELECT * FROM tasks ORDER BY priority, id DESC'}))result[key]=await rows(db,sql);
 if(user.role==='admin'){result.users=await rows(db,'SELECT id,name,email,role,active FROM users ORDER BY name');result.audit=await rows(db,'SELECT a.*,u.name user_name FROM audit a LEFT JOIN users u ON u.id=a.user_id ORDER BY a.id DESC LIMIT 250');}
 if(user.role==='admin'){
  result.workers=await rows(db,'SELECT * FROM workers ORDER BY name');
  result.positions=availablePositions(result.workers);
  result.workHours=await rows(db,'SELECT h.*,w.name worker_name FROM work_hours h JOIN workers w ON w.id=h.worker_id ORDER BY h.starts_at DESC');
  result.payrolls=await rows(db,'SELECT * FROM payrolls ORDER BY id DESC');
 }
 return result;
}
export async function mutate(user,path,b){return transaction(async db=>{
 let entity='',entityId=null;
 if(['workers','work-hours','work-hours/delete','payrolls','payrolls/pay'].includes(path)){
  entityId=await payrollMutation(db,user,path,b);entity=path.split('/')[0];
 }else if(path==='departments'){
  role(user,'supervisor');const values=[text(b.name,'Nombre',2,100),text(b.description||'','Descripción',0,400),/^#[a-f\d]{6}$/i.test(b.color)?b.color:'#527da8',b.active===false?0:1];
  if(b.id){entityId=id(b.id);const old=(await rows(db,'SELECT * FROM departments WHERE id=?',[entityId]))[0];if(!old)throw new Problem('Departamento no encontrado.',404);
   if(!values[3]&&old.active){if((await rows(db,'SELECT id FROM doctors WHERE department_id=? AND active=1',[entityId])).length)throw new Problem('No puedes desactivar un departamento con médicos activos. Reasígnalos o desactívalos primero.');if((await rows(db,'SELECT id FROM shifts WHERE department_id=? AND ends_at>NOW()',[entityId])).length)throw new Problem('No puedes desactivar un departamento con guardias futuras.');}
   await rows(db,'UPDATE departments SET name=?,description=?,color=?,active=? WHERE id=?',[...values,entityId]);}
  else entityId=(await rows(db,'INSERT INTO departments(name,description,color,active) VALUES(?,?,?,?)',values)).insertId;entity='departments';
 }else if(path==='doctors'){
  role(user,'supervisor');await activeDepartment(db,b.department_id);
  const values=[text(b.identification,'Identificación',3,30),text(b.name,'Nombre',3,100),text(b.specialty,'Especialidad',2,100),id(b.department_id),b.email?email(b.email):'',b.active===false?0:1];
  if(b.id){entityId=id(b.id);const old=(await rows(db,'SELECT * FROM doctors WHERE id=?',[entityId]))[0];if(!old)throw new Problem('Médico no encontrado.',404);
   if((old.department_id!==+b.department_id||!values[5])&&(await rows(db,'SELECT id FROM shifts WHERE doctor_id=? AND ends_at>NOW()',[entityId])).length)throw new Problem('Este médico tiene guardias futuras. Retira sus asignaciones antes de cambiar su departamento o desactivarlo.');
   await rows(db,'UPDATE doctors SET identification=?,name=?,specialty=?,department_id=?,email=?,active=? WHERE id=?',[...values,entityId]);
  }else entityId=(await rows(db,'INSERT INTO doctors(identification,name,specialty,department_id,email,active) VALUES(?,?,?,?,?,?)',values)).insertId;entity='doctors';
 }else if(path==='availability'){
  role(user,'supervisor');const doctorId=id(b.doctor_id);if(!(await rows(db,'SELECT id FROM doctors WHERE id=? AND active=1',[doctorId])).length)throw new Problem('Médico no disponible.');
  const [start,end]=interval(b.starts_at,b.ends_at);
  entityId=b.id?id(b.id):0;const old=entityId?(await rows(db,'SELECT * FROM availability WHERE id=?',[entityId]))[0]:null;if(entityId&&!old)throw new Problem('Disponibilidad no encontrada.',404);
  if(old&&(await rows(db,'SELECT id FROM shifts WHERE doctor_id=? AND starts_at<? AND ends_at>?',[old.doctor_id,old.ends_at,old.starts_at])).length)throw new Problem('No puedes editar una disponibilidad que tiene guardias asignadas.');
  if((await rows(db,'SELECT id FROM availability WHERE doctor_id=? AND starts_at<? AND ends_at>? AND id<>?',[doctorId,end,start,entityId])).length)throw new Problem('Ya existe un intervalo de disponibilidad que se cruza con este.');
  if(entityId)await rows(db,'UPDATE availability SET doctor_id=?,starts_at=?,ends_at=? WHERE id=?',[doctorId,start,end,entityId]);
  else entityId=(await rows(db,'INSERT INTO availability(doctor_id,starts_at,ends_at) VALUES(?,?,?)',[doctorId,start,end])).insertId;entity='availability';
 }else if(path==='availability/delete'){
  role(user,'supervisor');const a=(await rows(db,'SELECT * FROM availability WHERE id=?',[id(b.id)]))[0];if(!a)throw new Problem('Disponibilidad no encontrada.',404);
  if((await rows(db,'SELECT id FROM shifts WHERE doctor_id=? AND starts_at<? AND ends_at>?',[a.doctor_id,a.ends_at,a.starts_at])).length)throw new Problem('No puedes retirar una disponibilidad con guardias asignadas.');
  await rows(db,'DELETE FROM availability WHERE id=?',[a.id]);entity='availability';entityId=a.id;
 }else if(path==='plans'){
  role(user,'chief');const start=date(b.start_date),end=date(b.end_date);if(end<start)throw new Problem('Revisa las fechas de la planificación.');
  const name=text(b.name,'Nombre',3,120);
  if(b.id){const p=await plan(db,b.id);editable(p);const shifts=await rows(db,'SELECT id FROM shifts WHERE plan_id=? AND (starts_at<? OR ends_at>DATE_ADD(?,INTERVAL 1 DAY))',[p.id,start,end]);if(shifts.length)throw new Problem('El período debe contener todas las guardias existentes.');await rows(db,"UPDATE plans SET name=?,start_date=?,end_date=?,status='draft',version=version+1 WHERE id=?",[name,start,end,p.id]);entityId=p.id;}
  else entityId=(await rows(db,'INSERT INTO plans(name,start_date,end_date,author_id) VALUES(?,?,?,?)',[name,start,end,user.id])).insertId;entity='plans';
 }else if(path==='plans/delete'){
  role(user,'chief');const p=await plan(db,b.id);editable(p);await rows(db,'DELETE FROM tasks WHERE plan_id=?',[p.id]);await rows(db,'DELETE FROM shifts WHERE plan_id=?',[p.id]);await rows(db,'DELETE FROM plans WHERE id=?',[p.id]);entity='plans';entityId=p.id;
 }else if(path==='shifts'){
  role(user,'chief');const p=await plan(db,b.plan_id);editable(p);const [start,end]=interval(b.starts_at,b.ends_at);
  if(start.slice(0,10)<p.start_date||end>nextDay(p.end_date)+' 00:00:00')throw new Problem('La guardia debe estar dentro del período de la planificación.');
  const s={department_id:id(b.department_id),doctor_id:b.doctor_id?id(b.doctor_id):null,starts_at:start,ends_at:end};
  entityId=b.id?id(b.id):null;
  if(entityId&&!(await rows(db,'SELECT id FROM shifts WHERE id=? AND plan_id=?',[entityId,p.id])).length)throw new Problem('Guardia no encontrada.',404);
  if(entityId&&(await rows(db,'SELECT id FROM tasks WHERE shift_id=? AND department_id<>?',[entityId,s.department_id])).length)throw new Problem('Retira las tareas vinculadas antes de cambiar de departamento.');
  await validateShift(db,s,entityId||0);const values=[s.department_id,s.doctor_id,start,end,text(b.label,'Nombre del turno',2,100)];
  if(entityId)await rows(db,'UPDATE shifts SET department_id=?,doctor_id=?,starts_at=?,ends_at=?,label=? WHERE id=?',[...values,entityId]);
  else entityId=(await rows(db,'INSERT INTO shifts(department_id,doctor_id,starts_at,ends_at,label,plan_id) VALUES(?,?,?,?,?,?)',[...values,p.id])).insertId;
  await rows(db,"UPDATE plans SET status='draft',version=version+1 WHERE id=?",[p.id]);entity='shifts';
 }else if(path==='shifts/delete'){
  role(user,'chief');const s=(await rows(db,'SELECT * FROM shifts WHERE id=?',[id(b.id)]))[0];if(!s)throw new Problem('Guardia no encontrada.',404);editable(await plan(db,s.plan_id));
  await rows(db,'UPDATE tasks SET shift_id=NULL WHERE shift_id=?',[s.id]);await rows(db,'DELETE FROM shifts WHERE id=?',[s.id]);await rows(db,"UPDATE plans SET status='draft',version=version+1 WHERE id=?",[s.plan_id]);entity='shifts';entityId=s.id;
 }else if(path==='tasks'){
  role(user,'chief');const p=await plan(db,b.plan_id);editable(p);await activeDepartment(db,b.department_id);
  if(b.shift_id&&!(await rows(db,'SELECT id FROM shifts WHERE id=? AND plan_id=? AND department_id=?',[id(b.shift_id),p.id,id(b.department_id)])).length)throw new Problem('Selecciona una guardia de esta planificación y departamento.');
  if(!['high','normal'].includes(b.priority))throw new Problem('Prioridad inválida.');
  const values=[text(b.title,'Tarea',3,180),id(b.department_id),b.shift_id?id(b.shift_id):null,b.priority];
  if(b.id){entityId=id(b.id);if(!(await rows(db,'SELECT id FROM tasks WHERE id=? AND plan_id=?',[entityId,p.id])).length)throw new Problem('Tarea no encontrada.',404);await rows(db,'UPDATE tasks SET title=?,department_id=?,shift_id=?,priority=? WHERE id=?',[...values,entityId]);}
  else entityId=(await rows(db,'INSERT INTO tasks(title,department_id,shift_id,priority,plan_id) VALUES(?,?,?,?,?)',[...values,p.id])).insertId;
  await rows(db,"UPDATE plans SET status='draft',version=version+1 WHERE id=?",[p.id]);entity='tasks';
 }else if(path==='tasks/delete'){
  role(user,'chief');const t=(await rows(db,'SELECT * FROM tasks WHERE id=?',[id(b.id)]))[0];if(!t)throw new Problem('Tarea no encontrada.',404);editable(await plan(db,t.plan_id));await rows(db,'DELETE FROM tasks WHERE id=?',[t.id]);await rows(db,"UPDATE plans SET status='draft',version=version+1 WHERE id=?",[t.plan_id]);entity='tasks';entityId=t.id;
 }else if(path==='plans/submit'){
  role(user,'chief');const p=await plan(db,b.id);editable(p);await validatePlan(db,p);await rows(db,"UPDATE plans SET status='pending',reviewer_id=NULL,review_note='',version=version+1 WHERE id=?",[p.id]);entity='plans';entityId=p.id;
 }else if(path==='plans/review'){
  role(user,'supervisor');const p=await plan(db,b.id);if(p.status!=='pending')throw new Problem('Esta planificación ya no está pendiente de revisión.',409);
  if(+b.version!==p.version)throw new Problem('La planificación cambió. Actualiza antes de revisar.',409);
  if(!['approved','rejected'].includes(b.status))throw new Problem('Decisión inválida.');
  const note=text(b.note||'','Observaciones',b.status==='rejected'?5:0,1000);if(b.status==='approved')await validatePlan(db,p);
  await rows(db,'UPDATE plans SET status=?,reviewer_id=?,review_note=?,version=version+1 WHERE id=?',[b.status,user.id,note,p.id]);entity='plans';entityId=p.id;
 }else if(path==='users'){
  role(user,'admin');if(!['admin','supervisor','chief'].includes(b.role))throw new Problem('Rol inválido.');
  const values=[text(b.name,'Nombre',3,100),email(b.email),b.role,b.active===false?0:1];
  if(b.id){entityId=id(b.id);const old=(await rows(db,'SELECT * FROM users WHERE id=?',[entityId]))[0];if(!old)throw new Problem('Usuario no encontrado.',404);
   if(old.role==='admin'&&(!values[3]||b.role!=='admin')&&(await rows(db,"SELECT id FROM users WHERE role='admin' AND active=1")).length<=1)throw new Problem('Debe permanecer al menos un administrador activo.');
   await rows(db,'UPDATE users SET name=?,email=?,role=?,active=? WHERE id=?',[...values,entityId]);
   if(b.password)await rows(db,'UPDATE users SET password_hash=? WHERE id=?',[await hashPassword(password(b.password)),entityId]);
   await rows(db,'DELETE FROM sessions WHERE user_id=?',[entityId]);
  }else entityId=(await rows(db,'INSERT INTO users(name,email,role,active,password_hash) VALUES(?,?,?,?,?)',[...values,await hashPassword(password(b.password))])).insertId;entity='users';
 }else throw new Problem('Operación no encontrada.',404);
 await audit(db,user,path,entity,entityId);return {ok:true,id:entityId};
 });}
function nextDay(value){const d=new Date(value+'T00:00:00Z');d.setUTCDate(d.getUTCDate()+1);return d.toISOString().slice(0,10);}
