// Customer app screens — composes design-system primitives from window.SpiceRouteDesignSystem_65036e
const TWEAK_DEFAULTS = /*EDITMODE-BEGIN*/{
  "combosFirst": true,
  "showPhotos": true,
  "showDesc": true
}/*EDITMODE-END*/;
const DS = window.SpiceRouteDesignSystem_65036e || new Proxy({},{get:()=>(()=>null)}); // fallback if bundle not compiled yet
const {Button,IconButton,Input,Select,Badge,Tag,Tabs,Card,Toast,Radio,LanguagePicker} = DS;
const P = {gutter:16};
const money = v=>'\u20B9'+v;

function AppBar({title,onBack,right}){
  return <div style={{display:'flex',alignItems:'center',gap:8,padding:'10px 12px',position:'sticky',top:0,zIndex:20,background:'rgba(255,248,240,.92)',backdropFilter:'blur(8px)'}}>
    {onBack&&<IconButton label="Back" onClick={onBack}>{Icons.back(20)}</IconButton>}
    <h2 style={{fontFamily:'var(--font-display)',fontWeight:700,fontSize:18,flex:1,margin:0}}>{title}</h2>
    {right}
  </div>;
}
function VegDot({veg}){return <span style={{width:14,height:14,borderRadius:4,border:'1.5px solid '+(veg?'var(--mint-600)':'var(--chili-600)'),display:'inline-flex',alignItems:'center',justifyContent:'center',flexShrink:0}}><span style={{width:6,height:6,borderRadius:'50%',background:veg?'var(--mint-600)':'var(--chili-600)'}}></span></span>;}

function HomeScreen({t,go,cartCount}){
  const [cat,setCat]=React.useState(null);
  const list=KITCHENS.filter(k=>!cat||k.cuisine===cat);
  return <div>
    <div style={{padding:'14px 16px 0',display:'flex',alignItems:'flex-start',justifyContent:'space-between'}}>
      <div><h1 style={{fontFamily:'var(--font-display)',fontWeight:800,fontSize:26,margin:0}}>{t.greet}</h1>
      <div style={{font:'600 13px var(--font-body)',color:'var(--text-muted)',display:'flex',alignItems:'center',gap:4,marginTop:2}}>{Icons.pin(14)} T. Nagar, Chennai</div></div>
      <IconButton label={t.cart} variant="tonal" onClick={()=>go('cart')} style={{position:'relative'}}>{Icons.cart(20)}{cartCount>0&&<span style={{position:'absolute',top:-2,right:-2,background:'var(--action-primary)',color:'#fff',borderRadius:999,minWidth:18,height:18,font:'800 11px var(--font-body)',display:'flex',alignItems:'center',justifyContent:'center',padding:'0 4px'}}>{cartCount}</span>}</IconButton>
    </div>
    <div style={{padding:'12px 16px 4px'}}><Input placeholder={t.search} icon={Icons.search(18)}/></div>
    <div style={{background:'var(--surface-accent-soft)',margin:'10px 16px',borderRadius:'var(--radius-md)',padding:'10px 14px',font:'700 13px var(--font-body)',color:'var(--turmeric-600)',display:'flex',alignItems:'center',gap:8}}>{Icons.clock(16)} {t.save20}</div>
    <div style={{padding:'6px 0 2px 16px'}}>
      <div style={{font:'700 13px var(--font-body)',color:'var(--text-muted)',marginBottom:8}}>{t.cats}</div>
      <div style={{display:'flex',gap:8,overflowX:'auto',paddingRight:16,paddingBottom:4}}>
        {CATEGORIES.map(c=><Tag key={c} selected={cat===c} onClick={()=>setCat(cat===c?null:c)} style={{whiteSpace:'nowrap',flexShrink:0}}>{c}</Tag>)}
      </div>
    </div>
    <div style={{padding:'10px 16px 16px',display:'flex',flexDirection:'column',gap:14}}>
      <div style={{font:'700 13px var(--font-body)',color:'var(--text-muted)'}}>{t.featured}</div>
      {list.map(k=><Card key={k.slug} image={k.grad} imageHeight={120} onClick={()=>go('kitchen',k.slug)}>
        <div style={{display:'flex',justifyContent:'space-between',alignItems:'center'}}>
          <h3 style={{fontFamily:'var(--font-display)',fontWeight:700,fontSize:17,margin:0}}>{k.name}</h3>
          {k.featured&&<Badge tone="accent">Featured</Badge>}
        </div>
        <div style={{font:'600 13px var(--font-body)',color:'var(--text-muted)',marginTop:4,display:'flex',alignItems:'center',gap:6}}>{k.cuisine} · {k.dist} · {Icons.star(13)} {k.rating}</div>
      </Card>)}
    </div>
  </div>;
}

