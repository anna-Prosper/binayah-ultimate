"use client";

import React from "react";
import { T } from "@/lib/themes";
import { Browser } from "./MockupShells";
import { Stat } from "@/components/ui/primitives";

export function LinkedInScrape({ t }: { t: T }) {
  return (
    <Browser t={t} url="apollo.io / phantombuster">
      <div style={{display:"flex",gap:3,marginBottom:4}}>
        <Stat t={t} label="Flagged" value="47" color={t.accent}/>
        <Stat t={t} label="Verified" value="31" color={t.green}/>
        <Stat t={t} label="Hot" value="8" color={t.red}/>
      </div>
      {[{n:"James T.",r:"CFO",sig:"'Relocating to Dubai'",s:94,c:t.red},{n:"Anna V.",r:"Dir",sig:"Company expanding UAE",s:77,c:t.amber},{n:"Wei L.",r:"VP",sig:"'Just moved to Dubai'",s:63,c:t.accent}].map((x,i)=>(
        <div key={i} style={{display:"flex",alignItems:"center",gap:4,padding:"2.5px 0",borderBottom:`1px solid ${t.border}22`}}>
          <span style={{fontSize:6.5,fontWeight:700,color:t.text,flex:1}}>{x.n} · {x.r}</span>
          <span style={{fontSize:5.5,color:t.textDim,flex:2}}>{x.sig}</span>
          <div style={{width:20,height:20,borderRadius:"50%",background:x.c+"15",border:`1.5px solid ${x.c}`,display:"flex",alignItems:"center",justifyContent:"center"}}>
            <span style={{fontSize:6.5,fontWeight:800,color:x.c}}>{x.s}</span>
          </div>
        </div>
      ))}
    </Browser>
  );
}

export function ForumListener({ t }: { t: T }) {
  return (
    <Browser t={t} url="admin/forum-monitor">
      {[{s:"r/dubai",p:"'looking to buy investment property in Marina'",intent:"HIGH",c:t.red},{s:"r/expats",p:"'relocating to Dubai in March, need advice'",intent:"HIGH",c:t.amber},{s:"FB Dubai Expats",p:"'anyone recommend a property agent?'",intent:"MED",c:t.accent}].map((x,i)=>(
        <div key={i} style={{background:t.surface,borderRadius:5,padding:"4px 6px",marginBottom:3}}>
          <div style={{display:"flex",justifyContent:"space-between"}}>
            <span style={{fontSize:6,fontWeight:700,color:x.c}}>{x.s}</span>
            <span style={{fontSize:5.5,color:x.c,fontWeight:700}}>{x.intent}</span>
          </div>
          <div style={{fontSize:6,color:t.textSec,lineHeight:1.3}}>&quot;{x.p}&quot;</div>
        </div>
      ))}
    </Browser>
  );
}

export function ColdOutreachSystem({ t }: { t: T }) {
  return (
    <Browser t={t} url="admin/outreach-hub">
      <div style={{display:"flex",gap:3,marginBottom:5}}>
        <Stat t={t} label="Verified" value="847" color={t.green}/>
        <Stat t={t} label="Warming" value="78%" color={t.amber}/>
        <Stat t={t} label="Replied" value="34" color={t.accent}/>
        <Stat t={t} label="Meetings" value="7" color={t.purple}/>
      </div>
      {[{n:"Email enrichment",s:"847 verified",c:t.green},{n:"Domain warming",s:"78% ready · 8 days left",c:t.amber},{n:"Sequence A (reloc)",s:"3 active · 8% reply",c:t.accent},{n:"Sequence B (invest)",s:"1 active · 12% reply",c:t.accent}].map((x,i)=>(
        <div key={i} style={{display:"flex",justifyContent:"space-between",padding:"2.5px 0",borderBottom:`1px solid ${t.border}22`}}>
          <span style={{fontSize:6.5,fontWeight:600,color:t.text}}>{x.n}</span>
          <span style={{fontSize:6,color:x.c}}>{x.s}</span>
        </div>
      ))}
    </Browser>
  );
}
