export const studentLevels=["Начальный","Чтение","Хифз"] as const;
export type StudentLevel=typeof studentLevels[number];
export function studentLevel(value:string|undefined){return value==="Средний"?"Чтение":value==="Продвинутый"?"Хифз":value??"Начальный"}
export function groupLevel(value:string|undefined){return value==="Читающие"||value==="Только перешедшие на Коран"?"Чтение":value==="Заучивающие"?"Хифз":value?studentLevel(value):undefined}
export function checkLevel(check:{assessmentType?:string;assessmentLevel?:StudentLevel;readingMode?:string}){return check.assessmentLevel??(check.assessmentType==="beginner"?"Начальный":check.assessmentType==="reading"?(check.readingMode==="memory"?"Хифз":"Чтение"):undefined)}
export const beginnerCriteria=[{key:"letters",label:"Буквы"},{key:"rules",label:"Правила таджвида"},{key:"reading",label:"Чтение"},{key:"attendance",label:"Посещаемость"}] as const;