function KitchenScreen({t,slug,go,cart,addItem,tw}){
  const k=KITCHENS.find(x=>x.slug===slug);
  const tabOrder=tw.combosFirst?['Combos','Meals']:['Meals','Combos'];
  const [tab,setTab]=React.useState(tabOrder[0]);
  const items=tab==='Meals'?k.menu:k.combos;
  const count=Object.values(cart).reduce((a,b)=>a+b,0);
  return <div style={{paddingBottom:count?80:16}}>
    <div style={{height:170,background:k.grad,position:'relative'}}>
      <div style={{position:'absolute',top:10,left:12}}><IconButton label="Back" onClick={()=>go('home')} style={{background:'rgba(255,252,248,.9)'}}>{Icons.back(20)}</IconButton></div>
      <div style={{position:'absolute',inset:'auto 0 0 0',padding:'40px 16px 14px',background:'linear-gradient(transparent,rgba(43,29,18,.75))'}}>
        <h1 style={{fontFamily:'var(--font-display)',fontWeight:800,fontSize:24,color:'#fff',margin:0}}>{k.name}</h1>
        <div style={{font:'600 13px var(--font-body)',color:'rgba(255,248,240,.9)',display:'flex',gap:6,alignItems:'center'}}>{k.cuisine} · {k.dist} · {Icons.star(13)} {k.rating}</div>
      </div>
    </div>
    <div style={{padding:'14px 16px'}}>
      <Tabs tabs={tabOrder} active={tab} onChange={setTab}/>
      <div onClick={()=>go('bulk')} style={{background:'var(--surface-card)',border:'1.5px solid var(--border-subtle)',marginTop:10,borderRadius:'var(--radius-md)',padding:'10px 14px',font:'700 13px var(--font-body)',color:'var(--text-brand)',display:'flex',alignItems:'center',gap:8,cursor:'pointer'}}>{Icons.users(16)} Feeding a crowd? Request a bulk quote {Icons.chev(16)}</div>
      <div style={{display:'flex',flexDirection:'column',gap:10,marginTop:14}}>
        {items.length===0&&<div style={{font:'600 14px var(--font-body)',color:'var(--text-muted)',textAlign:'center',padding:24}}>No combos yet — the chef is still stirring ideas.</div>}
        {items.map(m=><div key={m.id} style={{background:'var(--surface-card)',borderRadius:'var(--radius-lg)',boxShadow:'var(--shadow-card)',padding:12,display:'flex',alignItems:'center',gap:12}}>
          {tw.showPhotos&&<div style={{width:60,height:60,borderRadius:12,background:m.thumb,flexShrink:0}}></div>}
          <div style={{flex:1,minWidth:0}}>
            <div style={{display:'flex',alignItems:'center',gap:6}}><VegDot veg={m.veg}/><span style={{font:'700 15px var(--font-body)'}}>{m.name}</span></div>
            {tw.showDesc&&m.desc&&<div style={{font:'600 12px var(--font-body)',color:'var(--text-muted)',marginTop:2}}>{m.desc}</div>}
            <div style={{font:'600 13px var(--font-body)',marginTop:3}}><span style={{color:'var(--text-brand)',fontWeight:800}}>{money(m.price)}</span> <span style={{color:'var(--text-faint)',textDecoration:'line-through'}}>{money(m.old)}</span></div>
          </div>
          {cart[m.id]?<div style={{display:'flex',alignItems:'center',gap:10,background:'var(--surface-brand-soft)',borderRadius:999,padding:4}}>
            <IconButton label="Less" size={30} onClick={()=>addItem(m.id,-1)}>{Icons.minus(16)}</IconButton>
            <span style={{font:'800 14px var(--font-body)',color:'var(--text-brand)'}}>{cart[m.id]}</span>
            <IconButton label="More" size={30} onClick={()=>addItem(m.id,1)}>{Icons.plus(16)}</IconButton>
          </div>:<Button size="sm" variant="secondary" onClick={()=>addItem(m.id,1)}>{t.addToCart}</Button>}
        </div>)}
      </div>
    </div>
    {count>0&&<div style={{position:'absolute',bottom:70,left:16,right:16}}><Button style={{width:'100%',justifyContent:'center'}} onClick={()=>go('cart')}>{t.viewCart} · {count}</Button></div>}
  </div>;
}

