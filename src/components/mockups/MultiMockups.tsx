"use client";

import React from "react";
import { T } from "@/lib/themes";
import { Browser } from "./MockupShells";
import { Stat, Bar } from "@/components/ui/primitives";

export function MultilingualDirs({ t }: { t: T }) {
  return (
    <Browser t={t} url="binayah.com/tr">
      <div style={{background:t.surface,borderRadius:6,padding:6,marginBottom:4}}>
        <div style={{fontSize:8.5,fontWeight:800,color:t.text}}>🏠 Binayah Dubai</div>
        <div style={{fontSize:6,color:t.textMuted}}>Dubai&apos;da en iyi gayrimenkuller</div>
        <div style={{display:"flex",gap:4,marginTop:3}}>
          <span style={{fontSize:6,color:t.amber,fontWeight:700}}>📅 Taksit planı</span>
          <span style={{fontSize:6,color:t.green}}>✈ İstanbul direk uçuş</span>
        </div>
      </div>
      <div style={{display:"flex",gap:2,flexWrap:"wrap"}}>
        {[{f:"🇷🇺",c:"/ru"},{f:"🇮🇳",c:"/hi"},{f:"🇹🇷",c:"/tr",active:true},{f:"🇨🇳",c:"/cn"},{f:"🇮🇷",c:"/fa"},{f:"🇫🇷",c:"/fr"},{f:"🇩🇪",c:"/de"},{f:"🇰🇿",c:"/kz"}].map(x=>(
          <span key={x.c} style={{fontSize:6,background:(x as {active?:boolean}).active?t.amber+"22":t.surface,padding:"1px 4px",borderRadius:3,color:(x as {active?:boolean}).active?t.amber:t.textMuted,border:(x as {active?:boolean}).active?`1px solid ${t.amber}44`:"none"}}>{x.f}{x.c}</span>
        ))}
      </div>
    </Browser>
  );
}

export function RegionalSEO({ t }: { t: T }) {
  return (
    <Browser t={t} url="yandex.ru / baidu.com">
      <div style={{marginBottom:4}}>
        {[{d:"binayah.ru",e:"Yandex",r:"#4",c:t.accent,note:"↑2 this week"},{d:"binayah.kz",e:"Yandex KZ",r:"#7",c:t.green,note:"New"},{d:"binayah.cn",e:"Baidu",r:"ICP pending",c:t.amber,note:"In review"},{d:"WeChat OA",e:"WeChat",r:"2.1K fans",c:t.purple,note:"Live"}].map((x,i)=>(
          <div key={i} style={{display:"flex",justifyContent:"space-between",alignItems:"center",padding:"2.5px 0",borderBottom:`1px solid ${t.border}22`}}>
            <div>
              <span style={{fontSize:6.5,fontWeight:700,color:x.c}}>{x.d}</span>
              <span style={{fontSize:5.5,color:t.textDim,marginLeft:4}}>{x.e}</span>
            </div>
            <div style={{textAlign:"right"}}>
              <span style={{fontSize:6,color:x.c,fontWeight:700}}>{x.r}</span>
              <span style={{fontSize:5,color:t.textDim,display:"block"}}>{x.note}</span>
            </div>
          </div>
        ))}
      </div>
    </Browser>
  );
}

export function DataCollection({ t }: { t: T }) {
  return (
    <Browser t={t} url="admin/visitor-intel">
      <div style={{display:"flex",gap:3,marginBottom:4}}>
        <Stat t={t} label="Sessions" value="4.2K" color={t.accent}/>
        <Stat t={t} label="Countries" value="34" color={t.green}/>
        <Stat t={t} label="Avg time" value="4:12" color={t.amber}/>
      </div>
      {[{flag:"🇷🇺",n:"Russia",avg:"$820K",intent:"Invest",pct:34,c:t.accent},{flag:"🇮🇳",n:"India",avg:"$310K",intent:"EOI",pct:28,c:t.green},{flag:"🇹🇷",n:"Turkey",avg:"$540K",intent:"Reloc",pct:18,c:t.amber}].map((x,i)=>(
        <div key={i} style={{display:"flex",alignItems:"center",gap:4,padding:"2px 0"}}>
          <span style={{fontSize:8}}>{x.flag}</span>
          <span style={{fontSize:6,color:t.textSec,flex:1}}>{x.n} · {x.avg} · {x.intent}</span>
          <div style={{width:40,height:3,background:t.border,borderRadius:2}}>
            <div style={{width:`${x.pct}%`,height:"100%",background:x.c,borderRadius:2}}/>
          </div>
        </div>
      ))}
    </Browser>
  );
}

