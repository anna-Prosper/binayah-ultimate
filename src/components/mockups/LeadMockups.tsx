"use client";

import React from "react";
import { T } from "@/lib/themes";
import { Phone, WaM, WaSys, Browser, Notifs } from "./MockupShells";
import { Bar, Stat, ScoreCircle } from "@/components/ui/primitives";

export function LeadResponder({ t }: { t: T }) {
  return (
    <Phone t={t} title="Bayut — Ahmed K.">
      <WaSys text="Lead received · 10:23:00"/>
      <WaM out text={"✓ 23s response\n2BR Marina options:\n1. Emaar T2 · 1.8M · 6.5%\n2. DAMAC · 1.6M · 7.1%\n→ Briefing sent to Sarah"} time="10:23"/>
      <WaSys text="Sarah notified ·  score: 87"/>
    </Phone>
  );
}

export function BehaviorScoring({ t }: { t: T }) {
  return (
    <Browser t={t} url="crm/live-visitors">
      {[{id:"#4821",s:92,sig:"3rd visit · Marina 3BR · viewed payment plan",c:t.red,action:"🔔 Alert Sarah"},{id:"#4819",s:67,sig:"JVC · 2 visits · price filter used",c:t.amber,action:"Watch"},{id:"#4815",s:23,sig:"Bounced after 8s",c:t.textDim,action:"Ignore"}].map((x,i)=>(
        <div key={i} style={{display:"flex",alignItems:"center",gap:4,padding:"3px 0",borderBottom:`1px solid ${t.border}22`}}>
          <div style={{width:26,height:26,borderRadius:"50%",background:x.c+"15",border:`2px solid ${x.c}`,display:"flex",alignItems:"center",justifyContent:"center",flexShrink:0}}>
            <span style={{fontSize:8,fontWeight:800,color:x.c}}>{x.s}</span>
          </div>
          <div style={{flex:1}}>
            <div style={{fontSize:6,color:t.textSec,lineHeight:1.3}}>{x.sig}</div>
          </div>
          <span style={{fontSize:5.5,color:x.c,fontWeight:700}}>{x.action}</span>
        </div>
      ))}
    </Browser>
  );
}

export function LeadPrediction({ t }: { t: T }) {
  return (
    <Browser t={t} url="crm/prediction">
      <div style={{display:"flex",alignItems:"center",gap:8,marginBottom:5}}>
        <ScoreCircle value={64} color={t.green}/>
        <div>
          <div style={{fontSize:7,fontWeight:700,color:t.text}}>Model accuracy: 64%</div>
          <div style={{fontSize:6,color:t.green}}>2,400 records · improves weekly</div>
        </div>
      </div>
      <Bar t={t} label="🇷🇺 Bayut" value={72} color={t.green}/>
      <Bar t={t} label="🇮🇳 Web" value={58} color={t.amber}/>
      <Bar t={t} label="🇬🇧 PF" value={45} color={t.amber}/>
      <Bar t={t} label="🇩🇪 Cold" value={22} color={t.red}/>
    </Browser>
  );
}

export function LeakDetector({ t }: { t: T }) {
  return (
    <Notifs t={t} items={[{t:"⚠ Ahmed K. · 4 days silent",body:"NEW MATCH: Marina 2BR dropped to 1.6M",time:"9PM",c:t.red,action:"→ Auto-draft sent · approve?"},{t:"⚠ Olga S. · 3 days silent",body:"3 Palm listings under her budget",time:"9PM",c:t.amber,action:"→ Draft ready · approve?"},{t:"✓ Wei L. · responded",body:"Viewing booked for Wednesday",time:"9PM",c:t.green}]}/>
  );
}

export function ViewingScheduler({ t }: { t: T }) {
  return (
    <Phone t={t} title="Ahmed K.">
      <WaM out text={"Available slots:\n📅 Sun 2PM · Mon 10AM\n📅 Tue 4PM · Wed 12PM\nWhich works?"} time="10:14"/>
      <WaM text="Monday 10AM works" time="10:16"/>
      <WaM out text={"✓ Booked Mon 10AM\nSarah will meet you at Marina T2 👋\nReminder sent"} time="10:17"/>
      <WaSys text="→ Agent notified · reminder set"/>
    </Phone>
  );
}

export function DealBroadcaster({ t }: { t: T }) {
  return (
    <Phone t={t} title="Price Drops 📉">
      <WaM out text={"📉 NEW DROP:\nMarina Heights T2\n1.3M → 1.2M (-7.7%)\n6.8% yield · Emaar"} time="6:00"/>
      <WaSys text="→ 34 matching investors"/>
      <WaM text="Interested, send details" time="6:09"/>
      <WaM text="Still available?" time="6:14"/>
    </Phone>
  );
}

