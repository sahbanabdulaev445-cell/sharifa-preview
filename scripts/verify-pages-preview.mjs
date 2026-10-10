// Browser-storage integration checks in memory; no real browser or user data.
import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import {createRequire} from "node:module";
import ts from "typescript";
const nativeRequire=createRequire(import.meta.url),cache=new Map(),saved=new Map();
let failWrite=false;
Object.defineProperty(globalThis,"localStorage",{configurable:true,value:{getItem:key=>saved.get(key)??null,setItem(key,value){if(failWrite)throw new Error("Storage quota test");saved.set(key,value)}}});
const aliases={"@/lib/storage":"preview/browser-storage.ts","@/lib/backup-storage":"preview/browser-storage.ts","@/app/chatgpt-auth":"preview/browser-auth.ts"};
function load(file){
 const filename=path.resolve(file);if(cache.has(filename))return cache.get(filename).exports;
 const module={exports:{}};cache.set(filename,module);
 const compiled=ts.transpileModule(fs.readFileSync(filename,"utf8"),{compilerOptions:{module:ts.ModuleKind.CommonJS,target:ts.ScriptTarget.ES2022}}).outputText;
 const require=name=>aliases[name]?load(aliases[name]):name.startsWith("@/")?load(name.slice(2)+".ts"):name.startsWith(".")?load(path.resolve(path.dirname(filename),name)+".ts"):nativeRequire(name);
 new Function("require","module","exports",compiled)(require,module,module.exports);return module.exports;
}
const model=load("lib/analytics.ts"),groups=load("lib/groups.ts"),storage=load("preview/browser-storage.ts"),api=load("app/api/data/route.ts"),backupApi=load("app/api/backup/route.ts");
async function post(kind,value,status=200){const response=await api.POST(new Request("https://preview.test/api/data?dataset=work",{method:"POST",headers:{Origin:"https://preview.test","Content-Type":"application/json"},body:JSON.stringify({kind,value})}));const result=await response.json();assert.equal(response.status,status,JSON.stringify(result));return result}
assert.equal((await storage.readData("work")).people.length,0);assert.equal((await storage.readData("demo")).people.length,104);
const teacher={id:"pages-teacher",kind:"teacher",name:"Учитель проверки",gender:"male",branch:model.branches[0],groups:"",startDate:"2026-01-01"};
await post("person",teacher);
await post("person",{...teacher,id:"pages-student",kind:"student",name:"Ахмад Алиев",teacherId:teacher.id,age:12,level:"Начальный"});
const group={id:"pages-group",name:"Утренняя",teacherId:teacher.id,branch:teacher.branch,gender:"male",days:[0,2],startTime:"09:00",endTime:"10:00"};
await post("group",{...group,studentIds:["pages-student"]});
await post("check",{id:"pages-reading",personId:"pages-student",groupId:group.id,teacherId:teacher.id,assessmentType:"reading",readingMode:"quran",date:"2026-10-01",makhraj:4,tajweed:6,note:"Повторить буквы"});
let data=await storage.readData("work");assert.equal(groups.groupResult(data,group),5);assert.equal(groups.priorityStudents(data,group).length,1);
await post("person",{...teacher,id:"pages-new-teacher",name:"Второй учитель",groupIds:[group.id]});
data=await storage.readData("work");assert.equal(data.people.find(p=>p.id==="pages-student").teacherId,"pages-new-teacher");
const before=saved.get(storage.PREVIEW_STORAGE_KEY),oldError=console.error;failWrite=true;console.error=()=>{};
try{await post("branch",{id:"pages-split",name:"Новый филиал",source:teacher.branch,teacherIds:["pages-new-teacher"]},503)}finally{failWrite=false;console.error=oldError}
assert.equal(saved.get(storage.PREVIEW_STORAGE_KEY),before);
await post("branch",{id:"pages-split",name:"Новый филиал",source:teacher.branch,teacherIds:["pages-new-teacher"]});
data=await storage.readData("work");assert.equal(data.people.find(p=>p.id==="pages-student").branch,"Новый филиал");assert.equal(data.groups[0].branch,"Новый филиал");assert.equal(data.checks.length,1);
await post("check",{...data.checks[0],makhraj:11},400);
assert.equal((await storage.readData("demo")).people.length,104);
const response=await backupApi.GET();assert.equal(response.status,200);const exported=await response.json();assert.equal(exported.version,3);
const restore=await backupApi.POST(new Request("https://preview.test/api/backup",{method:"POST",headers:{Origin:"https://preview.test","Content-Type":"application/json"},body:JSON.stringify(exported)}));assert.equal(restore.status,200);assert.deepEqual(await storage.readData("work"),data);
const invalid=await backupApi.POST(new Request("https://preview.test/api/backup",{method:"POST",headers:{Origin:"https://preview.test","Content-Type":"application/json"},body:'{"format":"wrong"}'}));assert.equal(invalid.status,400);assert.deepEqual(await storage.readData("work"),data);
console.log("PASS: GitHub preview persistence, isolated datasets, groups/readings, teacher transfer, branch split, write rollback, validation, backup export/restore and invalid-backup preservation.");
