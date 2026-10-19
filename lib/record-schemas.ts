import {z} from "zod";
import {criteria,today,branches} from "./analytics";
import {surahById,surahRangeInJuz} from "./quran";
import {studentLevel,groupLevel} from "./levels";
const id=z.string().min(1).max(100).regex(/^[a-zA-Z0-9-]+$/);
const calendarDate=z.string().regex(/^\d{4}-\d{2}-\d{2}$/).refine(v=>!Number.isNaN(Date.parse(v))&&new Date(v+"T12:00:00Z").toISOString().slice(0,10)===v,"Укажите существующую дату");
const date=calendarDate.refine(v=>v<=today(),"Дата не может быть в будущем");
const score=z.number().min(0).max(10);
const scores={makhraj:score,tajweed:score,hifz:score,attendance:score};
export const materialSchema=z.object({juz:z.number().int().min(1).max(30),surah:z.number().int().min(1).max(114),wholeSurah:z.boolean(),fromAyah:z.number().int().min(1).optional(),toAyah:z.number().int().min(1).optional()}).strict().superRefine((v,ctx)=>{
 const s=surahById(v.surah);if(!s)return;
 const issue=(path:string,message:string)=>ctx.addIssue({code:z.ZodIssueCode.custom,path:[path],message});
 if(v.wholeSurah){if(v.fromAyah!==undefined||v.toAyah!==undefined)issue("wholeSurah","Для всей суры диапазон аятов не нужен")}
 else if(v.fromAyah==null||v.toAyah==null)issue("fromAyah","Укажите начальный и конечный аяты");
 else{if(v.fromAyah>s.verses||v.toAyah>s.verses)issue("toAyah",`В выбранной суре ${s.verses} аятов`);if(v.toAyah<v.fromAyah)issue("toAyah","Конечный аят не может быть меньше начального")}
 const range=surahRangeInJuz(v.surah,v.juz);
 if(!range||!v.wholeSurah&&v.fromAyah!=null&&v.toAyah!=null&&(v.toAyah<range.from||v.fromAyah>range.to))issue("juz","Выбранные сура и аяты не относятся к этому джузу");
});
const branch=z.string().trim().min(1).max(100);
const time=z.string().regex(/^([01]\d|2[0-3]):[0-5]\d$/,"Укажите время в формате ЧЧ:ММ");
const groupShape={id,name:z.string().trim().min(1,"Введите название группы").max(80,"Название группы — до 80 символов").refine(v=>!v.includes(","),"Название группы не должно содержать запятую"),level:z.string().trim().min(1).max(80).transform(groupLevel).optional(),teacherId:id,branch,gender:z.enum(["male","female"])};
const scheduleShape={days:z.array(z.number().int().min(0).max(6)).min(1,"Выберите хотя бы один день недели").max(7).refine(v=>new Set(v).size===v.length,"Дни недели не должны повторяться"),startTime:time,endTime:time};
const group=z.object({...groupShape,...scheduleShape}).refine(g=>g.endTime>g.startTime,"Окончание занятия должно быть позже начала");
export const lessonTimesSchema=z.array(z.object({startTime:time,endTime:time}).refine(g=>g.endTime>g.startTime,"Окончание занятия должно быть позже начала")).max(24,"Можно сохранить до 24 вариантов времени").refine(items=>new Set(items.map(g=>`${g.startTime}-${g.endTime}`)).size===items.length,"Этот вариант времени уже есть");
const assignmentSchema=z.object({groupId:id,days:z.array(z.number().int().min(0).max(6)).max(7).refine(v=>new Set(v).size===v.length),startTime:z.union([time,z.literal("")]),endTime:z.union([time,z.literal("")])}).refine(g=>(!g.days.length&&!g.startTime&&!g.endTime)||(g.days.length>0&&g.startTime!==""&&g.endTime>g.startTime),"Выберите дни и время занятий");
export const groupSchedulesSchema=z.array(z.object({id,...scheduleShape}).refine(g=>g.endTime>g.startTime,"Окончание занятия должно быть позже начала")).max(500).refine(items=>new Set(items.map(g=>g.id)).size===items.length,"Расписание группы повторяется");
const backupGroup=z.object({...groupShape,days:z.array(z.number().int().min(0).max(6)).max(7),startTime:z.union([time,z.literal("")]),endTime:z.union([time,z.literal("")])}).refine(g=>(!g.days.length&&!g.startTime&&!g.endTime)||(g.days.length>0&&g.startTime!==""&&g.endTime>g.startTime),"Некорректное расписание группы");
function checkSchema(checkDate:z.ZodType<string>){
 const common={id,personId:id,date:checkDate,createdAt:z.string().datetime().optional(),note:z.string().max(2000),material:materialSchema.optional()};
 const readingScore=z.number().min(1,"Оценка должна быть от 1 до 10").max(10,"Оценка должна быть от 1 до 10");
 return z.union([z.object({...common,...scores,assessmentType:z.undefined()}),z.object({...common,assessmentType:z.literal("reading"),assessmentLevel:z.enum(["Чтение","Хифз"]).optional(),groupId:id.optional(),teacherId:id.optional(),readingMode:z.enum(["quran","memory"]).optional(),makhraj:readingScore,tajweed:readingScore,hifz:readingScore.optional(),attendance:score.optional()}),z.object({...common,assessmentType:z.literal("beginner"),assessmentLevel:z.literal("Начальный").optional(),groupId:id.optional(),teacherId:id.optional(),letters:readingScore,rules:readingScore,reading:readingScore,attendance:score})]);
}
export const birthYearSchema=z.number().int("Укажите год целым числом").min(1900,"Год рождения — не ранее 1900").refine(year=>year<=Number(today().slice(0,4)),"Год рождения не может быть в будущем");
export const passportSchema=z.object({series:z.string().regex(/^\d{4}$/, "Серия паспорта — 4 цифры").optional(),number:z.string().regex(/^\d{6}$/,"Номер паспорта — 6 цифр").optional(),issuedBy:z.string().trim().min(1).max(300).optional(),issueDate:date.optional(),departmentCode:z.string().regex(/^\d{3}-\d{3}$/,"Код подразделения — в формате 000-000").optional(),birthDate:date.optional(),birthPlace:z.string().trim().min(1).max(300).optional(),registrationAddress:z.string().trim().min(1).max(1000).optional()}).refine(p=>!p.birthDate||!p.issueDate||p.issueDate>=p.birthDate,"Дата выдачи паспорта не может быть раньше даты рождения");
export const recordSchemas={
 "people-action":z.object({id,action:z.enum(["archive","restore"]),personKind:z.enum(["student","teacher"]),ids:z.array(id).min(1).max(500).refine(v=>new Set(v).size===v.length,"Карточки не должны повторяться"),replacements:z.record(id).optional()}),
 branch:z.object({id,name:branch,source:branch.optional(),replaces:z.string().refine(v=>branches.includes(v)).optional(),archived:z.boolean().optional(),address:z.string().trim().max(300).optional(),phone:z.string().trim().max(40).optional(),note:z.string().trim().max(1000).optional()}),
 "branch-action":z.object({id,action:z.enum(["update","delete","restore"]),name:branch.optional(),address:z.string().trim().max(300).optional(),phone:z.string().trim().max(40).optional(),note:z.string().trim().max(1000).optional(),destination:branch.optional()}),
 person:z.object({id,kind:z.enum(["teacher","student"]),name:z.string().trim().min(2).max(100),gender:z.enum(["male","female"]),branch,groups:z.string().trim().max(2000),groupAssignments:z.array(assignmentSchema).max(500).refine(a=>new Set(a.map(g=>g.groupId)).size===a.length).optional(),groupId:id.optional(),teacherId:id.optional(),birthYear:birthYearSchema.optional(),age:z.number().int().min(3).max(100).optional(),level:z.enum(["Начальный","Чтение","Хифз","Средний","Продвинутый"]).transform(studentLevel).optional(),startDate:date.optional(),passport:passportSchema.optional(),archived:z.boolean().optional()}),
 group,check:checkSchema(date),
 exam:z.object({id,teacherId:id,date,juz:z.number().int().min(1).max(30),createdAt:z.string().datetime().optional(),...scores,note:z.string().max(2000)}),
 settings:z.object({id:z.literal("settings"),weights:z.object({makhraj:z.number().min(0).max(100),tajweed:z.number().min(0).max(100),hifz:z.number().min(0).max(100),attendance:z.number().min(0).max(100),students:z.number().min(0).max(100)}).refine(w=>criteria.reduce((a,c)=>a+w[c.key],0)>0,"Хотя бы один из четырёх основных показателей должен иметь вес больше нуля"),attention:score,decline:z.number().min(.1).max(10),examPass:score,lessonTimes:lessonTimesSchema.optional()}),
};
export const groupMembersSchema=z.array(id).max(500).refine(ids=>new Set(ids).size===ids.length,"В списке повторяются ученики");
export const backupRecordSchemas={branch:recordSchemas.branch,person:recordSchemas.person.extend({startDate:calendarDate.optional()}),group:backupGroup,check:checkSchema(calendarDate),exam:recordSchemas.exam.extend({date:calendarDate}),settings:recordSchemas.settings};
