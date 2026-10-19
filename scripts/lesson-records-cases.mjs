import assert from "node:assert/strict";
export async function verifyLessonRecords({post,readData,model,lessonHelpers,quran,share,schemas}){
 let data=await readData();const branch=model.branchNames(data)[0];
 const teacher={id:"lesson-teacher",kind:"teacher",name:"Учитель уроков",gender:"male",branch,groups:"",startDate:"2020-01-01",passport:{series:"0010",number:"000123"}};
 const student={id:"lesson-student",kind:"student",name:"Ученик уроков",gender:"male",branch,groups:"Уроки",groupId:"lesson-group",teacherId:teacher.id,birthYear:2018,level:"Начальный"};
 await post("person",teacher);
 const group={id:"lesson-group",teacherId:teacher.id,name:"Уроки",branch,gender:"male",days:[0,2,4],startTime:"10:00",endTime:"11:00"};
 await post("group",group);await post("person",student);
 const material={juz:30,surah:79,wholeSurah:false,fromAyah:1,toAyah:10};
 const make=(id,date,makhraj,tajweed,hifz,extra={})=>({id,personId:student.id,assessmentType:"reading",readingMode:"quran",groupId:group.id,teacherId:teacher.id,date,createdAt:"2026-10-18T20:00:00.000Z",makhraj,tajweed,hifz,attendance:10,note:"Комментарий к уроку",material,...extra});
 await post("check",make("lesson-1","2026-10-01",8,7,5));
 await post("check",make("lesson-2","2026-10-03",9,8,6,{attendance:0}));
 await post("check",make("lesson-3","2026-10-05",10,9,7,{material:{juz:30,surah:112,wholeSurah:true}}));
 await post("check",make("lesson-other-period","2026-09-30",1,1,1));
 // More than one real lesson on a day remains a separate record, never an upsert by person/date.
 await post("check",make("lesson-same-day","2026-10-05",7,7,7,{createdAt:"2026-10-18T20:01:00.000Z"}));
 await post("check",{id:"lesson-teacher-check",personId:teacher.id,date:"2026-10-02",createdAt:"2026-10-18T20:00:00.000Z",makhraj:8,tajweed:7,hifz:6,attendance:9,note:"Проверка учителя",material});
 for(const invalid of [{...material,toAyah:47},{...material,toAyah:0},{...material,fromAyah:11,toAyah:10},{...material,surah:115},{...material,juz:31},{...material,juz:1},{...material,toAyah:10.5},{...material,wholeSurah:true},{juz:30,surah:79,wholeSurah:false,fromAyah:1}])await post("check",make("lesson-invalid","2026-10-01",8,7,5,{material:invalid}),400);
 await post("check",make("lesson-invalid-attendance","2026-10-01",8,7,5,{attendance:11}),400);
 await post("check",make("lesson-invalid-date","2026-02-30",8,7,5),400);
 await post("check",make("lesson-future-date","2099-10-01",8,7,5),400);
 data=await readData();const saved=data.checks.find(c=>c.id==="lesson-1");assert.deepEqual(saved.material,material);assert.equal(saved.attendance,10);
 assert.equal(data.checks.find(c=>c.id==="lesson-teacher-check").material.surah,79);
 const period="range:2026-10-01:2026-10-05",checks=lessonHelpers.checksForPeriod(data,student.id,period),summary=lessonHelpers.assessmentAverage(checks,data);
 assert.equal(checks.length,4);assert.equal(summary.days,3);assert.equal(checks[0].id,"lesson-same-day");
 assert.equal(summary.metrics.find(k=>k.key==="makhraj").value,8.5);
 assert.equal(summary.metrics.find(k=>k.key==="attendance").value,7.5);
 assert.equal(lessonHelpers.checksForPeriod(data,student.id,"range:2026-10-03:2026-10-03").length,1);
 assert.equal(lessonHelpers.checksForPeriod(data,student.id,"range:2026-10-06:2026-10-10").length,0);
 assert.equal(model.weighted(saved,data.settings.weights),20/3,"Attendance is retained without changing academic reading total");
 const legacy={...saved,id:"lesson-legacy"};delete legacy.hifz;delete legacy.attendance;delete legacy.material;
 assert.ok(schemas.recordSchemas.check.safeParse(legacy).success);assert.equal(model.weighted(legacy,data.settings.weights),7.5);
 const withLegacy=lessonHelpers.assessmentAverage([...checks,legacy],data);assert.equal(withLegacy.metrics.find(k=>k.key==="hifz").count,4);assert.equal(withLegacy.metrics.find(k=>k.key==="attendance").count,4);
 // Editing a lesson updates only that id and can remove material without losing other days.
 await post("check",{...saved,material:undefined,note:"Исправлено"});data=await readData();assert.equal(data.checks.find(c=>c.id===saved.id).material,undefined);assert.equal(lessonHelpers.checksForPeriod(data,student.id,period).length,4);
 const report=share.studentReport(data,student,period),text=share.reportText(report);assert.ok(text.includes("79 — Ан-Назиат"));assert.ok(text.includes("вся сура"));assert.ok(text.includes("01.10.2026"));assert.ok(!text.includes("30.09.2026"));assert.ok(!text.includes("000123"));
 const groupText=share.reportText(share.groupReport(data,group,period));assert.ok(groupText.includes(student.name));assert.ok(groupText.includes(teacher.name));assert.ok(!groupText.includes("000123"));
 console.log("PASS: dated lessons including multiple per day, student/teacher studied material and attendance, API range/juz/verse validation, inclusive periods/all-record averages, optional legacy fields, editing isolation and share reports without passport data.");
}
