"use client";

import React from "react";
import { T } from "@/lib/themes";
import { Phone, WaM, Browser, Notifs } from "./MockupShells";
import { Bar, Stat, ScoreCircle } from "@/components/ui/primitives";

export function PriceMonitor({ t }: { t: T }) {
  return (
    <Browser t={t} url="admin/competitor-scan">
      <div style={{display:"flex",gap:3,marginBottom:4}}>
        <Stat t={t} label="Drops" value="12" color={t.red}/>
        <Stat t={t} label="New" value="5" color={t.green}/>
        <Stat t={t} label="Underpriced" value="3" color={t.amber}/>
      </div>
      {[{s:"Bayut",n:"Marina 2BR -8%",c:t.red,time:"2h"},{s:"PF",n:"JVC 1BR new",c:t.green,time:"4h"},{s:"Dubizzle",n:"Arjan -120K",c:t.amber,time:"6h"}].map((x,i)=>(
        <div key={i} style={{display:"flex",justifyContent:"space-between",alignItems:"center",padding:"2.5px 0",borderBottom:`1px solid ${t.border}22`}}>
          <div>
            <span style={{fontSize:6,fontWeight:700,color:x.c}}>{x.s}</span>
            <span style={{fontSize:6.5,color:t.textSec,marginLeft:4}}>{x.n}</span>
          </div>
          <span style={{fontSize:5.5,color:t.textDim}}>{x.time} ago</span>
        </div>
      ))}
    </Browser>
  );
}

export function MorningBrief({ t }: { t: T }) {
  return (
    <Phone t={t} title="Binayah AI ☀️">
      <WaM out text={"☀️ Apr 18 — Morning Brief\n\n📊 DLD: 47 txns, Marina +3%\n💰 Avg: 2.1M AED · +$4M pipeline\n\n🔔 12 hot leads to call\n⚠ 3 silent 48h+ (follow-up ready)\n\n🏆 Sarah: 3 viewings booked\n📈 SEO: +12% organic this week"} time="7:00"/>
    </Phone>
  );
}

export function MarketReports({ t }: { t: T }) {
  return (
    <Browser t={t} url="reports/apr-2026">
      <div style={{display:"flex",gap:3,marginBottom:4}}>
        <Stat t={t} label="Txns" value="847" color={t.accent}/>
        <Stat t={t} label="Avg" value="1.8M" color={t.green}/>
        <Stat t={t} label="Growth" value="+2.8%" color={t.green}/>
      </div>
      <Bar t={t} label="Marina" value={82} color={t.accent}/>
      <Bar t={t} label="JVC" value={94} color={t.green}/>
      <Bar t={t} label="Downtown" value={71} color={t.amber}/>
      <div style={{background:t.surface,borderRadius:4,padding:"3px 5px",marginTop:3}}>
        <span style={{fontSize:5.5,color:t.textDim}}>📥 Lead magnet: 234 downloads this week</span>
      </div>
    </Browser>
  );
}

export function DevReports({ t }: { t: T }) {
  return (
    <Browser t={t} url="reports/developers">
      <div style={{display:"flex",gap:4,marginBottom:5}}>
        <ScoreCircle value={87} color={t.green} size={40}/>
        <div>
          <div style={{fontSize:8,fontWeight:800,color:t.text}}>Emaar</div>
          <div style={{fontSize:6,color:t.green,fontWeight:600}}>Top Tier</div>
        </div>
        <div style={{marginLeft:"auto"}}>
          <ScoreCircle value={61} color={t.amber} size={40}/>
          <div style={{fontSize:6,color:t.amber,textAlign:"center"}}>Azizi</div>
        </div>
      </div>
      <Bar t={t} label="On-time" value={87} color={t.green}/>
      <Bar t={t} label="Appreciation" value={78} color={t.accent}/>
      <Bar t={t} label="Resale speed" value={64} color={t.amber}/>
    </Browser>
  );
}

