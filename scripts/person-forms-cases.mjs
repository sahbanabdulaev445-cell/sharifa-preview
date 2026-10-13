import assert from "node:assert/strict";
// All passport values below are synthetic test fixtures.
export async function verifyPersonForms({post,readData,model,groupHelpers,preferences}){
 const branch=model.branches[0];
 const pupil={id:"forms-pupil",kind:"student",name:"Ученик без назначений",gender:"male",branch,groups:"",birthYear:2012,level:"Начальный"};
 await post("person",pupil);
 let data=await readData(),saved=data.people.find(p=>p.id===pupil.id);
 assert.equal(saved.teacherId,undefined);assert.equal(saved.groupId,undefined);assert.equal(saved.startDate,undefined);assert.equal(saved.birthYear,2012);assert.equal(saved.age,undefined);
 assert.equal(model.personAge(saved,"2026-12-31"),14);assert.equal(model.personAge(saved,"2027-01-01"),15);
 assert.equal(model.personAge({age:12}),12);assert.equal(model.personAge({}),null);
 for(const birthYear of [1899,2099,2012.5])await post("person",{...pupil,birthYear},400);
 const withoutYear={...pupil};delete withoutYear.birthYear;await post("person",withoutYear,400);
 const passport={series:"0010",number:"000123",issuedBy:"Тестовое подразделение",issueDate:"2020-01-01",departmentCode:"000-001",birthDate:"1980-01-01",birthPlace:"Тестовое место рождения",registrationAddress:"Тестовый адрес"};
 const teacher={id:"forms-teacher",kind:"teacher",name:"Учитель с паспортом",gender:"male",branch,groups:"",startDate:"2026-01-01",passport};
 await post("person",teacher);data=await readData();assert.deepEqual(data.people.find(p=>p.id===teacher.id).passport,passport);
 for(const invalid of [{series:"123"},{number:"12a456"},{departmentCode:"123456"},{issueDate:"2020-02-30"},{birthDate:"1980-01-01",issueDate:"1979-01-01"}])await post("person",{...teacher,passport:invalid},400);
 const noStart={...teacher};delete noStart.startDate;await post("person",noStart,400);
 await post("person",{...pupil,passport},400);
 await post("person",{...pupil,teacherId:"missing-teacher"},400);
 const group={id:"forms-group",name:"Группа без персонального учителя",teacherId:teacher.id,branch,gender:"male",days:[1],startTime:"10:00",endTime:"11:00"};
 await post("group",group);
 await post("person",{...pupil,id:"forms-group-pupil",name:"Ученик в группе",groupId:group.id,groups:group.name});
 data=await readData();saved=data.people.find(p=>p.id==="forms-group-pupil");assert.equal(saved.teacherId,undefined);assert.equal(groupHelpers.groupStudents(data,group).some(p=>p.id===saved.id),true);assert.equal(model.studentsOf(data,teacher.id).some(p=>p.id===saved.id),true);
 await post("person",{...saved,gender:"female"},400);
 await post("branch",{id:"forms-branch",name:"Филиал новых карточек",source:branch,teacherIds:[teacher.id]});
 data=await readData();assert.equal(data.people.find(p=>p.id==="forms-group-pupil").branch,"Филиал новых карточек");assert.equal(data.people.find(p=>p.id===pupil.id).branch,branch);assert.deepEqual(data.people.find(p=>p.id===teacher.id).passport,passport);
 if(preferences){
  assert.deepEqual(preferences.birthYearSuggestions(),[2012,2013,2014,2015,2016,2017,2018,2019,2020]);
  assert.equal(preferences.rememberBirthYear(2011),true);assert.ok(preferences.birthYearSuggestions().includes(2011));assert.equal(preferences.rememberBirthYear(2099),false);
  const values={gender:"male",branch:"Филиал новых карточек",teacherId:teacher.id,groupId:group.id,groups:group.name,birthYear:"2011",level:"Средний",name:"Не запоминать имя",passport:"Не запоминать паспорт",startDate:"2026-01-01"};
  assert.equal(preferences.rememberStudentValues(values,"work"),true);
  const restored=preferences.studentInitialValues(data,"work");
  for(const field of ["gender","branch","teacherId","groupId","groups","birthYear","level"])assert.equal(restored[field],values[field]);
  for(const field of ["name","passport","startDate"])assert.equal(restored[field],undefined);
  assert.equal(preferences.studentInitialValues(data,"demo").birthYear,"");
  const overridden=preferences.studentInitialValues(data,"work",{branch,gender:"female"});assert.equal(overridden.branch,branch);assert.equal(overridden.gender,"female");assert.equal(overridden.teacherId,"");assert.equal(overridden.groupId,"");
  preferences.rememberStudentValues({...values,teacherId:"",groupId:"",groups:""},"work");assert.equal(preferences.studentInitialValues(data,"work").teacherId,"");assert.equal(preferences.studentInitialValues(data,"work").groupId,"");
 }
 console.log("PASS: optional student assignments/dates, birth years and changing age, RF passport persistence/validation, teacherless group membership and branch transfers, and isolated student defaults/year suggestions.");
}
