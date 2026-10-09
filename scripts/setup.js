import mysql from 'mysql2/promise';
import {readFile} from 'node:fs/promises';
import {config,pool} from '../server/db.js';
import {seed} from './seed.js';
let db;
try{db=await mysql.createConnection({...config,database:undefined,multipleStatements:true});await db.query(await readFile(new URL('../database/schema.sql',import.meta.url),'utf8'));await db.beginTransaction();await seed(db);await db.commit();console.log('Hospital RIP: esquema y datos iniciales preparados. Los datos existentes se conservan.');}catch(e){if(db)await db.rollback();console.error('No se pudo preparar MySQL:',e.code||e.message);process.exitCode=1;}finally{if(db)await db.end();await pool.end();}
