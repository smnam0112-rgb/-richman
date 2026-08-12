(()=>{
  if(typeof window.PRMMarket==='undefined')return;

  const venueText=()=>{
    const M=PRMMarket;
    if(M.activeVenue==='NXT'){
      if(M.activeSession==='NXT_PRE')return ['source-live','🟣 NXT 프리마켓 반영','계좌평가 NXT · KRX 기준가 별도 표시'];
      if(M.activeSession==='NXT_AFTER')return ['source-live','🟣 NXT 애프터마켓 반영','계좌평가 NXT · KRX 종가 별도 표시'];
      if(M.activeSession==='NXT_FINAL')return ['source-ok','🟣 NXT 최종가 반영','마지막 NXT 가격 · KRX 종가 별도 표시'];
      return ['source-live','🟣 NXT 시세 반영','계좌평가 NXT · KRX 가격 별도 표시'];
    }
    if(M.mode==='live')return ['source-live','🔵 KRX 장중 시세 반영','NXT 가격도 함께 확인'];
    if(M.mode==='stale')return ['source-warning','🟡 시세 갱신 지연','마지막 수신값 사용'];
    if(M.mode==='fallback')return ['source-warning','🟡 기본 시세 사용','시세 연결을 확인해 주세요'];
    return ['source-ok','🟢 KRX 기준 시세','NXT 가격이 있으면 함께 표시'];
  };

  try{
    if(typeof banner==='function'){
      banner=function(){
        const info=venueText();
        const M=PRMMarket;
        const extra=M.activeVenue==='NXT'
          ?` · NXT ${esc(M.nxtUpdatedLabel())} · KRX ${esc(M.krxUpdatedLabel())}`
          :` · 기준 ${esc(M.updatedLabel())}`;
        return `<div class="${info[0]}"><b>${info[1]}</b>${extra} · ${info[2]}</div>`;
      };
    }

    if(typeof positionRows==='function'){
      positionRows=function(r){
        return state.positions.map((p,i)=>{
          const mv=p.qty*p.price,pl=p.qty*(p.price-p.avg),ret=p.avg?(p.price-p.avg)/p.avg*100:0,w=r.value?mv/r.value*100:0;
          const open=PRMMarket.open(p.name),krx=PRMMarket.krxPrice(p.name),nxt=PRMMarket.nxtPrice(p.name);
          const active=PRMMarket.activeVenue==='NXT'&&nxt?'NXT':'KRX';
          const compare=(krx&&nxt)?nxt-krx:null;
          const comparePct=(compare!==null&&krx)?compare/krx*100:null;
          const quoteMeta=`<div class="muted" style="margin-top:4px;line-height:1.45;text-align:right">KRX ${krx?fmt(krx):'—'}<br>NXT ${nxt?fmt(nxt):'—'}${compare!==null?` <span class="${cls(compare)}">(${compare>=0?'+':''}${fmt(compare)}, ${comparePct>=0?'+':''}${comparePct.toFixed(2)}%)</span>`:''}<br><b>${active} 평가</b></div>`;
          return `<tr><td>${esc(p.name)}</td><td>${esc(p.type)}</td><td>${p.qty.toLocaleString()}</td><td>${fmt(p.avg)}</td><td>${open?fmt(open):'—'}</td><td><input class="priceinput" data-price-i="${i}" type="number" value="${p.price}">${quoteMeta}</td><td>${fmt(mv)}</td><td class="${cls(pl)}">${fmt(pl)}</td><td class="${cls(ret)}">${ret.toFixed(2)}%</td><td>${w.toFixed(1)}%</td><td>${fmt(p.loan)}</td></tr>`;
        }).join('');
      };
    }

    setTimeout(()=>{try{if(typeof render==='function')render()}catch(e){console.warn('NXT UI render failed',e)}},0);
  }catch(e){console.warn('NXT UI patch failed',e)}
})();
