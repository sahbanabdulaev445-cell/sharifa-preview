import assert from "node:assert/strict";

// Shared checks run through the real route against both D1 and preview storage.
export async function verifyTeacherGroups({post,readData,branch,failWrites}){
 const teacher={id:"schedule-teacher",kind:"teacher",name:"Учитель расписания",gender:"male",branch,groups:"",startDate:"2026-01-01"};
 const morning={id:"schedule-morning",name:"Утренняя",gender:"male",days:[0,2,4],startTime:"09:00",endTime:"10:00"};
 const evening={...morning,id:"schedule-evening",name:"Вечерняя",gender:"female",days:[1,3],startTime:"17:00",endTime:"18:30"};
 const payload={...teacher,groupIds:[],newGroups:[morning,evening]};
 const initial=await readData();
 for(const patch of [
  {newGroups:[{...morning,days:[]}]},
  {newGroups:[{...morning,days:[0,0]}]},
  {newGroups:[{...morning,endTime:"08:00"}]},
  {newGroups:[{...morning,endTime:"09:00"}]},
  {newGroups:[{...morning,id:teacher.id}]},
  {newGroups:[morning,{...morning,id:"schedule-duplicate"}]},
  {newGroups:[morning,{...evening,id:morning.id}]},
  {newGroups:[{...morning,id:"settings"}]},
  {groupSchedules:[{...morning,id:"unknown"}]}
 ]){await post("person",{...payload,...patch},400);assert.deepEqual(await readData(),initial)}
 await failWrites(payload,morning.id);
 assert.deepEqual(await readData(),initial);
 // Ownership always comes from the teacher, regardless of extra client fields.
 await post("person",{...payload,newGroups:[{...morning,teacherId:"other",branch:"other"},evening]});
 let data=await readData();
 assert.equal(data.people.find(p=>p.id===teacher.id).groups,"Утренняя, Вечерняя");
 for(const draft of [morning,evening])assert.deepEqual(data.groups.find(g=>g.id===draft.id),{...draft,teacherId:teacher.id,branch});
 const schedule={id:morning.id,days:[5,6],startTime:"10:30",endTime:"12:00"};
 await post("person",{...teacher,groupIds:[morning.id,evening.id],groupSchedules:[schedule]});
 data=await readData();assert.deepEqual(data.groups.find(g=>g.id===morning.id),{...morning,...schedule,teacherId:teacher.id,branch});
 const before=data;
 await post("person",{...teacher,name:"Не должно измениться",groupIds:[morning.id,evening.id],newGroups:[{...morning,id:"schedule-duplicate-name"}]},400);
 await post("person",{...teacher,groupIds:[morning.id,evening.id],newGroups:[{...morning,id:evening.id,name:"Другая"}]},400);
 assert.deepEqual(await readData(),before);
 const second={...teacher,id:"schedule-next-teacher",name:"Второй учитель"};
 await post("person",{...second,groupIds:[morning.id],groupSchedules:[{...schedule,startTime:"11:00"}],newGroups:[{...evening,id:"schedule-new",name:morning.name}]});
 data=await readData();assert.equal(data.groups.find(g=>g.id===morning.id).teacherId,second.id);assert.equal(data.groups.find(g=>g.id===morning.id).startTime,"11:00");assert.equal(data.people.find(p=>p.id===teacher.id).groups,evening.name);assert.equal(data.groups.find(g=>g.id==="schedule-new").teacherId,second.id);
 console.log("PASS: teacher with multiple new groups and schedules, ownership, schedule editing/transfer, invalid input preservation and atomic creation rollback.");
}
