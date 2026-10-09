import mysql from 'mysql2/promise';
export const config={host:process.env.DB_HOST||'127.0.0.1',port:Number(process.env.DB_PORT||3306),user:process.env.DB_USER||'hospital_user',password:process.env.DB_PASSWORD||'',database:process.env.DB_NAME||'hospital_rip',charset:'utf8mb4',dateStrings:true,timezone:'+00:00'};
export const pool=mysql.createPool({...config,connectionLimit:8});
export async function transaction(fn) { const db=await pool.getConnection(); try {await db.beginTransaction(); await db.query('SELECT id FROM locks WHERE id=1 FOR UPDATE'); const result=await fn(db); await db.commit(); return result;} catch(e){await db.rollback();throw e;}finally{db.release();} }
export async function rows(db,sql,args=[]) { return (await db.execute(sql,args))[0]; }
export async function audit(db,user,action,entity,entityId,detail='') { await rows(db,'INSERT INTO audit(user_id,action,entity,entity_id,detail) VALUES(?,?,?,?,?)',[user.id,action,entity,entityId,detail]); }
