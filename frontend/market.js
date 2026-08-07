window.PRMMarket={
  prices:{},lastUpdated:null,mode:'closing',
  async refresh(){
    try{
      const res=await fetch('data/closing_prices.json?ts='+Date.now(),{cache:'no-store'});
      if(!res.ok) throw new Error('closing price file error');
      const data=await res.json();
      this.prices=data.prices||{};
      this.lastUpdated=data.date||data.updated_at||null;
      this.mode='closing';
    }catch(e){
      this.prices={};
      this.lastUpdated='기본 시세';
      this.mode='fallback';
    }
  },
  price(name){
    const ticker=PRM_CONFIG.tickers[name];
    const close=Number(this.prices[ticker]||0);
    return close>0?close:Number(PRM_CONFIG.fallbackPrices[name]||0);
  }
};
