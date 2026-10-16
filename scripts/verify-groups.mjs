// Isolated SQLite integration checks. Never reads or modifies user data.
import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import {createRequire} from "node:module";
import {DatabaseSync} from "node:sqlite";
import ts from "typescript";
import {verifyTeacherGroups} from "./teacher-groups-cases.mjs";
import {verifyPersonForms} from "./person-forms-cases.mjs";
import {verifyBranchManagement} from "./branch-management-cases.mjs";
const nativeRequire=createRequire(import.meta.url),root=process.cwd(),sqlite=new DatabaseSync(":memory:");
sqlite.exec(fs.readFileSync("drizzle/0000_cloudy_jetstream.sql","utf8"));
let authenticated=true,failBatch=false;
const binding={
 prepare(sql){let args=[];const statement={bind(...values){args=values;return statement},async all(){return {results:sqlite.prepare(sql).all(...args)}},async first(){return sqlite.prepare(sql).get(...args)??null},async run(){return sqlite.prepare(sql).run(...args)}};return statement},
 async batch(statements){sqlite.exec("BEGIN IMMEDIATE");try{for(let i=0;i<statements.length;i++){await statements[i].all();if(failBatch&&i===0)throw new Error("Injected write failure")}sqlite.exec("COMMIT");return []}catch(e){sqlite.exec("ROLLBACK");throw e}},
};
const workerEnv={DB:binding};
const cache=new Map();
function load(file){const filename=path.resolve(root,file);if(cache.has(filename))return cache.get(filename).exports;const module={exports:{}};cache.set(filename,module);const compiled=ts.transpileModule(fs.readFileSync(filename,"utf8"),{compilerOptions:{module:ts.ModuleKind.CommonJS,target:ts.ScriptTarget.ES2022}}).outputText;
 const require=name=>{if(name==="cloudflare:workers")return {env:workerEnv};if(name==="@/app/chatgpt-auth")return {getChatGPTUser:async()=>authenticated?{userId:"group-test"}:null};if(name.startsWith("@/"))return load(name.slice(2)+".ts");if(name.startsWith("."))return load(path.relative(root,path.resolve(path.dirname(filename),name))+".ts");return nativeRequire(name)};
 new Function("require","module","exports",compiled)(require,module,module.exports);return module.exports;
}
const model=load("lib/analytics.ts"),groups=load("lib/groups.ts"),storage=load("lib/storage.ts"),api=load("app/api/data/route.ts"),backup=load("lib/backup-storage.ts");
async function post(kind,value,status=200,origin="http://groups.test"){
 const r=await api.POST(new Request("http://groups.test/api/data?dataset=work",{method:"POST",headers:{Origin:origin,"Content-Type":"application/json"},body:JSON.stringify({kind,value})}));
 const json=await r.json();assert.equal(r.status,status,JSON.stringify(json));return json;
}
const teacher={id:"g-teacher",kind:"teacher",name:"Учитель группы",gender:"male",branch:model.branches[0],groups:"",startDate:"2026-01-01"};
await post("person",teacher);await post("person",{...teacher,id:"g-teacher-2",name:"Второй учитель"});
await post("settings",{id:"settings",...model.defaults});
const student=(id,name,gender="male")=>({...teacher,id,kind:"student",name,gender,teacherId:teacher.id,age:12,level:"Средний"});
await post("person",student("g-z","Яхья Алиев"));await post("person",student("g-a","Ахмад Магомедов"));await post("person",student("g-girl","Аиша Алиева","female"));
const g={id:"g-boys",name:"Утренняя",branch:teacher.branch,teacherId:teacher.id,gender:"male",days:[0,2,4],startTime:"09:30",endTime:"10:30"};
await post("group",{...g,studentIds:["g-z","g-a"]});
let d=await storage.readData("work");
assert.deepEqual(groups.groupStudents(d,g).map(p=>p.id),["g-a","g-z"]);
assert.equal(groups.scheduleLabel(g),"Пн, Ср, Пт · 09:30–10:30");
assert.equal(d.people.find(p=>p.id==="g-a").groupId,g.id);
assert.equal(groups.groupResult(d,g),null);
assert.equal(model.result(d,teacher),null);
await post("group",{...g,studentIds:["g-girl"]},400);
await post("group",{...g,studentIds:["missing"]},400);
await post("group",{...g,days:[]},400);
await post("group",{...g,days:[0,0]},400);
await post("group",{...g,startTime:"25:00"},400);
await post("group",{...g,endTime:"09:00"},400);
await post("group",{...g,id:"g-duplicate"},400);
await post("group",{...g,branch:model.branches[1]},400);
await post("group",{...g,studentIds:["g-a","g-a"]},400);
const reading={id:"g-reading",personId:"g-a",groupId:g.id,teacherId:teacher.id,assessmentType:"reading",readingMode:"quran",date:"2026-09-10",createdAt:"2026-09-10T12:00:00.000Z",makhraj:4,tajweed:6,note:"Повторить буквы"};
await post("check",reading);
await post("check",{...reading,id:"bad-zero",makhraj:0},400);
await post("check",{...reading,id:"bad-high",tajweed:11},400);
await post("check",{...reading,id:"bad-mode",readingMode:"other"},400);
await post("check",{...reading,id:"bad-member",personId:"g-girl"},400);
await post("check",{...reading,id:"bad-teacher",teacherId:"g-teacher-2"},400);
await post("check",{...reading,id:"bad-date",date:"2026-02-30"},400);
await post("check",{...reading,id:"bad-future",date:"2099-01-01"},400);
d=await storage.readData("work");
assert.equal(d.checks[0].hifz,undefined);assert.equal(d.checks[0].attendance,undefined);
assert.equal(model.result(d,d.people.find(p=>p.id==="g-a")),5);
assert.equal(groups.groupResult(d,g),5);
assert.equal(model.result(d,teacher),5);
assert.deepEqual(groups.priorityStudents(d,g).map(p=>p.id),["g-a"]);
assert.equal(groups.groupResult(d,g,"2026-10"),null);
// Priority survives a month change and disappears only after a better latest result.
await post("check",{...reading,id:"g-success",readingMode:"memory",date:"2026-10-01",createdAt:"2026-10-01T12:00:00.000Z",makhraj:8,tajweed:10});
d=await storage.readData("work");assert.equal(groups.priorityStudents(d,g).length,0);assert.equal(groups.groupResult(d,g,"2026-10"),9);assert.equal(model.result(d,teacher,"2026-10"),9);
// A weak criterion remains visible even when the average passes the threshold.
await post("check",{...reading,id:"g-success",date:"2026-10-01",makhraj:6,tajweed:10});
d=await storage.readData("work");assert.equal(groups.priorityStudents(d,g).length,1);assert.equal(d.checks.length,2);
// Existing four-score teacher checks keep their established five-factor formula.
await post("check",{id:"g-teacher-check",personId:teacher.id,date:"2026-10-01",makhraj:10,tajweed:10,hifz:10,attendance:10,note:""});
d=await storage.readData("work");assert.equal(model.result(d,teacher,"2026-10"),9.6);
// Removing one member preserves their card and history; renaming/teacher transfer is atomic.
await post("group",{...g,name:"Вечерняя",teacherId:"g-teacher-2",studentIds:["g-a"]});
d=await storage.readData("work");assert.equal(d.people.find(p=>p.id==="g-z").groups,"");assert.equal(d.people.find(p=>p.id==="g-z").groupId,undefined);assert.equal(d.people.find(p=>p.id==="g-a").teacherId,"g-teacher-2");assert.equal(d.checks.length,3);
const snapshot=()=>sqlite.prepare("SELECT * FROM records ORDER BY id").all().map(r=>({...r}));
const before=snapshot();failBatch=true;const oldError=console.error;console.error=()=>{};try{await post("group",{...g,name:"Не должно сохраниться",studentIds:["g-z"]},503)}finally{failBatch=false;console.error=oldError}assert.deepEqual(snapshot(),before);
const exported=await backup.exportBackup();assert.equal(exported.version,3);await backup.restoreBackup(exported);assert.deepEqual(snapshot().filter(r=>r.dataset==="work"),before);
assert.equal((await storage.readData("work")).groups.length,1);
// Old text-only mixed groups split by gender without losing students.
const old=model.demoData();assert.equal(groups.availableGroups(old).length,16);
old.people.push({...student("legacy-girl","Фатима" ,"female"),teacherId:old.people[0].id,groups:"1А"});
const split=groups.availableGroups(old).filter(g=>g.teacherId===old.people[0].id&&g.name==="1А");assert.equal(split.length,2);assert.deepEqual(split.map(g=>groups.groupStudents(old,g).every(p=>p.gender===g.gender)),[true,true]);
authenticated=false;await post("group",g,401);authenticated=true;await post("group",g,403,"http://wrong.test");

