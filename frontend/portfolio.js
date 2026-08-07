window.PRMPortfolio={
  initial(){const saved=PRMStorage.get('state',null);if(saved){for(const p of saved.positions||[]){if(!p.price||p.price<=0)p.price=PRM_CONFIG.fallbackPrices[p.name]||0}return saved}
    return{cash:PRM_CONFIG.cash,monthlyLoss:0,positions:PRM_CONFIG.positions.map(p=>({...p,price:PRM_CONFIG.fallbackPrices[p.name]||0}))}},
  save(s){PRMStorage.set('state',s)},
  trade(s,t){const trades=PRMStorage.get('trades',[]);trades.push({...t,at:new Date().toISOString()});PRMStorage.set('trades',trades.slice(-1000));
    if(t.kind==='deposit')s.cash+=t.amount;
    if(t.kind==='withdraw')s.cash=Math.max(0,s.cash-t.amount);
    if(t.kind==='repay'){let rem=t.amount;for(const p of s.positions.filter(x=>x.loan>0)){const x=Math.min(rem,p.loan);p.loan-=x;rem-=x;if(rem<=0)break}s.cash=Math.max(0,s.cash-(t.amount-rem))}
    if(t.kind==='buy'){let p=s.positions.find(x=>x.name===t.name&&x.type===t.type);if(!p){p={name:t.name,type:t.type,qty:0,avg:0,loan:0,price:t.price};s.positions.push(p)}
      const old=p.avg*p.qty,add=t.price*t.qty;p.avg=(old+add)/(p.qty+t.qty);p.qty+=t.qty;p.price=t.price;if(t.type==='현금')s.cash=Math.max(0,s.cash-add);else p.loan+=t.amount||0}
    if(t.kind==='sell'){let rem=t.qty;for(const p of s.positions.filter(x=>x.name===t.name&&x.qty>0)){const n=Math.min(rem,p.qty),ratio=n/p.qty,repay=p.loan*ratio;p.qty-=n;p.loan-=repay;s.cash+=n*t.price-repay;rem-=n;if(rem<=0)break}s.positions=s.positions.filter(x=>x.qty>0)}
    this.save(s);return s}
};
