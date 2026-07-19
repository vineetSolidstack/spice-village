// Shared data, icons, i18n strings for the Spice Route customer app kit
const I = (d,s=20)=><svg width={s} height={s} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round">{d}</svg>;
const Icons = {
  home:(s)=>I(<><path d="m3 9 9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z"/><polyline points="9 22 9 12 15 12 15 22"/></>,s),
  chef:(s)=>I(<><path d="M17 21a1 1 0 0 0 1-1v-5.35c0-.457.316-.844.727-1.041a4 4 0 0 0-2.134-7.589 5 5 0 0 0-9.186 0 4 4 0 0 0-2.134 7.588c.411.198.727.585.727 1.041V20a1 1 0 0 0 1 1Z"/><path d="M6 17h12"/></>,s),
  receipt:(s)=>I(<><path d="M4 2v20l2-1 2 1 2-1 2 1 2-1 2 1 2-1 2 1V2l-2 1-2-1-2 1-2-1-2 1-2-1-2 1Z"/><path d="M16 8h-6a2 2 0 1 0 0 4h4a2 2 0 1 1 0 4H8"/><path d="M12 17.5v-11"/></>,s),
  user:(s)=>I(<><path d="M19 21v-2a4 4 0 0 0-4-4H9a4 4 0 0 0-4 4v2"/><circle cx="12" cy="7" r="4"/></>,s),
  search:(s)=>I(<><circle cx="11" cy="11" r="8"/><path d="m21 21-4.3-4.3"/></>,s),
  cart:(s)=>I(<><circle cx="8" cy="21" r="1"/><circle cx="19" cy="21" r="1"/><path d="M2.05 2.05h2l2.66 12.42a2 2 0 0 0 2 1.58h9.78a2 2 0 0 0 1.95-1.57l1.65-7.43H5.12"/></>,s),
  back:(s)=>I(<><path d="m12 19-7-7 7-7"/><path d="M19 12H5"/></>,s),
  star:(s)=><svg width={s||16} height={s||16} viewBox="0 0 24 24" fill="var(--turmeric-500)" stroke="var(--turmeric-500)" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round"><polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2"/></svg>,
  plus:(s)=>I(<><path d="M5 12h14"/><path d="M12 5v14"/></>,s),
  minus:(s)=>I(<path d="M5 12h14"/>,s),
  qr:(s)=>I(<><rect width="5" height="5" x="3" y="3" rx="1"/><rect width="5" height="5" x="16" y="3" rx="1"/><rect width="5" height="5" x="3" y="16" rx="1"/><path d="M21 16h-3a2 2 0 0 0-2 2v3"/><path d="M21 21v.01"/><path d="M12 7v3a2 2 0 0 1-2 2H7"/><path d="M3 12h.01"/><path d="M12 3h.01"/><path d="M12 16v.01"/><path d="M16 12h1"/><path d="M21 12v.01"/><path d="M12 21v-1"/></>,s),
  clock:(s)=>I(<><circle cx="12" cy="12" r="10"/><polyline points="12 6 12 12 16 14"/></>,s),
  pin:(s)=>I(<><path d="M20 10c0 4.993-5.539 10.193-7.399 11.799a1 1 0 0 1-1.202 0C9.539 20.193 4 14.993 4 10a8 8 0 0 1 16 0"/><circle cx="12" cy="10" r="3"/></>,s),
  bell:(s)=>I(<><path d="M6 8a6 6 0 0 1 12 0c0 7 3 9 3 9H3s3-2 3-9"/><path d="M10.3 21a1.94 1.94 0 0 0 3.4 0"/></>,s),
  users:(s)=>I(<><path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M22 21v-2a4 4 0 0 0-3-3.87"/><path d="M16 3.13a4 4 0 0 1 0 7.75"/></>,s),
  chev:(s)=>I(<path d="m9 18 6-6-6-6"/>,s),
  globe:(s)=>I(<><circle cx="12" cy="12" r="10"/><path d="M12 2a14.5 14.5 0 0 0 0 20 14.5 14.5 0 0 0 0-20"/><path d="M2 12h20"/></>,s),
};
// Trilingual strings — English default; user switches in Profile
const STRINGS = {
  en:{home:'Home',workshops:'Workshops',orders:'Orders',profile:'Profile',greet:'What\u2019s cooking today?',search:'Search kitchens & dishes\u2026',featured:'Featured kitchens',cats:'Cuisines',cart:'Cart',checkout:'Checkout',addToCart:'Add',viewCart:'View cart',emptyCart:'Your cart is hungry \u2014 feed it something homemade.',placeOrder:'Place order',orderPlaced:'Order\u2019s simmering! We\u2019ll ping you when it\u2019s ready.',yourOrders:'Your orders',showQr:'Show this QR at pickup',book:'Book workshop',language:'Language',bookings:'My bookings',notif:'Notifications',becomePartner:'Become a partner',save20:'Save up to 20% when you pre-order'},
  ta:{home:'\u0BAE\u0BC1\u0B95\u0BAA\u0BCD\u0BAA\u0BC1',workshops:'\u0BAA\u0B9F\u0BCD\u0B9F\u0BB1\u0BC8\u0B95\u0BB3\u0BCD',orders:'\u0B86\u0BB0\u0BCD\u0B9F\u0BB0\u0BCD\u0B95\u0BB3\u0BCD',profile:'\u0B9A\u0BC1\u0BAF\u0BB5\u0BBF\u0BB5\u0BB0\u0BAE\u0BCD',greet:'\u0B87\u0BA9\u0BCD\u0BB1\u0BC1 \u0B8E\u0BA9\u0BCD\u0BA9 \u0B9A\u0BAE\u0BC8\u0BAF\u0BB2\u0BCD?',search:'\u0B9A\u0BAE\u0BC8\u0BAF\u0BB2\u0BB1\u0BC8\u0B95\u0BB3\u0BC8\u0BA4\u0BCD \u0BA4\u0BC7\u0B9F\u0BC1\u0B99\u0BCD\u0B95\u0BB3\u0BCD\u2026',featured:'\u0B9A\u0BBF\u0BB1\u0BAA\u0BCD\u0BAA\u0BC1 \u0B9A\u0BAE\u0BC8\u0BAF\u0BB2\u0BB1\u0BC8\u0B95\u0BB3\u0BCD',cats:'\u0B9A\u0BAE\u0BC8\u0BAF\u0BB2\u0BCD \u0BB5\u0B95\u0BC8\u0B95\u0BB3\u0BCD',cart:'\u0B95\u0BC2\u0B9F\u0BC8',checkout:'\u0B9A\u0BC6\u0B95\u0BCD\u0B95\u0BB5\u0BC1\u0B9F\u0BCD',addToCart:'\u0B9A\u0BC7\u0BB0\u0BCD',viewCart:'\u0B95\u0BC2\u0B9F\u0BC8\u0BAF\u0BC8\u0BAA\u0BCD \u0BAA\u0BBE\u0BB0\u0BCD',emptyCart:'\u0B89\u0B99\u0BCD\u0B95\u0BB3\u0BCD \u0B95\u0BC2\u0B9F\u0BC8 \u0BAA\u0B9A\u0BBF\u0BAF\u0BBE\u0B95 \u0B89\u0BB3\u0BCD\u0BB3\u0BA4\u0BC1!',placeOrder:'\u0B86\u0BB0\u0BCD\u0B9F\u0BB0\u0BCD \u0B9A\u0BC6\u0BAF\u0BCD',orderPlaced:'\u0B86\u0BB0\u0BCD\u0B9F\u0BB0\u0BCD \u0BA4\u0BAF\u0BBE\u0BB0\u0BBE\u0B95\u0BBF\u0BB1\u0BA4\u0BC1!',yourOrders:'\u0B89\u0B99\u0BCD\u0B95\u0BB3\u0BCD \u0B86\u0BB0\u0BCD\u0B9F\u0BB0\u0BCD\u0B95\u0BB3\u0BCD',showQr:'\u0BAA\u0BBF\u0B95\u0BCD\u0B95\u0BAA\u0BCD\u0BAA\u0BBF\u0BB2\u0BCD QR \u0B95\u0BBE\u0B9F\u0BCD\u0B9F\u0BC1',book:'\u0BAA\u0BA4\u0BBF\u0BB5\u0BC1 \u0B9A\u0BC6\u0BAF\u0BCD',language:'\u0BAE\u0BC6\u0BBE\u0BB4\u0BBF',bookings:'\u0B8E\u0BA9\u0BA4\u0BC1 \u0BAA\u0BA4\u0BBF\u0BB5\u0BC1\u0B95\u0BB3\u0BCD',notif:'\u0B85\u0BB1\u0BBF\u0BB5\u0BBF\u0BAA\u0BCD\u0BAA\u0BC1\u0B95\u0BB3\u0BCD',becomePartner:'\u0B95\u0BC2\u0B9F\u0BCD\u0B9F\u0BBE\u0BB3\u0BB0\u0BBE\u0B95\u0BC1\u0B99\u0BCD\u0B95\u0BB3\u0BCD',save20:'\u0BAE\u0BC1\u0BA9\u0BCD\u0BAA\u0BA4\u0BBF\u0BB5\u0BBF\u0BB2\u0BCD 20% \u0B9A\u0BC7\u0BAE\u0BBF\u0BAF\u0BC1\u0B99\u0BCD\u0B95\u0BB3\u0BCD'},
  hi:{home:'\u0939\u094B\u092E',workshops:'\u0935\u0930\u094D\u0915\u0936\u0949\u092A',orders:'\u0911\u0930\u094D\u0921\u0930',profile:'\u092A\u094D\u0930\u094B\u092B\u093C\u093E\u0907\u0932',greet:'\u0906\u091C \u0915\u094D\u092F\u093E \u092A\u0915 \u0930\u0939\u093E \u0939\u0948?',search:'\u0930\u0938\u094B\u0908 \u0914\u0930 \u0935\u094D\u092F\u0902\u091C\u0928 \u0916\u094B\u091C\u0947\u0902\u2026',featured:'\u091A\u0941\u0928\u093F\u0902\u0926\u093E \u0930\u0938\u094B\u0907\u092F\u093E\u0901',cats:'\u0935\u094D\u092F\u0902\u091C\u0928 \u0936\u0948\u0932\u093F\u092F\u093E\u0901',cart:'\u0915\u093E\u0930\u094D\u091F',checkout:'\u091A\u0947\u0915\u0906\u0909\u091F',addToCart:'\u091C\u094B\u0921\u093C\u0947\u0902',viewCart:'\u0915\u093E\u0930\u094D\u091F \u0926\u0947\u0916\u0947\u0902',emptyCart:'\u0906\u092A\u0915\u093E \u0915\u093E\u0930\u094D\u091F \u092D\u0942\u0916\u093E \u0939\u0948!',placeOrder:'\u0911\u0930\u094D\u0921\u0930 \u0915\u0930\u0947\u0902',orderPlaced:'\u0911\u0930\u094D\u0921\u0930 \u092A\u0915 \u0930\u0939\u093E \u0939\u0948!',yourOrders:'\u0906\u092A\u0915\u0947 \u0911\u0930\u094D\u0921\u0930',showQr:'\u092A\u093F\u0915\u0905\u092A \u092A\u0930 \u092F\u0939 QR \u0926\u093F\u0916\u093E\u090F\u0902',book:'\u092C\u0941\u0915 \u0915\u0930\u0947\u0902',language:'\u092D\u093E\u0937\u093E',bookings:'\u092E\u0947\u0930\u0940 \u092C\u0941\u0915\u093F\u0902\u0917',notif:'\u0938\u0942\u091A\u0928\u093E\u090F\u0901',becomePartner:'\u092A\u093E\u0930\u094D\u091F\u0928\u0930 \u092C\u0928\u0947\u0902',save20:'\u092A\u094D\u0930\u0940-\u0911\u0930\u094D\u0921\u0930 \u092A\u0930 20% \u0924\u0915 \u092C\u091A\u093E\u090F\u0902'},
};
const KITCHENS=[
  {slug:'anitas-kitchen',name:'Anita\u2019s Kitchen',cuisine:'South Indian',dist:'1.2 km',rating:4.8,featured:true,grad:'linear-gradient(135deg,#E8A33D,#C1440E)',menu:[
    {id:'m1',name:'Ghee dosa (2 pc)',price:90,old:110,veg:true,desc:'Crisp, golden, brushed with homemade ghee',thumb:'linear-gradient(135deg,#F4C877,#D9531A)'},{id:'m2',name:'Sambar idli bowl',price:70,old:85,veg:true,desc:'Soft idlis soaked in drumstick sambar',thumb:'linear-gradient(135deg,#FBE3D6,#E8A33D)'},{id:'m3',name:'Chicken chettinad',price:180,old:220,veg:false,desc:'Slow-cooked with roasted spice masala',thumb:'linear-gradient(135deg,#C1440E,#5C3A21)'},{id:'m4',name:'Filter coffee',price:35,old:40,veg:true,desc:'Frothy, strong, brewed in brass',thumb:'linear-gradient(135deg,#8A6A50,#5C3A21)'}],
   combos:[{id:'c1',name:'Sunday tiffin combo',price:220,old:275,veg:true,desc:'Dosa, idli, vada, pongal + filter coffee',thumb:'linear-gradient(135deg,#E8A33D,#C1440E)'},{id:'c2',name:'Feast for two',price:420,old:520,veg:false,desc:'Chettinad chicken, dosas, dessert for two',thumb:'linear-gradient(135deg,#D9531A,#7A2E1D)'}]},
  {slug:'gurpreets-rasoi',name:'Gurpreet\u2019s Rasoi',cuisine:'North Indian',dist:'2.1 km',rating:4.6,featured:true,grad:'linear-gradient(135deg,#D9531A,#5C3A21)',menu:[
    {id:'m5',name:'Rajma chawal thali',price:150,old:180,veg:true,desc:'Comfort bowl with pickle & papad',thumb:'linear-gradient(135deg,#B0653A,#7A2E1D)'},{id:'m6',name:'Butter paneer + 4 roti',price:190,old:230,veg:true,desc:'Creamy tomato gravy, tandoor rotis',thumb:'linear-gradient(135deg,#E8A33D,#C62828)'},{id:'m7',name:'Gajar halwa cup',price:80,old:95,veg:true,desc:'Warm, slow-stirred, extra nuts',thumb:'linear-gradient(135deg,#D9531A,#A63A0C)'}],combos:[{id:'c3',name:'Punjabi lunchbox',price:250,old:310,veg:true,desc:'Thali + halwa + lassi, packed to go',thumb:'linear-gradient(135deg,#F4C877,#B0653A)'}]},
  {slug:'meenas-snacks',name:'Meena\u2019s Snack Corner',cuisine:'Snacks',dist:'800 m',rating:4.9,featured:false,grad:'linear-gradient(135deg,#2A9D8F,#1F7A4D)',menu:[
    {id:'m8',name:'Medu vada (4 pc)',price:60,old:75,veg:true,desc:'Crunchy outside, cloud-soft inside',thumb:'linear-gradient(135deg,#E8A33D,#8A6A50)'},{id:'m9',name:'Onion pakora plate',price:55,old:65,veg:true,desc:'Rainy-day fritters with mint chutney',thumb:'linear-gradient(135deg,#2A9D8F,#1F7A4D)'}],combos:[]},
];
const WORKSHOPS=[
  {id:'w1',title:'Master the dosa flip',host:'Chef Anita R.',price:499,seats:3,dur:'2 hrs',grad:'linear-gradient(135deg,#E8A33D,#D9531A)',sessions:['Sat 25 Jul · 10 am','Sun 26 Jul · 10 am','Sat 1 Aug · 4 pm']},
  {id:'w2',title:'Biryani, layer by layer',host:'Chef Imran K.',price:799,seats:8,dur:'3 hrs',grad:'linear-gradient(135deg,#C1440E,#5C3A21)',sessions:['Sun 26 Jul · 11 am','Sun 2 Aug · 11 am']},
  {id:'w3',title:'Sweets of the south',host:'Meena V.',price:399,seats:12,dur:'90 min',grad:'linear-gradient(135deg,#2A9D8F,#17805E)',sessions:['Sat 25 Jul · 3 pm']},
];
const CATEGORIES=['South Indian','North Indian','Snacks','Sweets','Healthy'];
// Kitchen-defined pickup slots with capacity caps (demo: Anita's Kitchen)
const SLOTS=[
  {t:'5:00 pm',code:'500',cap:15,used:6},
  {t:'5:15 pm',code:'515',cap:15,used:15},
  {t:'5:30 pm',code:'530',cap:12,used:3},
  {t:'5:45 pm',code:'545',cap:12,used:11},
  {t:'6:00 pm',code:'600',cap:15,used:2},
];
// Deterministic fake QR (functional placeholder, not a brand asset)
function QRBox({code,size=180}){
  const n=17,cells=[];let seed=0;for(const ch of code)seed=(seed*31+ch.charCodeAt(0))>>>0;
  const rnd=()=>{seed=(seed*1103515245+12345)>>>0;return seed/4294967296};
  for(let y=0;y<n;y++)for(let x=0;x<n;x++){const finder=(x<5&&y<5)||(x>n-6&&y<5)||(x<5&&y>n-6);const edge=(x===0||y===0||x===4||y===4),e2=(x===n-5||x===n-1)&&y<5,e3=y===n-5||y===n-1;let on;if(finder){if(x<5&&y<5)on=edge||(x>1&&x<3&&y>1&&y<3);else if(x>n-6&&y<5)on=e2||y===0||y===4||(x===n-3&&y===2);else on=(x===0||x===4||e3)&&x<5||(x===2&&y===n-3);}else on=rnd()>.52;if(on)cells.push(<rect key={x+'-'+y} x={x} y={y} width="1" height="1"/>)}
  return <svg width={size} height={size} viewBox={`0 0 ${n} ${n}`} style={{background:'#fff',borderRadius:12,padding:0}} fill="var(--cocoa-900)">{cells}</svg>;
}
Object.assign(window,{Icons,STRINGS,KITCHENS,WORKSHOPS,CATEGORIES,SLOTS,QRBox});
