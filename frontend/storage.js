window.PRMStorage={
  memory:{},
  get(k,d){
    if(Object.prototype.hasOwnProperty.call(this.memory,k))return JSON.parse(JSON.stringify(this.memory[k]));
    try{
      const raw=localStorage.getItem('prm:'+k);
      if(raw===null)return d;
      const value=JSON.parse(raw);
      this.memory[k]=JSON.parse(JSON.stringify(value));
      return value??d;
    }catch(e){
      console.warn('localStorage read failed; using in-memory state',e);
      return Object.prototype.hasOwnProperty.call(this.memory,k)?JSON.parse(JSON.stringify(this.memory[k])):d;
    }
  },
  set(k,v){
    this.memory[k]=JSON.parse(JSON.stringify(v));
    try{localStorage.setItem('prm:'+k,JSON.stringify(v))}catch(e){console.warn('localStorage save failed; state kept in memory for this session',e)}
    return v;
  },
  snapshot(state){const a=this.get('snapshots',[]);a.push({at:new Date().toISOString(),state:JSON.parse(JSON.stringify(state))});this.set('snapshots',a.slice(-365))},
  exportAll(){return JSON.stringify({state:this.get('state',null),snapshots:this.get('snapshots',[]),trades:this.get('trades',[])},null,2)}
};
