"use client";

import React from "react";
import { T } from "@/lib/themes";
import { Browser, Term, TL } from "./MockupShells";

export function OpenClawResearch({ t }: { t: T }) {
  return (
    <Browser t={t} url="docs.openclaw.ai/compare">
      <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:4}}>
        {[{n:"Qwen 3.6+",cost:"FREE",s:92,q:78,c:t.green},{n:"Claude Proxy",cost:"$0*",s:71,q:95,c:t.accent},{n:"Ollama",cost:"FREE",s:45,q:62,c:t.amber},{n:"Claude API",cost:"$$/tok",s:88,q:97,c:t.purple}].map(m=>(
          <div key={m.n} style={{background:t.surface,borderRadius:8,padding:4}}>
            <div style={{display:"flex",justifyContent:"space-between"}}>
              <span style={{fontSize:6.5,fontWeight:700,color:m.c}}>{m.n}</span>
              <span style={{fontSize:5.5,color:t.textDim}}>{m.cost}</span>
            </div>
            <div style={{display:"flex",alignItems:"center",gap:0,marginTop:0}}>
              <span style={{fontSize:5,color:t.textDim,width:20}}>Spd</span>
              <div style={{flex:1,height:3,background:t.border,borderRadius:2}}><div style={{width:`${m.s}%`,height:"100%",background:m.c,borderRadius:2}}/></div>
            </div>
            <div style={{display:"flex",alignItems:"center",gap:0,marginTop:0}}>
              <span style={{fontSize:5,color:t.textDim,width:20}}>Qual</span>
              <div style={{flex:1,height:3,background:t.border,borderRadius:2}}><div style={{width:`${m.q}%`,height:"100%",background:m.c,borderRadius:2}}/></div>
            </div>
          </div>
        ))}
      </div>
    </Browser>
  );
}

export function DevPipelineResearch({ t }: { t: T }) {
  return (
    <Browser t={t} url="admin/pipeline-test">
      <div style={{display:"flex",flexDirection:"column",gap:0}}>
        {[{n:"PM reads TASKS.md",icon:"📋",c:t.accent,done:true,ms:"0.2s"},{n:"Dev Agent writes code",icon:"💻",c:t.green,done:true,ms:"4.1s"},{n:"QA Agent reviews",icon:"🔍",c:t.amber,done:true,ms:"1.3s"},{n:"Fix loop (0 fails)",icon:"♻",c:t.purple,done:true,ms:"—"},{n:"git push → deploy",icon:"🚀",c:t.cyan||t.accent,done:false,ms:"..."}].map((s,i)=>(
          <div key={i} style={{display:"flex",alignItems:"center",gap:4,background:s.done?t.surface+"88":t.surface,borderRadius:8,padding:"4px 4px",opacity:s.done?1:0.45}}>
            <div style={{width:15,height:15,borderRadius:"50%",background:s.done?s.c+"22":"transparent",border:`1.5px solid ${s.c}`,display:"flex",alignItems:"center",justifyContent:"center",fontSize:6,color:s.c,fontWeight:800,flexShrink:0}}>{s.done?"✓":i+1}</div>
            <span style={{fontSize:7,fontWeight:600,color:t.text,flex:1}}>{s.n}</span>
            <span style={{fontSize:5.5,color:t.textDim,fontFamily:"monospace"}}>{s.ms}</span>
          </div>
        ))}
      </div>
    </Browser>
  );
}

export function QdrantResearch({ t }: { t: T }) {
  return (
    <Browser t={t} url="qdrant.tech/compare">
      <div style={{marginBottom:4}}>
        {[["","Local","Cloud","Pinecone"],["Cost/mo","$0","$25+","$70+"],["Latency","12ms","28ms","45ms"],["Privacy","✓ NDA","Cloud","Cloud"],["Setup","Medium","Easy","Easy"]].map((r,i)=>(
          <div key={i} style={{display:"flex",gap:0,borderBottom:`1px solid ${t.border}22`,paddingBottom:0,marginBottom:0}}>
            {r.map((c,j)=>(
              <span key={j} style={{flex:1,fontSize:i===0?5.5:6,fontWeight:i===0||j===0?700:j===1&&i>0?600:400,color:i===0?t.textMuted:j===0?t.textSec:j===1&&i>0?t.green:t.textDim,textAlign:j>0?"center":"left" as const}}>{c}</span>
            ))}
          </div>
        ))}
      </div>
      <div style={{background:t.green+"12",borderRadius:8,padding:"4px 4px",display:"flex",justifyContent:"space-between"}}>
        <span style={{fontSize:6,color:t.green,fontWeight:700}}>→ Qdrant Local recommended</span>
        <span style={{fontSize:5.5,color:t.green}}>NDA safe ✓</span>
      </div>
    </Browser>
  );
}

export function HostingStrategy({ t }: { t: T }) {
  return (
    <Browser t={t} url="admin/infra-decision">
      <div style={{display:"flex",gap:4,marginBottom:4}}>
        {[{n:"DO Docker",p:"$12/mo",rec:true,c:t.green,sub:"Start here"},{n:"AWS ECS",p:"$30/mo",rec:false,c:t.accent,sub:"When scaling"}].map(x=>(
          <div key={x.n} style={{flex:1,background:t.surface,borderRadius:8,padding:"4px 4px",border:`1px solid ${x.rec?x.c+"55":t.border}`,textAlign:"center"}}>
            <div style={{fontSize:7,fontWeight:700,color:x.c}}>{x.n}</div>
            <div style={{fontSize:13,fontWeight:900,color:t.text,margin:"0 0"}}>{x.p}</div>
            <div style={{fontSize:5.5,color:x.rec?x.c:t.textDim}}>{x.rec?"✓ RECOMMENDED":x.sub}</div>
          </div>
        ))}
      </div>
      {[{l:"Deploy speed",a:95,b:60},{l:"Cost",a:90,b:50},{l:"Scale ceiling",a:55,b:95}].map(x=>(
        <div key={x.l} style={{display:"flex",alignItems:"center",gap:4,marginBottom:0}}>
          <span style={{fontSize:5.5,color:t.textDim,width:52}}>{x.l}</span>
          <div style={{flex:1,height:4,background:t.surface,borderRadius:2}}><div style={{width:`${x.a}%`,height:"100%",background:t.green,borderRadius:2}}/></div>
          <span style={{fontSize:5,color:t.textDim,width:14,textAlign:"right"}}>{x.a}%</span>
        </div>
      ))}
    </Browser>
  );
}

export function InfraSetup({ t }: { t: T }) {
  return (
    <Term t={t}>
      <TL c="#888">$ ./deploy.sh binayah-vps</TL>
      <TL>{"✓"} Docker 24.0 installed</TL>
      <TL>{"✓"} OpenClaw deployed :8080</TL>
      <TL>{"✓"} Models loaded: qwen3.6</TL>
      <TL>{"✓"} WhatsApp API connected</TL>
      <TL c="#fbbf24">{"○"} Running first agent test...</TL>
      <TL c="#4afa83">{"→"} PM Agent: ready 🟢</TL>
    </Term>
  );
}
