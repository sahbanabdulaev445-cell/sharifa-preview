// Uses an in-memory SQLite database only; never opens the user's local or hosted data.
import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import {createRequire} from "node:module";
import {DatabaseSync} from "node:sqlite";
import ts from "typescript";
const nativeRequire=createRequire(import.meta.url),root=process.cwd(),sqlite=new DatabaseSync(":memory:");
sqlite.exec(fs.readFileSync("drizzle/0000_cloudy_jetstream.sql","utf8"));
let authenticated=true,failBatch=false;
const binding={
 prepare(sql){let args=[];const statement={bind(...values){args=values;return statement},async all(){return {results:sqlite.prepare(sql).all(...args)}},async first(){return sqlite.prepare(sql).get(...args)??null},async run(){return sqlite.prepare(sql).run(...args)}};return statement},
 async batch(statements){sqlite.exec("BEGIN IMMEDIATE");try{const results=[];for(let i=0;i<statements.length;i++){results.push(await statements[i].all());if(failBatch&&i===0)throw new Error("Injected write failure")}sqlite.exec("COMMIT");return results}catch(e){sqlite.exec("ROLLBACK");throw e}},
};
const workerEnv={DB:binding};
const cache=new Map();
function load(file){const filename=path.resolve(root,file);if(cache.has(filename))return cache.get(filename).exports;const module={exports:{}};cache.set(filename,module);const compiled=ts.transpileModule(fs.readFileSync(filename,"utf8"),{compilerOptions:{module:ts.ModuleKind.CommonJS,target:ts.ScriptTarget.ES2022}}).outputText;
 const require=(name)=>{if(name==="cloudflare:workers")return {env:workerEnv};if(name==="@/app/chatgpt-auth")return {getChatGPTUser:async()=>authenticated?{userId:"isolated-test"}:null};if(name.startsWith("@/"))return load(name.slice(2)+".ts");if(name.startsWith("."))return load(path.relative(root,path.resolve(path.dirname(filename),name))+".ts");return nativeRequire(name)};
 new Function("require","module","exports",compiled)(require,module,module.exports);return module.exports;
}
const model=load("lib/analytics.ts"),storage=load("lib/storage.ts"),backupStorage=load("lib/backup-storage.ts"),format=load("lib/backup-format.ts"),api=load("app/api/backup/route.ts"),dataApi=load("app/api/data/route.ts");
const teacher={id:"backup-teacher",kind:"teacher",name:"Учитель резервной копии",gender:"male",branch:model.branches[0],groups:"A, B",startDate:"2020-01-01",archived:true};
const student={...teacher,id:"backup-student",kind:"student",name:"Ученик резервной копии",groups:"A",teacherId:teacher.id,age:12,level:"Средний"};
const check={id:"backup-check",personId:student.id,date:"2026-01-01",createdAt:"2026-01-01T11:22:33.000Z",makhraj:0,tajweed:7.5,hifz:9,attendance:10,note:'Кириллица, "кавычки" и\nновая строка'};
const exam={...check,id:"backup-exam",teacherId:teacher.id,juz:30};delete exam.personId;
for(const dataset of ["work","demo"]){await storage.saveRecord(dataset,"person",teacher);await storage.saveRecord(dataset,"person",student);await storage.saveRecord(dataset,"check",check);await storage.saveRecord(dataset,"exam",exam);await storage.saveRecord(dataset,"settings",{id:"settings",...model.defaults,attention:dataset==="work"?6.5:7.5})}
sqlite.prepare("INSERT INTO records (id, dataset, kind, payload) VALUES (?, ?, ?, ?)").run("demo:initialized","demo","marker","{}");
const exported=await backupStorage.exportBackup();
assert.equal(exported.records.length,11);assert.equal(format.backupSummary(exported)[0].checks,1);
const snapshot=()=>sqlite.prepare("SELECT * FROM records ORDER BY id").all().map(row=>({...row}));
const original=snapshot();
await storage.saveRecord("work","person",{...teacher,id:"extra",archived:false});
await storage.saveRecord("work","check",{...check,makhraj:10});
await backupStorage.restoreBackup(JSON.parse(JSON.stringify(exported)));
assert.deepEqual(snapshot(),original);
assert.equal((await storage.readData("work")).settings.attention,6.5);
assert.equal((await storage.readData("demo")).people.length,2);
assert.equal((await storage.readData("work")).checks[0].createdAt,check.createdAt);
assert.equal((await storage.readData("work")).people[0].archived,true);
for(const modify of [b=>b.version=99,b=>b.records.push(b.records[0]),b=>b.records=b.records.filter(r=>r.id!=="work:backup-teacher"),b=>b.records.find(r=>r.id==="work:backup-check").value.makhraj=11,b=>b.records=b.records.filter(r=>r.id!=="work:settings")]){
 const damaged=structuredClone(exported);modify(damaged);await assert.rejects(()=>backupStorage.restoreBackup(damaged));assert.deepEqual(snapshot(),original);
}
failBatch=true;await assert.rejects(()=>backupStorage.restoreBackup(exported));failBatch=false;assert.deepEqual(snapshot(),original);
const request=(value,origin="http://backup.test")=>new Request("http://backup.test/api/backup",{method:"POST",headers:{Origin:origin,"Content-Type":"application/json"},body:typeof value==="string"?value:JSON.stringify(value)});
authenticated=false;assert.equal((await api.GET()).status,401);assert.equal((await api.POST(request(exported))).status,401);authenticated=true;
assert.equal((await api.POST(request(exported,"http://wrong.test"))).status,403);
assert.equal((await api.POST(request("{"))).status,400);
assert.equal((await api.POST(request({wrong:"format"}))).status,400);
assert.equal((await api.POST(new Request("http://backup.test/api/backup",{method:"POST",headers:{Origin:"http://backup.test","Content-Type":"application/json","Content-Length":String(format.MAX_BACKUP_BYTES+1)},body:"{}"}))).status,413);
assert.equal((await api.POST(request(exported))).status,200);assert.deepEqual(snapshot(),original);
const download=await api.GET();assert.equal(download.status,200);assert.match(download.headers.get("content-disposition"),/attachment/);assert.deepEqual((await download.json()).records,exported.records);
const invalidScore=await dataApi.POST(new Request("http://backup.test/api/data?dataset=work",{method:"POST",headers:{Origin:"http://backup.test","Content-Type":"application/json"},body:JSON.stringify({kind:"check",value:{...check,makhraj:11}})}));assert.equal(invalidScore.status,400);
sqlite.exec("DELETE FROM records");const empty=await backupStorage.exportBackup();assert.equal(empty.records.length,3);await backupStorage.restoreBackup(empty);assert.equal((await storage.readData("demo")).people.length,0);assert.deepEqual((await storage.readData("work")).settings,{id:"settings",...model.defaults});
// Large copies exercise multiple JSON chunks while retaining a single transaction.
const large=structuredClone(exported);for(let i=0;i<900;i++)large.records.push({id:`work:large-${i}`,dataset:"work",kind:"check",value:{...check,id:`large-${i}`,note:"Я".repeat(1900)}});
await backupStorage.restoreBackup(large);assert.equal(sqlite.prepare("SELECT COUNT(*) AS n FROM records WHERE kind='check'").get().n,902);
sqlite.close();console.log("PASS: both datasets, exact round trip, archived cards, dates/notes/settings, duplicate-free replacement, invalid-file rejection, rollback, authentication/origin/size checks, empty copies, and multi-chunk restore.");