export function PostSaleNurture({ t }: { t: T }) {
  return (
    <Phone t={t} title="Olga S. 🇷🇺">
      <WaM out text={"🎉 1 year, Olga!\n📈 Your unit: +12.4%\n💰 Now worth 2.02M AED\n🚇 Metro station Q3 2025"} time="9:00"/>
      <WaM text="Wow! My friend is looking too..." time="9:14"/>
      <WaSys text="🎯 Referral detected → team alerted"/>
    </Phone>
  );
}

export function WACommunities({ t }: { t: T }) {
  return (
    <Phone t={t} title="🏗 Marina Watchers (38)">
      <WaM out label="🤖" text={"📊 Week update:\n12 txns · avg 1,840/sqft\nPrice trend: +2.1% MoM\n[Full report →]"} time="7:05"/>
      <WaM text="Worth buying now or wait?" time="7:22"/>
      <WaM out label="🤖" text={"Last 6mo: +14% appreciation\nHistorically Q1 is strongest 📋"} time="7:30"/>
    </Phone>
  );
}

export function InvestorPortal({ t }: { t: T }) {
  return (
    <Browser t={t} url="portal.binayah.com/portfolio">
      <div style={{display:"flex",gap:3,marginBottom:4}}>
        <Stat t={t} label="Occupancy" value="94%" color={t.green}/>
        <Stat t={t} label="Rent YTD" value="142K" color={t.accent}/>
        <Stat t={t} label="Appreciation" value="+18%" color={t.purple}/>
      </div>
      {[{label:"Marina Heights 2BR",status:"Occupied",rent:"12,500/mo",val:"1.94M",cost:"2,400",c:t.green},{label:"JVC Studio",status:"Vacant 12d",rent:"—",val:"820K",cost:"180",c:t.red},{label:"Business Bay 1BR",status:"Renewing",rent:"9,800/mo",val:"1.45M",cost:"900",c:t.amber}].map((x,i)=>(
        <div key={i} style={{background:t.surface,borderRadius:8,padding:"4px 6px",marginBottom:3,borderLeft:`2.5px solid ${x.c}`}}>
          <div style={{display:"flex",justifyContent:"space-between"}}>
            <span style={{fontSize:6.5,fontWeight:700,color:t.text}}>{x.label}</span>
            <span style={{fontSize:5.5,color:x.c,fontWeight:700}}>{x.status}</span>
          </div>
          <div style={{display:"flex",gap:8,marginTop:1}}>
            <span style={{fontSize:5.5,color:t.textDim}}>Rent: {x.rent}</span>
            <span style={{fontSize:5.5,color:t.textDim}}>Value: {x.val}</span>
            <span style={{fontSize:5.5,color:t.textDim}}>Cost: {x.cost}</span>
          </div>
        </div>
      ))}
      <div style={{background:t.purple+"10",borderRadius:8,padding:"3px 5px"}}>
        <span style={{fontSize:5.5,color:t.purple}}>🤖 AI: JVC vacant — suggested AED 6,800/mo (-3%). Draft landlord message ready.</span>
      </div>
    </Browser>
  );
}

export function CRMLeaderboard({ t }: { t: T }) {
  return (
    <Browser t={t} url="crm/leaderboard">
      <div style={{fontSize:7.5,fontWeight:800,color:t.text,marginBottom:4}}>🏆 This Week</div>
      {[{n:"Sarah M.",xp:2840,streak:12,c:t.amber,badge:"🔥"},{n:"Omar K.",xp:2310,streak:8,c:t.accent,badge:"💀"},{n:"Ali R.",xp:1890,streak:3,c:t.textSec,badge:"⚡"}].map((x,i)=>(
        <div key={i} style={{display:"flex",alignItems:"center",gap:4,padding:"3px 0",borderBottom:`1px solid ${t.border}22`}}>
          <span style={{fontSize:7,fontWeight:800,color:x.c,width:12}}>{i+1}.</span>
          <span style={{fontSize:7,fontWeight:700,color:t.text,flex:1}}>{x.n}</span>
          <span style={{fontSize:6.5,color:t.purple}}>{x.xp}XP</span>
          <span style={{fontSize:7}}>{x.badge}×{x.streak}</span>
        </div>
      ))}
      <div style={{background:t.amber+"12",borderRadius:8,padding:4,marginTop:4}}>
        <div style={{fontSize:6,color:t.amber,fontWeight:600}}>📌 Daily: Follow up 5 leads → +200XP</div>
      </div>
    </Browser>
  );
}