export function OffPlanEval({ t }: { t: T }) {
  return (
    <Browser t={t} url="evaluate/creek-vista-t3">
      <div style={{display:"flex",alignItems:"center",gap:6,marginBottom:5}}>
        <ScoreCircle value={82} color={t.green} size={44}/>
        <div>
          <div style={{fontSize:8,fontWeight:800,color:t.text}}>Creek Vista T3</div>
          <div style={{fontSize:7,color:t.green,fontWeight:700}}>STRONG BUY</div>
          <div style={{fontSize:5.5,color:t.textDim}}>Emaar · Q4 2027</div>
        </div>
      </div>
      <Bar t={t} label="Developer" value={87} color={t.green}/>
      <Bar t={t} label="ROI proj." value={71} color={t.amber}/>
      <Bar t={t} label="Location" value={84} color={t.accent}/>
      <Bar t={t} label="Risk" value={18} color={t.green}/>
    </Browser>
  );
}

export function ViralAgent({ t }: { t: T }) {
  return (
    <Browser t={t} url="admin/viral-agent">
      <div style={{background:t.amber+"15",borderRadius:6,padding:"4px 6px",marginBottom:4,display:"flex",gap:4,alignItems:"center"}}>
        <span style={{fontSize:10}}>🔥</span>
        <div>
          <div style={{fontSize:6.5,fontWeight:700,color:t.amber}}>Trending: Golden visa 2026 changes</div>
          <div style={{fontSize:5.5,color:t.textDim}}>LinkedIn · Reddit · Google · ×3 spike</div>
        </div>
      </div>
      {[["📝","Blog","8 langs · SEO","✓ ready"],["📱","Social","LI+IG+X","✓ ready"],["📧","Email","4 segments","✓ ready"],["💬","WA blast","Broadcast","✓ ready"]].map((x,i)=>(
        <div key={i} style={{display:"flex",alignItems:"center",gap:4,padding:"1.5px 0",borderBottom:`1px solid ${t.border}11`}}>
          <span style={{fontSize:8}}>{x[0]}</span>
          <span style={{fontSize:6.5,color:t.text,flex:1,fontWeight:600}}>{x[1]}</span>
          <span style={{fontSize:5.5,color:t.textDim}}>{x[2]}</span>
          <span style={{fontSize:6,color:t.green,fontWeight:700}}>{x[3]}</span>
        </div>
      ))}
      <div style={{fontSize:6,color:t.amber,marginTop:3,fontWeight:600}}>⏳ Anna reviewing — publish in 15min</div>
    </Browser>
  );
}

export function VideoAgent({ t }: { t: T }) {
  return (
    <Browser t={t} url="video/creek-vista-t3">
      <div style={{background:t.surface,borderRadius:8,padding:"8px 6px",textAlign:"center",marginBottom:4}}>
        <div style={{fontSize:18,marginBottom:2}}>▶</div>
        <div style={{fontSize:7.5,fontWeight:700,color:t.text}}>Creek Vista T3 Walkthrough</div>
        <div style={{fontSize:6,color:t.textDim}}>AI script + voiceover · 90s</div>
        <div style={{height:3,background:t.border,borderRadius:2,marginTop:4}}><div style={{width:"62%",height:"100%",background:t.accent,borderRadius:2}}/></div>
      </div>
      <div style={{display:"flex",gap:2,justifyContent:"center"}}>
        {["🇬🇧 EN","🇷🇺 RU","🇨🇳 ZH","🇹🇷 TR","🇮🇳 HI","🇩🇪 DE"].map(x=>(
          <span key={x} style={{fontSize:5.5,background:t.surface,padding:"1px 3px",borderRadius:3,color:t.cyan||t.accent}}>{x}</span>
        ))}
      </div>
    </Browser>
  );
}

