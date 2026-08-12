(()=>{
  const M=window.PRMMarket;
  if(!M)return;

  M.krxPrices={};
  M.nxtPrices={};
  M.krxStatus='UNKNOWN';
  M.nxtStatus='UNKNOWN';
  M.krxUpdatedAt=null;
  M.nxtUpdatedAt=null;
  M.activeVenue='KRX';
  M.activeSession='KRX_CLOSE';

  const originalApply=M.apply.bind(M);
  M.apply=function(data){
    originalApply(data);
    this.krxPrices=data.krx_prices||data.prices||{};
    this.nxtPrices=data.nxt_prices||{};
    this.krxStatus=String(data.krx_status||'UNKNOWN').toUpperCase();
    this.nxtStatus=String(data.nxt_status||'UNKNOWN').toUpperCase();
    this.krxUpdatedAt=data.krx_updated_at||data.updated_at||null;
    this.nxtUpdatedAt=data.nxt_updated_at||null;
    this.activeVenue=String(data.active_venue||'KRX').toUpperCase();
    this.activeSession=String(data.active_session||'KRX_CLOSE').toUpperCase();
    this.prices=data.prices||this.prices||{};
  };

  M.krxPrice=function(name){
    const ticker=PRM_CONFIG.tickers[name];
    const v=Number(this.krxPrices[ticker]||0);
    return v>0?v:null;
  };

  M.nxtPrice=function(name){
    const ticker=PRM_CONFIG.tickers[name];
    const v=Number(this.nxtPrices[ticker]||0);
    return v>0?v:null;
  };

  M.venueLabel=function(){
    if(this.activeVenue!=='NXT')return 'KRX';
    if(this.activeSession==='NXT_PRE')return 'NXT PRE';
    if(this.activeSession==='NXT_AFTER')return 'NXT AFTER';
    if(this.activeSession==='NXT_FINAL')return 'NXT FINAL';
    return 'NXT';
  };

  M.nxtUpdatedLabel=function(){
    if(!this.nxtUpdatedAt)return '미수신';
    const d=new Date(this.nxtUpdatedAt);
    if(Number.isNaN(d.getTime()))return String(this.nxtUpdatedAt);
    return d.toLocaleString('ko-KR',{timeZone:'Asia/Seoul',month:'numeric',day:'numeric',hour:'2-digit',minute:'2-digit'});
  };

  M.krxUpdatedLabel=function(){
    if(!this.krxUpdatedAt)return '미수신';
    const d=new Date(this.krxUpdatedAt);
    if(Number.isNaN(d.getTime()))return String(this.krxUpdatedAt);
    return d.toLocaleString('ko-KR',{timeZone:'Asia/Seoul',month:'numeric',day:'numeric',hour:'2-digit',minute:'2-digit'});
  };
})();
