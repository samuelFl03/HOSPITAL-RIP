import test from 'node:test';
import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import {schemaForDatabase} from '../scripts/setup-schema.js';
test('Instalación selecciona la base de Railway y conserva todas las tablas',async()=>{
 const original=await readFile(new URL('../database/schema.sql',import.meta.url),'utf8');
 const schema=schemaForDatabase(original,'railway');
 assert.match(schema,/USE `railway`;/);
 assert.doesNotMatch(schema,/USE hospital_rip;/);
 assert.equal(schema.slice(schema.indexOf('CREATE TABLE')),original.slice(original.indexOf('CREATE TABLE')));
});
test('Instalación rechaza nombres que puedan inyectar SQL',()=>{
 for(const name of ['',null,'x`; DROP DATABASE hospital_rip;','a'.repeat(65)])assert.throws(()=>schemaForDatabase('',name));
});
