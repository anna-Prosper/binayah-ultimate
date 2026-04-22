"use client";

import React from "react";
import { T } from "@/lib/themes";
import { Browser } from "./MockupShells";
import { Bar, ScoreCircle } from "@/components/ui/primitives";

export function LoginMyList({ t }: { t: T }) {
  return (
    <Browser t={t} url="binayah.com/account">
      <div style={{display:"flex",alignItems:"center",gap:5,marginBottom:4}}>
        <div style={{width:28,height:28,borderRadius:"50%",background:t.accent+"22",border:`2px solid ${t.accent}44`,display:"flex",alignItems:"center",justifyContent:"center",fontSize:12}}>👤</div>
        <div>
          <div style={{fontSize:7,fontWeight:700,color:t.text}}>Welcome back, Ahmed</div>
          <div style={{fontSize:5.5,color:t.textDim}}>3 saved · 1 under review</div>
        </div>
      </div>
      {[{name:"Marina Heights 2BR",price:"1.6M",tag:"Saved",c:t.accent},{name:"JVC Studio · Payment plan",price:"720K",tag:"Saved",c:t.accent},{name:"My Palm apt · 3BR",price:"—",tag:"Under Review",c:t.amber}].map((x,i)=>(
        <div key={i} style={{display:"flex",justifyContent:"space-between",alignItems:"center",padding:"2.5px 0",borderBottom:`1px solid ${t.border}22`}}>
          <span style={{fontSize:6.5,color:t.text,flex:1}}>{x.name}</span>
          <span style={{fontSize:6,color:x.c,fontWeight:700}}>{x.tag}</span>
        </div>
      ))}
    </Browser>
  );
}

export function PropertyMap({ t }: { t: T }) {
  return (
    <Browser t={t} url="binayah.com/map">
      <div style={{display:"flex",flexDirection:"column",gap:2.5}}>
        {[{zone:"Marina",sqft:"1,840",trend:"+2.1%",risk:"⚠ 3 towers u/c",c:t.accent},{zone:"JVC",sqft:"980",trend:"+1.4%",risk:"✓ Low risk",c:t.green},{zone:"Downtown",sqft:"2,240",trend:"+3.1%",risk:"⚠ High service charge",c:t.amber}].map((x,i)=>(
          <div key={i} style={{background:t.surface,borderRadius:5,padding:"4px 6px",borderLeft:`2.5px solid ${x.c}`}}>
            <div style={{display:"flex",justifyContent:"space-between"}}>
              <span style={{fontSize:7,fontWeight:700,color:x.c}}>{x.zone}</span>
              <span style={{fontSize:6.5,color:t.green,fontWeight:700}}>{x.trend}</span>
            </div>
            <div style={{display:"flex",gap:8,marginTop:1}}>
              <span style={{fontSize:5.5,color:t.textDim}}>{x.sqft}/sqft</span>
              <span style={{fontSize:5.5,color:t.textDim}}>{x.risk}</span>
            </div>
          </div>
        ))}
        <div style={{background:t.accent+"10",borderRadius:4,padding:"3px 5px"}}>
          <span style={{fontSize:5.5,color:t.accent}}>💬 AI: &quot;best ROI under 1.5M?&quot; → JVC 7.8% ✓</span>
        </div>
      </div>
    </Browser>
  );
}

export function PropertyCompare({ t }: { t: T }) {
  return (
    <Browser t={t} url="binayah.com/compare">
      {[["","Marina T2","Creek Vista"],["Price","1.8M","1.3M"],["ROI","6.5%","7.8%"],["Developer","Emaar","Sobha"],["Ready","2019","2027"],["Score","82","76"]].map((r,i)=>(
        <div key={i} style={{display:"flex",gap:3,borderBottom:i<5?`1px solid ${t.border}22`:"none",paddingBottom:2,marginBottom:2}}>
          {r.map((c,j)=>(
            <span key={j} style={{flex:j===0?1.5:1,fontSize:i===0?5.5:6.5,fontWeight:i===0||j===0?700:j===2&&i>0?700:400,color:i===0?t.textMuted:j===0?t.textSec:j===2&&i>0?t.green:t.textSec,textAlign:j>0?"center":"left" as const}}>{c}</span>
          ))}
        </div>
      ))}
      <div style={{background:t.accent+"10",borderRadius:4,padding:"3px 5px"}}>
        <span style={{fontSize:5.5,color:t.accent}}>📥 Download PDF comparison → lead captured</span>
      </div>
    </Browser>
  );
}

