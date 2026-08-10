(()=>{
  const originalSet=PRMStorage.set.bind(PRMStorage);
  const memory={};
  PRMStorage.set=function(k,v){
    memory[k]=JSON.parse(JSON.stringify(v));
    try{originalSet(k,v)}catch(e){console.warn('localStorage save failed; using in-memory state for this session',e)}
  };

  PRMPortfolio.trade=function(s,t){
    const tx={
      kind:String(t.kind||''),
      name:String(t.name||''),
      type:String(t.type||''),
      qty:Math.max(0,Number(t.qty||0)),
      price:Math.max(0,Number(t.price||0)),
      amount:Math.max(0,Number(t.amount||0))
    };
    const before=PRMRisk.calc(s);
    let message='';

    if(tx.kind==='buy'){
      if(!tx.name) throw new Error('종목을 선택해 주세요.');
      if(tx.qty<=0) throw new Error('매수 수량을 입력해 주세요.');
      if(tx.price<=0) throw new Error('매수 가격을 입력해 주세요.');
      let p=s.positions.find(x=>x.name===tx.name&&x.type===tx.type);
      if(!p){p={name:tx.name,type:tx.type,qty:0,avg:0,loan:0,price:tx.price};s.positions.push(p)}
      const oldQty=Number(p.qty||0),oldCost=Number(p.avg||0)*oldQty,addCost=tx.price*tx.qty;
      p.qty=oldQty+tx.qty;
      p.avg=p.qty>0?(oldCost+addCost)/p.qty:0;
      p.price=tx.price;
      if(tx.type==='현금'){
        s.cash=Number(s.cash||0)-addCost;
        message=`${tx.name} 현금매수 ${tx.qty.toLocaleString()}주 반영 완료`;
      }else{
        p.loan=Number(p.loan||0)+tx.amount;
        message=tx.amount>0
          ?`${tx.name} ${tx.type} ${tx.qty.toLocaleString()}주 반영 완료 · 융자 ${Math.round(tx.amount).toLocaleString()}원 증가`
          :`${tx.name} ${tx.type} ${tx.qty.toLocaleString()}주 반영 완료 · 주의: 융자증가액은 0원으로 반영됨`;
      }
    }else if(tx.kind==='sell'){
      if(!tx.name) throw new Error('종목을 선택해 주세요.');
      if(tx.qty<=0) throw new Error('매도 수량을 입력해 주세요.');
      if(tx.price<=0) throw new Error('매도 가격을 입력해 주세요.');
      let rem=tx.qty;
      const targets=s.positions.filter(x=>x.name===tx.name&&x.qty>0).sort((a,b)=>a.type===tx.type?-1:b.type===tx.type?1:0);
      const available=targets.reduce((a,p)=>a+Number(p.qty||0),0);
      if(available<tx.qty) throw new Error(`보유수량은 ${available.toLocaleString()}주입니다.`);
      for(const p of targets){
        if(rem<=0)break;
        const oldQty=Number(p.qty||0),n=Math.min(rem,oldQty),ratio=oldQty?n/oldQty:0,loanRepay=Number(p.loan||0)*ratio;
        p.qty=oldQty-n;
        p.loan=Math.max(0,Number(p.loan||0)-loanRepay);
        s.cash=Number(s.cash||0)+n*tx.price-loanRepay;
        rem-=n;
      }
      s.positions=s.positions.filter(x=>x.qty>0);
      message=`${tx.name} ${tx.qty.toLocaleString()}주 매도 반영 완료`;
    }else if(tx.kind==='repay'){
      if(tx.amount<=0) throw new Error('신용상환 금액을 입력해 주세요.');
      let rem=Math.min(tx.amount,Math.max(0,Number(s.cash||0)));
      const start=rem;
      for(const p of s.positions.filter(x=>Number(x.loan||0)>0)){
        if(rem<=0)break;
        const x=Math.min(rem,Number(p.loan||0));p.loan-=x;rem-=x;
      }
      const used=start-rem;
      s.cash=Number(s.cash||0)-used;
      message=`신용 ${Math.round(used).toLocaleString()}원 상환 반영 완료`;
    }else if(tx.kind==='deposit'){
      if(tx.amount<=0) throw new Error('입금 금액을 입력해 주세요.');
      s.cash=Number(s.cash||0)+tx.amount;
      message=`${Math.round(tx.amount).toLocaleString()}원 입금 반영 완료`;
    }else if(tx.kind==='withdraw'){
      if(tx.amount<=0) throw new Error('출금 금액을 입력해 주세요.');
      s.cash=Number(s.cash||0)-tx.amount;
      message=`${Math.round(tx.amount).toLocaleString()}원 출금 반영 완료`;
    }else{
      throw new Error('거래 구분을 확인해 주세요.');
    }

    const trades=PRMPortfolio.trades();
    trades.push({...tx,at:new Date().toISOString()});
    PRMStorage.set('trades',trades.slice(-1000));
    PRMPortfolio.save(s);
    const after=PRMRisk.calc(s);
    PRMPortfolio.lastResult={message,before,after,tx};
    return s;
  };

  document.addEventListener('click',e=>{
    const btn=e.target.closest&&e.target.closest('#applyTrade');
    if(!btn)return;
    e.preventDefault();
    e.stopImmediatePropagation();
    try{
      const t={
        kind:document.getElementById('kind').value,
        name:document.getElementById('name').value,
        type:document.getElementById('type').value,
        qty:Number(document.getElementById('qty').value||0),
        price:Number(document.getElementById('price').value||0),
        amount:Number(document.getElementById('amount').value||0)
      };
      state=PRMPortfolio.trade(state,t);
      scenarioPrice=PRMRisk.hynixCurrent(state);
      const result=PRMPortfolio.lastResult;
      render();
      alert(`✅ ${result.message}\n\n평가금액: ${Math.round(result.before.value).toLocaleString()}원 → ${Math.round(result.after.value).toLocaleString()}원\n신용융자: ${Math.round(result.before.loan).toLocaleString()}원 → ${Math.round(result.after.loan).toLocaleString()}원\n예수금: ${Math.round(result.before.cash).toLocaleString()}원 → ${Math.round(result.after.cash).toLocaleString()}원`);
    }catch(err){
      alert('거래 반영 실패: '+(err&&err.message?err.message:String(err)));
    }
  },true);
})();