function CartScreen({t,go,cart,addItem,onPlace}){
  const all=KITCHENS.flatMap(k=>[...k.menu,...k.combos]);
  const rows=Object.entries(cart).filter(([,q])=>q>0).map(([id,q])=>({...all.find(m=>m.id===id),q}));
  const total=rows.reduce((a,r)=>a+r.price*r.q,0),saved=rows.reduce((a,r)=>a+(r.old-r.price)*r.q,0);
  const [slot,setSlot]=React.useState(null);
  const qty=rows.reduce((a,r)=>a+r.q,0);
  return <div>
    <AppBar title={t.cart} onBack={()=>go('home')}/>
    {rows.length===0?<div style={{textAlign:'center',padding:'60px 32px'}}>
      <div style={{fontSize:44}}>🍛</div>
      <div style={{fontFamily:'var(--font-display)',fontWeight:700,fontSize:18,marginTop:10}}>{t.emptyCart}</div>
      <Button style={{marginTop:18}} onClick={()=>go('home')}>{t.home}</Button>
    </div>:<div style={{padding:'4px 16px 16px',display:'flex',flexDirection:'column',gap:10}}>
      {rows.map(r=><div key={r.id} style={{background:'var(--surface-card)',borderRadius:'var(--radius-lg)',boxShadow:'var(--shadow-card)',padding:12,display:'flex',alignItems:'center',gap:12}}>
        {r.thumb?<div style={{width:48,height:48,borderRadius:10,background:r.thumb,flexShrink:0}}></div>:<VegDot veg={r.veg}/>}
        <div style={{flex:1}}><div style={{display:'flex',alignItems:'center',gap:6}}><VegDot veg={r.veg}/><span style={{font:'700 15px var(--font-body)'}}>{r.name}</span></div>
        <div style={{font:'800 13px var(--font-body)',color:'var(--text-brand)'}}>{money(r.price)}</div></div>
        <div style={{display:'flex',alignItems:'center',gap:10,background:'var(--surface-brand-soft)',borderRadius:999,padding:4}}>
          <IconButton label="Less" size={30} onClick={()=>addItem(r.id,-1)}>{Icons.minus(16)}</IconButton>
          <span style={{font:'800 14px var(--font-body)',color:'var(--text-brand)'}}>{r.q}</span>
          <IconButton label="More" size={30} onClick={()=>addItem(r.id,1)}>{Icons.plus(16)}</IconButton>
        </div>
      </div>)}
      <div style={{background:'var(--status-success-bg)',borderRadius:'var(--radius-md)',padding:'10px 14px',font:'700 13px var(--font-body)',color:'var(--status-success)'}}>You saved {money(saved)} by pre-ordering 🌶️</div>
      <div>
        <div style={{font:'700 13px var(--font-body)',margin:'4px 0 8px'}}>Pickup slot</div>
        <div style={{display:'flex',gap:8,flexWrap:'wrap'}}>
          {SLOTS.map(s=>{const left=s.cap-s.used,full=left<qty;return <button key={s.code} disabled={full} onClick={()=>setSlot(s.code)}
            style={{borderRadius:12,padding:'8px 12px',font:'700 13px var(--font-body)',cursor:full?'default':'pointer',border:slot===s.code?'2px solid var(--paprika-600)':'1.5px solid var(--border-subtle)',background:full?'var(--cream-200)':slot===s.code?'var(--surface-brand-soft)':'var(--surface-card)',color:full?'var(--text-faint)':slot===s.code?'var(--text-brand)':'var(--text-body)',textAlign:'left'}}>
            {s.t}<span style={{display:'block',font:'600 11px var(--font-body)',color:full?'var(--text-faint)':left<=3?'var(--status-warn)':'var(--text-muted)'}}>{full?'Full':left+' left'}</span>
          </button>})}
        </div>
        {!slot&&<div style={{font:'600 12px var(--font-body)',color:'var(--text-muted)',marginTop:6}}>Pick a slot to place your order — caps keep the kitchen calm.</div>}
      </div>
      <div style={{display:'flex',justifyContent:'space-between',font:'800 17px var(--font-body)',padding:'6px 2px'}}><span>Total</span><span>{money(total)}</span></div>
      <Button style={{width:'100%',justifyContent:'center',opacity:slot?1:.45}} disabled={!slot} onClick={()=>slot&&onPlace(SLOTS.find(s=>s.code===slot))}>{t.placeOrder} · {money(total)}</Button>
    </div>}
  </div>;
}

