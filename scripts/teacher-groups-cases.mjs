import assert from "node:assert/strict";

// Same route checks run against SQLite, D1 and browser-local preview storage.
export async function verifyTeacherGroups({post,readData,branch,failWrites,model,groupHelpers}){
 const first={id:"schedule-teacher",kind:"teacher",name:"Учитель расписания",gender:"male",branch,groups:"",startDate:"2026-01-01"};
 await post("person",first);
 const group={id:"schedule-morning",name:"Утренняя",gender:"male",teacherId:first.id,branch,days:[0,2,4],startTime:"09:00",endTime:"10:00"};
 await post("group",group);
 const pupil={...first,id:"schedule-pupil",kind:"student",name:"Ахмад Алиев",groups:group.name,groupId:group.id,teacherId:first.id,age:10,level:"Начальный"};await post("person",pupil);
 const second={...first,id:"schedule-next-teacher",name:"Второй учитель"},schedule={id:group.id,days:[1,3],startTime:"16:00",endTime:"17:30"},lessonTimes=[{startTime:"16:00",endTime:"17:30"}];
 const payload={...second,groupIds:[group.id],groupSchedules:[schedule],lessonTimes};
 const initial=await readData();
 for(const patch of [{groupIds:["unknown"]},{groupIds:[group.id,group.id]},{branch:"unknown"},{groupSchedules:[{...schedule,days:[]}]},{groupSchedules:[{...schedule,days:[0,0]}]},{groupSchedules:[{...schedule,endTime:"15:00"}]},{groupSchedules:[{...schedule,id:"unknown"}]},{lessonTimes:[{startTime:"25:00",endTime:"26:00"}]},{lessonTimes:[lessonTimes[0],lessonTimes[0]]},{newGroups:[{...group,id:"forbidden-new"}]}]){
  await post("person",{...payload,...patch},400);assert.deepEqual(await readData(),initial);
 }
 await failWrites(payload,second.id);assert.deepEqual(await readData(),initial);
 await post("person",payload);
 let data=await readData();assert.deepEqual(data.groups.find(g=>g.id===group.id),group);assert.deepEqual(data.people.find(p=>p.id===pupil.id),pupil);assert.equal(data.people.find(p=>p.id===first.id).groups,group.name);assert.deepEqual(data.people.find(p=>p.id===second.id).groupAssignments,[{groupId:group.id,days:schedule.days,startTime:schedule.startTime,endTime:schedule.endTime}]);assert.deepEqual(data.settings.lessonTimes,lessonTimes);
 const third={...first,id:"schedule-third-teacher",name:"Третий учитель"};await post("person",{...third,groupIds:[group.id]});
 data=await readData();assert.equal(data.groups.filter(g=>g.id===group.id).length,1);assert.equal(data.people.find(p=>p.id===second.id).groupAssignments[0].startTime,"16:00");assert.equal(data.people.find(p=>p.id===third.id).groupAssignments[0].startTime,"09:00");
 await post("check",{id:"schedule-shared-reading",personId:pupil.id,groupId:group.id,teacherId:second.id,assessmentType:"reading",readingMode:"quran",date:"2026-10-01",makhraj:5,tajweed:7,note:""});
 data=await readData();for(const id of [first.id,second.id,third.id]){assert.deepEqual(model.studentsOf(data,id).map(p=>p.id),[pupil.id]);assert.equal(model.result(data,data.people.find(p=>p.id===id)),6)}assert.equal(groupHelpers.availableGroups(data).filter(g=>g.id===group.id).length,1);assert.equal(groupHelpers.teacherGroup(data,group,second.id).startTime,"16:00");
 await post("person",{...second,groupIds:[]});
 data=await readData();assert.equal(data.people.find(p=>p.id===second.id).groupAssignments.length,0);assert.equal(data.people.find(p=>p.id===third.id).groupAssignments.length,1);assert.deepEqual(data.people.find(p=>p.id===pupil.id),pupil);assert.deepEqual(data.groups.find(g=>g.id===group.id),group);
 await post("person",{...first,groupIds:[]});data=await readData();assert.deepEqual(data.people.find(p=>p.id===pupil.id),pupil);assert.deepEqual(data.groups.find(g=>g.id===group.id),group);assert.equal(model.studentsOf(data,first.id).length,0);assert.equal(model.studentsOf(data,second.id).length,0);assert.equal(model.result(data,data.people.find(p=>p.id===third.id)),6);
 const legacy={...first,id:"schedule-legacy",name:"Учитель старых групп",groups:"Старая А, Старая Б"};await post("person",legacy);
 const legacyGroups=groupHelpers.availableGroups(await readData()).filter(g=>g.teacherId===legacy.id);assert.equal(legacyGroups.length,2);
 await post("person",{...legacy,groupIds:[]});data=await readData();for(const g of legacyGroups)assert.ok(groupHelpers.availableGroups(data).some(row=>row.id===g.id));
 console.log("PASS: reusable ready groups for three teachers, independent schedules, unchanged pupils, shared readings, unlinking, time presets, invalid input and atomic rollback.");
}
