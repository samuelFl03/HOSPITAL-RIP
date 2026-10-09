import { randomBytes, scrypt as scryptCb, timingSafeEqual, createHash } from 'node:crypto';
import { promisify } from 'node:util';
const scrypt = promisify(scryptCb);
export class Problem extends Error { constructor(message, status = 400) { super(message); this.status = status; } }
export const tokenHash = value => createHash('sha256').update(value).digest('hex');
export async function hashPassword(value) { const salt = randomBytes(16).toString('hex'); return `${salt}:${(await scrypt(value, salt, 64)).toString('hex')}`; }
export async function verifyPassword(value, hash) { const [salt, key] = hash.split(':'); const actual = await scrypt(value, salt, 64); const expected = Buffer.from(key, 'hex'); return expected.length === actual.length && timingSafeEqual(actual, expected); }
export function text(value, label, min = 1, max = 150) { if (typeof value !== 'string' || value.trim().length < min || value.trim().length > max) throw new Problem(`${label}: escribe entre ${min} y ${max} caracteres.`); return value.trim(); }
export function id(value) { const n = Number(value); if (!Number.isSafeInteger(n) || n < 1) throw new Problem('Identificador inválido.'); return n; }
export function date(value) { if (typeof value !== 'string' || !/^\d{4}-\d{2}-\d{2}$/.test(value) || !Number.isFinite(Date.parse(value)) || new Date(value).toISOString().slice(0,10) !== value) throw new Problem('Fecha inválida.'); return value; }
export function datetime(value) { if (typeof value !== 'string' || !/^\d{4}-\d{2}-\d{2}[T ]\d{2}:\d{2}(:\d{2})?$/.test(value)) throw new Problem('Fecha y hora inválidas.'); date(value.slice(0,10)); const hour = +value.slice(11,13), minute = +value.slice(14,16); if(hour>23 || minute>59 || +(value.slice(17,19)||0)>59) throw new Problem('Hora inválida.'); return value.replace('T',' ').slice(0,16)+':00'; }
export function interval(start, end) { const a = datetime(start), b = datetime(end); if (b <= a) throw new Problem('La hora final debe ser posterior a la inicial.'); return [a,b]; }
export function role(user, ...roles) { if (!roles.includes(user.role)) throw new Problem('Tu rol no tiene permiso para realizar esta acción.',403); }
export function email(value) { const v=text(value,'Correo',5,160).toLowerCase(); if(!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(v)) throw new Problem('Correo inválido.'); return v; }
export function password(value) { if(typeof value!=='string'||value.length<10||value.length>128) throw new Problem('La contraseña debe tener entre 10 y 128 caracteres.'); return value; }
export const overlaps = (a,b,c,d) => a < d && b > c;
