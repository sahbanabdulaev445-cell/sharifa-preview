import assert from "node:assert/strict";
import fs from "node:fs";
import {createRequire} from "node:module";
import ts from "typescript";
const module={exports:{}},require=createRequire(import.meta.url);
const compiled=ts.transpileModule(fs.readFileSync("build/sites-vite-plugin.ts","utf8"),{compilerOptions:{module:ts.ModuleKind.CommonJS,target:ts.ScriptTarget.ES2022}}).outputText;
new Function("require","module","exports",compiled)(require,module,module.exports);
function middleware(options,command="serve"){
 let handler;const plugin=module.exports.sites(options);
 plugin.configResolved({root:process.cwd(),command});
 plugin.configureServer({config:{server:{},logger:{info(){}}},middlewares:{use(fn){handler=fn}}});
 return handler;
}
function request(handler,{host="127.0.0.1:5173",address="127.0.0.1",headers={},url="/api/data"}={}){
 const allHeaders={host,...headers},req={headers:allHeaders,rawHeaders:Object.entries(allHeaders).flat(),socket:{remoteAddress:address},url,method:"GET"};
 const res={statusCode:200,headers:{},setHeader(k,v){this.headers[k]=v},end(){this.ended=true}};
 let continued=false;handler(req,res,()=>{continued=true});return {req,res,continued};
}
const direct=middleware({mockAuth:true,localAccess:true});
for(const options of [{},{host:"localhost:5173"},{host:"[::1]:5173",address:"::1"}]){
 const r=request(direct,options);assert.equal(r.continued,true);assert.equal(r.req.headers["oai-authenticated-user-id"],"local_seedy");assert.equal(r.res.headers["Set-Cookie"],undefined);
}
const spoof={"oai-authenticated-user-id":"forged","oai-authenticated-user-email":"forged@example.test"};
for(const options of [{host:"other.test:5173"},{address:"192.168.1.20"},{host:"127.0.0.1:5173",url:"http://other.test/api/data"}]){
 const r=request(direct,{...options,headers:spoof});assert.equal(r.req.headers["oai-authenticated-user-id"],undefined);assert.equal(r.req.rawHeaders.includes("forged"),false);
}
for(const headers of [{origin:"http://other.test"},{"sec-fetch-site":"cross-site"}]){const r=request(direct,{headers});assert.equal(r.res.statusCode,403);assert.equal(r.continued,false)}
const same=request(direct,{headers:{origin:"http://127.0.0.1:5173"}});assert.equal(same.continued,true);
assert.equal(middleware({mockAuth:true,localAccess:true},"build"),undefined);
assert.equal(middleware({mockAuth:false,localAccess:true}),undefined);
const legacy=middleware({mockAuth:true});assert.equal(request(legacy).req.headers["oai-authenticated-user-id"],undefined);
assert.equal(request(legacy,{headers:{cookie:"__sites_local_auth=1"}}).req.headers["oai-authenticated-user-id"],"local_seedy");
console.log("PASS: direct loopback access without cookies, host/socket restrictions, spoofed-header removal, same-origin requests, and no production injection.");

const origin=process.env.QA_ORIGIN??"http://127.0.0.1:5173";
for(const path of ["/","/api/data?dataset=work","/api/data?dataset=demo","/api/backup"]){
 const r=await fetch(origin+path,{redirect:"manual",signal:AbortSignal.timeout(30000)});
 assert.equal(r.status,200,`${path}: ${r.status}`);assert.equal(r.headers.get("location"),null);assert.equal(r.headers.get("set-cookie"),null);
 if(path==="/")assert.match(await r.text(),/Группы и занятия/);else await r.arrayBuffer();
}
const bad=await fetch(origin+"/api/data?dataset=work",{method:"POST",headers:{Origin:origin,"Content-Type":"application/json"},body:JSON.stringify({kind:"invalid",value:{}}),signal:AbortSignal.timeout(15000)});assert.equal(bad.status,400);
const cross=await fetch(origin+"/api/data?dataset=work",{method:"POST",headers:{Origin:"http://other.test","Content-Type":"application/json"},body:"{}",signal:AbortSignal.timeout(15000)});assert.equal(cross.status,403);
console.log("PASS: local page, both datasets and backup HTTP 200 without sign-in/cookies; POST reaches validation directly; cross-origin POST rejected. No user records modified.");
