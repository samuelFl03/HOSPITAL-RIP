// Añade las tablas de nómina sin modificar registros ni ejecutar el sembrado.
import mysql from 'mysql2/promise';
import {readFile} from 'node:fs/promises';
const credentials=JSON.parse(await readFile(new URL('../data/local-admin.json',import.meta.url),'utf8'));
const db=await mysql.createConnection({...credentials,database:'hospital_rip',multipleStatements:true});
try{
 const schema=await readFile(new URL('../database/schema.sql',import.meta.url),'utf8');
 await db.query(schema.slice(schema.indexOf('CREATE TABLE IF NOT EXISTS workers')));
 console.log('Tablas de nómina preparadas. Registros existentes conservados.');
}finally{await db.end();}