export function SignalDetection({ t }: { t: T }) {
  return (
    <Notifs t={t} items={[{t:"🚨 Microsoft HQ → Dubai",body:"10K+ exec relocations · target CFOs, CTOs, VPs",time:"2h ago",c:t.red,action:"→ Launch exec campaign"},{t:"📉 Ruble -6.2% today",body:"CIS buyers lose buying power — shift spend to AED",time:"4h ago",c:t.amber,action:"→ Hedge angle newsletter"},{t:"✈ New Istanbul–DXB route",body:"Flydubai daily from Jan 2026 · Turkish demand incoming",time:"1d ago",c:t.accent,action:"→ Turkish landing page"}]}/>
  );
}

export function ROICalculator({ t }: { t: T }) {
  return (
    <Browser t={t} url="tools/roi-calculator">
      <div style={{background:t.surface,borderRadius:6,padding:"5px 7px",marginBottom:4}}>
        <div style={{fontSize:6,color:t.textDim,marginBottom:1}}>Marina 2BR — if you bought in 2019</div>
        <div style={{fontSize:15,fontWeight:900,color:t.green}}>1.95M <span style={{fontSize:9}}>(+62%)</span></div>
        <div style={{fontSize:6,color:t.accent}}>+380K rental income · net yield 7.1%</div>
      </div>
      <div style={{background:t.accent+"12",borderRadius:5,padding:"4px 6px"}}>
        <div style={{fontSize:6,fontWeight:600,color:t.accent}}>📌 Similar opportunity today: Creek Vista T3 · 1.3M</div>
      </div>
    </Browser>
  );
}

export function CryptoBuyerPage({ t }: { t: T }) {
  return (
    <Browser t={t} url="binayah.com/buy-with-crypto">
      <div style={{marginBottom:4}}>
        <div style={{fontSize:8,fontWeight:800,color:t.text}}>Buy Dubai Property with Crypto</div>
        <div style={{display:"flex",gap:2,marginTop:3,flexWrap:"wrap"}}>
          {[{s:"₿ BTC",c:"#f7931a"},{s:"Ξ ETH",c:"#627eea"},{s:"◎ USDT",c:"#26a17b"},{s:"◉ USDC",c:"#2775ca"}].map(x=>(
            <span key={x.s} style={{fontSize:6,background:x.c+"18",color:x.c,border:`1px solid ${x.c}33`,padding:"1px 5px",borderRadius:4,fontWeight:700}}>{x.s}</span>
          ))}
        </div>
      </div>
      {[{n:"RERA verify",s:"Check developer"},{n:"Escrow open",s:"DLD supervised"},{n:"Crypto transfer",s:"1-3 business days"},{n:"Title deed",s:"Your name ✓"}].map((x,i)=>(
        <div key={i} style={{display:"flex",alignItems:"center",gap:5,padding:"2px 0"}}>
          <div style={{width:14,height:14,borderRadius:"50%",background:t.accent+"22",display:"flex",alignItems:"center",justifyContent:"center",fontSize:6,color:t.accent,fontWeight:800,flexShrink:0}}>{i+1}</div>
          <div>
            <span style={{fontSize:6.5,color:t.text,fontWeight:600}}>{x.n}</span>
            <span style={{fontSize:5.5,color:t.textDim,marginLeft:4}}>{x.s}</span>
          </div>
        </div>
      ))}
    </Browser>
  );
}

export function AreaGuides({ t }: { t: T }) {
  return (
    <Browser t={t} url="binayah.com/areas/downtown">
      <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:4}}>
        <div>
          <div style={{fontSize:8,fontWeight:800,color:t.text}}>Downtown Dubai</div>
          <div style={{fontSize:5.5,color:t.textDim}}>Burj Khalifa District</div>
        </div>
        <div style={{textAlign:"right"}}>
          <div style={{fontSize:12,fontWeight:900,color:t.accent}}>78</div>
          <div style={{fontSize:5,color:t.textDim}}>ROI score</div>
        </div>
      </div>
      <Bar t={t} label="Lifestyle" value={94} color={t.accent}/>
      <Bar t={t} label="ROI" value={74} color={t.green}/>
      <Bar t={t} label="Schools" value={58} color={t.amber}/>
      <div style={{background:t.surface,borderRadius:4,padding:"3px 5px",marginTop:3}}>
        <span style={{fontSize:5.5,color:t.textDim}}>Avg 3BR: 4.2M · 6.1% yield · ⚠ High service charge</span>
      </div>
    </Browser>
  );
}

