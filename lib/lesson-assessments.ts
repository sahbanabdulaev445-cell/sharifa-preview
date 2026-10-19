import {beginnerCriteria} from "./levels";
import {Check,Data,Person,avg,checkCriteria,compareChecks,criteria,allCriteria,dateLabel,inPeriod,periodBounds,weighted} from "./analytics";
import {StudiedMaterial} from "./quran";
import {materialSchema} from "./record-schemas";
export type MaterialDraft={juz:string;surah:string;wholeSurah:boolean;fromAyah:string;toAyah:string};
export function materialDraft(value?:StudiedMaterial):MaterialDraft{return {juz:value?String(value.juz):"",surah:value?String(value.surah):"",wholeSurah:value?.wholeSurah??false,fromAyah:value?.fromAyah!=null?String(value.fromAyah):"",toAyah:value?.toAyah!=null?String(value.toAyah):""}}
export function materialFromDraft(value:MaterialDraft):StudiedMaterial|undefined{
 if(!value.juz&&!value.surah&&!value.fromAyah&&!value.toAyah&&!value.wholeSurah)return undefined;
 const result=materialSchema.safeParse({juz:Number(value.juz),surah:Number(value.surah),wholeSurah:value.wholeSurah,...(!value.wholeSurah?{fromAyah:value.fromAyah?Number(value.fromAyah):undefined,toAyah:value.toAyah?Number(value.toAyah):undefined}:{})});
 if(!result.success)throw new Error(result.error.issues[0].message);
 return result.data;
}
export function checksForPeriod(data:Data,personId:string,period:string){return data.checks.filter(c=>c.personId===personId&&inPeriod(c.date,period)).sort(compareChecks)}
export function assessmentAverage(checks:Check[],data:Data){return {count:checks.length,days:new Set(checks.map(c=>c.date)).size,metrics:(checks.length&&checks.every(c=>c.assessmentType==="beginner")?beginnerCriteria:allCriteria).map(k=>{const values=checks.filter(c=>checkCriteria(c).some(x=>x.key===k.key)&&c[k.key]!=null).map(c=>c[k.key]!);return {...k,count:values.length,value:avg(values)}}).filter(k=>k.count>0||criteria.some(c=>c.key===k.key)&&!checks.some(c=>c.assessmentType==="beginner")),beginner:avg(checks.filter(c=>c.assessmentType==="beginner").map(c=>weighted(c,data.settings.weights))),reading:avg(checks.filter(c=>c.assessmentType==="reading").map(c=>weighted(c,data.settings.weights))),general:avg(checks.filter(c=>c.assessmentType!=="reading"&&c.assessmentType!=="beginner").map(c=>weighted(c,data.settings.weights)))}}
export function periodLabel(period:string){const b=periodBounds(period);return b?`${dateLabel(b.start)} — ${dateLabel(b.end)}`:"За всё время"}
export function personLessonSummary(data:Data,person:Person,period:string){const checks=checksForPeriod(data,person.id,period);return {person,checks,average:assessmentAverage(checks,data),latest:checks[0]??null}}