async function verifyOrganization(database){
 const oldTeacher={...teacher,id:"org-old",name:"Первый учитель",groups:"Старая группа"},newTeacher={...teacher,id:"org-new",name:"Новый учитель",groups:""};
 await post("person",oldTeacher);await post("person",{...student("org-student","Зайнаб Алиева","female"),teacherId:oldTeacher.id,groups:"Старая группа"});
 let state=await storage.readData("work"),legacy=groups.availableGroups(state).find(g=>g.teacherId===oldTeacher.id&&g.gender==="female");assert.ok(legacy);
 await post("person",{...newTeacher,groupIds:[legacy.id]});
 state=await storage.readData("work");assert.equal(state.groups.find(g=>g.id===legacy.id).teacherId,oldTeacher.id);assert.equal(state.people.find(p=>p.id==="org-student").teacherId,oldTeacher.id);assert.ok(groups.teacherHasGroup(state,legacy,newTeacher.id));assert.ok(groups.teacherHasGroup(state,legacy,oldTeacher.id));assert.equal(groups.availableGroups(state).filter(g=>g.id===legacy.id).length,1);
 await post("person",{...newTeacher,groupIds:[]});await post("person",{...newTeacher,groupIds:[legacy.id]});
 await post("person",{...teacher,id:"org-bad",groupIds:["unknown"]},400);await post("person",{...teacher,id:"org-bad",branch:model.branches[1],groupIds:[legacy.id]},400);await post("person",{...teacher,id:"org-bad",groupIds:[legacy.id,legacy.id]},400);
 const reading={id:"org-reading",personId:"org-student",groupId:legacy.id,teacherId:newTeacher.id,assessmentType:"reading",readingMode:"quran",date:"2026-10-01",makhraj:5,tajweed:6,note:"Сохранить историю"};await post("check",reading);
 await post("branch",{id:"org-empty",name:"Новый пустой филиал"});await post("person",{...teacher,id:"org-empty-teacher",branch:"Новый пустой филиал"});
 await post("branch",{id:"org-duplicate",name:"новый пустой филиал"},400);
 await post("branch",{id:"org-bad",name:"Некорректный",source:teacher.branch,teacherIds:[]},400);await post("branch",{id:"org-bad",name:"Некорректный",source:teacher.branch,teacherIds:["unknown"]},400);await post("branch",{id:"org-bad",name:"Некорректный",source:teacher.branch,teacherIds:["org-empty-teacher"]},400);
 // A shared group moves with all its teachers so its branch stays consistent.
 await post("branch",{id:"org-split",name:"Выделенный филиал",source:teacher.branch,teacherIds:[newTeacher.id]},400);
 await database.prepare("CREATE TRIGGER org_failure BEFORE UPDATE ON records WHEN NEW.id = 'work:org-student' BEGIN SELECT RAISE(ABORT, 'organization rollback'); END").run();
 const before=await storage.readData("work"),originalError=console.error;console.error=()=>{};
 try{await post("branch",{id:"org-split",name:"Выделенный филиал",source:teacher.branch,teacherIds:[newTeacher.id,oldTeacher.id]},503)}finally{console.error=originalError}
 assert.deepEqual(await storage.readData("work"),before);await database.prepare("DROP TRIGGER org_failure").run();
 await post("branch",{id:"org-split",name:"Выделенный филиал",source:teacher.branch,teacherIds:[newTeacher.id,oldTeacher.id]});
 state=await storage.readData("work");for(const id of [oldTeacher.id,newTeacher.id,"org-student"])assert.equal(state.people.find(p=>p.id===id).branch,"Выделенный филиал");assert.equal(state.groups.find(g=>g.id===legacy.id).branch,"Выделенный филиал");assert.deepEqual(state.checks.find(c=>c.id===reading.id),reading);assert.equal(model.result(state,state.people.find(p=>p.id===newTeacher.id)),5.5);
 const exported=await backup.exportBackup();await backup.restoreBackup(exported);const sort=rows=>[...rows].sort((a,b)=>a.id.localeCompare(b.id));assert.deepEqual(sort((await backup.exportBackup()).records),sort(exported.records));
 console.log("PASS: shared legacy group assignments, unchanged roster, multiple teachers, shared-group branch split, atomic rollback and backup round trip.");
}

