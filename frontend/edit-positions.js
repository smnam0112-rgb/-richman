(function(){
  function injectStyle(){
    if(document.getElementById('richman-edit-style'))return;
    const s=document.createElement('style');
    s.id='richman-edit-style';
    s.textContent=`
      #portfolio .editnum{width:110px;max-width:100%;padding:7px 8px;border:1px solid #cbd5e1;border-radius:8px;background:#fff;font:inherit;text-align:right;color:#111827}
      #portfolio .editnum:focus{outline:2px solid #2563eb33;border-color:#2563eb}
      #portfolio .editnum.manual{background:#fff7d6;border-color:#eab308}
      #portfolio .edit-help{display:flex;gap:8px;align-items:center;flex-wrap:wrap;margin:8px 0 12px;color:#475569;font-size:13px}
      #portfolio .edit-badge{display:inline-block;padding:3px 8px;border-radius:999px;background:#e0f2fe;color:#075985;font-weight:700}
      #portfolio .auto-price{margin-left:4px;padding:5px 7px;border:1px solid #cbd5e1;border-radius:7px;background:#f8fafc;font-size:11px;cursor:pointer}
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
      help.innerHTML='<span class="edit-badge">직접 수정 가능</span><span>수량 · 평단 · 현재가 · 융자금을 바로 수정할 수 있습니다. 현재가를 직접 입력하면 자동시세보다 우선합니다.</span>';
      table.parentElement.before(help);
    }
    const rows=table.querySelectorAll('tbody tr');
    rows.forEach((tr,i)=>{
      const p=state.positions[i];
      if(!p)return;
      const tds=tr.children;
      if(tds.length<11)return;
      tds[2].innerHTML=`<input class="editnum" data-edit-qty="${i}" inputmode="decimal" type="number" min="0" step="1" value="${Number(p.qty||0)}">`;
      tds[3].innerHTML=`<input class="editnum" data-edit-avg="${i}" inputmode="decimal" type="number" min="0" step="1" value="${Math.round(Number(p.avg||0))}">`;
      tds[5].innerHTML=`<input class="editnum ${p.manualPrice?'manual':''}" data-edit-price="${i}" inputmode="decimal" type="number" min="0" step="1" value="${Math.round(Number(p.price||0))}">${p.manualPrice?`<button class="auto-price" data-auto-price="${i}" type="button">자동</button>`:''}`;
      tds[10].innerHTML=`<input class="editnum" data-edit-loan="${i}" inputmode="decimal" type="number" min="0" step="1" value="${Math.round(Number(p.loan||0))}">`;
    });
  }

  document.addEventListener('change',e=>{
    const q=e.target.closest('[data-edit-qty]');
    const a=e.target.closest('[data-edit-avg]');
    const pr=e.target.closest('[data-edit-price]');
    const l=e.target.closest('[data-edit-loan]');
    const target=q||a||pr||l;
    if(!target)return;
    const key=q?'editQty':a?'editAvg':pr?'editPrice':'editLoan';
    const i=Number(target.dataset[key]);
    if(!Number.isInteger(i)||!state.positions[i])return;
    const v=Math.max(0,Number(target.value||0));
    if(q)state.positions[i].qty=v;
    if(a)state.positions[i].avg=v;
    if(pr){state.positions[i].price=v;state.positions[i].manualPrice=true;}
    if(l)state.positions[i].loan=v;
    PRMPortfolio.save(state);
    if(typeof scenarioPrice!=='undefined'&&state.positions[i].name==='SK하이닉스')scenarioPrice=PRMRisk.hynixCurrent(state)||scenarioPrice;
    if(typeof render==='function')render();
  });

  document.addEventListener('click',e=>{
    const b=e.target.closest('[data-auto-price]');
    if(!b)return;
    const i=Number(b.dataset.autoPrice);
    if(!Number.isInteger(i)||!state.positions[i])return;
    state.positions[i].manualPrice=false;
    const px=PRMMarket.price(state.positions[i].name);
    if(px>0)state.positions[i].price=px;
    PRMPortfolio.save(state);
    if(typeof render==='function')render();
  });

  const originalSync=typeof syncPrices==='function'?syncPrices:null;
  if(originalSync){
    syncPrices=function(){
      for(const p of state.positions){
        if(p.manualPrice)continue;
        const px=PRMMarket.price(p.name);
        if(px>0)p.price=px;
      }
      scenarioPrice=PRMRisk.hynixCurrent(state);
      PRMPortfolio.save(state);
    };
  }

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
