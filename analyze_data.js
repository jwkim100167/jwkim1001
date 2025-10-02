// Node.js로 localStorage 데이터 분석
const fs = require('fs');
const path = require('path');

// Windows의 Chrome localStorage 경로에서 데이터 찾기 시도
// 또는 파일로 내보낸 데이터가 있는지 확인

function findChromeLocalStorage() {
  const userProfile = process.env.USERPROFILE;
  const chromePaths = [
    path.join(userProfile, 'AppData', 'Local', 'Google', 'Chrome', 'User Data', 'Default', 'Local Storage'),
    path.join(userProfile, 'AppData', 'Local', 'Google', 'Chrome', 'User Data', 'Profile 1', 'Local Storage'),
  ];
  
  for (const chromePath of chromePaths) {
    if (fs.existsSync(chromePath)) {
      console.log('Chrome localStorage 경로 발견:', chromePath);
      try {
        const files = fs.readdirSync(chromePath);
        console.log('파일들:', files.slice(0, 10)); // 처음 10개만 표시
      } catch (error) {
        console.log('읽기 권한 없음');
      }
    }
  }
}

// 브라우저에서 수동으로 내보낸 데이터 파일이 있는지 확인
function checkExportedData() {
  const possibleFiles = [
    'lotto_data.json',
    'exported_lotto_data.json',
    'lotto_export.json'
  ];
  
  for (const filename of possibleFiles) {
    if (fs.existsSync(filename)) {
      console.log(`내보낸 데이터 파일 발견: ${filename}`);
      try {
        const data = JSON.parse(fs.readFileSync(filename, 'utf8'));
        analyzeLottoData(data);
        return true;
      } catch (error) {
        console.log(`파일 읽기 실패: ${filename}`, error.message);
      }
    }
  }
  return false;
}

function analyzeLottoData(lottoData) {
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
  
  console.log(`\n🔍 분석 완료: ${overlaps.length}개의 5개 이상 겹치는 경우 발견`);
  
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

console.log('🚀 로또 번호 겹침 분석을 시작합니다...');
console.log('\n💡 방법 1: 브라우저에서 데이터를 내보내서 분석');
console.log('   브라우저 콘솔에서 다음 코드를 실행하여 데이터를 파일로 저장하세요:');
console.log('   const data = localStorage.getItem("lotto_winning_numbers");');
console.log('   const blob = new Blob([data], {type: "application/json"});');
console.log('   const url = URL.createObjectURL(blob);');
console.log('   const a = document.createElement("a");');
console.log('   a.href = url;');
console.log('   a.download = "lotto_data.json";');
console.log('   a.click();');

console.log('\n💡 방법 2: Chrome localStorage 직접 접근 시도');
findChromeLocalStorage();

console.log('\n💡 방법 3: 내보낸 데이터 파일 확인');
if (!checkExportedData()) {
  console.log('내보낸 데이터 파일이 없습니다.');
}