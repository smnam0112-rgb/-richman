window.PRMStorage={
  get(k,d){try{return JSON.parse(localStorage.getItem('prm:'+k))??d}catch{return d}},
  set(k,v){localStorage.setItem('prm:'+k,JSON.stringify(v))},
  snapshot(state){const a=this.get('snapshots',[]);a.push({at:new Date().toISOString(),state});this.set('snapshots',a.slice(-365))},
  exportAll(){return JSON.stringify({state:this.get('state',null),snapshots:this.get('snapshots',[]),trades:this.get('trades',[])},null,2)}
};
