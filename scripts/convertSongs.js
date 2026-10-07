// songDatabase.json (타자 게임 1000곡) → musicSeed.json 확장
// 기존 97곡(아티스트·연도 있음) 유지 + 나머지 신규 곡 추가
import { readFileSync, writeFileSync } from 'fs';
import { dirname, join } from 'path';
import { fileURLToPath } from 'url';

const __dirname = dirname(fileURLToPath(import.meta.url));

// 카테고리 → 음악 취향 유형 매핑
const CATEGORY_MAP = {
  '발라드': ['CEIL', 'CEGL', 'CXIL', 'CXGL'],
  '아이돌': ['HEIL', 'HEGL', 'HXIL', 'HXGL', 'HEIS', 'HEGS', 'HXIS', 'HXGS'],
  '인디':   ['CEIS', 'CEGS', 'CXIS', 'CXGS'],
  '힙합':   ['HEIL', 'HXIL', 'HEGL', 'HXGL'],
  'R&B':    ['HEIS', 'HXIS', 'CEIS', 'CXIS'],
  '밴드':   ['HEGS', 'HXGS', 'CEGS', 'CXGS'],
  '트로트': ['HEGL', 'HXGL'],
};

// 곡 제목 → 아티스트/연도 매핑
const ARTIST_MAP = {
  // ===== 발라드 =====
  '밤편지':               { artist: 'IU',              year: 2017 },
  '긴 꿈':               { artist: 'IU',              year: 2018 },
  '스물셋':               { artist: 'IU',              year: 2015 },
  '분홍신':               { artist: 'IU',              year: 2013 },
  '좋은 날':              { artist: 'IU',              year: 2010 },
  '잔소리':               { artist: 'IU & 조정석',      year: 2013 },
  '한숨':                { artist: 'IU',              year: 2017 },
  '오르트구름':            { artist: 'IU',              year: 2021 },
  '비밀번호 486':          { artist: 'IU',              year: 2014 },
  '신호등':               { artist: 'IU',              year: 2021 },
  '너를 만나':             { artist: '폴킴',             year: 2018 },
  '혜성':                { artist: '잔나비',            year: 2020 },
  '사건의 지평선':          { artist: '윤하',             year: 2022 },
  '하루하루':              { artist: 'BIGBANG',          year: 2008 },
  '마지막 인사':            { artist: 'BIGBANG',          year: 2007 },
  'Fine':                { artist: '태연',             year: 2018 },
  '11:11':               { artist: '태연',             year: 2017 },
  'Four Seasons':         { artist: '태연',             year: 2019 },
  '눈의 꽃':              { artist: '박효신',            year: 2004 },
  '서른 즈음에':            { artist: '김광석',           year: 1991 },
  '이등병의 편지':           { artist: '김광석',           year: 1993 },
  '사랑했지만':             { artist: '김광석',           year: 1993 },
  '첫눈이 온다구요':         { artist: '이문세',           year: 1989 },
  '가로수 그늘 아래 서면':     { artist: '이문세',           year: 1988 },
  '붉은 노을':             { artist: '이문세',           year: 1988 },
  '그리움이 그리움에게':       { artist: '이문세',           year: 1988 },
  '돌아와요 부산항에':        { artist: '조용필',           year: 1975 },
  '그 겨울의 찻집':          { artist: '조용필',           year: 1983 },
  'To Heaven':            { artist: '조성모 & 거미',      year: 2003 },
  '사랑 앞에 난 (I Believe)': { artist: '조성모',           year: 1999 },
  'Wedding Dress':         { artist: '태양',             year: 2009 },
  '첫눈처럼 너에게 가겠다':    { artist: 'EXO',             year: 2013 },
  '벚꽃 엔딩':             { artist: '버스커버스커',       year: 2012 },
  '여수 밤바다':            { artist: '버스커버스커',       year: 2012 },
  '결혼해줘':              { artist: '버스커버스커',       year: 2012 },
  '200%':                { artist: 'AKMU',            year: 2014 },
  'Give Love':            { artist: 'AKMU',            year: 2014 },
  '낙하':                 { artist: 'AKMU',            year: 2021 },
  '좋니':                 { artist: '윤종신',            year: 2017 },
  '다행이다':              { artist: '이적',             year: 2009 },
  '비도 오고 그래서':        { artist: '이적',             year: 2013 },
  '가시나무':              { artist: '시인과 촌장',        year: 1988 },
  '가시':                 { artist: '버즈',             year: 2005 },
  '휘파람':               { artist: 'BIGBANG',          year: 2015 },
  '그대라는 시':            { artist: '나얼',             year: 2007 },
  '소주 한 잔':            { artist: '임창정',           year: 2004 },
  '소원을 말해봐':           { artist: '소녀시대',          year: 2009 },
  '다시 만난 세계':          { artist: '소녀시대',          year: 2007 },
  'Into the new world':   { artist: '소녀시대',          year: 2007 },
  '기억을 걷는 시간':        { artist: '브라운아이드소울',    year: 2011 },
  '취기를 빌어':            { artist: '에픽하이',          year: 2017 },
  '인연 (이선희)':          { artist: '이선희',           year: 2010 },
  '안아줘 (정준일)':         { artist: '정준일',           year: 2019 },
  '잊혀진 계절':            { artist: '이용',             year: 1982 },
  '보고싶다':              { artist: '김범수',           year: 2002 },
  '이러지마 제발':           { artist: '박효신',           year: 2005 },
  '아주 오래된 연인들':       { artist: '이적 & 김동률',     year: 2002 },

  // ===== 아이돌 =====
  // EXO
  'GROWL':               { artist: 'EXO',             year: 2013 },
  '으르렁':               { artist: 'EXO',             year: 2013 },
  'Monster':             { artist: 'EXO',             year: 2016 },
  'Ko Ko Bop':           { artist: 'EXO',             year: 2017 },
  "Don't Fight The Feeling": { artist: 'EXO',         year: 2021 },
  'MAMA':                { artist: 'EXO',             year: 2012 },
  'Overdose':            { artist: 'EXO',             year: 2014 },
  '러브샷':               { artist: 'EXO',             year: 2018 },
  'Tempo':               { artist: 'EXO',             year: 2018 },
  'The Eve':             { artist: 'EXO',             year: 2017 },
  'Obsession':           { artist: 'EXO',             year: 2019 },
  '영웅':                { artist: 'EXO',             year: 2019 },
  // SHINee
  'Ring Ding Dong':      { artist: 'SHINee',          year: 2009 },
  '누난 너무 예뻐':         { artist: 'SHINee',          year: 2008 },
  'Lucifer':             { artist: 'SHINee',          year: 2010 },
  'Replay':              { artist: 'SHINee',          year: 2008 },
  'View':                { artist: 'SHINee',          year: 2015 },
  '1 of 1':             { artist: 'SHINee',          year: 2016 },
  // NCT 127
  'Kick It':             { artist: 'NCT 127',         year: 2020 },
  'Cherry Bomb':         { artist: 'NCT 127',         year: 2017 },
  'Limitless':           { artist: 'NCT 127',         year: 2017 },
  'STICKER':             { artist: 'NCT 127',         year: 2021 },
  '2 BADDIES':          { artist: 'NCT 127',         year: 2022 },
  'Favorite':            { artist: 'NCT 127',         year: 2021 },
  // Stray Kids
  'MIROH':               { artist: 'Stray Kids',      year: 2019 },
  'BACK DOOR':           { artist: 'Stray Kids',      year: 2020 },
  'MANIAC':              { artist: 'Stray Kids',      year: 2022 },
  'Thunderous':          { artist: 'Stray Kids',      year: 2021 },
  'In Bloom':            { artist: 'Stray Kids',      year: 2022 },
  'SWEAT':               { artist: 'Stray Kids',      year: 2024 },
  'MELTING POINT':       { artist: 'Stray Kids',      year: 2022 },
  // (G)I-DLE
  'TOMBOY':              { artist: '(G)I-DLE',        year: 2022 },
  'QUEENCARD':           { artist: '(G)I-DLE',        year: 2023 },
  'Nxde':                { artist: '(G)I-DLE',        year: 2022 },
  'Hann':                { artist: '(G)I-DLE',        year: 2018 },
  'Oh my god':           { artist: '(G)I-DLE',        year: 2020 },
  // NewJeans
  'Attention':           { artist: 'NewJeans',        year: 2022 },
  'Ditto':               { artist: 'NewJeans',        year: 2022 },
  'ETA':                 { artist: 'NewJeans',        year: 2023 },
  'Cool With You':       { artist: 'NewJeans',        year: 2023 },
  'Super Shy':           { artist: 'NewJeans',        year: 2023 },
  'ASAP':                { artist: 'NewJeans',        year: 2023 },
  'Bubble Gum':          { artist: 'NewJeans',        year: 2024 },
  'New Jeans':           { artist: 'NewJeans',        year: 2022 },
  '하입보이':              { artist: 'NewJeans',        year: 2022 },
  '강아지':               { artist: 'NewJeans',        year: 2022 },
  // aespa
  'Black Mamba':         { artist: 'aespa',           year: 2020 },
  'Girls':               { artist: 'aespa',           year: 2022 },
  'Drama':               { artist: 'aespa',           year: 2023 },
  'Spicy':               { artist: 'aespa',           year: 2023 },
  'Supernova':           { artist: 'aespa',           year: 2024 },
  'Armageddon':          { artist: 'aespa',           year: 2024 },
  // BLACKPINK
  'How You Like That':   { artist: 'BLACKPINK',       year: 2020 },
  'Lovesick Girls':      { artist: 'BLACKPINK',       year: 2020 },
  'Pink Venom':          { artist: 'BLACKPINK',       year: 2022 },
  'Shut Down':           { artist: 'BLACKPINK',       year: 2022 },
  'FLOWER':              { artist: '지수',             year: 2023 },
  'Solo':                { artist: '제니',             year: 2018 },
  'You & Me':            { artist: '제니',             year: 2023 },
  // TWICE
  'CHEER UP':            { artist: 'TWICE',           year: 2016 },
  'TT':                  { artist: 'TWICE',           year: 2016 },
  'SIGNAL':              { artist: 'TWICE',           year: 2017 },
  'What is Love':        { artist: 'TWICE',           year: 2018 },
  'Dance The Night Away': { artist: 'TWICE',          year: 2018 },
  'MORE & MORE':         { artist: 'TWICE',           year: 2020 },
  'Talk That Talk':      { artist: 'TWICE',           year: 2022 },
  // IVE
  'LOVE DIVE':           { artist: 'IVE',             year: 2022 },
  'After LIKE':          { artist: 'IVE',             year: 2022 },
  'I AM':                { artist: 'IVE',             year: 2023 },
  'Kitsch':              { artist: 'IVE',             year: 2023 },
  'Baddie':              { artist: 'IVE',             year: 2023 },
  'Accendio':            { artist: 'IVE',             year: 2024 },
  // LE SSERAFIM
  'FEARLESS':            { artist: 'LE SSERAFIM',     year: 2022 },
  'ANTIFRAGILE':         { artist: 'LE SSERAFIM',     year: 2022 },
  'UNFORGIVEN':          { artist: 'LE SSERAFIM',     year: 2023 },
  'Perfect Night':       { artist: 'LE SSERAFIM',     year: 2023 },
  'Smart':               { artist: 'LE SSERAFIM',     year: 2024 },
  // 소녀시대
  'Gee':                 { artist: '소녀시대',          year: 2009 },
  'Oh!':                 { artist: '소녀시대',          year: 2010 },
  '훗':                  { artist: '소녀시대',          year: 2010 },
  'Lion Heart':          { artist: '소녀시대',          year: 2015 },
  'Party':               { artist: '소녀시대',          year: 2015 },
  '눈누난나':              { artist: '소녀시대-태티서',    year: 2012 },
  // f(x)
  'Electric Shock':      { artist: 'f(x)',            year: 2012 },
  '피노키오':              { artist: 'f(x)',            year: 2011 },
  '4 Walls':             { artist: 'f(x)',            year: 2015 },
  'Red Light':           { artist: 'f(x)',            year: 2014 },
  // Red Velvet
  'Red Flavor':          { artist: 'Red Velvet',      year: 2017 },
  'Power Up':            { artist: 'Red Velvet',      year: 2018 },
  'Happiness':           { artist: 'Red Velvet',      year: 2014 },
  'Ice Cream Cake':      { artist: 'Red Velvet',      year: 2015 },
  '러시안 룰렛':            { artist: 'Red Velvet',      year: 2016 },
  'Bad Boy (레드벨벳)':    { artist: 'Red Velvet',      year: 2018 },
  '피카부':               { artist: 'Red Velvet',      year: 2017 },
  'Queendom':            { artist: 'Red Velvet',      year: 2021 },
  'Monster (레드벨벳)':   { artist: 'Red Velvet',      year: 2020 },
  '짧은 치마':             { artist: 'Red Velvet',      year: 2014 },
  // MAMAMOO
  'HIP':                 { artist: 'MAMAMOO',         year: 2019 },
  '너나 해':              { artist: 'MAMAMOO',         year: 2018 },
  'AYA':                 { artist: 'MAMAMOO',         year: 2020 },
  'STARRY NIGHT':        { artist: 'MAMAMOO',         year: 2017 },
  'Hip (마마무)':          { artist: 'MAMAMOO',         year: 2019 },
  // ITZY
  'DALLA DALLA':         { artist: 'ITZY',            year: 2019 },
  'ICY':                 { artist: 'ITZY',            year: 2019 },
  'WANNABE':             { artist: 'ITZY',            year: 2020 },
  'Mafia in the Morning': { artist: 'ITZY',           year: 2021 },
  '마.피.아. In the morning': { artist: 'ITZY',        year: 2021 },
  // SEVENTEEN
  '아주 NICE':           { artist: 'SEVENTEEN',       year: 2016 },
  '붐붐':                { artist: 'SEVENTEEN',       year: 2017 },
  '박수':                { artist: 'SEVENTEEN',       year: 2021 },
  '어쩌나':               { artist: 'SEVENTEEN',       year: 2017 },
  'HIT':                 { artist: 'SEVENTEEN',       year: 2019 },
  'Rock with you':       { artist: 'SEVENTEEN',       year: 2021 },
  '반박불가':              { artist: 'SEVENTEEN',       year: 2022 },
  '인기':                { artist: 'SEVENTEEN',       year: 2022 },
  '좋아요':               { artist: 'SEVENTEEN',       year: 2017 },
  // GOT7
  'If You Do':           { artist: 'GOT7',            year: 2015 },
  'Hard Carry':          { artist: 'GOT7',            year: 2016 },
  'Never Ever':          { artist: 'GOT7',            year: 2017 },
  'Lullaby':             { artist: 'GOT7',            year: 2018 },
  // BTS
  'Dynamite':            { artist: 'BTS',             year: 2020 },
  'Butter':              { artist: 'BTS',             year: 2021 },
  'Boy With Luv':        { artist: 'BTS',             year: 2019 },
  'DNA':                 { artist: 'BTS',             year: 2017 },
  '불타오르네':             { artist: 'BTS',             year: 2016 },
  '상남자':               { artist: 'BTS',             year: 2013 },
  '화':                  { artist: 'BTS',             year: 2013 },
  'IDOL':                { artist: 'BTS',             year: 2018 },
  '쩔어':                { artist: 'BTS',             year: 2015 },
  '피 땀 눈물':           { artist: 'BTS',             year: 2016 },
  '페이크 러브':            { artist: 'BTS',             year: 2018 },
  '고민보다 GO':           { artist: 'BTS',             year: 2017 },
  'Life Goes On':        { artist: 'BTS',             year: 2020 },
  'FIRE':                { artist: 'BTS',             year: 2016 },
  // Super Junior
  '쏘리쏘리':              { artist: 'Super Junior',    year: 2010 },
  'Mr. Simple':          { artist: 'Super Junior',    year: 2011 },
  'BONAMANA':            { artist: 'Super Junior',    year: 2010 },
  // EXID
  '위아래':               { artist: 'EXID',            year: 2014 },
  '덜덜덜':               { artist: 'EXID',            year: 2014 },
  'HOT PINK':            { artist: 'EXID',            year: 2015 },
  // 2NE1
  'I AM THE BEST':       { artist: '2NE1',            year: 2011 },
  'LONELY':              { artist: '2NE1',            year: 2011 },
  'Come Back Home':      { artist: '2NE1',            year: 2014 },
  // BIGBANG
  'BANG BANG BANG':      { artist: 'BIGBANG',         year: 2015 },
  'FANTASTIC BABY':      { artist: 'BIGBANG',         year: 2012 },
  '거짓말':               { artist: 'BIGBANG',         year: 2007 },
  'BAD BOY':             { artist: 'BIGBANG',         year: 2012 },
  // WINNER
  '에라 모르겠다':          { artist: 'WINNER',          year: 2014 },
  // 선미
  '가시나':               { artist: '선미',             year: 2016 },
  'LALALAY':             { artist: '선미',             year: 2019 },
  '누누':                { artist: '선미',             year: 2022 },
  'Full Moon':           { artist: '선미',             year: 2014 },
  // Zico
  'Any Song':            { artist: 'Zico',            year: 2020 },
  '아무노래':              { artist: 'Zico',            year: 2020 },
  'Tough Cookie':        { artist: 'Zico',            year: 2014 },
  // 청하
  '벌써 12시':            { artist: '청하',             year: 2018 },
  'SNAPPING':            { artist: '청하',             year: 2019 },
  'Gotta Go':            { artist: '청하',             year: 2019 },
  // 씨스타
  'ALONE':               { artist: '씨스타',            year: 2012 },
  'TOUCH MY BODY':       { artist: '씨스타',            year: 2014 },
  'I Swear':             { artist: '씨스타',            year: 2014 },
  'So Cool':             { artist: '씨스타',            year: 2011 },
  // 카라
  '미스터':               { artist: '카라',             year: 2009 },
  '루팡':                { artist: '카라',             year: 2010 },
  '점핑':                { artist: '카라',             year: 2010 },
  '맘마미아':              { artist: '카라',             year: 2012 },
  // 여자친구
  '시간을 달려서':           { artist: '여자친구',          year: 2015 },
  'FINGERTIP':           { artist: '여자친구',          year: 2017 },
  '밤':                  { artist: '여자친구',          year: 2018 },
  '유리구슬':              { artist: '여자친구',          year: 2016 },
  'Rough':               { artist: '여자친구',          year: 2016 },
  // NMIXX
  'Love Me Like This':   { artist: 'NMIXX',           year: 2023 },
  'Dice':                { artist: 'NMIXX',           year: 2022 },
  'O.O':                 { artist: 'NMIXX',           year: 2022 },
  'DM':                  { artist: 'NMIXX',           year: 2023 },
  // iKON
  'LOVE SCENARIO':       { artist: 'iKON',            year: 2018 },
  'KILLING ME':          { artist: 'iKON',            year: 2018 },
  'Rhythm Ta':           { artist: 'iKON',            year: 2015 },
  // Oh My Girl
  'Remember Me':         { artist: 'Oh My Girl',      year: 2018 },
  '예쁜게 죄':             { artist: 'Oh My Girl',      year: 2016 },
  // 브레이브걸스
  'ROLLIN':              { artist: '브레이브걸스',       year: 2017 },
  // Wanna One
  'Energetic':           { artist: 'Wanna One',       year: 2017 },
  'Beautiful (워너원)':   { artist: 'Wanna One',       year: 2017 },
  // Pentagon
  'Shine':               { artist: 'Pentagon',        year: 2018 },
  // 4MINUTE
  'CRAZY':               { artist: '4MINUTE',         year: 2015 },
  // PSY
  '강남스타일':             { artist: 'PSY',             year: 2012 },
  'GENTLEMAN':           { artist: 'PSY',             year: 2013 },
  'I LUV IT':            { artist: 'PSY',             year: 2017 },
  'New Face':            { artist: 'PSY',             year: 2017 },
  // 서태지와 아이들
  '난 알아요':             { artist: '서태지와 아이들',     year: 1992 },
  '교실 이데아':            { artist: '서태지와 아이들',     year: 1994 },
  // T.O.P
  '땡':                  { artist: 'T.O.P',           year: 2017 },
  // Weeekly / 기타
  'STARRY NIGHT':        { artist: 'MAMAMOO',         year: 2017 },
  'Feel Good':           { artist: 'OH MY GIRL',      year: 2020 },
  // INFINITE
  '소년이여':              { artist: 'INFINITE',        year: 2012 },

  // ===== 인디 =====
  '공드리':               { artist: '혁오',             year: 2015 },
  '와리가리':              { artist: '혁오',             year: 2014 },
  '발해를 꿈꾸며':           { artist: '신해철',           year: 1989 },
  'OHIO':                { artist: '혁오',             year: 2017 },
  '주저하는 연인들을 위해':    { artist: '잔나비',            year: 2019 },
  '나의 사랑 나의 신부':      { artist: '잔나비',            year: 2014 },
  '가을밤에 든 생각':        { artist: '잔나비',            year: 2017 },
  '뜨거운 여름밤은 가고 남은 건 볼품없지만': { artist: '잔나비', year: 2017 },
  '꿈과 책과 힘과 벽':       { artist: '잔나비',            year: 2017 },
  '사랑은 은하수 다방에서':    { artist: '10cm',            year: 2011 },
  '아메리카노':             { artist: '10cm',            year: 2012 },
  '봄이 좋냐':             { artist: '10cm',            year: 2011 },
  '내가 모르는 나':          { artist: 'AKMU',            year: 2014 },
  '바람이 분다':            { artist: '이소라',            year: 2004 },
  '별 보러 가자':           { artist: '볼빨간사춘기',       year: 2016 },
  '나만, 봄':             { artist: '볼빨간사춘기',       year: 2016 },
  '좋다고 말해':            { artist: '볼빨간사춘기',       year: 2016 },
  '오르막길 (볼빨간)':       { artist: '볼빨간사춘기',       year: 2016 },
  '기억상실':              { artist: '적재',             year: 2019 },
  '소나기 (잠비나이)':       { artist: '잠비나이',          year: 2012 },
  '기억해줘 (N.Flying)':    { artist: 'N.Flying',        year: 2017 },
  'Tomboy (혁오)':         { artist: '혁오',             year: 2014 },
  'Gondry':              { artist: '혁오',             year: 2015 },
  '겨울잠 (혁오)':          { artist: '혁오',             year: 2016 },
  '난춘':                { artist: '혁오',             year: 2019 },
  '빨간 아이':             { artist: '잔나비',            year: 2017 },
  '자동차극장에서의 하룻밤':   { artist: '잔나비',            year: 2014 },
  '마지막 인사 (잔나비)':     { artist: '잔나비',            year: 2017 },
  '어디에도':              { artist: '혁오',             year: 2016 },
  '나의 사춘기에게':         { artist: '볼빨간사춘기',       year: 2016 },

  // ===== 힙합 =====
  '헤픈 엔딩':             { artist: '에픽하이',          year: 2009 },
  'Dali, Van, Picasso':  { artist: 'BTS',             year: 2021 },
  '형보다 나은 형':          { artist: '기리보이',          year: 2016 },
  'D (Half Moon)':       { artist: 'DEAN',            year: 2016 },
  'Instagram':           { artist: 'DEAN',            year: 2016 },
  'Pour Up':             { artist: 'DEAN',            year: 2016 },
  '신촌물어':              { artist: 'DEAN',            year: 2016 },
  'Bermuda Triangle':    { artist: '자이언티',           year: 2016 },
  '친해지길 바라':           { artist: '에픽하이',          year: 2013 },
  '주저앉아':              { artist: '에픽하이',          year: 2011 },
  '시발비용':              { artist: '에픽하이',          year: 2017 },
  '자격지심':              { artist: '에픽하이',          year: 2014 },
  'Born Hater':          { artist: '에픽하이',          year: 2014 },
  'Free Kick':           { artist: '에픽하이',          year: 2004 },
  'Merry Jane':          { artist: '에픽하이',          year: 2009 },
  'The Mexican Dream':   { artist: '에픽하이',          year: 2011 },
  'MOMMAE':              { artist: 'Jay Park',         year: 2015 },
  'Maria':               { artist: '화사',             year: 2021 },
  '기리보이 베이비':          { artist: '기리보이',          year: 2016 },
  '청담소나타':             { artist: '기리보이',          year: 2016 },
  '빈지노다':              { artist: '빈지노',            year: 2013 },
  '0 (zero)':            { artist: '빈지노',            year: 2013 },
  '낭만고양이':             { artist: '체리필터',          year: 2002 },
  '놀이 (Simon D)':       { artist: 'Simon Dominic',   year: 2014 },
  '땡':                  { artist: 'T.O.P',           year: 2017 },

  // ===== R&B =====
  'Beautiful':           { artist: '크러쉬',            year: 2015 },
  'Beautiful (크러쉬)':   { artist: '크러쉬',            year: 2015 },
  'OHIO (크러쉬)':        { artist: '크러쉬',            year: 2015 },
  '러쉬아워':              { artist: '크러쉬',            year: 2022 },
  '자나요':               { artist: '수란',             year: 2016 },
  'Hug Me':              { artist: '에디킴',            year: 2013 },
  'Just Right':          { artist: 'GOT7',            year: 2015 },

  // ===== 밴드 =====
  '예뻤어':               { artist: 'DAY6',            year: 2017 },
  '한 페이지가 될 수 있게':   { artist: 'DAY6',            year: 2019 },
  '놓아 놓아 놓아':         { artist: 'DAY6',            year: 2017 },
  'Zombie':              { artist: 'DAY6',            year: 2020 },
  '그래도 넌':             { artist: 'DAY6',            year: 2018 },
  '외톨이야':              { artist: 'CN Blue',         year: 2010 },
  "I'm Sorry":           { artist: 'CN Blue',         year: 2010 },
  'Hey You':             { artist: 'CN Blue',         year: 2012 },
  'Love Light':          { artist: 'FT Island',       year: 2011 },
  '사랑 앓이 (FT아일랜드)':  { artist: 'FT Island',       year: 2012 },
  '첫 번째 고백':          { artist: '버스커버스커',       year: 2011 },
  '봄봄봄':               { artist: '로이킴',            year: 2013 },

  // ===== 트로트 =====
  '테스형':               { artist: '나훈아',            year: 2020 },
  '물레방아 인생':           { artist: '나훈아',            year: 1988 },
  '고향역':               { artist: '나훈아',            year: 1972 },
  '둥지':                { artist: '나훈아',            year: 1987 },
  '가슴 아프게':            { artist: '나훈아',            year: 1969 },
  '비내리는 영동교':         { artist: '나훈아',            year: 1974 },
  '미워도 다시 한번':        { artist: '이미자',            year: 1968 },
  '사랑은 아무나 하나':       { artist: '남진',             year: 1968 },
  '내 나이가 어때서':        { artist: '오승근',            year: 2012 },
  '찐이야':               { artist: '영탁',             year: 2020 },
  '이제 나만 남았잖아':       { artist: '임영웅',            year: 2020 },
  '막걸리 한 잔':           { artist: '임영웅',            year: 2020 },
  '사랑은 늘 도망가 (트로트)': { artist: '임영웅',            year: 2022 },
  '별빛 같은 나의 사랑아 (트로트)': { artist: '임영웅',       year: 2022 },
  '이별의 부산 정거장':       { artist: '남인수',            year: 1953 },
  '노란 샤쓰의 사나이':       { artist: '한명숙',            year: 1961 },
  '어머님께':              { artist: 'god',             year: 1999 },
  '편의점':               { artist: '태진아',            year: 2019 },
  '진또배기':              { artist: '진성',             year: 2013 },
};

