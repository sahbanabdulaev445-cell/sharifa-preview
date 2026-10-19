export const studentLevels=["Начальный","Чтение","Хифз"] as const;
export function studentLevel(value:string|undefined){return value==="Средний"?"Чтение":value==="Продвинутый"?"Хифз":value??"Начальный"}
export const beginnerCriteria=[{key:"letters",label:"Буквы"},{key:"rules",label:"Правила таджвида"},{key:"reading",label:"Чтение"},{key:"attendance",label:"Посещаемость"}] as const;
