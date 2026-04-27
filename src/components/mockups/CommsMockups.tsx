"use client";

import React from "react";
import { T } from "@/lib/themes";
import { Phone, WaM, WaSys, Browser } from "./MockupShells";
import { Stat } from "@/components/ui/primitives";

export function WATranslation({ t }: { t: T }) {
  return (
    <Phone t={t} title="Alexei 🇷🇺">
      <WaM text="Ищу квартиру, бюджет 2М" time="10:23"/>
      <WaSys text="🔄 RU→EN  ·  0.3¢"/>
      <WaM out label="Agent sees" text="Looking for apartment, 2M AED" time="10:23"/>
      <WaM out label="Agent types" text="3 great sea-view options!" time="10:24"/>
      <WaSys text="🔄 EN→RU  ·  0.3¢"/>
      <WaM out label="Client gets" text="3 варианта с видом на море!" time="10:24"/>
    </Phone>
  );
}

export function AISalesAgent({ t }: { t: T }) {
  return (
    <Phone t={t} title="Binayah AI 🤖">
      <WaM text="预算300万，高回报" time="14:02"/>
      <WaM out text={"Conf: 94% ✓\n最佳：BizBay 7.2%\nJVC 7.8% · 12套 📋"} time="14:02"/>
      <WaM text="发给我详情" time="14:03"/>
      <WaM out text="Sending 3 listings to Sarah 👋" time="14:03"/>
      <WaSys text="→ Briefing card sent to agent"/>
    </Phone>
  );
}

export function TimezoneDrips({ t }: { t: T }) {
  return (
    <Browser t={t} url="admin/drip-scheduler">
      {[{tz:"🇷🇺 Moscow",local:"9:00 AM",s:"✓ Sent",c:t.green},{tz:"🇮🇳 Mumbai",local:"10:30 AM",s:"Queued",c:t.amber},{tz:"🇨🇳 Beijing",local:"8:00 AM",s:"Tomorrow",c:t.accent},{tz:"🇹🇷 Istanbul",local:"12:00 PM",s:"Queued",c:t.amber}].map((x,i)=>(
        <div key={i} style={{display:"flex",justifyContent:"space-between",alignItems:"center",padding:"4px 0",borderBottom:`1px solid ${t.border}22`}}>
          <div>
            <span style={{fontSize:6.5,color:t.text}}>{x.tz}</span>
            <span style={{fontSize:5.5,color:t.textDim,marginLeft:4}}>{x.local}</span>
          </div>
          <span style={{fontSize:6,color:x.c,fontWeight:700}}>{x.s}</span>
        </div>
      ))}
    </Browser>
  );
}

export function WACompliance({ t }: { t: T }) {
  return (
    <Browser t={t} url="admin/wa-health">
      <div style={{display:"flex",gap:4,marginBottom:4}}>
        <Stat t={t} label="Quality" value="High" color={t.green}/>
        <Stat t={t} label="Opt-in" value="94%" color={t.accent}/>
        <Stat t={t} label="Templates" value="12/12" color={t.green}/>
      </div>
      {[{n:"Marketing template",s:"Approved",c:t.green},{n:"Follow-up sequence",s:"Approved",c:t.green},{n:"Bulk broadcast",s:"Under review",c:t.amber},{n:"Monthly report",s:"Draft",c:t.textDim}].map((x,i)=>(
        <div key={i} style={{display:"flex",justifyContent:"space-between",padding:"2.5px 0",borderBottom:`1px solid ${t.border}22`}}>
          <span style={{fontSize:6.5,color:t.text}}>{x.n}</span>
          <span style={{fontSize:6,color:x.c,fontWeight:600}}>{x.s}</span>
        </div>
      ))}
    </Browser>
  );
}
