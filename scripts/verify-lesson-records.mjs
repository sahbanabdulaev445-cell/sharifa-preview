import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import {createRequire} from "node:module";
import ts from "typescript";
const nativeRequire=createRequire(import.meta.url),cache=new Map();
function load(file){const filename=path.resolve(file);if(cache.has(filename))return cache.get(filename).exports;const module={exports:{}};cache.set(filename,module);const code=ts.transpileModule(fs.readFileSync(filename,"utf8"),{compilerOptions:{module:ts.ModuleKind.CommonJS,target:ts.ScriptTarget.ES2022}}).outputText;const require=name=>name.startsWith(".")?load(path.resolve(path.dirname(filename),name)+".ts"):nativeRequire(name);new Function("require","module","exports",code)(require,module,module.exports);return module.exports}
const quran=load("lib/quran.ts"),{materialSchema,recordSchemas}=load("lib/record-schemas.ts"),helpers=load("lib/lesson-assessments.ts"),model=load("lib/analytics.ts");
const metadata=JSON.parse(fs.readFileSync("lib/quran-metadata.json","utf8"));
assert.equal(quran.surahs.length,114);assert.equal(quran.juzStarts.length,30);assert.equal(quran.surahs.reduce((a,s)=>a+s.verses,0),6236);
for(const [i,s] of quran.surahs.entries()){assert.equal(s.id,i+1);assert.equal(s.verses,Number(metadata.suras[i].ayas));assert.equal(s.arabic,metadata.suras[i].name);assert.equal(s.start,Number(metadata.suras[i].start));assert.ok(s.name);}
assert.equal(quran.surahById(79).verses,46);assert.equal(quran.surahById(2).verses,286);assert.equal(quran.surahById(114).verses,6);
for(const s of quran.surahs)for(let ayah=1;ayah<=s.verses;ayah++){const juz=quran.juzForAyah(s.id,ayah);const range=quran.surahRangeInJuz(s.id,juz);assert.ok(range&&ayah>=range.from&&ayah<=range.to);assert.ok(materialSchema.safeParse({juz,surah:s.id,wholeSurah:false,fromAyah:ayah,toAyah:ayah}).success);}
assert.deepEqual(quran.surahRangeInJuz(2,2),{from:142,to:252});assert.equal(quran.juzForAyah(78,1),30);
assert.equal(helpers.materialFromDraft(helpers.materialDraft()),undefined);
const m={juz:30,surah:79,wholeSurah:false,fromAyah:1,toAyah:10};assert.deepEqual(helpers.materialFromDraft(helpers.materialDraft(m)),m);
assert.deepEqual(helpers.materialFromDraft({juz:"30",surah:"79",wholeSurah:true,fromAyah:"1",toAyah:"10"}),{juz:30,surah:79,wholeSurah:true});
assert.throws(()=>helpers.materialFromDraft({juz:"30",surah:"79",wholeSurah:false,fromAyah:"10",toAyah:"9"}));
assert.throws(()=>helpers.materialFromDraft({juz:"30",surah:"",wholeSurah:false,fromAyah:"",toAyah:""}));
const data=structuredClone(model.emptyData),check={id:"a",personId:"p",date:"2026-10-01",note:"",assessmentType:"reading",groupId:"g",teacherId:"t",readingMode:"quran",makhraj:8,tajweed:7,hifz:5};
data.checks=[check,{...check,id:"b",date:"2026-10-03",makhraj:10,tajweed:9,hifz:7,attendance:0}];
assert.equal(model.weighted(data.checks[1],data.settings.weights),26/3);
assert.ok(Math.abs(model.checkProgress(data,data.checks[1]).totalChange-2)<1e-9,"Introducing attendance does not invalidate academic comparison");
assert.ok(recordSchemas.check.safeParse({...check,material:m,attendance:0}).success);
console.log("PASS: complete offline 114-surah/6236-verse/30-juz catalog, every verse boundary, material drafts, complete-surah toggles, invalid ranges and attendance-preserving reading comparisons.");
