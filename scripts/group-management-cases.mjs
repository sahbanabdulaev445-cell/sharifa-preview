import assert from "node:assert/strict";
export async function verifyGroupManagement({post,readData,model,groupHelpers,failAction}){
 const branch=model.branchNames(await readData())[0];
 const teacher={id:"remove-teacher",kind:"teacher",name:"Учитель удаления",gender:"male",branch,groups:"",startDate:"2020-01-01"};
 await post("person",teacher);
 const group={id:"remove-group",name:"Удаляемая группа",level:"Чтение",teacherId:teacher.id,branch,gender:"male",days:[0,2],startTime:"09:00",endTime:"10:00"};
 await post("group",group);
 const other={...group,id:"remove-other",name:"Оставшаяся группа"};await post("group",other);
 const pupil={id:"remove-student",kind:"student",name:"Ученик группы",gender:"male",branch,groups:group.name,groupId:group.id,teacherId:teacher.id,birthYear:2018,level:"Чтение"};
 await post("person",pupil);await post("person",{...pupil,id:"remove-archived",name:"Удалённый ученик",archived:true});
 const check={id:"remove-check",personId:pupil.id,groupId:group.id,teacherId:teacher.id,assessmentType:"reading",assessmentLevel:"Чтение",date:"2026-10-01",makhraj:8,tajweed:7,attendance:10,note:"История сохраняется"};await post("check",check);
 const action={id:group.id,action:"archive"};let data=await readData();const before=structuredClone(data);
 if(failAction){await failAction(action);assert.deepEqual(await readData(),before,"A failed group archive must roll back every pupil and teacher write");}
 await post("group-action",{id:"missing-group",action:"archive"},400);
 await post("group-action",action);data=await readData();assert.equal(data.groups.find(g=>g.id===group.id).archived,true);
 assert.ok(!groupHelpers.availableGroups(data).some(g=>g.id===group.id));assert.ok(groupHelpers.availableGroups(data).some(g=>g.id===other.id));
 for(const id of [pupil.id,"remove-archived"]){const p=data.people.find(p=>p.id===id);assert.equal(p.groupId,undefined);assert.equal(p.groups,"");assert.equal(p.teacherId,teacher.id);}
 assert.deepEqual(data.checks,before.checks);assert.deepEqual(data.exams,before.exams);
 await post("check",check);assert.deepEqual((await readData()).checks.find(c=>c.id===check.id),data.checks.find(c=>c.id===check.id),"Historical lessons stay editable after deleting a group");
 await post("check",{...check,id:"remove-new-archived-check"},400);
 await post("group-action",action,400);await post("group",group,400);
 await post("group-action",{id:group.id,action:"restore"});data=await readData();assert.ok(groupHelpers.availableGroups(data).some(g=>g.id===group.id));assert.equal(groupHelpers.groupStudents(data,group).length,0,"Restoring never silently reassigns pupils");
 assert.ok(groupHelpers.teacherHasGroup(data,group,teacher.id));
 // Legacy textual groups must not reappear after deletion; unrelated legacy groups survive.
 const legacyTeacher={...teacher,id:"remove-legacy-teacher",name:"Учитель старых групп",groups:"Первая, Вторая"};await post("person",legacyTeacher);
 const legacy=groupHelpers.availableGroups(await readData()).find(g=>g.teacherId===legacyTeacher.id&&g.name==="Первая");assert.ok(legacy);
 await post("group-action",{id:legacy.id,action:"archive"});data=await readData();assert.ok(!groupHelpers.availableGroups(data).some(g=>g.id===legacy.id));assert.ok(groupHelpers.availableGroups(data).some(g=>g.teacherId===legacyTeacher.id&&g.name==="Вторая"));
 const replacement={...teacher,id:"remove-replacement",name:"Принимающий учитель"};await post("person",replacement);
 await post("people-action",{id:"remove-transfer-command",action:"archive",personKind:"teacher",ids:[legacyTeacher.id],replacements:{[branch]:replacement.id}});
 data=await readData();assert.equal(data.groups.find(g=>g.id===legacy.id).teacherId,replacement.id,"Archived groups follow a teacher transfer so they can still be restored");assert.equal(data.groups.find(g=>g.id===legacy.id).archived,true);
 await post("group-action",{id:legacy.id,action:"restore"});assert.ok(groupHelpers.availableGroups(await readData()).some(g=>g.id===legacy.id));
 const owner=(await readData()).people.find(p=>p.id===teacher.id);
 await post("person",{...owner,groupIds:[group.id,other.id]});
 await post("group",{...group,name:"Обновлённая группа",days:[1,3],startTime:"11:00",endTime:"12:00"});data=await readData();
 const updated=data.groups.find(g=>g.id===group.id);assert.equal(updated.name,"Обновлённая группа");assert.equal(groupHelpers.teacherGroup(data,updated,teacher.id).startTime,"11:00","Editing the main schedule updates a matching owner schedule");
 console.log("PASS: group archive/restore, pupil and teacher detachment, legacy group deletion without reappearance, preserved history and atomic rollback.");
}
