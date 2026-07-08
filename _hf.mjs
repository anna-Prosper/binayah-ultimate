import dns from "dns"; dns.setServers(["8.8.8.8","1.1.1.1"]);
const { MongoClient } = await import("mongodb");
import { readFileSync } from "fs";
const uri = readFileSync("/Users/zoop/.env.shared","utf8").match(/^MONGODB_URI=(.+)$/m)[1].trim();
const c = new MongoClient(uri,{serverSelectionTimeoutMS:20000}); await c.connect();
const coll=c.db().collection("pipelinestates");
const base=(await coll.findOne({"state.workspaces":{$exists:true}})).state;
const baseTotal=Object.values(base.subtasks||{}).reduce((a,l)=>a+(Array.isArray(l)?l.length:0),0);
let peak=baseTotal, everAbove=false, lastUpd=null;
for(let i=0;i<55;i++){
  const doc=(await coll.findOne({"state.workspaces":{$exists:true}}));
  const total=Object.values(doc.state.subtasks||{}).reduce((a,l)=>a+(Array.isArray(l)?l.length:0),0);
  const upd=new Date(doc.updatedAt).toISOString().slice(11,23);
  if(total>baseTotal){everAbove=true;peak=Math.max(peak,total);}
  if(upd!==lastUpd){ console.log(`  ${(i*1.6).toFixed(0)}s: total=${total}${total>baseTotal?" ***UP***":""} upd=${upd}`); lastUpd=upd; }
  await new Promise(r=>setTimeout(r,1600));
}
console.log(`\nbaseline=${baseTotal} peak=${peak} everWentAboveBaseline=${everAbove}`);
console.log(everAbove ? "=> WRITE happened (task reached server); it was then DELETED -> stale tab deleting" : "=> Task NEVER reached the server -> the create is not being written");
await c.close();
