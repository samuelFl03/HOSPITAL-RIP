import test from 'node:test';
import assert from 'node:assert/strict';
import {cents,earnings,payrollMutation} from '../server/payroll.js';
test('Tarifa monetaria exacta y entradas inválidas',()=>{
 assert.equal(cents('12345.67'),1234567);
 for(const v of [0,-1,'','1.001',null,true,'1e4','NaN'])assert.throws(()=>cents(v));
});
test('Horas parciales y redondeo al centavo',()=>{
 assert.equal(earnings(480,2500000),20000000);
 assert.equal(earnings(90,10001),15002);
 assert.equal(earnings(1,100),2);
});
test('Todos los cambios de nómina exigen administrador antes de consultar MySQL',async()=>{
 for(const path of ['workers','work-hours','work-hours/delete','payrolls','payrolls/pay'])
  for(const role of ['chief','supervisor'])await assert.rejects(payrollMutation(null,{role},path,{}),e=>e.status===403);
});
