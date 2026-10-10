import assert from 'node:assert/strict';
import fs from 'node:fs';
import ts from 'typescript';
const js=ts.transpileModule(fs.readFileSync('lib/analytics.ts','utf8'),{compilerOptions:{module:ts.ModuleKind.ESNext,target:ts.ScriptTarget.ES2022}}).outputText;
const model=await import('data:text/javascript;base64,'+Buffer.from(js).toString('base64'));
const base=process.env.QA_ORIGIN??'http://127.0.0.1:5173';
const headers={'Content-Type':'application/json'};
async function read(){const r=await fetch(base+'/api/data?dataset=demo',{headers});assert.equal(r.status,200);return r.json()}
async function post(kind,value,expected=200){const r=await fetch(base+'/api/data?dataset=demo',{method:'POST',headers,body:JSON.stringify({kind,value})});const d=await r.json();assert.equal(r.status,expected,JSON.stringify(d));return d}
const initial=await read();assert.ok(initial.people.length>=104);assert.ok(initial.checks.length>=624);assert.equal((await fetch(base+'/api/data')).status,200);
const teacher={id:'qa-teacher',kind:'teacher',name:'Проверка сохранения',gender:'male',branch:'Гамидова',groups:'QA',startDate:'2026-01-01'};
const student={...teacher,id:'qa-student',kind:'student',name:'Ученик проверки',teacherId:teacher.id,age:12,level:'Средний'};
await post('person',teacher);await post('person',student);
await post('person',{...student,id:'qa-invalid',branch:'Каспийск'},400);
const c=(id,personId,date,score)=>({id,personId,date,makhraj:score,tajweed:score,hifz:score,attendance:score,note:'Автоматическая локальная проверка',createdAt:'2026-10-05T10:00:00.000Z'});
await post('check',c('qa-t-old',teacher.id,'2026-09-01',7));await post('check',c('qa-s-old',student.id,'2026-09-01',6));
await post('check',c('qa-t-new',teacher.id,'2026-10-01',9));await post('check',c('qa-s-new',student.id,'2026-10-01',7));
await post('check',{...c('qa-invalid-score',student.id,'2026-10-01',8),makhraj:11},400);
await post('check',{...c('qa-invalid-date',student.id,'2026-10-01',8),date:'2026-02-30'},400);
await post('settings',{id:'settings',...initial.settings,weights:{makhraj:0,tajweed:0,hifz:0,attendance:0,students:100}},400);
for(let i=0;i<3;i++)await post('exam',{id:'qa-exam-'+i,teacherId:teacher.id,date:'2026-0'+(7+i)+'-15',juz:30,makhraj:[7.8,8.6,9.3][i],tajweed:[7.8,8.6,9.3][i],hifz:[7.8,8.6,9.3][i],attendance:[7.8,8.6,9.3][i],note:'QA'});
let fresh=await read();assert.equal(fresh.people.find(p=>p.id===teacher.id).name,teacher.name);assert.equal(fresh.exams.filter(e=>e.teacherId===teacher.id).length,3);
assert.equal(model.num(model.result(fresh,teacher,'2026-10')),'8,6');assert.equal(model.num(model.delta(fresh,teacher,'2026-10')),'1,8');
assert.equal(model.result(fresh,teacher,'2026-08'),null);assert.equal(model.delta(fresh,teacher,'2026-08'),null);
await post('check',{...c('qa-s-new',student.id,'2026-10-01',7),makhraj:4});fresh=await read();assert.equal(fresh.checks.filter(x=>x.id==='qa-s-new').length,1);assert.ok(model.alerts(fresh,student,'2026-10').some(x=>x.includes('снижение')));
assert.equal(model.previousMonth('2026-01'),'2025-12');assert.equal(model.weighted({makhraj:0,tajweed:0,hifz:0,attendance:0},model.defaults.weights),0);
console.log('PASS: durable writes/read-back, editing without duplicates, direct local access, score/date/relation validation, 5-factor rating, monthly delta, missing-data handling, attention alerts, 3 exam attempts.');
