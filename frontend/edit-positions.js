(function(){
  function injectStyle(){
    if(document.getElementById('richman-edit-style'))return;
    const s=document.createElement('style');
    s.id='richman-edit-style';
    s.textContent=`
      #portfolio .editnum{width:110px;max-width:100%;padding:7px 8px;border:1px solid #cbd5e1;border-radius:8px;background:#fff;font:inherit;text-align:right}
      #portfolio .editnum:focus{outline:2px solid #2563eb33;border-color:#2563eb}
      #portfolio .edit-help{display:flex;gap:8px;align-items:center;flex-wrap:wrap;margin:8px 0 12px;color:#475569;font-size:13px}
      #portfolio .edit-badge{display:inline-block;padding:3px 8px;border-radius:999px;background:#e0f2fe;color:#075985;font-weight:700}
      @media(max-width:700px){#portfolio .editnum{width:92px;padding:9px 6px;font-size:16px}}
    `;
    document.head.appendChild(s);
  }

  function enhance(){
    injectStyle();
    const sec=document.getElementById('portfolio');
    if(!sec || typeof state==='undefined')return;
    const table=sec.querySelector('table');
    if(!table)return;
    if(!sec.querySelector('.edit-help')){
      const help=document.createElement('div');
      help.className='edit-help';
      help.innerHTML='<span class="edit-badge">직접 수정 가능</span><span>수량과 평단을 숫자로 바꾸면 즉시 저장됩니다.</span>';
      table.parentElement.before(help);
    }
    const rows=table.querySelectorAll('tbody tr');
    rows.forEach((tr,i)=>{
      const p=state.positions[i];
      if(!p)return;
      const tds=tr.children;
      if(tds.length<4)return;
      if(!tds[2].querySelector('[data-edit-qty]'))tds[2].innerHTML=`<input class="editnum" data-edit-qty="${i}" inputmode="decimal" type="number" min="0" step="1" value="${Number(p.qty||0)}">`;
      if(!tds[3].querySelector('[data-edit-avg]'))tds[3].innerHTML=`<input class="editnum" data-edit-avg="${i}" inputmode="decimal" type="number" min="0" step="1" value="${Math.round(Number(p.avg||0))}">`;
    });
  }

  document.addEventListener('change',e=>{
    const q=e.target.closest('[data-edit-qty]');
    const a=e.target.closest('[data-edit-avg]');
    if(!q&&!a)return;
    const i=Number((q||a).dataset[q?'editQty':'editAvg']);
    if(!Number.isInteger(i)||!state.positions[i])return;
    const v=Math.max(0,Number((q||a).value||0));
    if(q)state.positions[i].qty=v;
    if(a)state.positions[i].avg=v;
    PRMPortfolio.save(state);
    if(typeof scenarioPrice!=='undefined'&&state.positions[i].name==='SK하이닉스')scenarioPrice=PRMRisk.hynixCurrent(state)||scenarioPrice;
    if(typeof render==='function')render();
  });

  const oldRender=typeof render==='function'?render:null;
  if(oldRender){
    render=function(){
      oldRender();
      setTimeout(enhance,0);
    };
  }
  if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',()=>setTimeout(enhance,0));
  else setTimeout(enhance,0);
})();
