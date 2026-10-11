import {z} from "zod";
import {criteria,today} from "./analytics";
const id=z.string().min(1).max(100).regex(/^[a-zA-Z0-9-]+$/);
const calendarDate=z.string().regex(/^\d{4}-\d{2}-\d{2}$/).refine(v=>!Number.isNaN(Date.parse(v))&&new Date(v+"T12:00:00Z").toISOString().slice(0,10)===v,"Укажите существующую дату");
const date=calendarDate.refine(v=>v<=today(),"Дата не может быть в будущем");
const score=z.number().min(0).max(10);
const scores={makhraj:score,tajweed:score,hifz:score,attendance:score};
const branch=z.string().trim().min(1).max(100);
const time=z.string().regex(/^([01]\d|2[0-3]):[0-5]\d$/,"Укажите время в формате ЧЧ:ММ");
const groupShape={id,name:z.string().trim().min(1,"Введите название группы").max(80,"Название группы — до 80 символов").refine(v=>!v.includes(","),"Название группы не должно содержать запятую"),teacherId:id,branch,gender:z.enum(["male","female"])};
const scheduleShape={days:z.array(z.number().int().min(0).max(6)).min(1,"Выберите хотя бы один день недели").max(7).refine(v=>new Set(v).size===v.length,"Дни недели не должны повторяться"),startTime:time,endTime:time};
const group=z.object({...groupShape,...scheduleShape}).refine(g=>g.endTime>g.startTime,"Окончание занятия должно быть позже начала");
export const teacherGroupDraftSchema=z.object({id,name:groupShape.name,gender:groupShape.gender,...scheduleShape}).refine(g=>g.endTime>g.startTime,"Окончание занятия должно быть позже начала");
export const newTeacherGroupsSchema=z.array(teacherGroupDraftSchema).max(20,"За один раз можно добавить до 20 новых групп");
export const groupSchedulesSchema=z.array(z.object({id,...scheduleShape}).refine(g=>g.endTime>g.startTime,"Окончание занятия должно быть позже начала")).max(500).refine(items=>new Set(items.map(g=>g.id)).size===items.length,"Расписание группы повторяется");
const backupGroup=z.object({...groupShape,days:z.array(z.number().int().min(0).max(6)).max(7),startTime:z.union([time,z.literal("")]),endTime:z.union([time,z.literal("")])}).refine(g=>(!g.days.length&&!g.startTime&&!g.endTime)||(g.days.length>0&&g.startTime!==""&&g.endTime>g.startTime),"Некорректное расписание группы");
function checkSchema(checkDate:z.ZodType<string>){
 const common={id,personId:id,date:checkDate,createdAt:z.string().datetime().optional(),note:z.string().max(2000)};
 const readingScore=z.number().min(1,"Оценка должна быть от 1 до 10").max(10,"Оценка должна быть от 1 до 10");
 return z.union([z.object({...common,...scores,assessmentType:z.undefined()}),z.object({...common,assessmentType:z.literal("reading"),groupId:id,teacherId:id,readingMode:z.enum(["quran","memory"]),makhraj:readingScore,tajweed:readingScore})]);
}
export const recordSchemas={
 branch:z.object({id,name:branch,source:branch.optional()}),
 person:z.object({id,kind:z.enum(["teacher","student"]),name:z.string().trim().min(2).max(100),gender:z.enum(["male","female"]),branch,groups:z.string().trim().max(2000),groupId:id.optional(),teacherId:id.optional(),age:z.number().int().min(3).max(100).optional(),level:z.enum(["Начальный","Средний","Продвинутый"]).optional(),startDate:date,archived:z.boolean().optional()}),
 group,check:checkSchema(date),
 exam:z.object({id,teacherId:id,date,juz:z.number().int().min(1).max(30),createdAt:z.string().datetime().optional(),...scores,note:z.string().max(2000)}),
 settings:z.object({id:z.literal("settings"),weights:z.object({makhraj:z.number().min(0).max(100),tajweed:z.number().min(0).max(100),hifz:z.number().min(0).max(100),attendance:z.number().min(0).max(100),students:z.number().min(0).max(100)}).refine(w=>criteria.reduce((a,c)=>a+w[c.key],0)>0,"Хотя бы один из четырёх основных показателей должен иметь вес больше нуля"),attention:score,decline:z.number().min(.1).max(10),examPass:score}),
};
export const groupMembersSchema=z.array(id).max(500).refine(ids=>new Set(ids).size===ids.length,"В списке повторяются ученики");
export const backupRecordSchemas={branch:recordSchemas.branch,person:recordSchemas.person.extend({startDate:calendarDate}),group:backupGroup,check:checkSchema(calendarDate),exam:recordSchemas.exam.extend({date:calendarDate}),settings:recordSchemas.settings};
