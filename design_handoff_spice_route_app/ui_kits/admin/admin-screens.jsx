// Kitchen Owner (Admin) portal — mobile PWA
const DS = window.SpiceRouteDesignSystem_65036e || new Proxy({},{get:()=>(()=>null)}); // fallback if bundle not compiled yet
const {Button,IconButton,Input,Badge,Tabs,Switch,Toast,Select} = DS;
const money=v=>'\u20B9'+v;
const AI=(d,s=20)=><svg width={s} height={s} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round">{d}</svg>;
const AIcons={
  dash:s=>AI(<><rect width="7" height="9" x="3" y="3" rx="1"/><rect width="7" height="5" x="14" y="3" rx="1"/><rect width="7" height="9" x="14" y="12" rx="1"/><rect width="7" height="5" x="3" y="16" rx="1"/></>,s),
  menu:s=>AI(<><path d="M3 2v7c0 1.1.9 2 2 2h4a2 2 0 0 0 2-2V2"/><path d="M7 2v20"/><path d="M21 15V2a5 5 0 0 0-5 5v6c0 1.1.9 2 2 2h3Zm0 0v7"/></>,s),
  orders:s=>AI(<><path d="M4 2v20l2-1 2 1 2-1 2 1 2-1 2 1 2-1 2 1V2l-2 1-2-1-2 1-2-1-2 1-2-1-2 1Z"/><path d="M16 8h-6a2 2 0 1 0 0 4h4a2 2 0 1 1 0 4H8"/></>,s),
  gear:s=>AI(<><path d="M12.22 2h-.44a2 2 0 0 0-2 2v.18a2 2 0 0 1-1 1.73l-.43.25a2 2 0 0 1-2 0l-.15-.08a2 2 0 0 0-2.73.73l-.22.38a2 2 0 0 0 .73 2.73l.15.1a2 2 0 0 1 1 1.72v.51a2 2 0 0 1-1 1.74l-.15.09a2 2 0 0 0-.73 2.73l.22.38a2 2 0 0 0 2.73.73l.15-.08a2 2 0 0 1 2 0l.43.25a2 2 0 0 1 1 1.73V20a2 2 0 0 0 2 2h.44a2 2 0 0 0 2-2v-.18a2 2 0 0 1 1-1.73l.43-.25a2 2 0 0 1 2 0l.15.08a2 2 0 0 0 2.73-.73l.22-.39a2 2 0 0 0-.73-2.73l-.15-.08a2 2 0 0 1-1-1.74v-.5a2 2 0 0 1 1-1.74l.15-.09a2 2 0 0 0 .73-2.73l-.22-.38a2 2 0 0 0-2.73-.73l-.15.08a2 2 0 0 1-2 0l-.43-.25a2 2 0 0 1-1-1.73V4a2 2 0 0 0-2-2z"/><circle cx="12" cy="12" r="3"/></>,s),
  edit:s=>AI(<><path d="M21.174 6.812a1 1 0 0 0-3.986-3.987L3.842 16.174a2 2 0 0 0-.5.83l-1.321 4.352a.5.5 0 0 0 .623.622l4.353-1.32a2 2 0 0 0 .83-.497z"/></>,s),
  trash:s=>AI(<><path d="M3 6h18"/><path d="M19 6v14c0 1-1 2-2 2H7c-1 0-2-1-2-2V6"/><path d="M8 6V4c0-1 1-2 2-2h4c1 0 2 1 2 2v2"/></>,s),
  plus:s=>AI(<><path d="M5 12h14"/><path d="M12 5v14"/></>,s),
  clock:s=>AI(<><circle cx="12" cy="12" r="10"/><polyline points="12 6 12 12 16 14"/></>,s),
  minus:s=>AI(<path d="M5 12h14"/>,s),
  qr:s=>AI(<><rect width="5" height="5" x="3" y="3" rx="1"/><rect width="5" height="5" x="16" y="3" rx="1"/><rect width="5" height="5" x="3" y="16" rx="1"/><path d="M21 16h-3a2 2 0 0 0-2 2v3"/><path d="M12 7v3a2 2 0 0 1-2 2H7"/></>,s),
};
const A_ORDERS=[
  {code:'SR-7194',slot:'500-07',who:'Priya S.',items:'Ghee dosa ×2, Filter coffee ×1',total:215,status:'New'},
  {code:'SR-7191',slot:'500-03',who:'Arun M.',items:'Sunday tiffin combo ×1',total:220,status:'Preparing'},
  {code:'SR-7188',slot:'530-01',who:'Kavya R.',items:'Sambar idli bowl ×2',total:140,status:'Ready'},
  {code:'SR-7180',slot:'545-11',who:'Dev P.',items:'Chicken chettinad ×1',total:180,status:'Completed'},
];
const A_BULK={id:'BQ-102',who:'Arun M. · 98400 12345',what:'500 meal combos · 3 sides',when:'Deliver Sat 2 Aug · 12:30 pm',status:'Pending quote'};
const A_SLOTS=[
  {code:'500',t:'5:00 pm',cap:15,used:6},
  {code:'515',t:'5:15 pm',cap:15,used:15},
  {code:'530',t:'5:30 pm',cap:12,used:3},
  {code:'545',t:'5:45 pm',cap:12,used:11},
  {code:'600',t:'6:00 pm',cap:15,used:2},
];
const NEXT={New:'Preparing',Preparing:'Ready',Ready:'Completed'};
const TONE={New:'info',Preparing:'warn',Ready:'success',Completed:'neutral'};

