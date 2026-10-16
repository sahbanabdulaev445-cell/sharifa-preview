import assert from "node:assert/strict";
export async function verifyBranchManagement({post,readData,model,failAction}){
 const original=model.branches[3],id=model.defaultBranchId(original);
 const teacher={id:"manage-teacher",kind:"teacher",name:"Учитель филиала",gender:"male",branch:original,groups:"",startDate:"2026-01-01"};
 const pupil={id:"manage-student",kind:"student",name:"Ученик филиала",gender:"male",branch:original,groups:"",birthYear:2018,level:"Начальный"};
 await post("person",teacher);await post("person",pupil);await post("person",{...pupil,id:"manage-archived",archived:true});
 const group={id:"manage-group",name:"Основная группа",teacherId:teacher.id,branch:original,gender:"male",days:[0],startTime:"09:00",endTime:"10:00"};
 await post("group",{...group,studentIds:[pupil.id]});
 await post("person",{...pupil,groupId:group.id,groups:group.name});
 await post("check",{id:"manage-check",personId:pupil.id,assessmentType:"reading",readingMode:"quran",groupId:group.id,teacherId:teacher.id,date:"2026-10-01",makhraj:8,tajweed:9,note:"Сохранить историю"});
 const update={id,action:"update",name:"Филиал управления",address:"Тестовый адрес филиала",phone:"Тестовый контакт",note:"Тестовая заметка"};
 await post("branch-action",update);
 let data=await readData();
 assert.equal(model.branchNames(data).includes(original),false,"Renaming a default branch must hide its original hardcoded name");
 assert.equal(model.branchNames(data).includes(update.name),true);
 const entry=data.branches.find(b=>b.id===id);assert.equal(entry.replaces,original);assert.equal(entry.address,update.address);assert.equal(entry.phone,update.phone);assert.equal(entry.note,update.note);
 for(const personId of [teacher.id,pupil.id,"manage-archived"])assert.equal(data.people.find(p=>p.id===personId).branch,update.name);
 assert.equal(data.groups.find(g=>g.id===group.id).branch,update.name);
 const otherName=model.branchNames(data).find(name=>name!==update.name);
 await post("branch-action",{...update,name:otherName},400);
 await post("branch-action",{id,action:"delete"},400);
 await post("branch-action",{id,action:"delete",destination:update.name},400);
 await post("branch-action",{id,action:"delete",destination:"Не существует"},400);
 const destination={id:"manage-destination",name:"Получатель переноса"};await post("branch",destination);
 const before=await readData();
 if(failAction){await failAction({id,action:"delete",destination:destination.name});assert.deepEqual(await readData(),before,"A failed transfer must leave people, groups and branch status unchanged")}
 await post("branch-action",{id,action:"delete",destination:destination.name});data=await readData();
 assert.equal(model.branchNames(data).includes(update.name),false);assert.equal(model.branchNames(data).includes(original),false);
 assert.equal(data.branches.find(b=>b.id===id).archived,true);
 for(const personId of [teacher.id,pupil.id,"manage-archived"])assert.equal(data.people.find(p=>p.id===personId).branch,destination.name);
 assert.equal(data.groups.find(g=>g.id===group.id).branch,destination.name);
 assert.deepEqual(data.checks,before.checks);assert.deepEqual(data.exams,before.exams);
 await post("branch-action",{id,action:"restore"});data=await readData();assert.ok(model.branchNames(data).includes(update.name));assert.equal(model.branchNames(data).includes(original),false);assert.equal(data.people.some(p=>p.branch===update.name),false);
 const empty={id:"manage-empty",name:"Пустой филиал"};await post("branch",empty);await post("branch-action",{id:empty.id,action:"delete"});data=await readData();assert.equal(model.branchNames(data).includes(empty.name),false);
 await post("branch",{...empty,id:"manage-reused-name"});await post("branch-action",{id:empty.id,action:"restore"},400);
 await post("branch-action",{id:"missing-branch",action:"delete"},400);
 await post("branch-action",{id,action:"unknown"},400);
 console.log("PASS: default/custom branch edits, metadata, active names, linked and archived people, teacherless pupils, group transfers, unchanged assessment history, atomic rollback, reversible deletion and restore/name-conflict validation.");
}
