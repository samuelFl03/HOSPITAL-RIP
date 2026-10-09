import http from 'node:http';
import {readFile} from 'node:fs/promises';
import {fileURLToPath} from 'node:url';
import path from 'node:path';
import {randomBytes} from 'node:crypto';
import {pool,rows,audit} from './db.js';
import {Problem,tokenHash,verifyPassword,text,email,role,date,hashPassword,password} from './security.js';
import {snapshot,mutate} from './service.js';
const port=Number(process.env.PORT||3090),host=process.env.HOST||'127.0.0.1';
const origin=process.env.APP_ORIGIN||`http://localhost:${port}`;
const web=fileURLToPath(new URL('../web/',import.meta.url));
const attempts=new Map();
const cookie=(token,age)=>`rip_session=${token}; Path=/; HttpOnly; SameSite=Strict; Max-Age=${age}${process.env.NODE_ENV==='production'?'; Secure':''}`;
const json=(res,status,body)=>{res.writeHead(status,{'Content-Type':'application/json; charset=utf-8'});res.end(JSON.stringify(body));};
async function body(req){let content='';for await(const chunk of req){content+=chunk;if(content.length>128000)throw new Problem('Solicitud demasiado grande.',413);}try{return JSON.parse(content||'{}');}catch{throw new Problem('JSON inválido.');}}
async function userFor(req){const token=req.headers.cookie?.match(/(?:^|;\s*)rip_session=([a-f0-9]+)/)?.[1];if(!token)return null;return (await rows(pool,'SELECT u.id,u.name,u.email,u.role FROM sessions s JOIN users u ON u.id=s.user_id WHERE s.token_hash=? AND s.expires_at>UTC_TIMESTAMP() AND u.active=1',[tokenHash(token)]))[0];}
export const server=http.createServer(async(req,res)=>{
 res.setHeader('X-Content-Type-Options','nosniff');res.setHeader('Referrer-Policy','same-origin');res.setHeader('X-Frame-Options','DENY');
 res.setHeader('Content-Security-Policy',"default-src 'self'; script-src 'self'; style-src 'self' 'unsafe-inline'; img-src 'self' data:; connect-src 'self'; font-src 'self'; object-src 'none'; frame-ancestors 'none'; base-uri 'none'; form-action 'self'");
 try{
  const url=new URL(req.url,origin),route=url.pathname;
  if(route.startsWith('/api/')){
   res.setHeader('Cache-Control','no-store');
   if(req.method==='POST'&&req.headers.origin!==origin&&req.headers.origin!==`http://127.0.0.1:${port}`)throw new Problem('Origen de solicitud no permitido.',403);
   if(route==='/api/login'&&req.method==='POST'){
    const data=await body(req),mail=email(data.email),pass=text(data.password,'Contraseña',1,128),key=`${req.socket.remoteAddress}:${mail}`;
    const entry=attempts.get(key);if(entry&&entry.count>=8&&entry.until>Date.now())throw new Problem('Demasiados intentos. Espera 15 minutos.',429);
    const u=(await rows(pool,'SELECT * FROM users WHERE email=? AND active=1',[mail]))[0];
    if(!u||!await verifyPassword(pass,u.password_hash)){attempts.set(key,{count:entry&&entry.until>Date.now()?entry.count+1:1,until:Date.now()+900000});throw new Problem('Correo o contraseña incorrectos.',401);}
    attempts.delete(key);const token=randomBytes(32).toString('hex');await rows(pool,'DELETE FROM sessions WHERE expires_at<UTC_TIMESTAMP()');await rows(pool,'INSERT INTO sessions(token_hash,user_id,expires_at) VALUES(?,?,DATE_ADD(UTC_TIMESTAMP(),INTERVAL 12 HOUR))',[tokenHash(token),u.id]);
    await audit(pool,u,'login','users',u.id);res.setHeader('Set-Cookie',cookie(token,43200));return json(res,200,{user:{id:u.id,name:u.name,email:u.email,role:u.role}});
   }
   const user=await userFor(req);if(!user)throw new Problem('Inicia sesión para continuar.',401);
   if(route==='/api/me'&&req.method==='GET')return json(res,200,{user});
   if(route==='/api/logout'&&req.method==='POST'){const token=req.headers.cookie?.match(/rip_session=([a-f0-9]+)/)?.[1];if(token)await rows(pool,'DELETE FROM sessions WHERE token_hash=?',[tokenHash(token)]);res.setHeader('Set-Cookie',cookie('',0));return json(res,200,{ok:true});}
   if(route==='/api/password'&&req.method==='POST'){const b=await body(req);const u=(await rows(pool,'SELECT password_hash FROM users WHERE id=?',[user.id]))[0];if(!await verifyPassword(text(b.current,'Contraseña actual',1,128),u.password_hash))throw new Problem('La contraseña actual es incorrecta.');await rows(pool,'UPDATE users SET password_hash=? WHERE id=?',[await hashPassword(password(b.password)),user.id]);await rows(pool,'DELETE FROM sessions WHERE user_id=?',[user.id]);res.setHeader('Set-Cookie',cookie('',0));return json(res,200,{ok:true});}
   if(route==='/api/data'&&req.method==='GET')return json(res,200,await snapshot(pool,user));
   if(route==='/api/reports'&&req.method==='GET'){
    role(user,'admin');const start=date(url.searchParams.get('start')),end=date(url.searchParams.get('end'));if(end<start)throw new Problem('Período inválido.');
    const items=await rows(pool,'SELECT s.id,s.label,s.starts_at,s.ends_at,d.name department,m.name doctor,p.name plan,p.status FROM shifts s JOIN departments d ON d.id=s.department_id LEFT JOIN doctors m ON m.id=s.doctor_id JOIN plans p ON p.id=s.plan_id WHERE s.starts_at>=? AND s.starts_at<DATE_ADD(?,INTERVAL 1 DAY) ORDER BY s.starts_at',[start,end]);
    return json(res,200,{start,end,items});
   }
   if(req.method==='POST')return json(res,200,await mutate(user,route.slice(5),await body(req)));
   throw new Problem('Ruta no encontrada.',404);
  }
  if(req.method!=='GET'&&req.method!=='HEAD')throw new Problem('Método no permitido.',405);
  const relative=route==='/'?'index.html':decodeURIComponent(route).slice(1);const target=path.resolve(web,relative);
  if(!target.startsWith(web)||relative.split('/').some(p=>p.startsWith('.')))throw new Problem('No encontrado.',404);
  const mime={'.html':'text/html; charset=utf-8','.js':'text/javascript; charset=utf-8','.css':'text/css; charset=utf-8','.svg':'image/svg+xml'}[path.extname(target)];if(!mime)throw new Problem('No encontrado.',404);
  const data=await readFile(target);res.writeHead(200,{'Content-Type':mime,'Cache-Control':'no-cache'});res.end(req.method==='HEAD'?undefined:data);
 }catch(e){const status=e.status||(['ER_DUP_ENTRY'].includes(e.code)?409:e.code==='ENOENT'?404:500);if(status===500)console.error(e.code||e.message);json(res,status,{error:status===500?'No se pudo completar la operación. Comprueba que MySQL esté iniciado.':e.code==='ER_DUP_ENTRY'?'Ya existe un registro con esa identificación, nombre o correo.':e.message});}
});
server.listen(port,host,()=>console.log(`Hospital RIP disponible en ${origin}`));
const cleanup=setInterval(()=>{for(const [k,v]of attempts)if(v.until<Date.now())attempts.delete(k);},60000);cleanup.unref();
process.on('SIGINT',()=>server.close(async()=>{await pool.end();process.exit();}));
