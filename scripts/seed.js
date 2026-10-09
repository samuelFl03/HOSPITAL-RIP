import {hashPassword} from '../server/security.js';
export async function seed(db){
 const [[{total}]]=await db.query('SELECT COUNT(*) total FROM users');if(total)return;
 const hash=await hashPassword('Hospital2026!');
 await db.query('INSERT INTO users(name,email,password_hash,role) VALUES ?',[ [['Samuel Flórez','admin@hospital.local',hash,'admin'],['Laura Méndez','supervisor@hospital.local',hash,'supervisor'],['Andrés Rivera','jefe@hospital.local',hash,'chief']] ]);
 await db.query('INSERT INTO departments(name,description,color) VALUES ?',[ [['Medicina general','Atención integral y valoración médica.','#537fa6'],['Pediatría','Atención especializada de niños y adolescentes.','#ae7d56'],['Psicología','Acompañamiento y atención en salud mental.','#8b79b1'],['Urgencias','Atención oportuna y cobertura continua.','#cc735f']] ]);
 const doctors=[['RIP-1001','Valentina Rojas','Medicina general',1],['RIP-1002','Juan Camilo Torres','Medicina interna',1],['RIP-1003','Mariana Castro','Pediatría',2],['RIP-1004','Daniel Herrera','Pediatría',2],['RIP-1005','Sofía Martínez','Psicología clínica',3],['RIP-1006','Nicolás Peña','Psicología',3],['RIP-1007','Isabella Gómez','Medicina de urgencias',4],['RIP-1008','Sebastián López','Medicina de urgencias',4]];
 await db.query('INSERT INTO doctors(identification,name,specialty,department_id) VALUES ?', [doctors]);
 const now=new Date();const start=new Date(Date.UTC(now.getFullYear(),now.getMonth(),now.getDate()));const iso=d=>d.toISOString().slice(0,10);const end=new Date(start);end.setUTCDate(end.getUTCDate()+6);const availabilityEnd=new Date(end);availabilityEnd.setUTCDate(availabilityEnd.getUTCDate()+22);
 for(let i=1;i<=8;i++)await db.query('INSERT INTO availability(doctor_id,starts_at,ends_at) VALUES(?,?,?)',[i,iso(start)+' 00:00:00',iso(availabilityEnd)+' 23:59:00']);
 await db.query('INSERT INTO plans(name,start_date,end_date,author_id) VALUES(?,?,?,3)',['Guardias · Semana de apertura',iso(start),iso(end)]);
 for(let day=0;day<7;day++){const when=new Date(start);when.setUTCDate(when.getUTCDate()+day);for(let dept=1;dept<=4;dept++){await db.query('INSERT INTO shifts(plan_id,department_id,doctor_id,starts_at,ends_at,label) VALUES(1,?,?,?,?,?)',[dept,day===6&&dept>2?null:((dept-1)*2+1+day%2),iso(when)+' 07:00:00',iso(when)+' 15:00:00','Guardia de mañana']);}}
 await db.query("INSERT INTO tasks(plan_id,department_id,shift_id,title,priority) VALUES(1,4,4,'Reforzar la cobertura de urgencias','high'),(1,2,2,'Valoraciones prioritarias de pediatría','high'),(1,3,NULL,'Revisión del programa de acompañamiento','normal')");
 await db.query("INSERT INTO audit(user_id,action,entity,entity_id,detail) VALUES(1,'initial_setup','system',1,'Carga inicial de datos ficticios para el proyecto académico')");
}
