import test from 'node:test';
import assert from 'node:assert/strict';
import {availablePositions,validatePosition} from '../server/positions.js';

test('Cargos existentes se conservan y no se duplican',()=>{
 const positions=availablePositions([{position:'Auxiliar'},{position:'Técnico de radiología'},{position:'Técnico de radiología'}]);
 assert.equal(positions.filter(p=>p==='Auxiliar').length,1);
 assert.equal(positions.filter(p=>p==='Técnico de radiología').length,1);
 assert.equal(validatePosition('Técnico de radiología',positions),'Técnico de radiología');
});
test('El servidor rechaza un cargo vacío o fuera de las opciones',()=>{
 for(const value of ['',null,'Cargo inventado'])assert.throws(()=>validatePosition(value,availablePositions()));
 assert.equal(validatePosition('Médico general',availablePositions()),'Médico general');
});
