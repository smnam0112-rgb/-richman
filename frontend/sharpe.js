window.PRMSharpe={
  history:[],
  rfAnnual:Number(localStorage.getItem('prm:sharpeRiskFree')||3),
  async load(){
    try{
      const res=await fetch('data/performance_history.json?ts='+Date.now(),{cache:'no-store'});
      if(!res.ok) throw new Error('performance history unavailable');
      const data=await res.json();
      this.history=Array.isArray(data.series)?data.series.filter(x=>Number(x.net_asset)>0):[];
    }catch(e){this.history=[];console.warn(e)}
    this.inject();
  },
  returns(){
    const vals=this.history.map(x=>Number(x.net_asset)).filter(x=>x>0);
    const out=[];
    for(let i=1;i<vals.length;i++) out.push(vals[i]/vals[i-1]-1);
    return out;
  },
  calc(){
    const rs=this.returns();
    if(rs.length<3) return {value:null,count:rs.length,reason:'최소 4거래일의 순자산 종가가 필요합니다.'};
    const rfDaily=Math.pow(1+Math.max(-99,this.rfAnnual)/100,1/252)-1;
    const excess=rs.map(r=>r-rfDaily);
    const mean=excess.reduce((a,b)=>a+b,0)/excess.length;
    const variance=excess.reduce((a,b)=>a+Math.pow(b-mean,2),0)/(excess.length-1);
    const sd=Math.sqrt(variance);
    if(!isFinite(sd)||sd===0) return {value:null,count:rs.length,reason:'수익률 변동성이 없어 계산할 수 없습니다.'};
    return {value:mean/sd*Math.sqrt(252),count:rs.length,meanDaily:rs.reduce((a,b)=>a+b,0)/rs.length,volDaily:sd};
  },
  label(v){if(v==null)return '데이터 축적 중';if(v>=1)return '양호';if(v>=.5)return '보통';if(v>=0)return '낮음';return '음수';},
  inject(){
    const app=document.getElementById('app');if(!app)return;
    const result=this.calc();
    const value=result.value==null?'—':result.value.toFixed(2);
    const label=this.label(result.value);
    const kpis=app.querySelector('.kpis');
    if(kpis){
      let k=document.getElementById('sharpeKpi');
      if(!k){k=document.createElement('div');k.id='sharpeKpi';k.className='kpi';kpis.appendChild(k)}
      k.innerHTML=`<b>샤프지수</b><strong>${value}</strong><small>${label} · 일별 종가 기준</small>`;
    }
    const old=document.getElementById('sharpePanel');if(old)old.remove();
    const risk=document.getElementById('risk');
    if(risk){
      const sec=document.createElement('section');sec.id='sharpePanel';sec.className='panel';
      sec.innerHTML=`<h2>샤프지수</h2><div class="riskstrip"><div class="riskbox"><b>연환산 Sharpe</b><strong>${value}</strong></div><div class="riskbox"><b>판정</b><strong>${label}</strong></div><div class="riskbox"><b>수익률 관측치</b><strong>${result.count}일</strong></div><div class="riskbox"><b>무위험수익률</b><strong>${this.rfAnnual.toFixed(2)}%</strong></div></div><div class="field" style="margin-top:12px"><label>연 무위험수익률 직접 입력 (%)</label><input id="sharpeRf" type="number" step="0.1" value="${this.rfAnnual}"></div><p class="muted">매일 오후 8시에 저장되는 순자산의 일별 수익률로 계산하고 252거래일 기준으로 연환산합니다. ${result.reason||'값이 높을수록 같은 변동성 대비 초과수익이 컸다는 뜻입니다.'}</p>`;
      risk.insertAdjacentElement('afterend',sec);
      const input=document.getElementById('sharpeRf');
      if(input)input.onchange=e=>{this.rfAnnual=Number(e.target.value||0);localStorage.setItem('prm:sharpeRiskFree',String(this.rfAnnual));this.inject()};
    }
  }
};

(function(){
  let timer=null;
  const target=document.getElementById('app');
  if(target){new MutationObserver(()=>{clearTimeout(timer);timer=setTimeout(()=>PRMSharpe.inject(),30)}).observe(target,{childList:true,subtree:true});}
  PRMSharpe.load();
})();
