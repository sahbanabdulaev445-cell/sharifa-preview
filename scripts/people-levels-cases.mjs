import assert from "node:assert/strict";
export async function verifyPeopleAndLevels({post,readData,model,failAction}){
 let data=await readData();const branch=model.branchNames(data)[0];
 const teacher=(id,name)=>({id,kind:"teacher",name,gender:"male",branch,groups:"",startDate:"2020-01-01"});
 const a=teacher("bulk-a","Первый учитель"),b=teacher("bulk-b","Второй учитель"),target=teacher("bulk-target","Учитель для переноса");
 for(const t of [a,b,target])await post("person",t);
 const group=(id,tid,name)=>({id,name,teacherId:tid,branch,gender:"male",days:[0,2,4],startTime:"09:00",endTime:"10:00"});
 const ga=group("bulk-ga",a.id,"Начальная А"),gb=group("bulk-gb",b.id,"Начальная Б"),gt=group("bulk-gt",target.id,"Своя группа");
 for(const g of [ga,gb,gt])await post("group",g);
 const student=(id,name,g,level="Начальный")=>({id,kind:"student",name,gender:"male",branch,groups:g.name,groupId:g.id,teacherId:g.teacherId,birthYear:2018,level});
 const s1=student("bulk-s1","Первый ученик",ga),s2=student("bulk-s2","Второй ученик",gb),old=student("bulk-legacy","Прежний уровень",ga,"Средний");
 for(const p of [s1,s2,old])await post("person",p);
 data=await readData();assert.equal(data.people.find(p=>p.id===old.id).level,"Чтение");
 await post("person",{...old,level:"Продвинутый"});assert.equal((await readData()).people.find(p=>p.id===old.id).level,"Хифз");
 const check={id:"beginner-check",personId:s1.id,date:"2026-10-01",assessmentType:"beginner",groupId:ga.id,teacherId:a.id,letters:8,rules:7,reading:6,attendance:9,note:"Учебный пример"};
 await post("check",check);data=await readData();const saved=data.checks.find(c=>c.id===check.id);
 assert.equal(saved.makhraj,undefined);assert.equal(saved.tajweed,undefined);assert.equal(saved.hifz,undefined);
 assert.equal(model.weighted(saved,data.settings.weights),7.5);
 assert.deepEqual(model.checkCriteria(saved).map(k=>k.label),["Буквы","Правила таджвида","Чтение","Посещаемость"]);
 for(const invalid of [{letters:11},{rules:0},{reading:-1},{attendance:11},{personId:a.id},{teacherId:"missing"},{teacherId:b.id}])await post("check",{...check,id:"beginner-invalid",...invalid},400);
 const missing={...check,id:"beginner-missing"};delete missing.rules;await post("check",missing,400);
 const general={id:"beginner-old-general",personId:s1.id,date:"2026-09-30",makhraj:2,tajweed:3,hifz:4,attendance:10,note:"Старый вид проверки"};
 await post("check",general);data=await readData();assert.equal(model.previousCheck(data,saved),null,"A beginner check never compares against old Quran criteria");
 assert.deepEqual(model.checkCriteria(data.checks.find(c=>c.id===general.id)).map(k=>k.label),["Махрадж","Таджвид","Хифз","Посещаемость"]);
 // Each lesson stores its selected level; it does not depend on later pupil edits.
 for(const level of ["Чтение","Хифз"]){
  const lesson={id:level==="Хифз"?"level-hifz":"level-reading",personId:s1.id,date:"2026-10-02",assessmentType:"reading",assessmentLevel:level,makhraj:8,tajweed:7,hifz:6,attendance:10,note:"Без обязательной группы"};
  await post("check",lesson);const persisted=(await readData()).checks.find(c=>c.id===lesson.id);assert.equal(persisted.assessmentLevel,level);assert.equal(persisted.readingMode,undefined);
 }
 await post("check",{...check,id:"level-beginner",assessmentLevel:"Начальный"});
 await post("check",{...check,id:"level-invalid",assessmentLevel:"Хифз"},400);
 await post("check",{id:"level-invalid",personId:s1.id,date:"2026-10-02",assessmentType:"reading",assessmentLevel:"Начальный",makhraj:8,tajweed:7,note:""},400);
 await post("group",{...ga,level:"Читающие"});assert.equal((await readData()).groups.find(g=>g.id===ga.id).level,"Чтение");
 await post("group",{...gb,level:"Заучивающие"});assert.equal((await readData()).groups.find(g=>g.id===gb.id).level,"Хифз");
 data=await readData();
 const action=(ids,extra={})=>({id:crypto.randomUUID(),action:"archive",personKind:"student",ids,...extra});
 const history=JSON.stringify({checks:data.checks,exams:data.exams});
 await post("people-action",action([s1.id,s2.id]));data=await readData();assert.ok(data.people.find(p=>p.id===s1.id).archived);assert.ok(data.people.find(p=>p.id===s2.id).archived);
 assert.equal(model.studentsOf(data,a.id).some(p=>p.id===s1.id),false);
 await post("people-action",action([s1.id,s2.id],{action:"restore"}));data=await readData();assert.equal(data.people.find(p=>p.id===s1.id).archived,false);
 await post("people-action",action([s1.id,s1.id]),400);await post("people-action",action([s1.id,"missing"]),400);
 const before=await readData();await post("people-action",action([a.id,b.id],{personKind:"teacher"}),400);assert.deepEqual(await readData(),before);
 await post("people-action",action([a.id,b.id],{personKind:"teacher",replacements:{[branch]:a.id}}),400);
 if(failAction){await failAction(action([s1.id,s2.id]));assert.deepEqual(await readData(),before,"A failed bulk write does not partly archive people");}
 await post("people-action",action([a.id,b.id],{personKind:"teacher",replacements:{[branch]:target.id}}));data=await readData();
 for(const id of [a.id,b.id]){const t=data.people.find(p=>p.id===id);assert.ok(t.archived);assert.deepEqual(t.groupAssignments,[]);}
 for(const id of [s1.id,s2.id,old.id])assert.equal(data.people.find(p=>p.id===id).teacherId,target.id);
 for(const id of [ga.id,gb.id])assert.equal(data.groups.find(g=>g.id===id).teacherId,target.id);
 const assigned=data.people.find(p=>p.id===target.id).groupAssignments.map(g=>g.groupId);assert.ok([ga.id,gb.id,gt.id].every(id=>assigned.includes(id)));
 assert.equal(JSON.stringify({checks:data.checks,exams:data.exams}),history,"Archiving never removes or rewrites assessment history");
 await post("check",check);assert.deepEqual((await readData()).checks.find(c=>c.id===check.id),saved,"A historical beginner check remains editable after its teacher is archived");
 await post("people-action",action([a.id,b.id],{action:"restore",personKind:"teacher"}));data=await readData();assert.equal(data.people.find(p=>p.id===a.id).archived,false);assert.equal(data.groups.find(g=>g.id===ga.id).teacherId,target.id,"Restoring teachers does not silently undo transfers");
 console.log("PASS: legacy level names, distinct beginner skills, scores/validation/comparison isolation, bulk pupil archive/restore, teacher transfers, preserved schedules/history and atomic rollback.");
}
