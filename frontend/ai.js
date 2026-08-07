window.PRMAI={
 coach(s){const r=PRMRisk.calc(s),h=PRMRisk.health(s);if(r.collateral<160)return'🔴 방어 최우선. 신규 신용 확대보다 상환·현금 확보가 우선입니다.';
 if(r.collateral<170)return'🟠 방어 강화. 150%·140% 임계가격을 기준으로 추가 하락 리스크를 관리하세요.';
 if(r.collateral<180)return'🟡 주의. 180% 회복 전 레버리지 확대를 신중히 보세요.';
 return'🟢 상대적 안정. 집중도와 신용비중은 계속 관리하세요.'},
 prompt(s){const r=PRMRisk.calc(s),h=PRMRisk.health(s);return `내 계좌를 분석해줘. 평가금액 ${Math.round(r.value)}원, 손익 ${Math.round(r.pnl)}원, 순자산 ${Math.round(r.net)}원, 담보비율 ${r.collateral.toFixed(2)}%, 건강도 ${h.score}/100. 최대손실 1억원, 월간손실한도 2000만원 기준으로 대응전략을 제시해줘.`}
};