function OrdersScreen({t,go,placed}){
  const orders=[...(placed?[{code:'SR-7194',slotCode:placed.slotCode,slotTime:placed.slotTime,kitchen:'Anita\u2019s Kitchen',status:'Preparing',items:placed.count,when:'Today · pickup '+placed.slotTime}]:[]),
    {code:'SR-7102',slotCode:'545-09',slotTime:'5:45 pm',kitchen:'Gurpreet\u2019s Rasoi',status:'Completed',items:2,when:'Tue 14 Jul'}];
  const [open,setOpen]=React.useState(placed?'SR-7194':null);
  const o=orders.find(x=>x.code===open);
  if(o)return <div>
    <AppBar title={'Order '+o.code} onBack={()=>setOpen(null)}/>
    <div style={{padding:16,display:'flex',flexDirection:'column',gap:14,alignItems:'center'}}>
      <Badge tone={o.status==='Completed'?'neutral':'success'}>{o.status}</Badge>
      <div style={{background:'var(--cocoa-900)',borderRadius:'var(--radius-lg)',padding:'12px 26px',textAlign:'center'}}>
        <div style={{font:'700 11px var(--font-body)',color:'var(--cocoa-300)',letterSpacing:'.08em'}}>SLOT CODE</div>
        <div style={{fontFamily:'var(--font-display)',fontWeight:800,fontSize:34,color:'#fff',letterSpacing:'.06em'}}>{o.slotCode}</div>
        <div style={{font:'600 12px var(--font-body)',color:'var(--cocoa-300)'}}>pickup {o.slotTime}</div>
      </div>
      <div style={{background:'var(--surface-card)',borderRadius:'var(--radius-xl)',boxShadow:'var(--shadow-card)',padding:20,display:'flex',flexDirection:'column',alignItems:'center',gap:12}}>
        <QRBox code={o.slotCode}/>
        <div style={{font:'700 14px var(--font-body)'}}>{t.showQr}</div>
        <div style={{font:'800 22px var(--font-display)',letterSpacing:'.08em',color:'var(--text-brand)'}}>{o.slotCode}</div>
        <div style={{font:'600 12px var(--font-body)',color:'var(--text-muted)'}}>Scans to your slot code · ref {o.code}</div>
      </div>
      <div style={{font:'600 13px var(--font-body)',color:'var(--text-muted)'}}>{o.kitchen} · {o.items} items · {o.when}</div>
    </div>
  </div>;
  return <div>
    <AppBar title={t.yourOrders}/>
    <div style={{padding:'4px 16px',display:'flex',flexDirection:'column',gap:10}}>
      {orders.map(x=><div key={x.code} onClick={()=>setOpen(x.code)} style={{background:'var(--surface-card)',borderRadius:'var(--radius-lg)',boxShadow:'var(--shadow-card)',padding:14,display:'flex',alignItems:'center',gap:12,cursor:'pointer'}}>
        <span style={{color:'var(--text-brand)'}}>{Icons.qr(24)}</span>
        <div style={{flex:1}}><div style={{font:'700 15px var(--font-body)'}}>{x.kitchen}</div>
        <div style={{font:'600 12px var(--font-body)',color:'var(--text-muted)'}}>{x.slotCode} · {x.code} · {x.items} items · {x.when}</div></div>
        <Badge tone={x.status==='Completed'?'neutral':'success'}>{x.status}</Badge>
      </div>)}
    </div>
  </div>;
}