export function NeighbourhoodQuiz({ t }: { t: T }) {
  return (
    <Browser t={t} url="binayah.com/quiz">
      <div style={{textAlign:"center",marginBottom:5}}>
        <span style={{fontSize:16}}>🏠</span>
        <div style={{fontSize:8,fontWeight:800,color:t.text,marginTop:2}}>Find your Dubai community</div>
        <div style={{display:"flex",alignItems:"center",gap:3,justifyContent:"center",marginTop:3}}>
          <div style={{flex:1,height:3,background:t.border,borderRadius:2}}><div style={{width:"60%",height:"100%",background:t.accent,borderRadius:2}}/></div>
          <span style={{fontSize:5.5,color:t.textDim}}>Q3/5</span>
        </div>
      </div>
      <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:3}}>
        {["🏖 Beach access","🌃 Nightlife","👨‍👩‍👧 Family-first","📈 Max ROI"].map(x=>(
          <div key={x} style={{background:t.surface,borderRadius:6,padding:"6px 4px",textAlign:"center",fontSize:6.5,color:t.textSec,cursor:"pointer"}}>{x}</div>
        ))}
      </div>
    </Browser>
  );
}

export function CityCalculator({ t }: { t: T }) {
  return (
    <Browser t={t} url="binayah.com/vs/dubai-vs-moscow">
      {[["","🇷🇺 Moscow","🇦🇪 Dubai"],["Yield","3.2%","7.1%"],["Tax","13%+","0%"],["Visa","—","Golden ✓"],["Growth 1Y","+1.8%","+14%"],["Currency","RUB risk","USD pegged"]].map((r,i)=>(
        <div key={i} style={{display:"flex",gap:3,borderBottom:i<5?`1px solid ${t.border}22`:"none",paddingBottom:1.5,marginBottom:1.5}}>
          {r.map((c,j)=>(
            <span key={j} style={{flex:j===0?1.2:1,fontSize:i===0?6:6.5,fontWeight:i===0||j===0?700:(j===2&&i>0)?700:400,color:i===0?t.textMuted:j===0?t.textSec:(j===2&&i>0)?t.green:t.textSec,textAlign:j>0?"center":"left" as const}}>{c}</span>
          ))}
        </div>
      ))}
    </Browser>
  );
}

export function ScamChecker({ t }: { t: T }) {
  return (
    <Browser t={t} url="binayah.com/scam-check">
      <div style={{display:"flex",alignItems:"center",gap:5,marginBottom:4}}>
        <ScoreCircle value={78} color={t.amber} size={40}/>
        <div>
          <div style={{fontSize:7.5,fontWeight:800,color:t.amber}}>SUSPICIOUS</div>
          <div style={{fontSize:5.5,color:t.textDim}}>Score 78/100 — proceed with caution</div>
        </div>
      </div>
      {[{c:"RERA registration",p:true},{c:"Price vs DLD comps",p:true},{c:"Scam language detected",p:false,note:"'guaranteed ROI'"},{c:"Photo reverse search",p:false,note:"Stolen from Bayut"},{c:"WhatsApp-only contact",p:false,note:"No office address"}].map((x,i)=>(
        <div key={i} style={{display:"flex",alignItems:"center",gap:4,padding:"1.5px 0"}}>
          <span style={{fontSize:7,color:x.p?t.green:t.red,fontWeight:700}}>{x.p?"✓":"✗"}</span>
          <span style={{fontSize:6.5,color:x.p?t.textSec:t.red,flex:1}}>{x.c}</span>
          {(x as {note?:string}).note&&<span style={{fontSize:5,color:t.red}}>{(x as {note?:string}).note}</span>}
        </div>
      ))}
    </Browser>
  );
}

export function AreaFutureMap({ t }: { t: T }) {
  return (
    <Browser t={t} url="binayah.com/future-map">
      <div style={{fontSize:7,fontWeight:800,color:t.text,marginBottom:4}}>📍 Dubai Marina, Block 5</div>
      {[{icon:"🏗",label:"View corridor",verdict:"⚠ At risk",detail:"3 towers permitted behind",c:t.amber},{icon:"🚇",label:"Metro expansion",verdict:"✓ Line 2 planned",detail:"500m by 2028",c:t.green},{icon:"🔊",label:"Noise risk",verdict:"✓ Low",detail:"No roads planned nearby",c:t.green},{icon:"🏭",label:"Construction density",verdict:"🚨 High",detail:"12 towers in 2km radius",c:t.red},{icon:"📈",label:"Value trajectory",verdict:"✓ +8% proj.",detail:"Based on 5Y DLD data",c:t.green}].map((x,i)=>(
        <div key={i} style={{display:"flex",alignItems:"center",gap:4,padding:"1.5px 0",borderBottom:`1px solid ${t.border}11`}}>
          <span style={{fontSize:9}}>{x.icon}</span>
          <span style={{fontSize:5.5,color:t.textSec,flex:1}}>{x.label}</span>
          <div style={{textAlign:"right"}}>
            <div style={{fontSize:5.5,color:x.c,fontWeight:700}}>{x.verdict}</div>
            <div style={{fontSize:4.5,color:t.textDim}}>{x.detail}</div>
          </div>
        </div>
      ))}
    </Browser>
  );
}
