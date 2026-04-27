"use client";

import React from "react";
import { T } from "@/lib/themes";
import { Browser, Term, TL } from "./MockupShells";

export function PMAgent({ t }: { t: T }) {
  return (
    <Browser t={t} url="admin/pm-agent">
      <div style={{fontSize:7,fontWeight:800,color:t.text,marginBottom:5}}>📋 Sprint Queue</div>
      {[{task:"WA slot booking logic",p:"P1",c:t.red,by:"Dev Agent"},{task:"/hi multilingual page",p:"P2",c:t.amber,by:"Dev Agent"},{task:"Lead score webhook",p:"P3",c:t.accent,by:"Queued"}].map((x,i)=>(
        <div key={i} style={{display:"flex",alignItems:"center",gap:4,padding:"3px 0",borderBottom:`1px solid ${t.border}22`}}>
          <span style={{fontSize:5.5,fontWeight:800,color:x.c,background:x.c+"18",padding:"1px 4px",borderRadius:3}}>{x.p}</span>
          <span style={{fontSize:6.5,color:t.text,flex:1}}>{x.task}</span>
          <span style={{fontSize:5.5,color:t.textDim}}>{x.by}</span>
        </div>
      ))}
      <div style={{fontSize:6,color:t.textDim,marginTop:4}}>3 tasks in LOG.md · 2 completed today</div>
    </Browser>
  );
}

export function DevAgent({ t }: { t: T }) {
  return (
    <Term t={t}>
      <TL c="#888">$ claude-code --task=P1</TL>
      <TL c="#5b9cf6">↳ Reading wa-scheduler.ts</TL>
      <TL c="#5b9cf6">↳ Analyzing 4 related files</TL>
      <TL>Writing slot-booking logic...</TL>
      <TL>Tests: ✓ 18/18 passing</TL>
      <TL c="#4afa83">git commit -m &quot;feat: WA scheduler&quot;</TL>
      <TL c="#4afa83">→ QA Agent notified 🟢</TL>
    </Term>
  );
}

export function QAAgent({ t }: { t: T }) {
  return (
    <Browser t={t} url="admin/qa-review">
      <div style={{fontSize:7,fontWeight:800,color:t.text,marginBottom:4}}>🔍 feat: WA scheduler</div>
      {[{c:"Code correctness",p:true},{c:"18/18 tests passing",p:true},{c:"Error handling",p:true},{c:"Edge: double-book?",p:false}].map((x,i)=>(
        <div key={i} style={{display:"flex",alignItems:"center",gap:4,padding:"2px 0"}}>
          <span style={{fontSize:7,color:x.p?t.green:t.red,fontWeight:700}}>{x.p?"✓":"✗"}</span>
          <span style={{fontSize:6.5,color:x.p?t.textSec:t.red}}>{x.c}</span>
        </div>
      ))}
      <div style={{background:t.red+"12",borderRadius:8,padding:"3px 6px",marginTop:4,display:"flex",gap:4}}>
        <span style={{fontSize:6,color:t.red}}>↩ Sent back: fix L94 double-book case → Dev Agent</span>
      </div>
    </Browser>
  );
}

export function CodeReview({ t }: { t: T }) {
  return (
    <Browser t={t} url="admin/review-queue">
      <div style={{background:t.green+"10",border:`1px solid ${t.green}33`,borderRadius:8,padding:"5px 7px",marginBottom:5}}>
        <div style={{display:"flex",justifyContent:"space-between",alignItems:"center"}}>
          <span style={{fontSize:7,fontWeight:700,color:t.text}}>feat: WA scheduler</span>
          <span style={{fontSize:5.5,color:t.green,fontWeight:700}}>QA ✓ PASSED</span>
        </div>
        <div style={{fontSize:5.5,color:t.textDim,marginTop:1}}>3 files · 127 additions · 14 deletions</div>
      </div>
      {[{c:"Works end-to-end?",ok:true},{c:"Obvious edge cases?",ok:true},{c:"Ready to ship?",ok:true}].map((x,i)=>(
        <div key={i} style={{display:"flex",gap:4,padding:"1.5px 0"}}>
          <span style={{fontSize:6.5,color:x.ok?t.green:t.amber}}>{x.ok?"✓":"?"}</span>
          <span style={{fontSize:6.5,color:t.textSec}}>{x.c}</span>
        </div>
      ))}
      <div style={{display:"flex",gap:3,marginTop:5}}>
        <div style={{flex:1,background:t.green,borderRadius:8,padding:"3px 0",textAlign:"center",fontSize:6,color:"#fff",fontWeight:700}}>✓ Merge</div>
        <div style={{flex:1,background:t.surface,borderRadius:8,padding:"3px 0",textAlign:"center",fontSize:6,color:t.textSec}}>→ PM Agent</div>
      </div>
    </Browser>
  );
}

export function ContentFactory({ t }: { t: T }) {
  return (
    <Browser t={t} url="admin/launch-kit">
      <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:4}}>
        <span style={{fontSize:7.5,fontWeight:800,color:t.text}}>🚀 Creek Vista T3</span>
        <span style={{fontSize:6,color:t.green,fontWeight:700}}>12 min</span>
      </div>
      {[["📝","Blog","8 langs","✓"],["📱","Social","LI · IG · X","✓"],["📧","Email","4 segments","✓"],["💬","WA draft","Broadcast","✓"],["🌐","Landing","SEO ready","✓"],["🎬","Video script","Abdullah","✓"]].map((x,i)=>(
        <div key={i} style={{display:"flex",alignItems:"center",gap:4,padding:"1.5px 0",borderBottom:`1px solid ${t.border}11`}}>
          <span style={{fontSize:9}}>{x[0]}</span>
          <span style={{fontSize:6.5,color:t.text,flex:1,fontWeight:600}}>{x[1]}</span>
          <span style={{fontSize:5.5,color:t.textDim}}>{x[2]}</span>
          <span style={{fontSize:6,color:t.green,fontWeight:700}}>{x[3]}</span>
        </div>
      ))}
      <div style={{background:t.amber+"12",borderRadius:8,padding:"3px 6px",marginTop:4}}>
        <span style={{fontSize:6,color:t.amber,fontWeight:600}}>⏳ Pending Approval Hub review</span>
      </div>
    </Browser>
  );
}
