"use client";
import {Check,Data,num} from "@/lib/analytics";
import {assessmentAverage} from "@/lib/lesson-assessments";
import "./lesson-records.css";
export default function AssessmentAverages({checks,data}:{checks:Check[];data:Data}){
 if(!checks.length)return null;
 const summary=assessmentAverage(checks,data);
 return <section className="lesson-averages" aria-label="Средние оценки за выбранный период"><div className="lesson-averages-heading"><h4>Средние за период</h4><span>{summary.count} записей · {summary.days} дней</span></div><div>{summary.metrics.map(metric=><div key={metric.key}><span>{metric.label}</span><b>{num(metric.value)}</b><small>{metric.count?`${metric.count} оценок`:"Не оценивался"}</small></div>)}</div><p>{summary.beginner!==null&&<>Начальный уровень: <b>{num(summary.beginner)}</b> / 10 · </>}{summary.reading!==null&&<>Чтение: <b>{num(summary.reading)}</b> / 10{summary.general!==null?" · ":""}</>}{summary.general!==null&&<>Общие проверки: <b>{num(summary.general)}</b> / 10</>}</p><small>Учитываются все записи за период. Пропущенные оценки не считаются нулём; посещаемость показана отдельно от итога чтения.</small></section>;
}