function WorkshopsScreen({t}){
  const [open,setOpen]=React.useState(null);
  const [sess,setSess]=React.useState(0);
  const [ppl,setPpl]=React.useState(1);
  const [pay,setPay]=React.useState('venue');
  const [booked,setBooked]=React.useState(false);
  const w=WORKSHOPS.find(x=>x.id===open);
  if(w)return <div style={{paddingBottom:16}}>
    <div style={{height:150,background:w.grad,position:'relative'}}>
      <div style={{position:'absolute',top:10,left:12}}><IconButton label="Back" onClick={()=>{setOpen(null);setBooked(false)}} style={{background:'rgba(255,252,248,.9)'}}>{Icons.back(20)}</IconButton></div>
    </div>
    <div style={{padding:16,display:'flex',flexDirection:'column',gap:14}}>
      <div><h1 style={{fontFamily:'var(--font-display)',fontWeight:800,fontSize:22,margin:0}}>{w.title}</h1>
      <div style={{font:'600 13px var(--font-body)',color:'var(--text-muted)',marginTop:2}}>{w.host} · {w.dur} · {money(w.price)}/person</div></div>
      {booked?<div style={{textAlign:'center',padding:'20px 0'}}>
        <Toast tone="success">Apron on — you're in! 👩‍🍳</Toast>
        <div style={{font:'600 13px var(--font-body)',color:'var(--text-muted)',marginTop:12}}>{w.sessions[sess]} · {ppl} {ppl>1?'people':'person'} · {pay==='venue'?'Pay at venue':'Paid online'}</div>
      </div>:<React.Fragment>
      <div><div style={{font:'700 13px var(--font-body)',marginBottom:8}}>Session</div>
        <div style={{display:'flex',gap:8,flexWrap:'wrap'}}>{w.sessions.map((s,i)=><Tag key={s} selected={sess===i} onClick={()=>setSess(i)}>{s}</Tag>)}</div></div>
      <div><div style={{font:'700 13px var(--font-body)',marginBottom:8}}>Participants</div>
        <div style={{display:'inline-flex',alignItems:'center',gap:14,background:'var(--surface-brand-soft)',borderRadius:999,padding:4}}>
          <IconButton label="Less" size={32} onClick={()=>setPpl(Math.max(1,ppl-1))}>{Icons.minus(16)}</IconButton>
          <span style={{font:'800 16px var(--font-body)',color:'var(--text-brand)'}}>{ppl}</span>
          <IconButton label="More" size={32} onClick={()=>setPpl(ppl+1)}>{Icons.plus(16)}</IconButton>
        </div></div>
      <div style={{display:'flex',flexDirection:'column',gap:10}}>
        <Radio checked={pay==='venue'} onChange={()=>setPay('venue')} label="Pay at venue" description="Cash or UPI on arrival"/>
        <Radio checked={pay==='online'} onChange={()=>setPay('online')} label="Pay online" description="UPI, card or netbanking"/>
      </div>
      <Button style={{width:'100%',justifyContent:'center'}} onClick={()=>setBooked(true)}>{t.book} · {money(w.price*ppl)}</Button>
      </React.Fragment>}
    </div>
  </div>;
  return <div>
    <AppBar title={t.workshops}/>
    <div style={{padding:'4px 16px 16px',display:'flex',flexDirection:'column',gap:14}}>
      {WORKSHOPS.map(x=><Card key={x.id} image={x.grad} imageHeight={110} onClick={()=>setOpen(x.id)}>
        <div style={{display:'flex',justifyContent:'space-between',alignItems:'center'}}>
          <h3 style={{fontFamily:'var(--font-display)',fontWeight:700,fontSize:17,margin:0}}>{x.title}</h3>
          {x.seats<=3&&<Badge tone="warn">{x.seats} seats left</Badge>}
        </div>
        <div style={{font:'600 13px var(--font-body)',color:'var(--text-muted)',marginTop:4}}>{x.host} · {x.dur} · <span style={{color:'var(--text-brand)',fontWeight:800}}>{money(x.price)}</span></div>
      </Card>)}
    </div>
  </div>;
}

