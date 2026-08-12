window.PRMStressLinkUI={
  inject(){
    const sec=document.getElementById('stress');if(!sec||typeof state==='undefined'||typeof scenarioPrice==='undefined')return;
    document.getElementById('linkedStressPanel')?.remove();
    const current=PRMRisk.hynixCurrent(state),move=current?scenarioPrice/current-1:0,sens=PRMRisk.sensitivities(),prices=PRMRisk.scenarioPrices(state,scenarioPrice);
    const names=['삼성전자','SK스퀘어','삼성전기'];
    const cards=names.map(name=>{const base=(state.positions.find(p=>p.name===name)||{}).price||0,px=prices[name]||base,k=Number(sens[name]||0),chg=base?(px/base-1)*100:0;return `<div class="riskbox"><b>${name}</b><strong>${Math.round(px).toLocaleString('ko-KR')}원</strong><small class="${chg>0?'pos':chg<0?'neg':''}">${chg>=0?'+':''}${chg.toFixed(2)}% · ${k.toFixed(2)}×</small></div>`}).join('');
    const controls=names.map(name=>`<div class="field"><label>${name} 민감도</label><input data-stress-sens="${name}" type="number" min="0" max="2" step="0.05" value="${Number(sens[name]||0).toFixed(2)}"></div>`).join('');
    const html=`<div id="linkedStressPanel" class="panel" style="margin-top:12px;background:#0b1320"><h3 style="margin-top:0">연동 스트레스 모델</h3><div class="riskstrip"><div class="riskbox"><b>하이닉스 변동률</b><strong class="${move>0?'pos':move<0?'neg':''}">${move>=0?'+':''}${(move*100).toFixed(2)}%</strong><small>현재가 대비</small></div>${cards}</div><div class="grid3" style="margin-top:12px">${controls}</div><p class="muted">기본값은 가정치입니다. 하이닉스가 10% 움직일 때 삼성전자 4.5%, SK스퀘어 7.5%, 삼성전기 3.0%가 같은 방향으로 움직인다고 가정합니다. 민감도는 직접 수정할 수 있으며 저장됩니다.</p></div>`;
    const slider=sec.querySelector('.sliderrow');if(slider)slider.insertAdjacentHTML('afterend',html);else sec.insertAdjacentHTML('afterbegin',html);
    sec.querySelectorAll('[data-stress-sens]').forEach(el=>el.addEventListener('change',()=>{PRMRisk.setSensitivity(el.dataset.stressSens,Number(el.value));if(typeof render==='function')render();}));
  }
};
let prmStressLinkTimer=null;
new MutationObserver(()=>{clearTimeout(prmStressLinkTimer);prmStressLinkTimer=setTimeout(()=>PRMStressLinkUI.inject(),50)}).observe(document.getElementById('app'),{childList:true,subtree:true});
PRMStressLinkUI.inject();
