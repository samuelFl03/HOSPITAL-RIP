import {Problem,text} from './security.js';

const catalog=['Administrador','Auxiliar','Auxiliar de enfermería','Camillero','Enfermero','Médico general','Médico especialista','Médico jefe','Personal de laboratorio','Personal de limpieza','Personal de mantenimiento','Psicólogo','Recepcionista','Supervisor'];

export function availablePositions(workers=[]){
 return [...new Set([...catalog,...workers.map(w=>w.position).filter(p=>typeof p==='string'&&p.trim())])].sort((a,b)=>a.localeCompare(b,'es'));
}

export function validatePosition(value,positions){
 const position=text(value,'Cargo',2,100);
 if(!positions.includes(position))throw new Problem('Selecciona uno de los cargos disponibles.');
 return position;
}