function ProfileScreen({t,lang,setLang}){
  const rows=[[Icons.receipt(20),t.bookings],[Icons.bell(20),t.notif],[Icons.chef(20),t.becomePartner]];
  return <div>
    <AppBar title={t.profile}/>
    <div style={{padding:'4px 16px 16px',display:'flex',flexDirection:'column',gap:14}}>
      <div style={{display:'flex',alignItems:'center',gap:14,background:'var(--surface-card)',borderRadius:'var(--radius-lg)',boxShadow:'var(--shadow-card)',padding:16}}>
        <div style={{width:52,height:52,borderRadius:'50%',background:'var(--surface-brand-soft)',display:'flex',alignItems:'center',justifyContent:'center',color:'var(--text-brand)',fontFamily:'var(--font-display)',fontWeight:800,fontSize:20}}>P</div>
        <div><div style={{fontFamily:'var(--font-display)',fontWeight:700,fontSize:17}}>Priya S.</div>
        <div style={{font:'600 13px var(--font-body)',color:'var(--text-muted)'}}>priya@example.com</div></div>
      </div>
      <div style={{background:'var(--surface-card)',borderRadius:'var(--radius-lg)',boxShadow:'var(--shadow-card)',overflow:'hidden'}}>
        {rows.map(([ic,label],i)=><div key={label} style={{display:'flex',alignItems:'center',gap:12,padding:'14px 16px',borderTop:i?'1px solid var(--border-subtle)':'none',cursor:'pointer'}}>
          <span style={{color:'var(--text-brand)'}}>{ic}</span><span style={{font:'700 14px var(--font-body)',flex:1}}>{label}</span>{Icons.chev(18)}
        </div>)}
      </div>
      <div><div style={{font:'700 13px var(--font-body)',marginBottom:8,display:'flex',alignItems:'center',gap:6}}>{Icons.globe(16)} {t.language}</div>
        <LanguagePicker value={lang} onChange={setLang}/></div>
    </div>
  </div>;
}

function MiniCalendar({value,onChange}){
  const today=new Date();today.setHours(0,0,0,0);
  const [view,setView]=React.useState(()=>new Date(today.getFullYear(),today.getMonth(),1));
  const months=['January','February','March','April','May','June','July','August','September','October','November','December'];
  const first=new Date(view.getFullYear(),view.getMonth(),1);
  const startPad=first.getDay();
  const daysIn=new Date(view.getFullYear(),view.getMonth()+1,0).getDate();
  const cells=[...Array(startPad).fill(null),...Array.from({length:daysIn},(_,i)=>i+1)];
  const isSel=d=>value&&value.getDate()===d&&value.getMonth()===view.getMonth()&&value.getFullYear()===view.getFullYear();
  const isPast=d=>new Date(view.getFullYear(),view.getMonth(),d)<today;
  return <div style={{background:'var(--surface-card)',borderRadius:'var(--radius-lg)',boxShadow:'var(--shadow-card)',padding:14}}>
    <div style={{display:'flex',alignItems:'center',marginBottom:8}}>
      <IconButton label="Previous month" size={30} onClick={()=>setView(v=>new Date(v.getFullYear(),v.getMonth()-1,1))}>{Icons.back(16)}</IconButton>
      <div style={{flex:1,textAlign:'center',fontFamily:'var(--font-display)',fontWeight:700,fontSize:15}}>{months[view.getMonth()]} {view.getFullYear()}</div>
      <IconButton label="Next month" size={30} onClick={()=>setView(v=>new Date(v.getFullYear(),v.getMonth()+1,1))}>{Icons.chev(16)}</IconButton>
    </div>
    <div style={{display:'grid',gridTemplateColumns:'repeat(7,1fr)',gap:2,textAlign:'center'}}>
      {['S','M','T','W','T','F','S'].map((d,i)=><div key={i} style={{font:'700 11px var(--font-body)',color:'var(--text-faint)',padding:'4px 0'}}>{d}</div>)}
      {cells.map((d,i)=>d===null?<div key={'p'+i}></div>:
        <button key={d} disabled={isPast(d)} onClick={()=>onChange(new Date(view.getFullYear(),view.getMonth(),d))}
          style={{border:'none',borderRadius:10,padding:'8px 0',font:(isSel(d)?'800':'600')+' 13px var(--font-body)',cursor:isPast(d)?'default':'pointer',background:isSel(d)?'var(--action-primary)':'transparent',color:isPast(d)?'var(--text-faint)':isSel(d)?'#fff':'var(--text-body)'}}>{d}</button>)}
    </div>
  </div>;
}

