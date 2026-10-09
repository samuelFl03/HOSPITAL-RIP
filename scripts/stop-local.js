import mysql from 'mysql2/promise';
import {readFile} from 'node:fs/promises';
try{const credentials=JSON.parse(await readFile(new URL('../data/local-admin.json',import.meta.url),'utf8'));const db=await mysql.createConnection(credentials);await db.query('SHUTDOWN');await db.end();console.log('MySQL local detenido. Los datos se conservan.');}catch(e){if(e.code==='ECONNREFUSED')console.log('MySQL local ya está detenido.');else{console.error('No se pudo detener MySQL:',e.code||e.message);process.exitCode=1;}}
