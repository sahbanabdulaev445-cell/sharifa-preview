import {studentLevels,StudentLevel} from "@/lib/levels";
import RequiredMark from "./required-mark";
export default function AssessmentLevelPicker({value,onChange,disabled=false}:{value:StudentLevel;onChange:(level:StudentLevel)=>void;disabled?:boolean}){
 return <fieldset className="reading-mode assessment-level full" disabled={disabled}><legend>Уровень проверки<RequiredMark/></legend>{studentLevels.map(level=><label key={level}><input type="radio" name="assessment-level" value={level} checked={value===level} onChange={()=>onChange(level)}/>{level}</label>)}</fieldset>;
}