const curatedPath = join(__dirname, '../src/data/lifestyle/musicSeed.json');
const dbPath      = join(__dirname, '../src/data/games/songDatabase.json');

const curated = JSON.parse(readFileSync(curatedPath, 'utf-8'));
const curatedTitles = new Set(curated.map(s => s.title));

const { songs } = JSON.parse(readFileSync(dbPath, 'utf-8'));

const newSongs = songs
  .filter(s => !curatedTitles.has(s.name))
  .map(s => {
    const info = ARTIST_MAP[s.name] ?? {};
    return {
      title: s.name,
      artist: info.artist ?? '',
      year: info.year ?? null,
      type_codes: CATEGORY_MAP[s.category] ?? [],
    };
  });

// 중복 제거 (같은 제목이 여러 카테고리에 있는 경우)
const seen = new Set();
const deduped = newSongs.filter(s => {
  if (seen.has(s.title)) return false;
  seen.add(s.title);
  return true;
});

const merged = [...curated, ...deduped];

writeFileSync(curatedPath, JSON.stringify(merged, null, 2));
console.log(`큐레이션 ${curated.length}곡 + 신규 ${deduped.length}곡 = 총 ${merged.length}곡`);
const withArtist = deduped.filter(s => s.artist).length;
console.log(`신규 곡 중 아티스트 정보 있음: ${withArtist}곡 / ${deduped.length}곡`);
