"use client";

import React from "react";
import { T } from "@/lib/themes";
import { Browser, Term, TL, Notifs } from "./MockupShells";
import { Bar, Stat } from "@/components/ui/primitives";

export function PropertyAPI({ t }: { t: T }) {
  return (
    <Term t={t}>
      <TL c="#5b9cf6">GET /api/properties?area=marina&amp;max=2M&amp;beds=2</TL>
      <TL c="#888">200 OK · 47 results · 31ms</TL>
      <TL>{`{ id:"mrn_t2", roi:7.2, dev:"Emaar" }`}</TL>
      <TL c="#888">━━━━━━━━━━━━━━━━━━</TL>
      <TL c="#fbbf24">Consumers: Bot · Web · Calc · Content</TL>
      <TL c="#4afa83">Uptime: 99.98% · Cache: 94% hit</TL>
    </Term>
  );
}

export function CRMIntegration({ t }: { t: T }) {
  return (
    <Browser t={t} url="admin/crm-status">
      {[{n:"Lead Responder",s:"Live",c:t.green},{n:"Behavior Scoring",s:"Live",c:t.green},{n:"Approval Hub",s:"Pending",c:t.amber},{n:"KPI Dashboard",s:"Pending",c:t.amber},{n:"WA Communities",s:"Planned",c:t.purple},{n:"Leak Detector",s:"Planned",c:t.purple}].map((x,i)=>(
        <div key={i} style={{display:"flex",justifyContent:"space-between",alignItems:"center",padding:"2.5px 0",borderBottom:`1px solid ${t.border}22`}}>
          <span style={{fontSize:6.5,color:t.text}}>{x.n}</span>
          <span style={{fontSize:6,color:x.c,fontWeight:700,background:x.c+"12",padding:"1px 5px",borderRadius:4}}>{x.s}</span>
        </div>
      ))}
    </Browser>
  );
}

export function ApprovalHub({ t }: { t: T }) {
  return (
    <Notifs t={t} items={[{t:"📧 RU Newsletter",body:"Ruble analysis + 4 listings · AI draft",time:"2m",c:t.accent,action:"✓ Approve  ✎ Edit  ✗ Reject"},{t:"💬 Follow-up · Ahmed K.",body:"3 days silent — new Palm match found",time:"5m",c:t.amber,action:"✓ Send  ✎ Edit"},{t:"📝 Blog · 'Hidden costs'",body:"8 languages · SEO optimized",time:"1h",c:t.green,action:"✓ Published"}]}/>
  );
}

export function KnowledgeBase({ t }: { t: T }) {
  return (
    <Term t={t}>
      <TL c="#888">$ qdrant-index --all</TL>
      <TL c="#5b9cf6">↳ Indexing codebase...</TL>
      <TL>{"✓"} 2,847 code chunks indexed</TL>
      <TL>{"✓"} 412 business doc chunks</TL>
      <TL>{"✓"} 891 past PR chunks</TL>
      <TL c="#888">━━━━ search test ━━━━</TL>
      <TL c="#5b9cf6">query: &quot;marina roi 2024&quot;</TL>
      <TL c="#4afa83">{"→"} 3 results · 23ms 🟢</TL>
    </Term>
  );
}

export function KPIDashboard({ t }: { t: T }) {
  return (
    <Browser t={t} url="crm.binayah.com/kpi">
      <div style={{display:"flex",gap:3,marginBottom:5}}>
        <Stat t={t} label="Response" value="47s" color={t.green}/>
        <Stat t={t} label="Conv %" value="3.8" color={t.accent}/>
        <Stat t={t} label="Pipeline" value="$4.2M" color={t.purple}/>
        <Stat t={t} label="QA Pass" value="94%" color={t.green}/>
      </div>
      <Bar t={t} label="🇷🇺 Russia" value={34} color={t.accent}/>
      <Bar t={t} label="🇮🇳 India" value={28} color={t.green}/>
      <Bar t={t} label="🇹🇷 Turkey" value={18} color={t.amber}/>
      <Bar t={t} label="🇨🇳 China" value={11} color={t.cyan||t.accent}/>
    </Browser>
  );
}

export function TranslationMemory({ t }: { t: T }) {
  return (
    <Browser t={t} url="admin/translations">
      <div style={{display:"flex",gap:3,marginBottom:5}}>
        <Stat t={t} label="Terms" value="847" color={t.accent}/>
        <Stat t={t} label="Languages" value="8" color={t.green}/>
        <Stat t={t} label="Saved" value="$420" color={t.amber}/>
      </div>
      {[{en:"Sea view apt",ru:"Квартира с видом",n:142},{en:"Payment plan",ru:"План оплаты",n:89},{en:"Golden Visa",ru:"Золотая виза",n:67}].map((x,i)=>(
        <div key={i} style={{background:t.surface,borderRadius:4,padding:"3px 5px",marginBottom:2}}>
          <div style={{display:"flex",justifyContent:"space-between"}}>
            <span style={{fontSize:6.5,fontWeight:600,color:t.text}}>{x.en}</span>
            <span style={{fontSize:5.5,color:t.textDim}}>×{x.n}</span>
          </div>
          <div style={{fontSize:6,color:t.accent}}>🇷🇺 {x.ru}</div>
        </div>
      ))}
    </Browser>
  );
}
