import mysql from 'mysql2/promise';
import {readFile} from 'node:fs/promises';
import {config,pool} from '../server/db.js';
import {seed} from './seed.js';
import {schemaForDatabase} from './setup-schema.js';
import {email,password,text,hashPassword} from '../server/security.js';
let db;
try{
 db=await mysql.createConnection({...config,database:undefined,multipleStatements:true});
 await db.query(schemaForDatabase(await readFile(new URL('../database/schema.sql',import.meta.url),'utf8'),config.database));
 await db.beginTransaction();
 if(process.env.NODE_ENV==='production'){
  const [[{total}]]=await db.query('SELECT COUNT(*) total FROM users');
  if(!total){
   const name=text(process.env.INITIAL_ADMIN_NAME||'Administrador','Nombre',3,100);
   const mail=email(process.env.INITIAL_ADMIN_EMAIL);
   const hash=await hashPassword(password(process.env.INITIAL_ADMIN_PASSWORD));
   await db.execute("INSERT INTO users(name,email,password_hash,role) VALUES(?,?,?,'admin')",[name,mail,hash]);
  }
 }else await seed(db);
 await db.commit();console.log('Hospital RIP: tablas y cuenta inicial preparadas en la base configurada. Los datos existentes se conservan.');
}catch(e){if(db)await db.rollback();console.error('No se pudo preparar MySQL:',e.code||e.message);process.exitCode=1;}finally{if(db)await db.end();await pool.end();}
