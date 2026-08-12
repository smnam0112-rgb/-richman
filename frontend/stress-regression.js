window.PRMStressRegression={
  data:null,
  windowKey:localStorage.getItem('prm:stressRegressionWindow')||'6m',
  rawUrl:'https://raw.githubusercontent.com/smnam0112-rgb/-richman/main/data/stress_regression.json',
  async readJson(url){const sep=url.includes('?')?'&':'?';const r=await fetch(url+sep+'ts='+Date.now(),{cache:'no-store'});if(!r.ok)throw new Error('regression data '+r.status);return r.json()},
  async load(){
    for(const url of [this.rawUrl,'data/stress_regression.json']){
      try{const d=await this.readJson(url);if(d&&d.windows){this.data=d;if(!d.windows[this.windowKey])this.windowKey=d.recommended_window||'6m';if(typeof render==='function')render();return d}}catch(e){console.warn('stress regression unavailable',url,e)}
    }
    return null;
  },
  setWindow(key){if(!['3m','6m'].includes(key))return;this.windowKey=key;localStorage.setItem('prm:stressRegressionWindow',key);if(typeof render==='function')render()},
  stats(name,key=this.windowKey){return this.data&&this.data.windows&&this.data.windows[key]&&this.data.windows[key][name]||null},
  beta(name,key=this.windowKey){const s=this.stats(name,key),v=Number(s&&s.beta);return Number.isFinite(v)?Math.max(-2,Math.min(2,v)):null},
  sensitivityMap(){const out={};for(const n of ['삼성전자','SK스퀘어','삼성전기']){const v=this.beta(n);if(v!==null)out[n]=v}return out},
  updatedLabel(){if(!this.data)return '회귀 데이터 확인 중';return `${this.data.as_of||'-'} 종가 기준 · ${this.windowKey==='3m'?'3개월':'6개월'} 회귀`}
};
PRMStressRegression.load();
