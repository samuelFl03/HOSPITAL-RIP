import test from 'node:test';
import assert from 'node:assert/strict';
import {date,datetime,interval,overlaps,hashPassword,verifyPassword,role,password} from '../server/security.js';
test('Rechaza fechas imposibles y horarios invertidos',()=>{assert.throws(()=>date('2026-02-30'));assert.throws(()=>datetime('2026-09-18T24:00'));assert.throws(()=>interval('2026-09-18T15:00','2026-09-18T07:00'));assert.equal(date('2028-02-29'),'2028-02-29');});
test('Detecta cruces; permite guardias contiguas',()=>{assert.equal(overlaps('07:00','15:00','14:00','20:00'),true);assert.equal(overlaps('07:00','15:00','15:00','23:00'),false);});
test('Contraseñas con sal distinta y verificación segura',async()=>{const a=await hashPassword('Hospital2026!'),b=await hashPassword('Hospital2026!');assert.notEqual(a,b);assert.equal(await verifyPassword('Hospital2026!',a),true);assert.equal(await verifyPassword('Incorrecta123!',a),false);assert.throws(()=>password('123'));});
test('Permisos por rol en el servidor',()=>{assert.throws(()=>role({role:'chief'},'supervisor'),{status:403});assert.doesNotThrow(()=>role({role:'admin'},'admin'));});
