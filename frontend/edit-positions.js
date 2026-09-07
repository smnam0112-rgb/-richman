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
      #portfolio .auto-price,#portfolio .remove-pos{margin-left:4px;padding:5px 7px;border:1px solid #cbd5e1;border-radius:7px;background:#f8fafc;font-size:11px;cursor:pointer}
      #portfolio .remove-pos{color:#b91c1c;border-color:#fecaca;background:#fff1f2}
      #portfolio .add-position{margin:14px 0;padding:14px;border:1px solid #dbeafe;border-radius:12px;background:#f8fbff}
      #portfolio .add-position h3{margin:0 0 10px;font-size:15px}
      #portfolio .add-grid{display:grid;grid-template-columns:1.3fr 1fr repeat(4,minmax(100px,1fr)) auto;gap:8px;align-items:end}
      #portfolio .add-grid label{display:block;font-size:12px;color:#475569;margin-bottom:4px}
      #portfolio .add-grid input,#portfolio .add-grid select{width:100%;box-sizing:border-box;padding:8px;border:1px solid #cbd5e1;border-radius:8px;background:#fff;color:#111827;font:inherit}
      #portfolio .add-btn{padding:9px 14px;border:0;border-radius:8px;background:#2563eb;color:#fff;font-weight:700;cursor:pointer}
      #portfolio .add-note{margin-top:8px;font-size:12px;color:#64748b}
      @media(max-width:900px){#portfolio .add-grid{grid-template-columns:1fr 1fr 1fr}}
      @media(max-width:700px){#portfolio .editnum{width:92px;padding:9px 6px;font-size:16px}#portfolio .add-grid{grid-template-columns:1fr 1fr}#portfolio .add-btn{width:100%}}
    `;
    document.head.appendChild(s);
  }

  function addForm(sec,table){
    if(sec.querySelector('.add-position'))return;
    const wrap=document.createElement('div');
    wrap.className='add-position';
    const tickerOptions=Object.keys(PRM_CONFIG.tickers||{}).map(n=>`<option value="${n}">${n}</option>`).join('');
    wrap.innerHTML=`<h3>종목 추가</h3><div class="add-grid">
      <div><label>종목명</label><input id="addPosName" list="richmanTickerList" placeholder="예: NAVER"><datalist id="richmanTickerList">${tickerOptions}</datalist></div>
      <div><label>구분</label><select id="addPosType"><option>현금</option><option>유통융자</option><option>자기융자</option><option>신용</option></select></div>
      <div><label>수량</label><input id="addPosQty" type="number" min="0" step="1" value="1"></div>
      <div><label>평단</label><input id="addPosAvg" type="number" min="0" step="1" placeholder="원"></div>
      <div><label>현재가</label><input id="addPosPrice" type="number" min="0" step="1" placeholder="원"></div>
      <div><label>융자금</label><input id="addPosLoan" type="number" min="0" step="1" value="0"></div>
      <button class="add-btn" id="addPositionBtn" type="button">종목 추가</button>
    </div><div class="add-note">등록된 종목은 자동시세를 사용할 수 있고, 없는 종목은 입력한 현재가를 수동가격으로 유지합니다.</div>`;
    table.parentElement.after(wrap);
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
      help.innerHTML='<span class="edit-badge">직접 수정 가능</span><span>수량 · 평단 · 현재가 · 융자금을 수정할 수 있고, 매도 완료 종목은 삭제할 수 있습니다.</span>';
      table.parentElement.before(help);
    }
    const head=table.querySelector('thead tr');
    if(head && !head.querySelector('[data-remove-head]')){
      const th=document.createElement('th');th.textContent='관리';th.dataset.removeHead='1';head.appendChild(th);
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
      let manage=tr.querySelector('[data-manage-cell]');
      if(!manage){manage=document.createElement('td');manage.dataset.manageCell='1';tr.appendChild(manage);}
      manage.innerHTML=`<button class="remove-pos" data-remove-pos="${i}" type="button">삭제</button>`;
    });
    addForm(sec,table);
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
    const auto=e.target.closest('[data-auto-price]');
    if(auto){
      const i=Number(auto.dataset.autoPrice);
      if(Number.isInteger(i)&&state.positions[i]){
        state.positions[i].manualPrice=false;
        const px=PRMMarket.price(state.positions[i].name);
        if(px>0)state.positions[i].price=px;
        PRMPortfolio.save(state);
        if(typeof render==='function')render();
      }
      return;
    }
    const del=e.target.closest('[data-remove-pos]');
    if(del){
      const i=Number(del.dataset.removePos);
      if(!Number.isInteger(i)||!state.positions[i])return;
      const p=state.positions[i];
      if(!confirm(`${p.name} ${p.type} 포지션을 삭제할까요?`))return;
      state.positions.splice(i,1);
      PRMPortfolio.save(state);
      scenarioPrice=PRMRisk.hynixCurrent(state)||scenarioPrice;
      if(typeof render==='function')render();
      return;
    }
    if(e.target.closest('#addPositionBtn')){
      const name=(document.getElementById('addPosName')?.value||'').trim();
      const type=document.getElementById('addPosType')?.value||'현금';
      const qty=Math.max(0,Number(document.getElementById('addPosQty')?.value||0));
      const avg=Math.max(0,Number(document.getElementById('addPosAvg')?.value||0));
      let price=Math.max(0,Number(document.getElementById('addPosPrice')?.value||0));
      const loan=Math.max(0,Number(document.getElementById('addPosLoan')?.value||0));
      if(!name){alert('종목명을 입력해 주세요.');return;}
      if(qty<=0){alert('수량은 1주 이상 입력해 주세요.');return;}
      if(avg<=0){alert('평단을 입력해 주세요.');return;}
      const autoKnown=!!(PRM_CONFIG.tickers&&PRM_CONFIG.tickers[name]);
      if(autoKnown){const px=PRMMarket.price(name);if(px>0)price=px;}
      if(price<=0){alert('현재가를 입력해 주세요.');return;}
      state.positions.push({name,type,qty,avg,price,loan,manualPrice:!autoKnown});
      PRMPortfolio.save(state);
      if(name==='SK하이닉스')scenarioPrice=PRMRisk.hynixCurrent(state)||scenarioPrice;
      if(typeof render==='function')render();
    }
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
  if(oldRender){render=function(){oldRender();setTimeout(enhance,0);};}
  if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',()=>setTimeout(enhance,0));
  else setTimeout(enhance,0);
})();
