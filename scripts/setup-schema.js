export function schemaForDatabase(schema,database){
 if(typeof database!=='string'||!/^\w{1,64}$/.test(database))throw new Error('DB_NAME debe contener solo letras, números y guiones bajos.');
 return schema.replace(/^CREATE DATABASE IF NOT EXISTS hospital_rip[^;]*;\s*USE hospital_rip;/,`CREATE DATABASE IF NOT EXISTS \`${database}\` CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;\nUSE \`${database}\`;`);
}