function BulkScreen({t,go,slug}){
  const k=KITCHENS.find(x=>x.slug===slug)||KITCHENS[0];
  const dishes=[...k.combos,...k.menu];
  const [units,setUnits]=React.useState({});
  const [sent,setSent]=React.useState(false);
  const [date,setDate]=React.useState(null);
  const [win,setWin]=React.useState('Lunch · 12–1 pm');
  const fmtDate=d=>d?d.toLocaleDateString('en-IN',{weekday:'short',day:'numeric',month:'short'}):null;
  const totalUnits=Object.values(units).reduce((a,v)=>a+(parseInt(v)||0),0);
  return <div>
    <AppBar title={'Bulk order · '+k.name} onBack={()=>go('kitchen')}/>
    <div style={{padding:'4px 16px 16px',display:'flex',flexDirection:'column',gap:14}}>
      {sent?<div style={{textAlign:'center',padding:'40px 12px'}}>
        <Toast tone="success">{'Quote requested — '+k.name+' will call you back.'}</Toast>
        <div style={{font:'600 13px var(--font-body)',color:'var(--text-muted)',marginTop:14}}>{totalUnits} units across {Object.values(units).filter(v=>parseInt(v)>0).length} dishes · {fmtDate(date)} · {win}. Bulk orders are priced by the kitchen — they don't use pickup slots.</div>
        <Button variant="secondary" style={{marginTop:18}} onClick={()=>go('kitchen')}>Back to kitchen</Button>
      </div>:<React.Fragment>
      <div style={{background:'var(--surface-accent-soft)',borderRadius:'var(--radius-md)',padding:'10px 14px',font:'600 13px var(--font-body)',color:'var(--turmeric-600)'}}>For parties, offices & events. Write units per dish — the kitchen reviews and sends a custom quote, no instant checkout.</div>
      <div style={{display:'flex',flexDirection:'column',gap:8}}>
        {dishes.map(m=><div key={m.id} style={{background:'var(--surface-card)',borderRadius:'var(--radius-lg)',boxShadow:'var(--shadow-card)',padding:10,display:'flex',alignItems:'center',gap:10}}>
          <div style={{width:44,height:44,borderRadius:10,background:m.thumb,flexShrink:0}}></div>
          <div style={{flex:1,minWidth:0}}><div style={{font:'700 14px var(--font-body)'}}>{m.name}</div>
          <div style={{font:'600 12px var(--font-body)',color:'var(--text-muted)'}}>{money(m.price)} retail · bulk price on quote</div></div>
          <input type="number" min="0" placeholder="0" value={units[m.id]||''} onChange={e=>setUnits(u=>({...u,[m.id]:e.target.value}))}
            style={{width:64,border:'1.5px solid var(--border-subtle)',borderRadius:10,padding:'9px 10px',font:'700 15px var(--font-body)',color:'var(--text-body)',textAlign:'center',background:'var(--surface-card)',outline:'none'}}/>
        </div>)}
      </div>
      <Input label="Sides / extras" placeholder="e.g. 3 sides, dessert, packaging notes"/>
      <div>
        <div style={{font:'700 13px var(--font-body)',marginBottom:6}}>Delivery date{date?<span style={{color:'var(--text-brand)'}}> · {fmtDate(date)}</span>:null}</div>
        <MiniCalendar value={date} onChange={setDate}/>
      </div>
      <Select label="Delivery window" options={['Breakfast · 8–9 am','Lunch · 12–1 pm','Evening · 5–6 pm','Dinner · 7–8 pm']} value={win} onChange={setWin}/>
      <Input label="Contact number" placeholder="10-digit mobile"/>
      <Button style={{width:'100%',justifyContent:'center',opacity:totalUnits>0&&date?1:.45}} disabled={totalUnits===0||!date} onClick={()=>setSent(true)}>Request quote{totalUnits>0?' · '+totalUnits+' units':''}</Button>
      </React.Fragment>}
    </div>
  </div>;
}