async function verifyTeacherCreation(database){
 await verifyTeacherGroups({post,model,groupHelpers:groups,readData:()=>storage.readData("work"),branch:teacher.branch,async failWrites(payload){
  await database.prepare("CREATE TRIGGER teacher_creation_failure BEFORE INSERT ON records WHEN NEW.id = 'work:schedule-next-teacher' BEGIN SELECT RAISE(ABORT, 'teacher creation rollback'); END").run();
  const oldError=console.error;console.error=()=>{};
  try{await post("person",payload,503)}finally{console.error=oldError;await database.prepare("DROP TRIGGER teacher_creation_failure").run()}
 }});
 const canonical=d=>Object.fromEntries(Object.entries(d).map(([key,value])=>[key,Array.isArray(value)?[...value].sort((a,b)=>a.id.localeCompare(b.id)):value]));
 const before=canonical(await storage.readData("work")),exported=await backup.exportBackup();await backup.restoreBackup(exported);assert.deepEqual(canonical(await storage.readData("work")),before);
 const invalid=structuredClone(exported),row=invalid.records.find(r=>r.id==="work:schedule-third-teacher");row.value.groupAssignments[0].groupId="missing-group";await assert.rejects(()=>backup.restoreBackup(invalid));assert.deepEqual(canonical(await storage.readData("work")),before);

}

