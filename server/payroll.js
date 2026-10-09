import {Problem,date,interval,id,text,role} from './security.js';
import {rows} from './db.js';
import {availablePositions,validatePosition} from './positions.js';

export function cents(value) {
 if(!['string','number'].includes(typeof value)||!/^\d{1,9}(\.\d{1,2})?$/.test(String(value)))throw new Problem('La tarifa debe ser positiva y tener máximo dos decimales.');
 const n=Math.round(Number(value)*100);if(n<1)throw new Problem('La tarifa debe ser mayor que cero.');return n;
}
export function earnings(minutes,rate){return Number((BigInt(minutes)*BigInt(rate)+30n)/60n);}
export async function payrollMutation(db,user,path,b){
 role(user,'admin');let entityId;
 if(path==='workers'){
  const positions=availablePositions(await rows(db,'SELECT DISTINCT position FROM workers'));
  const values=[text(b.name,'Nombre',3,100),text(b.identification,'Identificación',3,30),validatePosition(b.position,positions),cents(b.hourly_rate),b.active===false?0:1];
  if(b.id){entityId=id(b.id);if(!(await rows(db,'SELECT id FROM workers WHERE id=?',[entityId])).length)throw new Problem('Trabajador no encontrado.',404);await rows(db,'UPDATE workers SET name=?,identification=?,position=?,rate_cents=?,active=? WHERE id=?',[...values,entityId]);}
  else entityId=(await rows(db,'INSERT INTO workers(name,identification,position,rate_cents,active) VALUES(?,?,?,?,?)',values)).insertId;
 }else if(path==='work-hours'){
  const workerId=id(b.worker_id),[start,end]=interval(b.starts_at,b.ends_at);
  const worker=(await rows(db,'SELECT * FROM workers WHERE id=? AND active=1',[workerId]))[0];if(!worker)throw new Problem('Selecciona un trabajador activo.');
  const minutes=(Date.parse(end.replace(' ','T')+'Z')-Date.parse(start.replace(' ','T')+'Z'))/60000;
  if(minutes>1440)throw new Problem('Cada jornada debe durar como máximo 24 horas.');
  if(end>new Intl.DateTimeFormat('sv-SE',{timeZone:'America/Bogota',year:'numeric',month:'2-digit',day:'2-digit',hour:'2-digit',minute:'2-digit',second:'2-digit',hourCycle:'h23'}).format(new Date()))throw new Problem('Registra únicamente jornadas ya trabajadas.');
  if((await rows(db,'SELECT id FROM work_hours WHERE worker_id=? AND starts_at<? AND ends_at>?',[workerId,end,start])).length)throw new Problem('La jornada se cruza con otra registrada.',409);
  entityId=(await rows(db,'INSERT INTO work_hours(worker_id,starts_at,ends_at,minutes,rate_cents,note) VALUES(?,?,?,?,?,?)',[workerId,start,end,minutes,worker.rate_cents,text(b.note||'','Observación',0,400)])).insertId;
 }else if(path==='work-hours/delete'){
  entityId=id(b.id);const h=(await rows(db,'SELECT * FROM work_hours WHERE id=?',[entityId]))[0];if(!h)throw new Problem('Jornada no encontrada.',404);if(h.payroll_id)throw new Problem('Una jornada liquidada no puede retirarse.',409);await rows(db,'DELETE FROM work_hours WHERE id=?',[entityId]);
 }else if(path==='payrolls'){
  const workerId=id(b.worker_id),start=date(b.start_date),end=date(b.end_date);if(end<start)throw new Problem('Período inválido.');
  const worker=(await rows(db,'SELECT * FROM workers WHERE id=?',[workerId]))[0];if(!worker)throw new Problem('Trabajador no encontrado.',404);
  const hours=await rows(db,'SELECT * FROM work_hours WHERE worker_id=? AND payroll_id IS NULL AND starts_at>=? AND ends_at<=DATE_ADD(?,INTERVAL 1 DAY) ORDER BY id',[workerId,start,end]);
  if(!hours.length)throw new Problem('No hay jornadas completas pendientes en este período.');
  const minutes=hours.reduce((n,h)=>n+h.minutes,0),total=hours.reduce((n,h)=>n+earnings(h.minutes,h.rate_cents),0);
  entityId=(await rows(db,'INSERT INTO payrolls(worker_id,worker_name,identification,start_date,end_date,minutes,total_cents,created_by) VALUES(?,?,?,?,?,?,?,?)',[workerId,worker.name,worker.identification,start,end,minutes,total,user.id])).insertId;
  for(const h of hours)await rows(db,'UPDATE work_hours SET payroll_id=? WHERE id=?',[entityId,h.id]);
 }else if(path==='payrolls/pay'){
  entityId=id(b.id);const p=(await rows(db,'SELECT * FROM payrolls WHERE id=?',[entityId]))[0];if(!p)throw new Problem('Liquidación no encontrada.',404);if(p.status==='paid')throw new Problem('Esta liquidación ya está pagada.',409);
  await rows(db,"UPDATE payrolls SET status='paid',paid_at=UTC_TIMESTAMP(),paid_by=?,reference=? WHERE id=?",[user.id,text(b.reference,'Referencia del pago',3,100),entityId]);
 }else throw new Problem('Operación no encontrada.',404);
 return entityId;
}