function CustomerApp(){
  const [tw,setTweak]=useTweaks(TWEAK_DEFAULTS);
  const [lang,setLang]=React.useState('en');
  const t=STRINGS[lang];
  const [nav,setNav]=React.useState({tab:'home',screen:'home',slug:null});
  const [cart,setCart]=React.useState({});
  const [placed,setPlaced]=React.useState(null);
  const [toast,setToast]=React.useState(false);
  const addItem=(id,d)=>setCart(c=>({...c,[id]:Math.max(0,(c[id]||0)+d)}));
  const count=Object.values(cart).reduce((a,b)=>a+b,0);
  const go=(screen,slug)=>setNav(n=>({...n,screen,slug:slug??n.slug}));
  const onPlace=(slot)=>{const seq=slot.used+1;setPlaced({count,slotCode:slot.code+'-'+String(seq).padStart(2,'0'),slotTime:slot.t});setCart({});setToast(true);setTimeout(()=>setToast(false),2600);setNav({tab:'orders',screen:'home',slug:null});};
  const tabs=[['home',Icons.home,t.home],['workshops',Icons.chef,t.workshops],['orders',Icons.receipt,t.orders],['profile',Icons.user,t.profile]];
  let body;
  if(nav.tab==='home'){
    if(nav.screen==='kitchen')body=<KitchenScreen key={tw.combosFirst} t={t} slug={nav.slug} go={go} cart={cart} addItem={addItem} tw={tw}/>;
    else if(nav.screen==='cart')body=<CartScreen t={t} go={go} cart={cart} addItem={addItem} onPlace={onPlace}/>;
    else if(nav.screen==='bulk')body=<BulkScreen t={t} go={go} slug={nav.slug}/>;
    else body=<HomeScreen t={t} go={go} cartCount={count}/>;
  } else if(nav.tab==='workshops')body=<WorkshopsScreen t={t}/>;
  else if(nav.tab==='orders')body=<OrdersScreen t={t} placed={placed}/>;
  else body=<ProfileScreen t={t} lang={lang} setLang={setLang}/>;
  return <div style={{width:390,height:760,background:'var(--surface-page)',position:'relative',overflow:'hidden',display:'flex',flexDirection:'column',fontFamily:'var(--font-body)',color:'var(--text-body)'}}>
    <TweaksPanel>
      <TweakSection label="Kitchen menu"/>
      <TweakToggle label="Combos first" value={tw.combosFirst} onChange={v=>setTweak('combosFirst',v)}/>
      <TweakToggle label="Food photos" value={tw.showPhotos} onChange={v=>setTweak('showPhotos',v)}/>
      <TweakToggle label="Descriptions" value={tw.showDesc} onChange={v=>setTweak('showDesc',v)}/>
    </TweaksPanel>
    <div style={{flex:1,overflowY:'auto',position:'relative'}}>{body}</div>
    {toast&&<div style={{position:'absolute',bottom:78,left:16,right:16,display:'flex',justifyContent:'center'}}><Toast tone="success">{t.orderPlaced} 🍛</Toast></div>}
    <div style={{display:'flex',borderTop:'1px solid var(--border-subtle)',background:'rgba(255,252,248,.96)',backdropFilter:'blur(8px)',padding:'8px 8px 10px'}}>
      {tabs.map(([id,icon,label])=><button key={id} onClick={()=>setNav({tab:id,screen:'home',slug:null})}
        style={{flex:1,border:'none',background:'transparent',cursor:'pointer',display:'flex',flexDirection:'column',alignItems:'center',gap:3,color:nav.tab===id?'var(--text-brand)':'var(--text-muted)',font:(nav.tab===id?'800':'600')+' 11px var(--font-body)',padding:'4px 0'}}>
        {icon(22)}{label}
      </button>)}
    </div>
  </div>;
}
window.CustomerApp=CustomerApp;