await verifyOrganization(binding);
await verifyTeacherCreation(binding);
await verifyPersonForms({post,readData:()=>storage.readData("work"),model,groupHelpers:groups});
await verifyBranchManagement({post,readData:()=>storage.readData("work"),model,async failAction(value){const oldError=console.error;failBatch=true;console.error=()=>{};try{await post("branch-action",value,503)}finally{failBatch=false;console.error=oldError}}});
const formsBackup=await backup.exportBackup();await backup.restoreBackup(formsBackup);
assert.deepEqual((await backup.exportBackup()).records,formsBackup.records);
sqlite.close();console.log("PASS: groups, schedules, gender separation, alphabetical roster, atomic transfers/removal/rollback, two-score readings, group and teacher totals, persistent priority/recheck, validation, legacy groups, and backup round trip.");

if(process.argv.includes("--d1")){
 const {Miniflare}=await import("miniflare");
 const mf=new Miniflare({modules:true,script:"export default {fetch(){return new Response('isolated groups verification')}}",compatibilityDate:"2026-05-15",compatibilityFlags:["nodejs_compat"],cf:false,d1Databases:["DB"]});
 try{
  const database=await mf.getD1Database("DB");workerEnv.DB=database;
  for(const sql of fs.readFileSync("drizzle/0000_cloudy_jetstream.sql","utf8").split("--> statement-breakpoint"))await database.prepare(sql).run();
  await post("person",teacher);await post("person",student("g-a","Ахмад Магомедов"));
  await post("group",{...g,studentIds:["g-a"]});await post("check",reading);
  const d1Data=await storage.readData("work");assert.equal(groups.groupResult(d1Data,g),5);assert.equal(model.result(d1Data,teacher),5);
  await database.prepare("CREATE TRIGGER groups_failure BEFORE UPDATE ON records WHEN NEW.id = 'work:g-a' BEGIN SELECT RAISE(ABORT, 'test rollback'); END").run();
  const before=await storage.readData("work"),oldError=console.error;console.error=()=>{};
  try{await post("group",{...g,name:"Не сохранить",studentIds:[]},503)}finally{console.error=oldError}
  assert.deepEqual(await storage.readData("work"),before);
  await database.prepare("DROP TRIGGER groups_failure").run();
  const d1Backup=await backup.exportBackup();await backup.restoreBackup(d1Backup);const order=records=>[...records].sort((a,b)=>a.id.localeCompare(b.id));assert.deepEqual(order((await backup.exportBackup()).records),order(d1Backup.records));
  await verifyOrganization(database);
  await verifyTeacherCreation(database);
  console.log("PASS: real isolated D1 group/reading writes, totals, atomic rollback and backup restoration.");
 }finally{await mf.dispose()}
}
