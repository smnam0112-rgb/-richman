window.PRMPortfolio={
  fresh(){return{schema:9,cash:PRM_CONFIG.cash,monthlyLoss:0,positions:PRM_CONFIG.positions.map(p=>({...p,price:PRM_CONFIG.fallbackPrices[p.name]||0}))}},
  initial(){
    const saved=PRMStorage.get('state',null);
    if(!saved)return this.fresh();
    const oldSchema=Number(saved.schema||0);
    saved.cash=Number(saved.cash||0);
    saved.monthlyLoss=Number(saved.monthlyLoss||0);
    saved.positions=saved.positions||[];
    if(oldSchema<9){
      const oldSamsung=saved.positions.find(p=>p.name==='삼성전기');
      const samsungPrice=Number(oldSamsung&&oldSamsung.price||PRM_CONFIG.fallbackPrices['삼성전기']||0);
      saved.positions=saved.positions.filter(p=>p.name!=='삼성전기');
      const corrected=PRM_CONFIG.positions.find(p=>p.name==='삼성전기');
      if(corrected)saved.positions.unshift({...corrected,price:samsungPrice});
      saved.cash=PRM_CONFIG.cash;
      saved.schema=9;
      this.save(saved);
    }else saved.schema=9;
    for(const p of saved.positions){p.qty=Number(p.qty||0);p.avg=Number(p.avg||0);p.loan=Number(p.loan||0);if(!p.price||p.price<=0)p.price=PRM_CONFIG.fallbackPrices[p.name]||0}
    return saved;
  },
  save(s){PRMStorage.set('state',s)},
  reset(){const s=this.fresh();this.save(s);return s},
  setMonthlyLoss(s,v){s.monthlyLoss=Math.max(0,Number(v||0));this.save(s)},
  trades(){return PRMStorage.get('trades',[])},
  trade(s,t){const trades=this.trades();trades.push({...t,at:new Date().toISOString()});PRMStorage.set('trades',trades.slice(-1000));
    if(t.kind==='deposit')s.cash+=Math.max(0,t.amount);
    if(t.kind==='withdraw')s.cash=Math.max(0,s.cash-Math.max(0,t.amount));
    if(t.kind==='repay'){let rem=Math.min(Math.max(0,t.amount),s.cash);for(const p of s.positions.filter(x=>x.loan>0)){const x=Math.min(rem,p.loan);p.loan-=x;rem-=x;if(rem<=0)break}s.cash=Math.max(0,s.cash-(t.amount-rem))}
    if(t.kind==='buy'&&t.qty>0&&t.price>0){let p=s.positions.find(x=>x.name===t.name&&x.type===t.type);if(!p){p={name:t.name,type:t.type,qty:0,avg:0,loan:0,price:t.price};s.positions.push(p)}const old=p.avg*p.qty,add=t.price*t.qty;p.avg=(old+add)/(p.qty+t.qty);p.qty+=t.qty;p.price=t.price;if(t.type==='현금')s.cash=Math.max(0,s.cash-add);else p.loan+=Math.max(0,t.amount||0)}
    if(t.kind==='sell'&&t.qty>0&&t.price>0){let rem=t.qty;for(const p of s.positions.filter(x=>x.name===t.name&&x.qty>0)){const n=Math.min(rem,p.qty),ratio=n/p.qty,repay=p.loan*ratio;p.qty-=n;p.loan-=repay;s.cash+=n*t.price-repay;rem-=n;if(rem<=0)break}s.positions=s.positions.filter(x=>x.qty>0)}
    this.save(s);return s}
};