function AdminHeader({title,right}){
  return <div style={{display:'flex',alignItems:'center',gap:10,padding:'14px 16px 10px',position:'sticky',top:0,zIndex:20,background:'rgba(255,248,240,.92)',backdropFilter:'blur(8px)'}}>
    <h1 style={{fontFamily:'var(--font-display)',fontWeight:800,fontSize:22,margin:0,flex:1}}>{title}</h1>{right}
  </div>;
}
function Stat({label,value,tone}){
  return <div style={{flex:1,background:'var(--surface-card)',borderRadius:'var(--radius-lg)',boxShadow:'var(--shadow-card)',padding:14}}>
    <div style={{fontFamily:'var(--font-display)',fontWeight:800,fontSize:24,color:tone||'var(--text-body)'}}>{value}</div>
    <div style={{font:'600 12px var(--font-body)',color:'var(--text-muted)'}}>{label}</div>
  </div>;
}
function OrderRow({o,advance}){
  return <div style={{background:'var(--surface-card)',borderRadius:'var(--radius-lg)',boxShadow:'var(--shadow-card)',padding:14,display:'flex',flexDirection:'column',gap:8}}>
    <div style={{display:'flex',alignItems:'center',gap:8}}>
      <span style={{background:'var(--cocoa-900)',color:'#fff',borderRadius:8,padding:'2px 8px',font:'800 13px var(--font-display)',letterSpacing:'.05em'}}>{o.slot}</span>
      <span style={{font:'800 13px var(--font-display)',letterSpacing:'.04em'}}>{o.code}</span>
      <span style={{font:'600 13px var(--font-body)',color:'var(--text-muted)',flex:1}}>{o.who}</span>
      <Badge tone={TONE[o.status]}>{o.status}</Badge>
    </div>
    <div style={{font:'600 13px var(--font-body)',color:'var(--text-muted)'}}>{o.items}</div>
    <div style={{display:'flex',alignItems:'center',justifyContent:'space-between'}}>
      <span style={{font:'800 15px var(--font-body)'}}>{money(o.total)}</span>
      {NEXT[o.status]&&<Button size="sm" variant={o.status==='Ready'?'primary':'secondary'} onClick={()=>advance(o.code)}>{o.status==='Ready'?'Verify QR & complete':'Mark '+NEXT[o.status].toLowerCase()}</Button>}
    </div>
  </div>;
}
function AdminApp(){
  const [tab,setTab]=React.useState('dash');
  const [orders,setOrders]=React.useState(A_ORDERS);
  const [accepting,setAccepting]=React.useState(true);
  const [menu,setMenu]=React.useState(KITCHENS[0].menu.map(m=>({...m,avail:true})));
  const [slots,setSlots]=React.useState(A_SLOTS);
  const [bulk,setBulk]=React.useState(A_BULK.status);
  const capSlot=(code,d)=>setSlots(ss=>ss.map(s=>s.code===code?{...s,cap:Math.max(s.used,s.cap+d)}:s));
  const [toast,setToast]=React.useState(null);
  const ping=m=>{setToast(m);setTimeout(()=>setToast(null),2200)};
  const advance=code=>setOrders(os=>os.map(o=>o.code===code?{...o,status:NEXT[o.status]}:o));
  const fresh=orders.filter(o=>o.status!=='Completed');
  const tabs=[['dash',AIcons.dash,'Dashboard'],['orders',AIcons.orders,'Orders'],['slots',AIcons.clock,'Slots'],['menu',AIcons.menu,'Menu'],['settings',AIcons.gear,'Settings']];
  let body;
  if(tab==='dash')body=<div>
    <AdminHeader title="Anita's Kitchen" right={<Badge tone={accepting?'success':'danger'}>{accepting?'Open':'Closed'}</Badge>}/>
    <div style={{padding:'0 16px 16px',display:'flex',flexDirection:'column',gap:12}}>
      <div style={{display:'flex',gap:10}}>
        <Stat label="New orders" value={orders.filter(o=>o.status==='New').length} tone="var(--status-info)"/>
        <Stat label="Preparing" value={orders.filter(o=>o.status==='Preparing').length} tone="var(--status-warn)"/>
        <Stat label="Today's sales" value={money(755)}/>
      </div>
      <div style={{font:'700 13px var(--font-body)',color:'var(--text-muted)',marginTop:4}}>Needs attention</div>
      {fresh.slice(0,2).map(o=><OrderRow key={o.code} o={o} advance={advance}/>)}
    </div>
  </div>;
  else if(tab==='orders')body=<div>
    <AdminHeader title="Orders"/>
    <div style={{padding:'0 16px 16px',display:'flex',flexDirection:'column',gap:10}}>
      <div style={{background:'var(--surface-card)',border:'2px solid var(--turmeric-500)',borderRadius:'var(--radius-lg)',boxShadow:'var(--shadow-card)',padding:16,display:'flex',flexDirection:'column',gap:8}}>
        <div style={{display:'flex',alignItems:'center',gap:8}}>
          <span style={{font:'800 14px var(--font-display)'}}>Bulk request · {A_BULK.id}</span>
          <span style={{flex:1}}></span>
          <Badge tone={bulk==='Pending quote'?'warn':bulk==='Quoted'?'info':'neutral'}>{bulk}</Badge>
        </div>
        <div style={{font:'700 14px var(--font-body)'}}>{A_BULK.what}</div>
        <div style={{font:'600 13px var(--font-body)',color:'var(--text-muted)'}}>{A_BULK.when} · {A_BULK.who}</div>
        <div style={{font:'600 12px var(--font-body)',color:'var(--text-muted)'}}>Priced manually — bulk orders skip pickup-slot capacity.</div>
        {bulk==='Pending quote'&&<div style={{display:'flex',gap:10}}>
          <Button size="sm" onClick={()=>{setBulk('Quoted');ping('Quote sent to customer')}}>Send quote</Button>
          <Button size="sm" variant="ghost" onClick={()=>{setBulk('Declined');ping('Request declined')}}>Decline</Button>
        </div>}
      </div>
      {orders.map(o=><OrderRow key={o.code} o={o} advance={advance}/>)}
    </div>
  </div>;
  else if(tab==='slots')body=<div>
    <AdminHeader title="Pickup slots" right={<Button size="sm" icon={AIcons.plus(16)} onClick={()=>ping('Add slot — form omitted in kit')}>Add slot</Button>}/>
    <div style={{padding:'0 16px 16px',display:'flex',flexDirection:'column',gap:10}}>
      <div style={{background:'var(--surface-accent-soft)',borderRadius:'var(--radius-md)',padding:'10px 14px',font:'600 13px var(--font-body)',color:'var(--turmeric-600)'}}>Caps limit how many orders customers can book per slot — full slots close automatically at checkout.</div>
      {slots.map(s=>{const left=s.cap-s.used;return <div key={s.code} style={{background:'var(--surface-card)',borderRadius:'var(--radius-lg)',boxShadow:'var(--shadow-card)',padding:14,display:'flex',alignItems:'center',gap:12}}>
        <span style={{background:'var(--cocoa-900)',color:'#fff',borderRadius:8,padding:'4px 10px',font:'800 14px var(--font-display)',letterSpacing:'.05em'}}>{s.code}</span>
        <div style={{flex:1}}><div style={{font:'700 15px var(--font-body)'}}>{s.t}</div>
        <div style={{font:'600 12px var(--font-body)',color:left===0?'var(--status-danger)':left<=2?'var(--status-warn)':'var(--text-muted)'}}>{s.used}/{s.cap} booked · {left===0?'Full':left+' left'}</div></div>
        <div style={{display:'flex',alignItems:'center',gap:8,background:'var(--surface-brand-soft)',borderRadius:999,padding:4}}>
          <IconButton label="Lower cap" size={30} onClick={()=>capSlot(s.code,-1)}>{AIcons.minus(15)}</IconButton>
          <span style={{font:'800 14px var(--font-body)',color:'var(--text-brand)',minWidth:22,textAlign:'center'}}>{s.cap}</span>
          <IconButton label="Raise cap" size={30} onClick={()=>capSlot(s.code,1)}>{AIcons.plus(15)}</IconButton>
        </div>
      </div>})}
    </div>
  </div>;
  else if(tab==='menu')body=<div>
    <AdminHeader title="Menu" right={<Button size="sm" icon={AIcons.plus(16)} onClick={()=>ping('Add item — form omitted in kit')}>Add item</Button>}/>
    <div style={{padding:'0 16px 16px',display:'flex',flexDirection:'column',gap:10}}>
      {menu.map(m=><div key={m.id} style={{background:'var(--surface-card)',borderRadius:'var(--radius-lg)',boxShadow:'var(--shadow-card)',padding:14,display:'flex',alignItems:'center',gap:12,opacity:m.avail?1:.55}}>
        <div style={{width:44,height:44,borderRadius:12,background:'linear-gradient(135deg,#E8A33D,#C1440E)',flexShrink:0}}></div>
        <div style={{flex:1}}><div style={{font:'700 14px var(--font-body)'}}>{m.name}</div>
        <div style={{font:'800 13px var(--font-body)',color:'var(--text-brand)'}}>{money(m.price)} <span style={{color:'var(--text-faint)',fontWeight:600,textDecoration:'line-through'}}>{money(m.old)}</span></div></div>
        <Switch checked={m.avail} onChange={v=>setMenu(ms=>ms.map(x=>x.id===m.id?{...x,avail:v}:x))}/>
        <IconButton label="Edit" size={34} onClick={()=>ping('Edit '+m.name)}>{AIcons.edit(16)}</IconButton>
        <IconButton label="Delete" size={34} onClick={()=>ping('Deleted (demo)')} style={{color:'var(--status-danger)'}}>{AIcons.trash(16)}</IconButton>
      </div>)}
    </div>
  </div>;
  else body=<div>
    <AdminHeader title="Settings"/>
    <div style={{padding:'0 16px 16px',display:'flex',flexDirection:'column',gap:14}}>
      <div style={{background:'var(--surface-card)',borderRadius:'var(--radius-lg)',boxShadow:'var(--shadow-card)',padding:16,display:'flex',alignItems:'center',justifyContent:'space-between'}}>
        <div><div style={{font:'700 15px var(--font-body)'}}>Accepting orders</div>
        <div style={{font:'600 12px var(--font-body)',color:'var(--text-muted)'}}>Customers can pre-order while open</div></div>
        <Switch checked={accepting} onChange={setAccepting}/>
      </div>
      <Input label="Kitchen name" defaultValue="Anita's Kitchen"/>
      <Select label="Primary cuisine" options={['South Indian','North Indian','Snacks','Sweets']} value="South Indian"/>
      <Input label="Pickup window" defaultValue="5–7 pm" hint="Shown on every order"/>
      <Button onClick={()=>ping('Kitchen profile saved')}>Save changes</Button>
    </div>
  </div>;
  return <div style={{width:390,height:760,background:'var(--surface-page)',position:'relative',overflow:'hidden',display:'flex',flexDirection:'column',fontFamily:'var(--font-body)',color:'var(--text-body)'}}>
    <div style={{flex:1,overflowY:'auto'}}>{body}</div>
    {toast&&<div style={{position:'absolute',bottom:78,left:16,right:16,display:'flex',justifyContent:'center'}}><Toast tone="success">{toast}</Toast></div>}
    <div style={{display:'flex',borderTop:'1px solid var(--border-subtle)',background:'rgba(255,252,248,.96)',backdropFilter:'blur(8px)',padding:'8px 8px 10px'}}>
      {tabs.map(([id,icon,label])=><button key={id} onClick={()=>setTab(id)} style={{flex:1,border:'none',background:'transparent',cursor:'pointer',display:'flex',flexDirection:'column',alignItems:'center',gap:3,color:tab===id?'var(--text-brand)':'var(--text-muted)',font:(tab===id?'800':'600')+' 11px var(--font-body)',padding:'4px 0'}}>{icon(22)}{label}</button>)}
    </div>
  </div>;
}
window.AdminApp=AdminApp;
