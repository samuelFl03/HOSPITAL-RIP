import {existsSync} from 'node:fs';
import {mkdir,readFile,writeFile} from 'node:fs/promises';
import {spawn,spawnSync} from 'node:child_process';
import path from 'node:path';
import {fileURLToPath} from 'node:url';
import {randomBytes} from 'node:crypto';
import net from 'node:net';
import mysql from 'mysql2/promise';
import {seed} from './seed.js';
const root=fileURLToPath(new URL('../',import.meta.url));process.chdir(root);
const localConfig=path.join(root,'data','local-mysql.json');
const mysqld=process.env.MYSQLD_PATH||'C:\\Program Files\\MySQL\\MySQL Server 8.0\\bin\\mysqld.exe';
const wait=ms=>new Promise(r=>setTimeout(r,ms));
async function portBusy(port){return new Promise(resolve=>{const socket=net.connect({host:'127.0.0.1',port});socket.once('connect',()=>{socket.destroy();resolve(true);});socket.once('error',()=>resolve(false));});}
async function launch(config){
 if(await portBusy(config.port))return;
 if(!existsSync(config.executable))throw Error('No se encontró MySQL Server 8. Instálalo o configura una conexión externa en .env.');
 const child=spawn(config.executable,['--no-defaults',`--datadir=${config.directory}`,`--port=${config.port}`,'--bind-address=127.0.0.1','--mysqlx=OFF','--default-time-zone=-05:00','--log-error=local-error.log'],{detached:true,stdio:'ignore',windowsHide:true});child.unref();
 for(let i=0;i<60;i++){if(await portBusy(config.port))return;await wait(500);}throw Error('MySQL no inició. Revisa data/mysql/local-error.log.');
}
async function initialize(){
 if(existsSync(path.join(root,'.env')))return;
 if(!existsSync(mysqld))throw Error('Instala MySQL Server 8 o configura .env con una base existente. Consulta README.md.');
 const port=3310;if(await portBusy(port))throw Error('El puerto 3310 está ocupado. Configura una conexión externa en .env.');
 const directory=path.join(root,'data','mysql');if(existsSync(directory))throw Error('Ya existe data/mysql sin configuración completa. Conserva los datos y revisa la instalación.');
 await mkdir(directory,{recursive:true});console.log('Preparando una instancia MySQL local e independiente en el puerto 3310…');
 const init=spawnSync(mysqld,['--no-defaults','--initialize-insecure',`--datadir=${directory}`],{windowsHide:true,encoding:'utf8'});if(init.status!==0)throw Error('No se pudo inicializar MySQL. Revisa los archivos .err dentro de data/mysql.');
 const config={port,directory,executable:mysqld};await launch(config);
 const db=await mysql.createConnection({host:'127.0.0.1',port,user:'root',password:'',multipleStatements:true});
 try{
  await db.query(await readFile(path.join(root,'database','schema.sql'),'utf8'));await db.beginTransaction();await seed(db);await db.commit();
  const appPassword=randomBytes(32).toString('base64url'),adminPassword=randomBytes(32).toString('base64url');
  await db.query("CREATE USER 'hospital_app'@'localhost' IDENTIFIED BY ?",[appPassword]);await db.query("GRANT SELECT,INSERT,UPDATE,DELETE ON hospital_rip.* TO 'hospital_app'@'localhost'");
  await db.query("ALTER USER 'root'@'localhost' IDENTIFIED BY ?",[adminPassword]);
  await writeFile(path.join(root,'data','local-admin.json'),JSON.stringify({host:'127.0.0.1',port,user:'root',password:adminPassword},null,2),{mode:0o600});
  await writeFile(path.join(root,'.env'),`DB_HOST=127.0.0.1\nDB_PORT=${port}\nDB_NAME=hospital_rip\nDB_USER=hospital_app\nDB_PASSWORD=${appPassword}\nPORT=3090\nHOST=127.0.0.1\nAPP_ORIGIN=http://localhost:3090\nNODE_ENV=development\n`,{mode:0o600});
  await writeFile(localConfig,JSON.stringify(config,null,2));console.log('Instancia hospital_rip preparada. No se modificó el servicio MySQL80 ni las bases de Pharmaboost.');
 }finally{await db.end();}
}
try{await initialize();if(existsSync(localConfig))await launch(JSON.parse(await readFile(localConfig,'utf8')));if(!process.argv.includes('--setup-only')){const child=spawn(process.execPath,['--env-file=.env','server/index.js'],{stdio:'inherit',windowsHide:true});child.on('exit',code=>process.exit(code||0));}}catch(e){console.error(e.message);process.exitCode=1;}