export function MarketDashboard({ t }: { t: T }) {
  return (
    <Browser t={t} url="binayah.com/market">
      <div style={{display:"flex",gap:3,marginBottom:5}}>
        <Stat t={t} label="Txns" value="1,247" color={t.accent}/>
        <Stat t={t} label="Sqft" value="1,840" color={t.green}/>
        <Stat t={t} label="MoM" value="+2.8%" color={t.green}/>
        <Stat t={t} label="YoY" value="+14%" color={t.purple}/>
      </div>
      <Bar t={t} label="Marina" value={87} color={t.accent}/>
      <Bar t={t} label="Downtown" value={74} color={t.purple}/>
      <Bar t={t} label="JVC" value={68} color={t.green}/>
      <Bar t={t} label="Biz Bay" value={61} color={t.amber}/>
      <div style={{fontSize:5.5,color:t.textDim,marginTop:3}}>🤖 AI: Marina +9% projected next 12mo</div>
    </Browser>
  );
}

export function SocialAgent({ t }: { t: T }) {
  return (
    <Browser t={t} url="reddit.com/r/dubai">
      <div style={{background:t.surface,borderRadius:6,padding:"5px 6px",marginBottom:3}}>
        <div style={{fontSize:6.5,fontWeight:700,color:t.text}}>Worth buying Dubai vs London right now?</div>
        <div style={{fontSize:5.5,color:t.textDim}}>r/dubai · 127 upvotes · 43 comments</div>
      </div>
      <div style={{borderLeft:`2.5px solid ${t.accent}`,paddingLeft:6}}>
        <div style={{display:"flex",gap:3,alignItems:"center",marginBottom:2}}>
          <div style={{width:14,height:14,borderRadius:"50%",background:t.accent+"22",border:`1px solid ${t.accent}44`,display:"flex",alignItems:"center",justifyContent:"center",fontSize:7}}>B</div>
          <span style={{fontSize:6,fontWeight:700,color:t.accent}}>Binayah_AI · 🔺 89</span>
        </div>
        <div style={{fontSize:6,color:t.textSec,lineHeight:1.4}}>Dubai: 7.1% yield, 0% tax, Golden Visa path. DLD data shows Marina +14% YoY. London: 3.2%, 28% CGT. Different risk profile but Dubai ROI is hard to beat right now.</div>
      </div>
    </Browser>
  );
}

export function Newsletter({ t }: { t: T }) {
  return (
    <Browser t={t} url="newsletter.binayah.com">
      <div style={{display:"flex",gap:3,marginBottom:4}}>
        <Stat t={t} label="Subscribers" value="2.4K" color={t.accent}/>
        <Stat t={t} label="Open rate" value="48%" color={t.green}/>
        <Stat t={t} label="Fwd rate" value="12%" color={t.amber}/>
      </div>
      <div style={{background:t.surface,borderRadius:5,padding:"5px 6px"}}>
        <div style={{fontSize:6.5,fontWeight:700,color:t.text,marginBottom:2}}>This week&apos;s issue:</div>
        <div style={{fontSize:6,color:t.textSec,lineHeight:1.4}}>&quot;The one thing nobody tells you about off-plan ROI (and why developers hate us for saying it)&quot;</div>
        <div style={{fontSize:5.5,color:t.textDim,marginTop:2}}>1 insight · 1 data point · 1 honest take</div>
      </div>
    </Browser>
  );
}
