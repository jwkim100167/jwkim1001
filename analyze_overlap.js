// 브라우저 콘솔에서 실행할 분석 코드
// localStorage에서 로또 데이터를 가져와서 5개 겹치는 경우 찾기

function analyzeOverlap() {
  // localStorage에서 데이터 가져오기
  const stored = localStorage.getItem('lotto_winning_numbers');
  if (!stored) {
    console.log('❌ 저장된 로또 데이터가 없습니다.');
    return;
  }
  
  const lottoData = JSON.parse(stored);
  if (!lottoData.data || lottoData.data.length === 0) {
    console.log('❌ 로또 데이터가 비어있습니다.');
    return;
  }
  
  console.log(`📊 분석 시작: 총 ${lottoData.data.length}개 회차`);
  
  // 모든 회차의 당첨번호 6개씩 추출
  const allCombinations = lottoData.data.map(item => {
    let numbers = [];
    if (item.numbers) {
      numbers = [...item.numbers];
    } else {
      numbers = [item.num1, item.num2, item.num3, item.num4, item.num5, item.num6];
    }
    return {
      round: item.round,
      numbers: numbers.filter(num => num >= 1 && num <= 45).sort((a, b) => a - b)
    };
  }).filter(item => item.numbers.length === 6);
  
  console.log(`✅ 유효한 조합: ${allCombinations.length}개`);
  
  // 5개 이상 겹치는 경우 찾기
  const overlaps = [];
  
  for (let i = 0; i < allCombinations.length; i++) {
    for (let j = i + 1; j < allCombinations.length; j++) {
      const combo1 = allCombinations[i];
      const combo2 = allCombinations[j];
      
      // 겹치는 번호 개수 세기
      const intersection = combo1.numbers.filter(num => combo2.numbers.includes(num));
      
      if (intersection.length >= 5) {
        overlaps.push({
          round1: combo1.round,
          round2: combo2.round,
          numbers1: combo1.numbers,
          numbers2: combo2.numbers,
          overlap: intersection,
          overlapCount: intersection.length
        });
      }
    }
  }
  
  console.log(`🔍 분석 완료: ${overlaps.length}개의 5개 이상 겹치는 경우 발견`);
  
  if (overlaps.length > 0) {
    console.log('\n📋 겹치는 경우들:');
    overlaps.forEach((overlap, index) => {
      console.log(`\n${index + 1}. ${overlap.round1}회차 vs ${overlap.round2}회차`);
      console.log(`   ${overlap.round1}회차: [${overlap.numbers1.join(', ')}]`);
      console.log(`   ${overlap.round2}회차: [${overlap.numbers2.join(', ')}]`);
      console.log(`   겹치는 번호 (${overlap.overlapCount}개): [${overlap.overlap.join(', ')}]`);
      
      if (overlap.overlapCount === 6) {
        console.log('   ⚠️ 완전히 동일한 조합!');
      } else if (overlap.overlapCount === 5) {
        const diff1 = overlap.numbers1.filter(num => !overlap.overlap.includes(num));
        const diff2 = overlap.numbers2.filter(num => !overlap.overlap.includes(num));
        console.log(`   다른 번호: ${overlap.round1}회차(${diff1.join(', ')}) vs ${overlap.round2}회차(${diff2.join(', ')})`);
      }
    });
  } else {
    console.log('✅ 5개 이상 겹치는 경우가 없습니다.');
  }
  
  // 통계 정보
  const exactMatches = overlaps.filter(o => o.overlapCount === 6).length;
  const fiveMatches = overlaps.filter(o => o.overlapCount === 5).length;
  
  console.log('\n📊 통계:');
  console.log(`   완전히 동일한 조합 (6개 일치): ${exactMatches}건`);
  console.log(`   5개 일치: ${fiveMatches}건`);
  console.log(`   총 겹치는 경우: ${overlaps.length}건`);
  
  return overlaps;
}

// 실행
console.log('🚀 로또 번호 겹침 분석을 시작합니다...');
console.log('💡 브라우저 콘솔에서 analyzeOverlap() 함수를 실행하세요.');