if(process.argv.includes("--d1")){
 const {Miniflare}=await import("miniflare");
 const mf=new Miniflare({modules:true,script:"export default {fetch(){return new Response('isolated backup verification')}}",compatibilityDate:"2026-05-15",compatibilityFlags:["nodejs_compat"],cf:false,d1Databases:["DB"]});
 try{
  const database=await mf.getD1Database("DB");workerEnv.DB=database;
  for(const sql of fs.readFileSync("drizzle/0000_cloudy_jetstream.sql","utf8").split("--> statement-breakpoint"))await database.prepare(sql).run();
  await backupStorage.restoreBackup(exported);assert.deepEqual((await backupStorage.exportBackup()).records,exported.records);
  await database.prepare("CREATE TRIGGER backup_test_failure BEFORE INSERT ON records WHEN NEW.id = 'work:backup-check' BEGIN SELECT RAISE(ABORT, 'test rollback'); END").run();
  await assert.rejects(()=>backupStorage.restoreBackup(exported));assert.deepEqual((await backupStorage.exportBackup()).records,exported.records);
  await database.prepare("DROP TRIGGER backup_test_failure").run();
  await backupStorage.restoreBackup(large);assert.equal((await database.prepare("SELECT COUNT(*) AS n FROM records WHERE kind='check'").first()).n,902);
  console.log("PASS: isolated D1 runtime, exact export/import, transaction rollback, and multi-chunk restoration.");
 }finally{await mf.dispose()}
}
