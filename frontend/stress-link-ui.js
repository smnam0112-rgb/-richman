window.PRMStressLinkUI={
  inject(){
    const sec=document.getElementById('stress');if(!sec||typeof state==='undefined'||typeof scenarioPrice==='undefined')return;
    document.getElementById('linkedStressPanel')?.remove();
    const current=PRMRisk.hynixCurrent(state),move=current?scenarioPrice/current-1:0,sens=PRMRisk.sensitivities(),prices=PRMRisk.scenarioPrices(state,scenarioPrice);
    const held=new Set(state.positions.filter(p=>Number(p.qty||0)>0).map(p=>p.name));
    const names=['삼성전자','SK스퀘어','삼성전기'].filter(name=>held.has(name));
    const reg=typeof PRMStressRegression!=='undefined'?PRMStressRegression:null;
    const cards=names.map(name=>{const base=(state.positions.find(p=>p.name===name)||{}).price||0,px=prices[name]||base,k=Number(sens[name]||0),chg=base?(px/base-1)*100:0,manual=PRMRisk.isManualSensitivity(name);return `<div class="riskbox"><b>${name}</b><strong>${Math.round(px).toLocaleString('ko-KR')}원</strong><small class="${chg>0?'pos':chg<0?'neg':''}">${chg>=0?'+':''}${chg.toFixed(2)}% · β ${k.toFixed(3)}${manual?' (수동)':' (자동)'}</small></div>`}).join('');
    const controls=names.map(name=>{const manual=PRMRisk.isManualSensitivity(name);return `<div class="field"><label>${name} 적용 β</label><div style="display:flex;gap:6px"><input data-stress-sens="${name}" type="number" min="-2" max="2" step="0.01" value="${Number(sens[name]||0).toFixed(3)}"><button class="tiny" data-stress-auto="${name}" ${manual?'':'disabled'}>자동</button></div></div>`}).join('');
    const rows=names.map(name=>{const a=reg&&reg.stats(name,'3m'),b=reg&&reg.stats(name,'6m');const f=x=>x==null?'—':Number(x).toFixed(3);return `<tr><td>${name}</td><td>${a?f(a.beta):'—'}</td><td>${b?f(b.beta):'—'}</td><td>${b?f(b.correlation):'—'}</td><td>${b?f(b.r2):'—'}</td><td>${b?b.n:'—'}</td></tr>`}).join('');
    const windowKey=reg?reg.windowKey:'6m';
    const html=`<div id="linkedStressPanel" class="panel" style="margin-top:12px;background:#0b1320"><h3 style="margin-top:0">실제 수익률 연동 스트레스 모델</h3><div class="riskstrip"><div class="riskbox"><b>하이닉스 변동률</b><strong class="${move>0?'pos':move<0?'neg':''}">${move>=0?'+':''}${(move*100).toFixed(2)}%</strong><small>현재가 대비</small></div>${cards}</div><div style="display:flex;align-items:center;gap:8px;margin-top:12px"><span class="muted">자동 β 기준</span><select id="stressRegWindow" style="width:auto"><option value="3m" ${windowKey==='3m'?'selected':''}>최근 3개월</option><option value="6m" ${windowKey==='6m'?'selected':''}>최근 6개월</option></select><span class="muted">${reg?reg.updatedLabel():'회귀 데이터 확인 중'}</span></div>${names.length?`<div class="tablewrap" style="margin-top:10px"><table><thead><tr><th>종목</th><th>3M β</th><th>6M β</th><th>6M 상관</th><th>6M R²</th><th>표본</th></tr></thead><tbody>${rows}</tbody></table></div><div class="grid3" style="margin-top:12px">${controls}</div>`:''}<p class="muted">현재 보유 중인 종목만 연동합니다. β는 일별 종가 수익률 OLS 회귀값이며 기본은 6개월 회귀입니다.</p></div>`;
    const slider=sec.querySelector('.sliderrow');if(slider)slider.insertAdjacentHTML('afterend',html);else sec.insertAdjacentHTML('afterbegin',html);
    const win=document.getElementById('stressRegWindow');if(win&&reg)win.addEventListener('change',()=>reg.setWindow(win.value));
    sec.querySelectorAll('[data-stress-sens]').forEach(el=>el.addEventListener('change',()=>{PRMRisk.setSensitivity(el.dataset.stressSens,Number(el.value));if(typeof render==='function')render();}));
    sec.querySelectorAll('[data-stress-auto]').forEach(el=>el.addEventListener('click',()=>{PRMRisk.clearSensitivity(el.dataset.stressAuto);if(typeof render==='function')render();}));
  }
};
let prmStressLinkTimer=null;
new MutationObserver(()=>{clearTimeout(prmStressLinkTimer);prmStressLinkTimer=setTimeout(()=>PRMStressLinkUI.inject(),50)}).observe(document.getElementById('app'),{childList:true,subtree:true});
PRMStressLinkUI.inject();
