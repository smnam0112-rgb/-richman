window.PRMDiary={generate(s){const r=PRMRisk.calc(s),h=PRMRisk.health(s);return [
'투자일기 '+new Date().toLocaleDateString('ko-KR'),'','총 평가금액: '+Math.round(r.value).toLocaleString()+'원','평가손익: '+Math.round(r.pnl).toLocaleString()+'원','순자산: '+Math.round(r.net).toLocaleString()+'원','담보비율: '+r.collateral.toFixed(2)+'%','계좌 건강도: '+h.score+'/100','','오늘의 메모: ','','내일 전략: '
].join('\n')}};
