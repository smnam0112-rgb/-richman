window.PRMRisk={
  baseEffectiveDebt(){return PRM_CONFIG.baseline.portfolioValue/(PRM_CONFIG.baseline.collateralRatio/100)},
  baseLoan(){return PRM_CONFIG.positions.reduce((a,p)=>a+(p.loan||0),0)},
  debtAdjustment(){return this.baseEffectiveDebt()-this.baseLoan()},
  debt(s,extraRepay=0){const loan=s.positions.reduce((a,p)=>a+(p.loan||0),0);return Math.max(1,loan+this.debtAdjustment()-Math.max(0,extraRepay))},
  sensitivities(){
    const base={...(PRM_CONFIG.stressSensitivity||{})};
    try{return{...base,...JSON.parse(localStorage.getItem('prm:stressSensitivity')||'{}')}}catch(e){return base}
  },
  setSensitivity(name,value){
    const all=this.sensitivities();all[name]=Math.max(0,Math.min(2,Number(value||0)));localStorage.setItem('prm:stressSensitivity',JSON.stringify(all));return all[name];
  },
  scenarioMove(s,hynixPrice){const cur=this.hynixCurrent(s);return cur>0&&hynixPrice>0?hynixPrice/cur-1:0},
  scenarioPriceFor(s,p,hynixPrice){
    if(!hynixPrice)return p.price;
    if(p.name==='SK하이닉스')return hynixPrice;
    const k=Number(this.sensitivities()[p.name]||0),move=this.scenarioMove(s,hynixPrice);
    return Math.max(0,p.price*(1+move*k));
  },
  scenarioPrices(s,hynixPrice){
    const out={};
    for(const p of s.positions)out[p.name]=this.scenarioPriceFor(s,p,hynixPrice);
    return out;
  },
  calc(s,opts={}){
    let value=0,cost=0,loan=0;
    for(const p of s.positions){
      const price=opts.hynixPrice&&opts.linkedStress!==false?this.scenarioPriceFor(s,p,opts.hynixPrice):(opts.hynixPrice&&p.name==='SK하이닉스'?opts.hynixPrice:p.price);
      value+=p.qty*price;cost+=p.qty*p.avg;loan+=p.loan||0;
    }
    const repay=Math.min(Math.max(0,opts.repay||0),loan);
    const cash=Math.max(0,s.cash-repay);
    const effectiveDebt=this.debt(s,repay);
    const pnl=value-cost;
    return{value,cost,loan:loan-repay,pnl,net:value+cash-(loan-repay),cash,collateral:value/effectiveDebt*100,effectiveDebt};
  },
  hynixQty(s){return s.positions.filter(p=>p.name==='SK하이닉스').reduce((a,p)=>a+p.qty,0)},
  hynixValue(s,price){return this.hynixQty(s)*(price||this.hynixCurrent(s))},
  hynixCurrent(s){const p=s.positions.find(x=>x.name==='SK하이닉스');return p?p.price:0},
  hynixThreshold(s,target){
    let lo=0,hi=Math.max(PRM_CONFIG.stress.max||2300000,this.hynixCurrent(s)*3,3000000);
    if(this.calc(s,{hynixPrice:hi}).collateral<target)return hi;
    for(let i=0;i<48;i++){const mid=(lo+hi)/2;if(this.calc(s,{hynixPrice:mid}).collateral>=target)hi=mid;else lo=mid}
    return hi;
  },
  concentration(s,opts={}){const r=this.calc(s,opts);return r.value?this.hynixValue(s,opts.hynixPrice)/r.value*100:0},
  repaymentForTarget(s,target){const r=this.calc(s);const neededDebt=r.value/(target/100);return Math.max(0,Math.min(r.loan,r.effectiveDebt-neededDebt))},
  maxLossUsed(s,opts={}){const r=this.calc(s,opts);return Math.max(0,-r.pnl)},
  zone(collateral){if(collateral>=180)return{key:'safe',label:'안정',emoji:'🟢'};if(collateral>=170)return{key:'caution',label:'주의',emoji:'🟡'};if(collateral>=160)return{key:'defense',label:'방어',emoji:'🟠'};if(collateral>=150)return{key:'danger',label:'위험',emoji:'🔴'};return{key:'critical',label:'초위험',emoji:'🚨'}},
  health(s,opts={}){const r=this.calc(s,opts),c=this.concentration(s,opts);let score=100;
    if(r.collateral<180)score-=10;if(r.collateral<170)score-=15;if(r.collateral<160)score-=20;if(r.collateral<150)score-=20;
    if(c>65)score-=10;if(c>75)score-=10;const lr=r.loan/(r.value||1);if(lr>.5)score-=10;if(lr>.6)score-=10;
    const ml=Math.max(0,s.monthlyLoss||0);if(ml>PRM_CONFIG.baseline.monthlyLossLimit*.5)score-=5;if(ml>PRM_CONFIG.baseline.monthlyLossLimit)score-=15;
    return{score:Math.max(0,Math.min(100,score)),concentration:c,leverage:lr*100,zone:this.zone(r.collateral)};
  },
  stressRows(s){
    const out=[];
    for(let px=PRM_CONFIG.stress.min;px<=PRM_CONFIG.stress.max;px+=PRM_CONFIG.stress.tableStep){
      const r=this.calc(s,{hynixPrice:px}),prices=this.scenarioPrices(s,px);
      out.push({price:px,prices,value:r.value,pnl:r.pnl,net:r.net,collateral:r.collateral,zone:this.zone(r.collateral)});
    }
    return out;
  }
};