export function DynamicHomepage({ t }: { t: T }) {
  return (
    <div style={{display:"flex",gap:3}}>
      {[{f:"🇷🇺",l:"Russian",a:"Marina · RUB",cta:"Golden Visa →",c:t.accent},{f:"🇮🇳",l:"Indian",a:"JVC · INR",cta:"EMI Calc →",c:t.green},{f:"🇹🇷",l:"Turkish",a:"Business Bay · TRY",cta:"Taksit →",c:t.amber}].map(v=>(
        <div key={v.l} style={{flex:1,background:t.surface,borderRadius:6,padding:"5px 4px",textAlign:"center"}}>
          <span style={{fontSize:13}}>{v.f}</span>
          <div style={{fontSize:6,fontWeight:700,color:v.c,marginTop:2}}>{v.l}</div>
          <div style={{fontSize:5.5,color:t.textSec,marginTop:1}}>{v.a}</div>
          <div style={{fontSize:5,color:v.c,marginTop:3,fontWeight:600}}>{v.cta}</div>
        </div>
      ))}
    </div>
  );
}

export function Newsletters({ t }: { t: T }) {
  return (
    <Browser t={t} url="admin/push-newsletters">
      {[{f:"🇷🇺",s:"Ruble -4% hedge angle",o:"38%",sent:"4.2K"},{f:"🇮🇳",s:"JVC under 400K — NRI guide",o:"42%",sent:"3.1K"},{f:"🇹🇷",s:"0% ödeme planı öne çıkar",o:"31%",sent:"1.8K"}].map((x,i)=>(
        <div key={i} style={{background:t.surface,borderRadius:5,padding:"4px 6px",marginBottom:3}}>
          <div style={{display:"flex",justifyContent:"space-between"}}>
            <span style={{fontSize:6.5,color:t.textSec}}>{x.f} {x.s}</span>
          </div>
          <div style={{display:"flex",gap:6,marginTop:1}}>
            <span style={{fontSize:5.5,color:t.green}}>↗ {x.o} open</span>
            <span style={{fontSize:5.5,color:t.textDim}}>{x.sent} sent</span>
          </div>
        </div>
      ))}
    </Browser>
  );
}

export function GeoCampaigns({ t }: { t: T }) {
  return (
    <Browser t={t} url="admin/geo-campaigns">
      {[{flag:"🇹🇷",title:"Turkey surge +47%",status:"Pending approval",budget:"$200/d",c:t.red},{flag:"🇷🇺",title:"Russia bounce -12%",status:"Paused",budget:"—",c:t.amber},{flag:"🇮🇳",title:"India steady +8%",status:"Running",budget:"$80/d",c:t.green}].map((x,i)=>(
        <div key={i} style={{background:t.surface,borderRadius:5,padding:"4px 6px",marginBottom:3,borderLeft:`2.5px solid ${x.c}`}}>
          <div style={{display:"flex",justifyContent:"space-between",alignItems:"center"}}>
            <span style={{fontSize:7}}>{x.flag} <span style={{fontSize:6.5,fontWeight:600,color:t.text}}>{x.title}</span></span>
            <span style={{fontSize:6,color:x.c,fontWeight:700}}>{x.budget}</span>
          </div>
          <div style={{fontSize:5.5,color:x.c,marginTop:1,fontWeight:600}}>{x.status}</div>
        </div>
      ))}
    </Browser>
  );
}
