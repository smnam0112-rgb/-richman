(()=>{
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
