window.PRMMarket={
  prices:{},opens:{},previousCloses:{},lastUpdated:null,marketStatus:'UNKNOWN',source:null,mode:'loading',
  rawUrl:'https://raw.githubusercontent.com/smnam0112-rgb/-richman/main/data/market_prices.json',
  async readJson(url){
    const sep=url.includes('?')?'&':'?';
    const res=await fetch(url+sep+'ts='+Date.now(),{cache:'no-store'});
    if(!res.ok)throw new Error('price file error '+res.status);
    return res.json();
  },
  isKoreaMarketOpen(now=new Date()){
    const parts=new Intl.DateTimeFormat('en-CA',{timeZone:'Asia/Seoul',weekday:'short',hour:'2-digit',minute:'2-digit',hourCycle:'h23'}).formatToParts(now);
    const get=t=>(parts.find(x=>x.type===t)||{}).value;
    if(['Sat','Sun'].includes(get('weekday')))return false;
    const minutes=Number(get('hour'))*60+Number(get('minute'));
    return minutes>=540&&minutes<=930;
  },
  apply(data){
    if(!data||!data.prices||!Object.values(data.prices).some(x=>Number(x)>0))throw new Error('empty price file');
    this.prices=data.prices||{};
    this.opens=data.opens||{};
    this.previousCloses=data.previous_closes||{};
    this.lastUpdated=data.updated_at||data.date||null;
    this.marketStatus=String(data.market_status||'UNKNOWN').toUpperCase();
    this.source=data.source||null;
    const age=this.lastUpdated?Date.now()-Date.parse(this.lastUpdated):Infinity;
    const open=this.marketStatus==='OPEN'||this.isKoreaMarketOpen();
    this.mode=open?(age<=15*60*1000?'live':'stale'):'closing';
  },
  async refresh(){
    const candidates=[this.rawUrl,'data/market_prices.json'];
    for(const url of candidates){
      try{this.apply(await this.readJson(url));return}catch(e){console.warn('market price source unavailable',url,e)}
    }
    try{
      const data=await this.readJson('data/closing_prices.json');
      this.prices=data.prices||{};
      this.opens={};
      this.previousCloses={};
      this.lastUpdated=data.date||data.updated_at||null;
      this.marketStatus='CLOSE';
      this.source=data.source||null;
      this.mode='closing';
    }catch(e){
      this.prices={};
      this.opens={};
      this.previousCloses={};
      this.lastUpdated='기본 시세';
      this.marketStatus='UNKNOWN';
      this.source=null;
      this.mode='fallback';
    }
  },
  price(name){
    const ticker=PRM_CONFIG.tickers[name];
    const close=Number(this.prices[ticker]||0);
    return close>0?close:Number(PRM_CONFIG.fallbackPrices[name]||0);
  },
  open(name){
    const ticker=PRM_CONFIG.tickers[name];
    const value=Number(this.opens[ticker]||0);
    return value>0?value:null;
  },
  updatedLabel(){
    if(!this.lastUpdated)return '확인 전';
    const d=new Date(this.lastUpdated);
    if(Number.isNaN(d.getTime()))return String(this.lastUpdated);
    return d.toLocaleString('ko-KR',{timeZone:'Asia/Seoul',month:'numeric',day:'numeric',hour:'2-digit',minute:'2-digit'});
  }
};
