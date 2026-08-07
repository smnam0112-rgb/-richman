window.PRMRisk={
  debt(){return PRM_CONFIG.baseline.portfolioValue/(PRM_CONFIG.baseline.collateralRatio/100)},
  calc(s){let value=0,cost=0,loan=0;for(const p of s.positions){value+=p.qty*p.price;cost+=p.qty*p.avg;loan+=p.loan}
    return{value,cost,loan,pnl:value-cost,net:value+s.cash-loan,collateral:value/this.debt()*100}},
  hynixThreshold(s,target){const hq=s.positions.filter(p=>p.name==='SK하이닉스').reduce((a,p)=>a+p.qty,0);
    const non=s.positions.filter(p=>p.name!=='SK하이닉스').reduce((a,p)=>a+p.qty*p.price,0);
    return hq?(this.debt()*(target/100)-non)/hq:0},
  health(s){const r=this.calc(s);let score=100;
    if(r.collateral<180)score-=10;if(r.collateral<170)score-=15;if(r.collateral<160)score-=25;
    const h=s.positions.filter(p=>p.name==='SK하이닉스').reduce((a,p)=>a+p.qty*p.price,0)/(r.value||1);
    if(h>.65)score-=15;if(h>.8)score-=10;const lr=r.loan/(r.value||1);if(lr>.5)score-=15;
    return{score:Math.max(0,Math.min(100,score))}}
};
