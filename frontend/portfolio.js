window.PRMPortfolio={
  fresh(){return{schema:13,cash:PRM_CONFIG.cash,cashD1:PRM_CONFIG.cashD1||PRM_CONFIG.cash,cashD2:PRM_CONFIG.cashD2||PRM_CONFIG.cash,monthlyLoss:0,positions:PRM_CONFIG.positions.map(p=>({...p,price:PRM_CONFIG.fallbackPrices[p.name]||0}))}},
  initial(){
    const saved=PRMStorage.get('state',null);
    if(!saved)return this.fresh();
    const oldSchema=Number(saved.schema||0);
    saved.cash=Number(saved.cash||0);
    saved.monthlyLoss=Number(saved.monthlyLoss||0);
    saved.positions=saved.positions||[];
    if(oldSchema<13){
      const oldPrices={};
      for(const p of saved.positions){
        if(p&&p.name&&Number(p.price||0)>0&&!oldPrices[p.name])oldPrices[p.name]=Number(p.price);
      }
      saved.positions=PRM_CONFIG.positions.map(p=>({...p,price:oldPrices[p.name]||PRM_CONFIG.fallbackPrices[p.name]||0}));
      saved.cash=PRM_CONFIG.cash;
      saved.cashD1=PRM_CONFIG.cashD1||PRM_CONFIG.cash;
      saved.cashD2=PRM_CONFIG.cashD2||PRM_CONFIG.cash;
      saved.schema=13;
      this.save(saved);
    }else{
      saved.schema=13;
      saved.cashD1=Number(saved.cashD1??PRM_CONFIG.cashD1??saved.cash);
      saved.cashD2=Number(saved.cashD2??PRM_CONFIG.cashD2??saved.cash);
    }
    for(const p of saved.positions){p.qty=Number(p.qty||0);p.avg=Number(p.avg||0);p.loan=Number(p.loan||0);if(!p.price||p.price<=0)p.price=PRM_CONFIG.fallbackPrices[p.name]||0}
    return saved;
  },
  save(s){PRMStorage.set('state',s);return s},
  reset(){const s=this.fresh();this.save(s);return s},
  setMonthlyLoss(s,v){s.monthlyLoss=Math.max(0,Number(v||0));this.save(s)},
  trades(){return PRMStorage.get('trades',[])},
  normalizeTrade(t){return{kind:String(t.kind||''),name:String(t.name||''),type:String(t.type||''),qty:Math.max(0,Number(t.qty||0)),price:Math.max(0,Number(t.price||0)),amount:Math.max(0,Number(t.amount||0))}},
  trade(s,t){
    const tx=this.normalizeTrade(t),before=PRMRisk.calc(s);
    let message='';
    if(tx.kind==='buy'){
      if(!tx.name)throw new Error('종목을 선택해 주세요.');
      if(tx.qty<=0)throw new Error('매수 수량을 입력해 주세요.');
      if(tx.price<=0)throw new Error('매수 가격을 입력해 주세요.');
      const gross=tx.qty*tx.price;
      const financed=tx.type!=='현금';
      if(financed&&tx.amount<=0)throw new Error('신용매수는 융자증가액을 입력해 주세요.');
      if(financed&&tx.amount>gross)throw new Error('융자증가액이 총 매수금액보다 클 수 없습니다.');
      const cashNeed=financed?gross-tx.amount:gross;
      if(cashNeed>Number(s.cash||0))throw new Error(`예수금이 ${Math.round(cashNeed-Number(s.cash||0)).toLocaleString()}원 부족합니다.`);
      let p=s.positions.find(x=>x.name===tx.name&&x.type===tx.type);
      if(!p){p={name:tx.name,type:tx.type,qty:0,avg:0,loan:0,price:tx.price};s.positions.push(p)}
      const oldQty=Number(p.qty||0),oldCost=Number(p.avg||0)*oldQty;
      p.qty=oldQty+tx.qty;
      p.avg=(oldCost+gross)/p.qty;
      p.price=tx.price;
      if(financed)p.loan=Number(p.loan||0)+tx.amount;
      s.cash=Number(s.cash||0)-cashNeed;
      s.cashD2=s.cash;
      message=financed?`${tx.name} ${tx.type} ${tx.qty.toLocaleString()}주 매수 · 융자 ${Math.round(tx.amount).toLocaleString()}원 / 자기자금 ${Math.round(cashNeed).toLocaleString()}원`:`${tx.name} 현금 ${tx.qty.toLocaleString()}주 매수 · 예수금 ${Math.round(gross).toLocaleString()}원 사용`;
    }else if(tx.kind==='sell'){
      if(!tx.name)throw new Error('종목을 선택해 주세요.');
      if(!tx.type)throw new Error('매도할 보유유형을 선택해 주세요.');
      if(tx.qty<=0)throw new Error('매도 수량을 입력해 주세요.');
      if(tx.price<=0)throw new Error('매도 가격을 입력해 주세요.');
      const p=s.positions.find(x=>x.name===tx.name&&x.type===tx.type&&Number(x.qty||0)>0);
      if(!p)throw new Error(`${tx.name} ${tx.type} 보유분이 없습니다.`);
      const oldQty=Number(p.qty||0);
      if(tx.qty>oldQty)throw new Error(`해당 보유유형 수량은 ${oldQty.toLocaleString()}주입니다.`);
      const ratio=tx.qty/oldQty;
      const loanRepay=Number(p.loan||0)*ratio;
      const gross=tx.qty*tx.price;
      const cashIn=gross-loanRepay;
      p.qty=oldQty-tx.qty;
      p.loan=Math.max(0,Number(p.loan||0)-loanRepay);
      s.cash=Number(s.cash||0)+cashIn;
      s.cashD2=s.cash;
      if(p.qty<=0)s.positions=s.positions.filter(x=>x!==p);
      message=`${tx.name} ${tx.type} ${tx.qty.toLocaleString()}주 매도 · 매도대금 ${Math.round(gross).toLocaleString()}원 / 융자상환 ${Math.round(loanRepay).toLocaleString()}원 / 예수금 +${Math.round(cashIn).toLocaleString()}원`;
    }else if(tx.kind==='repay'){
      if(tx.amount<=0)throw new Error('신용상환 금액을 입력해 주세요.');
      if(tx.amount>Number(s.cash||0))throw new Error('예수금보다 많은 금액을 상환할 수 없습니다.');
      const totalLoan=s.positions.reduce((a,p)=>a+Number(p.loan||0),0);
      if(tx.amount>totalLoan)throw new Error('총 융자금보다 많은 금액을 상환할 수 없습니다.');
      let rem=tx.amount;
      for(const p of s.positions.filter(x=>Number(x.loan||0)>0)){
        if(rem<=0)break;
        const used=Math.min(rem,Number(p.loan||0));
        p.loan-=used;rem-=used;
      }
      s.cash=Number(s.cash||0)-tx.amount;
      s.cashD2=s.cash;
      message=`신용 ${Math.round(tx.amount).toLocaleString()}원 상환 · 예수금 동일 금액 감소`;
    }else if(tx.kind==='deposit'){
      if(tx.amount<=0)throw new Error('입금 금액을 입력해 주세요.');
      s.cash=Number(s.cash||0)+tx.amount;
      s.cashD2=s.cash;
      message=`예수금 +${Math.round(tx.amount).toLocaleString()}원`;
    }else if(tx.kind==='withdraw'){
      if(tx.amount<=0)throw new Error('출금 금액을 입력해 주세요.');
      if(tx.amount>Number(s.cash||0))throw new Error('예수금보다 많이 출금할 수 없습니다.');
      s.cash=Number(s.cash||0)-tx.amount;
      s.cashD2=s.cash;
      message=`예수금 -${Math.round(tx.amount).toLocaleString()}원`;
    }else throw new Error('거래 구분을 확인해 주세요.');
    const after=PRMRisk.calc(s);
    const trades=this.trades();
    trades.push({...tx,at:new Date().toISOString(),cashBefore:before.cash,cashAfter:after.cash,loanBefore:before.loan,loanAfter:after.loan});
    PRMStorage.set('trades',trades.slice(-1000));
    this.save(s);
    this.lastResult={message,before,after,tx};
    return s;
  }
};
