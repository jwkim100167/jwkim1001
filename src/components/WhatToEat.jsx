import React, { useState, useRef, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import './WhatToEat.css';

// ── 카테고리 데이터 ──────────────────────────────────────────────
// meal: 'lunch' | 'dinner' | 'both'
const CATEGORIES = [
  {
    id: 'korean_rice', name: '한식 밥/백반', color: '#FFCBA4',
    items: [
      { name: '김치찌개백반',   meal: 'lunch'  },
      { name: '된장찌개백반',   meal: 'lunch'  },
      { name: '제육볶음',       meal: 'both'   },
      { name: '제육덮밥',       meal: 'lunch'  },
      { name: '불고기백반',     meal: 'both'   },
      { name: '오징어볶음',     meal: 'both'   },
      { name: '낙지볶음',       meal: 'both'   },
      { name: '닭갈비',         meal: 'dinner' },
      { name: '닭볶음탕',       meal: 'dinner' },
      { name: '쭈꾸미볶음',     meal: 'both'   },
      { name: '고등어구이백반', meal: 'lunch'  },
      { name: '생선구이정식',   meal: 'lunch'  },
      { name: '갈치조림',       meal: 'both'   },
      { name: '코다리조림',     meal: 'both'   },
      { name: '보리밥정식',     meal: 'lunch'  },
      { name: '비빔밥',         meal: 'lunch'  },
      { name: '돌솥비빔밥',     meal: 'lunch'  },
      { name: '산채정식',       meal: 'lunch'  },
      { name: '쌈밥정식',       meal: 'lunch'  },
      { name: '콩나물국밥',     meal: 'lunch'  },
      { name: '순대국밥',       meal: 'both'   },
      { name: '뼈해장국',       meal: 'both'   },
      { name: '소머리국밥',     meal: 'both'   },
      { name: '설렁탕',         meal: 'lunch'  },
      { name: '곰탕',           meal: 'lunch'  },
      { name: '육개장',         meal: 'lunch'  },
      { name: '갈비탕',         meal: 'both'   },
      { name: '삼계탕',         meal: 'both'   },
      { name: '추어탕',         meal: 'lunch'  },
      { name: '황태해장국',     meal: 'lunch'  },
      { name: '우거지국밥',     meal: 'lunch'  },
      { name: '김치말이국수',   meal: 'lunch'  },
      { name: '잔치국수',       meal: 'lunch'  },
    ],
  },
  {
    id: 'korean_stew', name: '찌개/전골/탕', color: '#FFABAB',
    items: [
      { name: '부대찌개',  meal: 'both'   },
      { name: '김치전골',  meal: 'dinner' },
      { name: '청국장',    meal: 'lunch'  },
      { name: '동태찌개',  meal: 'both'   },
      { name: '알탕',      meal: 'dinner' },
      { name: '곱창전골',  meal: 'dinner' },
      { name: '버섯전골',  meal: 'dinner' },
      { name: '낙지전골',  meal: 'dinner' },
      { name: '해물탕',    meal: 'dinner' },
      { name: '매운탕',    meal: 'dinner' },
      { name: '대구탕',    meal: 'both'   },
      { name: '아구찜',    meal: 'dinner' },
      { name: '해물찜',    meal: 'dinner' },
      { name: '닭한마리',  meal: 'dinner' },
      { name: '감자탕',    meal: 'dinner' },
    ],
  },
  {
    id: 'bun_sik', name: '분식', color: '#FFF0A0',
    items: [
      { name: '떡볶이',     meal: 'lunch'  },
      { name: '라볶이',     meal: 'lunch'  },
      { name: '김밥',       meal: 'lunch'  },
      { name: '참치김밥',   meal: 'lunch'  },
      { name: '치즈김밥',   meal: 'lunch'  },
      { name: '충무김밥',   meal: 'lunch'  },
      { name: '순대',       meal: 'lunch'  },
      { name: '튀김',       meal: 'lunch'  },
      { name: '쫄면',       meal: 'lunch'  },
      { name: '비빔국수',   meal: 'lunch'  },
      { name: '라면',       meal: 'lunch'  },
      { name: '치즈라면',   meal: 'lunch'  },
      { name: '만두',       meal: 'lunch'  },
      { name: '군만두',     meal: 'lunch'  },
      { name: '떡라면',     meal: 'lunch'  },
      { name: '어묵탕',     meal: 'lunch'  },
      { name: '김치볶음밥', meal: 'lunch'  },
      { name: '오므라이스', meal: 'lunch'  },
      { name: '돈까스',     meal: 'lunch'  },
      { name: '치즈돈까스', meal: 'lunch'  },
      { name: '생선까스',   meal: 'lunch'  },
    ],
  },
  {
    id: 'noodles', name: '면류', color: '#B8F0D0',
    items: [
      { name: '칼국수',     meal: 'lunch' },
      { name: '바지락칼국수', meal: 'lunch' },
      { name: '들깨칼국수', meal: 'lunch' },
      { name: '콩국수',     meal: 'dinner' },
      { name: '막국수',     meal: 'lunch' },
      { name: '물냉면',     meal: 'lunch' },
      { name: '비빔냉면',   meal: 'lunch' },
      { name: '밀면',       meal: 'dinner' },
      { name: '우동',       meal: 'lunch' },
      { name: '메밀소바',   meal: 'lunch' },
      { name: '수제비',     meal: 'lunch' },
    ],
  },
  {
    id: 'chinese', name: '중식', color: '#FFCDD2',
    items: [
      { name: '짜장면',    meal: 'both'   },
      { name: '짬뽕',      meal: 'both'   },
      { name: '간짜장',    meal: 'both'   },
      { name: '볶음밥',    meal: 'lunch'  },
      { name: '잡채밥',    meal: 'lunch'  },
      { name: '짬뽕밥',    meal: 'both'   },
      { name: '마파두부밥', meal: 'lunch' },
      { name: '탕수육',    meal: 'both'   },
      { name: '깐풍기',    meal: 'dinner' },
      { name: '유린기',    meal: 'dinner' },
      { name: '양장피',    meal: 'dinner' },
      { name: '팔보채',    meal: 'dinner' },
      { name: '고추잡채',  meal: 'both'   },
      { name: '마라탕',    meal: 'both'   },
      { name: '마라샹궈',  meal: 'dinner' },
      { name: '꿔바로우',  meal: 'dinner' },
      { name: '동파육',    meal: 'dinner' },
      { name: '멘보샤',    meal: 'both'   },
    ],
  },
  {
    id: 'japanese', name: '일식', color: '#FFD6E7',
    items: [
      { name: '초밥',        meal: 'both'   },
      { name: '회덮밥',      meal: 'lunch'  },
      { name: '연어덮밥',    meal: 'lunch'  },
      { name: '사케동',      meal: 'lunch'  },
      { name: '텐동',        meal: 'lunch'  },
      { name: '가츠동',      meal: 'lunch'  },
      { name: '규동',        meal: 'lunch'  },
      { name: '오야꼬동',    meal: 'lunch'  },
      { name: '일본식 카레', meal: 'lunch'  },
      { name: '라멘',        meal: 'both'   },
      { name: '츠케멘',      meal: 'both'   },
      { name: '우동정식',    meal: 'lunch'  },
      { name: '돈카츠',      meal: 'lunch'  },
      { name: '모듬튀김',    meal: 'both'   },
      { name: '야끼니꾸',    meal: 'dinner' },
      { name: '이자카야안주', meal: 'dinner' },
      { name: '사시미',      meal: 'dinner' },
    ],
  },
  {
    id: 'western', name: '양식', color: '#B3D9FF',
    items: [
      { name: '파스타',         meal: 'all' },
      { name: '크림파스타',     meal: 'all' },
      { name: '토마토파스타',   meal: 'all' },
      { name: '오일파스타',     meal: 'all' },
      { name: '로제파스타',     meal: 'all' },
      { name: '봉골레',         meal: 'all' },
      { name: '까르보나라',     meal: 'all' },
      { name: '리조또',         meal: 'all' },
      { name: '스테이크',       meal: 'all' },
      { name: '함박스테이크',   meal: 'all' },
      { name: '안심/등심스테이크', meal: 'all' },
      { name: '라자냐',         meal: 'all' },
      { name: '그라탕',         meal: 'all' },
      { name: '필라프',         meal: 'all' },
      { name: '오믈렛',         meal: 'all' },
      { name: '콥샐러드',       meal: 'all' },
      { name: '시저샐러드',     meal: 'all' },
    ],
  },
  {
    id: 'chicken', name: '치킨', color: '#FFE8A3',
    items: [
      { name: '후라이드',       meal: 'dinner' },
      { name: '양념치킨',       meal: 'dinner' },
      { name: '간장치킨',       meal: 'dinner' },
      { name: '마늘치킨',       meal: 'dinner' },
      { name: '반반치킨',       meal: 'dinner' },
      { name: '파닭',           meal: 'dinner' },
      { name: '뿌링클류 치킨',  meal: 'dinner' },
      { name: '닭강정',         meal: 'dinner' },
      { name: '순살치킨',       meal: 'dinner' },
      { name: '치킨버거세트',   meal: 'dinner' },
    ],
  },
  {
    id: 'burger', name: '버거/패스트푸드', color: '#FFD4A3',
    items: [
      { name: '수제버거',     meal: 'both'   },
      { name: '치즈버거',     meal: 'both'   },
      { name: '불고기버거',   meal: 'lunch'  },
      { name: '새우버거',     meal: 'lunch'  },
      { name: '치킨버거',     meal: 'lunch'  },
      { name: '핫도그',       meal: 'lunch'  },
      { name: '감자튀김세트', meal: 'lunch'  },
      { name: '타코',         meal: 'both'   },
      { name: '부리또',       meal: 'both'   },
      { name: '퀘사디아',     meal: 'both'   },
      { name: '나초',         meal: 'dinner' },
    ],
  },
  {
    id: 'pizza', name: '피자', color: '#FFCCBC',
    items: [
      { name: '페퍼로니피자',       meal: 'both'   },
      { name: '콤비네이션피자',     meal: 'both'   },
      { name: '고구마피자',         meal: 'both'   },
      { name: '불고기피자',         meal: 'both'   },
      { name: '하와이안피자',       meal: 'both'   },
      { name: '치즈피자',           meal: 'both'   },
      { name: '시카고피자',         meal: 'dinner' },
      { name: '화덕피자/마르게리타', meal: 'both'  },
    ],
  },
  {
    id: 'bbq', name: '고기/구이', color: '#FFAB91',
    items: [
      { name: '삼겹살',   meal: 'dinner' },
      { name: '목살',     meal: 'dinner' },
      { name: '항정살',   meal: 'dinner' },
      { name: '갈매기살', meal: 'dinner' },
      { name: '오겹살',   meal: 'dinner' },
      { name: '소갈비살', meal: 'dinner' },
      { name: '차돌박이', meal: 'dinner' },
      { name: '양념갈비', meal: 'dinner' },
      { name: '우대갈비', meal: 'dinner' },
      { name: '곱창구이', meal: 'dinner' },
      { name: '막창',     meal: 'dinner' },
      { name: '대창',     meal: 'dinner' },
      { name: '닭발',     meal: 'dinner' },
      { name: '양꼬치',   meal: 'dinner' },
      { name: '훈제오리', meal: 'dinner' },
      { name: '보쌈',     meal: 'dinner' },
      { name: '족발',     meal: 'dinner' },
      { name: '불족발',   meal: 'dinner' },
    ],
  },
  {
    id: 'seafood', name: '회/해산물', color: '#B2EBF2',
    items: [
      { name: '모듬회',   meal: 'dinner' },
      { name: '광어회',   meal: 'dinner' },
      { name: '연어회',   meal: 'dinner' },
      { name: '참치회',   meal: 'dinner' },
      { name: '물회',     meal: 'both'   },
      { name: '회무침',   meal: 'dinner' },
      { name: '조개구이', meal: 'dinner' },
      { name: '새우구이', meal: 'dinner' },
      { name: '대게/킹크랩', meal: 'lunch'  },
      { name: '간장게장', meal: 'dinner' },
      { name: '양념게장', meal: 'dinner' },
      { name: '굴보쌈',   meal: 'dinner' },
      { name: '낙지호롱', meal: 'dinner' },
      { name: '문어숙회', meal: 'dinner' },
    ],
  },
  {
    id: 'asian', name: '아시안', color: '#E1BEE7',
    items: [
      { name: '쌀국수',      meal: 'lunch'  },
      { name: '분짜',        meal: 'lunch'  },
      { name: '팟타이',      meal: 'lunch'  },
      { name: '똠얌꿍',      meal: 'lunch'  },
      { name: '카오팟',      meal: 'lunch'  },
      { name: '나시고렝',    meal: 'lunch'  },
      { name: '미고렝',      meal: 'lunch'  },
      { name: '그린커리',    meal: 'lunch'  },
      { name: '인도카레+난', meal: 'lunch'  },
      { name: '탄두리치킨',  meal: 'lunch'  },
      { name: '반미',        meal: 'lunch'  },
      { name: '사테',        meal: 'lunch'  },
    ],
  },
  {
    id: 'cafe_brunch', name: '카페/브런치', color: '#C8E6C9',
    items: [
      { name: '샌드위치',       meal: 'dinner' },
      { name: '파니니',         meal: 'dinner' },
      { name: '베이글샌드',     meal: 'dinner' },
      { name: '클럽샌드위치',   meal: 'dinner' },
      { name: '에그베네딕트',   meal: 'dinner' },
      { name: '프렌치토스트',   meal: 'dinner' },
      { name: '팬케이크',       meal: 'dinner' },
      { name: '와플',           meal: 'dinner' },
      { name: '아보카도토스트', meal: 'dinner' },
      { name: '포케볼',         meal: 'dinner' },
      { name: '김밥+컵라면',    meal: 'dinner' },
    ],
  },
  {
    id: 'snack_anju', name: '야식/안주', color: '#C5CAE9',
    items: [
      { name: '곱창볶음',      meal: 'dinner' },
      { name: '골뱅이소면',    meal: 'dinner' },
      { name: '노가리',        meal: 'dinner' },
      { name: '닭똥집',        meal: 'dinner' },
      { name: '오돌뼈',        meal: 'dinner' },
      { name: '계란말이',      meal: 'dinner' },
      { name: '두부김치',      meal: 'dinner' },
      { name: '모듬전',        meal: 'dinner' },
      { name: '김치전',        meal: 'dinner' },
      { name: '파전/해물파전', meal: 'dinner' },
      { name: '치즈볼',        meal: 'lunch'  },
      { name: '감바스',        meal: 'dinner' },
      { name: '나가사키짬뽕',  meal: 'dinner' },
    ],
  },
];

const ALL_ITEMS = CATEGORIES.flatMap(cat =>
  cat.items.map(item => ({
    ...item,
    catId: cat.id,
    catName: cat.name,
    catColor: cat.color,
  }))
);

// ── 헬퍼 ────────────────────────────────────────────────────────
function getInitialNames(filter) {
  if (filter === 'custom') return new Set();
  return new Set(
    ALL_ITEMS
      .filter(i => filter === 'all' || i.meal === filter || i.meal === 'both')
      .map(i => i.name)
  );
}

// ── 캔버스 그리기 ────────────────────────────────────────────────
function drawWheel(canvas, rot, items) {
  if (!canvas) return;
  const ctx = canvas.getContext('2d');
  const W = canvas.width;
  const H = canvas.height;
  const cx = W / 2;
  const cy = H / 2;
  const r = Math.min(cx, cy) - 42;

  ctx.clearRect(0, 0, W, H);

  if (!items || items.length === 0) {
    ctx.beginPath();
    ctx.arc(cx, cy, r, 0, 2 * Math.PI);
    ctx.fillStyle = '#f4f4f4';
    ctx.fill();
    ctx.strokeStyle = '#ccc';
    ctx.lineWidth = 3;
    ctx.stroke();
    ctx.fillStyle = '#bbb';
    ctx.font = `bold 14px "Malgun Gothic","Apple SD Gothic Neo",sans-serif`;
    ctx.textAlign = 'center';
    ctx.fillText('아래에서 메뉴를 추가해주세요', cx, cy);
    return;
  }
  const num = items.length;
  const segAngle = (2 * Math.PI) / num;
  const showText = num <= 80;

  for (let i = 0; i < num; i++) {
    const sa = rot + i * segAngle;
    const ea = rot + (i + 1) * segAngle;

    // 세그먼트
    ctx.beginPath();
    ctx.moveTo(cx, cy);
    ctx.arc(cx, cy, r, sa, ea);
    ctx.closePath();
    ctx.fillStyle = items[i].catColor;
    ctx.fill();
    ctx.strokeStyle = 'rgba(255,255,255,0.7)';
    ctx.lineWidth = 0.7;
    ctx.stroke();

    // 텍스트 (항목이 80개 이하일 때만)
    if (showText) {
      const ma = rot + (i + 0.5) * segAngle;
      const fs = num <= 30 ? 11 : num <= 50 ? 10 : 8.5;
      ctx.save();
      ctx.translate(cx, cy);
      ctx.rotate(ma);
      ctx.textAlign = 'right';
      ctx.fillStyle = 'rgba(0,0,0,0.75)';
      ctx.font = `bold ${fs}px "Malgun Gothic","Apple SD Gothic Neo",sans-serif`;
      ctx.fillText(items[i].name, r - 7, 3.5);
      ctx.restore();
    }
  }

  // 외곽 링
  ctx.beginPath();
  ctx.arc(cx, cy, r, 0, 2 * Math.PI);
  ctx.strokeStyle = '#555';
  ctx.lineWidth = 3;
  ctx.stroke();

  // 중앙 원판 (HTML 버튼이 위에 올라감)
  ctx.beginPath();
  ctx.arc(cx, cy, 44, 0, 2 * Math.PI);
  ctx.fillStyle = 'white';
  ctx.fill();
  ctx.strokeStyle = '#e0e0e0';
  ctx.lineWidth = 2;
  ctx.stroke();

  // 고정 화살표 (상단)
  const tipX = cx;
  const tipY = cy - r;
  ctx.beginPath();
  ctx.moveTo(tipX - 17, tipY - 34);
  ctx.lineTo(tipX + 17, tipY - 34);
  ctx.lineTo(tipX, tipY);
  ctx.closePath();
  ctx.fillStyle = '#e74c3c';
  ctx.fill();
  ctx.strokeStyle = 'white';
  ctx.lineWidth = 2.5;
  ctx.stroke();
}

function getSelectedIndex(rot, numItems) {
  const normalized = ((-Math.PI / 2 - rot) % (2 * Math.PI) + 2 * Math.PI) % (2 * Math.PI);
  return Math.floor(normalized / ((2 * Math.PI) / numItems)) % numItems;
}

// ── 컴포넌트 ────────────────────────────────────────────────────
export default function WhatToEat() {
  const navigate = useNavigate();
  const canvasRef = useRef(null);
  const rotationRef = useRef(0);
  const animationRef = useRef(null);

  const [mealFilter, setMealFilter]       = useState('all');
  const [activeNames, setActiveNames]     = useState(() => getInitialNames('all'));
  const [isSpinning, setIsSpinning]       = useState(false);
  const [result, setResult]               = useState(null);
  const [showMgmt, setShowMgmt]           = useState(false);
  const [mgmtView, setMgmtView]           = useState('category'); // 'category' | 'on' | 'off'
  const [customItems, setCustomItems]     = useState([]);
  const [showCustomInput, setShowCustomInput] = useState(false);
  const [customInputVal, setCustomInputVal]   = useState('');

  const isCustom   = mealFilter === 'custom';
  const wheelItems = isCustom
    ? customItems
    : ALL_ITEMS.filter(i => activeNames.has(i.name));
  const offItems   = isCustom
    ? []
    : ALL_ITEMS.filter(i => !activeNames.has(i.name));

  // 카테고리별 상태 계산
  const getCatStatus = (catId) => {
    const cat = CATEGORIES.find(c => c.id === catId);
    const mealFiltered = cat.items.filter(
      i => mealFilter === 'all' || mealFilter === 'custom' || i.meal === mealFilter || i.meal === 'both'
    );
    if (mealFiltered.length === 0) return { active: 0, total: 0, on: false };
    const active = mealFiltered.filter(i => activeNames.has(i.name)).length;
    return { active, total: mealFiltered.length, on: active > 0 };
  };

  // 초기 그리기
  useEffect(() => {
    drawWheel(canvasRef.current, 0, ALL_ITEMS.filter(i => i.meal !== 'lunch' || true));
  }, []);

  // activeNames / customItems 변경 시 재그리기
  useEffect(() => {
    if (!isSpinning) {
      drawWheel(canvasRef.current, rotationRef.current, wheelItems);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [activeNames, customItems]);

  // ── 필터 변경 ────────────────────────────────────────────────
  const handleFilter = (f) => {
    if (isSpinning) return;
    setMealFilter(f);
    setResult(null);
    setActiveNames(getInitialNames(f));
  };

  // ── 카테고리 토글 ────────────────────────────────────────────
  const toggleCategory = (catId) => {
    const cat = CATEGORIES.find(c => c.id === catId);
    const { on } = getCatStatus(catId);
    const newNames = new Set(activeNames);
    if (on) {
      cat.items.forEach(i => newNames.delete(i.name));
    } else {
      cat.items
        .filter(i => mealFilter === 'all' || mealFilter === 'custom' || i.meal === mealFilter || i.meal === 'both')
        .forEach(i => newNames.add(i.name));
    }
    setActiveNames(newNames);
  };

  // ── 개별 메뉴 추가/제거 ──────────────────────────────────────
  const addItem = (name) => setActiveNames(prev => new Set([...prev, name]));
  const removeItem = (name) => {
    if (wheelItems.length <= 2) return;
    setActiveNames(prev => { const s = new Set(prev); s.delete(name); return s; });
  };

  // ── 돌리기 (공통 로직) ───────────────────────────────────────
  const spinWith = (items) => {
    if (isSpinning || items.length < 2) return;
    if (animationRef.current) cancelAnimationFrame(animationRef.current);

    setIsSpinning(true);
    setResult(null);

    const snapshot   = [...items];
    const totalAngle = (5 + Math.random() * 6) * 2 * Math.PI + Math.random() * 2 * Math.PI;
    const duration   = 4500 + Math.random() * 2000;
    const startAngle = rotationRef.current;
    const startTime  = performance.now();

    const animate = (now) => {
      const t      = Math.min((now - startTime) / duration, 1);
      const eased  = 1 - Math.pow(1 - t, 4);
      rotationRef.current = startAngle + totalAngle * eased;
      drawWheel(canvasRef.current, rotationRef.current, snapshot);

      if (t < 1) {
        animationRef.current = requestAnimationFrame(animate);
      } else {
        const idx = getSelectedIndex(rotationRef.current, snapshot.length);
        setResult(snapshot[idx]);
        setIsSpinning(false);
      }
    };

    animationRef.current = requestAnimationFrame(animate);
  };

  const spin = () => spinWith(wheelItems);

  const respinExcluding = () => {
    if (!result) return;
    if (isCustom) {
      const items = customItems.filter(i => i.name !== result.name);
      setCustomItems(items);
      spinWith(items);
    } else {
      const newNames = new Set(activeNames);
      newNames.delete(result.name);
      const items = ALL_ITEMS.filter(i => newNames.has(i.name));
      setActiveNames(newNames);
      spinWith(items);
    }
  };

  const addCustomItem = () => {
    const name = customInputVal.trim();
    if (!name || customItems.some(i => i.name === name)) return;
    setCustomItems(prev => [...prev, {
      name,
      meal: 'custom',
      catId: 'custom',
      catName: '직접입력',
      catColor: '#a78bfa',
    }]);
    setCustomInputVal('');
  };

  const removeCustomItem = (name) => {
    setCustomItems(prev => prev.filter(i => i.name !== name));
  };

  // ── 렌더 ────────────────────────────────────────────────────
  return (
    <div className="whattoeat">
      <div className="whattoeat-container">

        {/* 헤더 */}
        <div className="wte-header">
          <button className="wte-back-btn" onClick={() => navigate('/')}>← 홈</button>
          <h1>오늘 뭐 먹지?</h1>
        </div>

        {/* 필터 탭 */}
        <div className="filter-tabs">
          {[
            { key: 'all',    label: '전체' },
            { key: 'lunch',  label: '점심' },
            { key: 'dinner', label: '저녁' },
            { key: 'custom', label: '빈칸(지정)' },
          ].map(({ key, label }) => (
            <button
              key={key}
              className={`filter-tab${mealFilter === key ? ' active' : ''}`}
              onClick={() => handleFilter(key)}
              disabled={isSpinning}
            >
              {label}
            </button>
          ))}
        </div>

        <p className="item-count">원판 {wheelItems.length}개 메뉴</p>

        {/* 원판 */}
        <div className="wheel-wrapper">
          <canvas ref={canvasRef} width={500} height={500} className="wheel-canvas" />
          <button
            className={`center-spin-btn${isSpinning ? ' spinning' : ''}`}
            onClick={spin}
            disabled={isSpinning}
          >
            {isSpinning ? '···' : '돌리기'}
          </button>

          {/* 빈칸(지정) + 버튼 */}
          {isCustom && !isSpinning && !result && (
            <button
              className="add-custom-btn"
              onClick={() => { setShowCustomInput(v => !v); setCustomInputVal(''); }}
              title="메뉴 추가"
            >
              +
            </button>
          )}

          {/* 결과 오버레이 */}
          {result && (
            <div className="wheel-result-overlay" onClick={() => setResult(null)}>
              <div className="overlay-inner" onClick={e => e.stopPropagation()}>
                <span
                  className="overlay-cat-badge"
                  style={{ background: result.catColor }}
                >
                  {result.catName}
                </span>
                <p className="overlay-menu-name">{result.name}</p>
                <div className="overlay-actions">
                  <button
                    className="overlay-map-btn"
                    onClick={() =>
                      window.open(`https://map.naver.com/v5/search/${encodeURIComponent(result.name)}`, '_blank')
                    }
                  >
                    지도 찾기
                  </button>
                  <button
                    className="overlay-respin-btn"
                    onClick={respinExcluding}
                    disabled={wheelItems.length <= 2}
                  >
                    이 메뉴 빼고 돌리기
                  </button>
                </div>
                <p className="overlay-dismiss">원판 터치 시 닫힘</p>
              </div>
            </div>
          )}
        </div>

        {/* 빈칸(지정) 입력창 */}
        {isCustom && showCustomInput && (
          <div className="custom-input-bar">
            <input
              className="custom-input-field"
              type="text"
              placeholder="메뉴 이름 입력"
              value={customInputVal}
              onChange={e => setCustomInputVal(e.target.value)}
              onKeyDown={e => { if (e.key === 'Enter') addCustomItem(); if (e.key === 'Escape') setShowCustomInput(false); }}
              autoFocus
            />
            <button className="custom-input-add" onClick={addCustomItem}>추가</button>
            <button className="custom-input-cancel" onClick={() => setShowCustomInput(false)}>✕</button>
          </div>
        )}

        {/* 메뉴 편집 */}
        <div className="menu-mgmt">
          <button className="mgmt-toggle" onClick={() => setShowMgmt(v => !v)}>
            <span>메뉴 편집</span>
            <span className="mgmt-counts">원판 {wheelItems.length} · 제외 {offItems.length}</span>
            <span className="mgmt-chevron">{showMgmt ? '▲' : '▼'}</span>
          </button>

          {showMgmt && (
            <div className="mgmt-panel">
              {/* 서브 탭 */}
              <div className="mgmt-sub-tabs">
                {[
                  { key: 'category', label: '카테고리' },
                  { key: 'on',       label: `원판 (${wheelItems.length})` },
                  { key: 'off',      label: `제외 (${offItems.length})` },
                ].map(({ key, label }) => (
                  <button
                    key={key}
                    className={`mgmt-sub-tab${mgmtView === key ? ' active' : ''}`}
                    onClick={() => setMgmtView(key)}
                  >
                    {label}
                  </button>
                ))}
              </div>

              <div className="mgmt-list">
                {/* 카테고리 탭 */}
                {mgmtView === 'category' && CATEGORIES.map(cat => {
                  const { active, total, on } = getCatStatus(cat.id);
                  if (total === 0) return null;
                  return (
                    <div key={cat.id} className="mgmt-row">
                      <span className="cat-badge" style={{ background: cat.color }}>
                        {cat.name}
                      </span>
                      <span className="mgmt-item-name">
                        <span className="cat-count">{active}/{total}</span>
                      </span>
                      <button
                        className={`mgmt-action-btn ${on ? 'mgmt-remove' : 'mgmt-add'}`}
                        onClick={() => toggleCategory(cat.id)}
                      >
                        {on ? '전체 제거' : '전체 추가'}
                      </button>
                    </div>
                  );
                })}

                {/* 원판 탭 */}
                {mgmtView === 'on' && (
                  wheelItems.length === 0
                    ? <p className="mgmt-empty">원판에 메뉴가 없습니다.<br/>+ 버튼으로 추가하세요.</p>
                    : wheelItems.map(item => (
                      <div key={item.name} className="mgmt-row">
                        <span className="cat-badge" style={{ background: item.catColor }}>{item.catName}</span>
                        <span className="mgmt-item-name">{item.name}</span>
                        <button
                          className="mgmt-action-btn mgmt-remove"
                          onClick={() => isCustom ? removeCustomItem(item.name) : removeItem(item.name)}
                          disabled={!isCustom && wheelItems.length <= 2}
                        >
                          제거
                        </button>
                      </div>
                    ))
                )}

                {/* 제외 탭 */}
                {mgmtView === 'off' && (
                  offItems.length === 0
                    ? <p className="mgmt-empty">제외된 메뉴가 없습니다.</p>
                    : offItems.map(item => (
                      <div key={item.name} className="mgmt-row">
                        <span className="cat-badge" style={{ background: item.catColor }}>{item.catName}</span>
                        <span className="mgmt-item-name">{item.name}</span>
                        <button
                          className="mgmt-action-btn mgmt-add"
                          onClick={() => addItem(item.name)}
                        >
                          추가
                        </button>
                      </div>
                    ))
                )}
              </div>
            </div>
          )}
        </div>

        <div className="wte-footer"><p>made by jwkim1001</p></div>
      </div>
    </div>
  );
}
