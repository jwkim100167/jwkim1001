import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { useEffect, useState } from 'react';
import { getSavedGames, getLottoNumberByRoundFromSupabase, getLatestLottoNumberFromSupabase } from '../services/supabaseLotto';
import { supabase } from '../supabaseClient';
import { restaurantDataTable, restaurantCategoryTable } from '../data/restaurantData';
import './MyPage.css';

// 요약 회차 아이템 컴포넌트
function SummaryRoundItem({ round, games }) {
  const [winningData, setWinningData] = useState(null);
  const [bestRank, setBestRank] = useState(null);

  useEffect(() => {
    // 해당 회차의 당첨번호 가져오기
    getLottoNumberByRoundFromSupabase(round).then((data) => {
      setWinningData(data);

      if (data && games) {
        // 모든 게임의 등수 계산
        const ranks = games.map((game) => {
          const gameNumbers = [
            game.count1,
            game.count2,
            game.count3,
            game.count4,
            game.count5,
            game.count6,
          ];
          return calculateRankStatic(gameNumbers, data);
        });

        // 최고 등수 찾기 (1등이 가장 좋음)
        const numericRanks = ranks.filter((r) => typeof r === 'number');
        if (numericRanks.length > 0) {
          setBestRank(Math.min(...numericRanks));
        } else {
          setBestRank('낙첨');
        }
      }
    });
  }, [round, games]);

  return (
    <div className="summary-item">
      <span className="summary-round">{round}회</span>
      {!winningData ? (
        <span className="summary-result no-data">당첨번호 없음</span>
      ) : bestRank === null ? (
        <span className="summary-result loading">계산 중...</span>
      ) : (
        <span className={`summary-result rank-${bestRank}`}>
          {typeof bestRank === 'number' ? `${bestRank}등` : bestRank}
        </span>
      )}
    </div>
  );
}

// 정적 등수 계산 함수
function calculateRankStatic(gameNumbers, winningData) {
  if (!winningData) return null;

  const winningNums = [
    winningData.num1,
    winningData.num2,
    winningData.num3,
    winningData.num4,
    winningData.num5,
    winningData.num6,
  ];

  const matchCount = gameNumbers.filter((num) => winningNums.includes(num)).length;
  const hasBonus = gameNumbers.includes(winningData.bonus);

  if (matchCount === 6) return 1;
  if (matchCount === 5 && hasBonus) return 2;
  if (matchCount === 5) return 3;
  if (matchCount === 4) return 4;
  if (matchCount === 3) return 5;
  return '낙첨';
}

export default function MyPage() {
  const { user, logout, loading: authLoading } = useAuth();
  const navigate = useNavigate();
  const [activeTab, setActiveTab] = useState('profile');

  // 로또 관련 상태
  const [savedGames, setSavedGames] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selectedRound, setSelectedRound] = useState(null);
  const [winningNumbers, setWinningNumbers] = useState(null);
  const [roundOptions, setRoundOptions] = useState([]);
  const [latestRound, setLatestRound] = useState(null);
  const [nextRound, setNextRound] = useState(null);

  // 비밀번호 변경 상태
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [passwordMessage, setPasswordMessage] = useState('');

  // 오늘 뭐먹지 상태
  const [foodSubMenu, setFoodSubMenu] = useState('restaurant'); // 'category' | 'restaurant'

  // 레스토랑 추가 상태
  const [newRestaurant, setNewRestaurant] = useState({
    name: '',
    isOpen: true
  });
  const [restaurantSaveMessage, setRestaurantSaveMessage] = useState('');

  // 카테고리 관리 상태
  const [myRestaurants, setMyRestaurants] = useState([]);
  const [selectedRestaurantId, setSelectedRestaurantId] = useState('');
  const [categoryData, setCategoryData] = useState({
    mealTime: '',
    mealKind: '',
    location: '',
    location2: '',
    drinkYN: 'N',
    category: '',
    signature: '',
    partyNumMin: 1,
    partyNumMax: 10
  });
  const [categorySaveMessage, setCategorySaveMessage] = useState('');
  const [restaurantCategoryFromDB, setRestaurantCategoryFromDB] = useState([]);
  const [loadingCategory, setLoadingCategory] = useState(false);

  // 취향 알기 탭 상태
  const [tasteQuestions, setTasteQuestions] = useState([]);
  const [myTasteAnswers, setMyTasteAnswers] = useState({});
  const [myTasteActive, setMyTasteActive] = useState({});
  const [tasteLoading, setTasteLoading] = useState(false);

  // admin 카테고리 수정 상태
  const [categorizedRestaurants, setCategorizedRestaurants] = useState([]);
  const [editRestaurantId, setEditRestaurantId] = useState('');
  const [editCategoryRecordId, setEditCategoryRecordId] = useState(null);
  const [editCategoryData, setEditCategoryData] = useState({
    mealTime: '', mealKind: '', location: '', location2: '',
    drinkYN: 'N', category: '', signature: '', partyNumMin: 1, partyNumMax: 10
  });
  const [editCategoryMessage, setEditCategoryMessage] = useState('');
  const [loadingEdit, setLoadingEdit] = useState(false);

  useEffect(() => {
    console.log('🔵 MyPage useEffect 실행됨, user:', user);
    if (user?.id) {
      console.log('✅ user.id 있음:', user.id);
      // 최신 회차 가져오기
      getLatestLottoNumberFromSupabase().then((data) => {
        console.log('🔍 최신 회차 데이터:', data);
        if (data) {
          const latest = data.round;
          console.log('📊 최신 회차:', latest, '다음 회차:', latest + 1);
          setLatestRound(latest);
          setNextRound(latest + 1);

          // 요약보기 + 다음 회차 + 최신 4개 회차
          const last5Rounds = [latest + 1, ...Array.from({ length: 4 }, (_, i) => latest - i)];
          console.log('📋 요약보기 회차:', last5Rounds);
          setRoundOptions(['summary', ...last5Rounds]);

          // 기본값은 요약보기
          setSelectedRound('summary');
        }
      });

      loadSavedGames();
    } else {
      console.log('❌ user 또는 user.id 없음');
    }
  }, [user]);

  // 선택된 회차 변경 시 당첨번호 가져오기
  useEffect(() => {
    if (selectedRound && selectedRound !== 'summary') {
      loadWinningNumbers(selectedRound);
    }
  }, [selectedRound]);

  const loadWinningNumbers = async (round) => {
    try {
      const data = await getLottoNumberByRoundFromSupabase(round);
      setWinningNumbers(data);
    } catch (error) {
      console.error('당첨번호 로드 실패:', error);
      setWinningNumbers(null);
    }
  };

  // 당첨 등수 계산 (보너스 번호 제외한 6개 번호만 비교)
  const calculateRank = (gameNumbers, winningData) => {
    if (!winningData) return null;

    const winningNums = [
      winningData.num1,
      winningData.num2,
      winningData.num3,
      winningData.num4,
      winningData.num5,
      winningData.num6,
    ];

    const matchCount = gameNumbers.filter(num => winningNums.includes(num)).length;
    const hasBonus = gameNumbers.includes(winningData.bonus);

    if (matchCount === 6) return 1;
    if (matchCount === 5 && hasBonus) return 2;
    if (matchCount === 5) return 3;
    if (matchCount === 4) return 4;
    if (matchCount === 3) return 5;
    return '낙첨';
  };

  const loadSavedGames = async () => {
    setLoading(true);
    try {
      const games = await getSavedGames(user.id);
      // l_number별로 그룹화
      const groupedGames = games.reduce((acc, game) => {
        if (!acc[game.l_number]) {
          acc[game.l_number] = [];
        }
        acc[game.l_number].push(game);
        return acc;
      }, {});
      setSavedGames(groupedGames);
    } catch (error) {
      console.error('저장된 게임 로드 실패:', error);
    } finally {
      setLoading(false);
    }
  };

  // 취향 알기 문항 로드
  const loadTasteQuestions = async () => {
    setTasteLoading(true);
    const { data, error } = await supabase
      .from('taste_match_questions')
      .select('id, sort_order, category, title, emoji_a, text_a, emoji_b, text_b, jw_answer, is_active')
      .order('sort_order', { ascending: true });
    if (!error && data) {
      setTasteQuestions(data);
      const answers = {};
      const active = {};
      data.forEach(q => {
        answers[q.id] = q.jw_answer;
        active[q.id] = q.is_active !== false;
      });
      setMyTasteAnswers(answers);
      setMyTasteActive(active);
    }
    setTasteLoading(false);
  };

  useEffect(() => {
    if (activeTab === 'taste') {
      loadTasteQuestions();
    }
  }, [activeTab]);

  const handleLogout = () => {
    logout();
    navigate('/');
  };

  // 레스토랑 저장 핸들러
  const handleSaveRestaurant = async () => {
    setRestaurantSaveMessage('');

    if (!newRestaurant.name) {
      setRestaurantSaveMessage('레스토랑 이름은 필수 항목입니다.');
      return;
    }

    try {
      const { data, error } = await supabase
        .from('restaurantDataTable')
        .insert([{
          name: newRestaurant.name,
          u_id: user.id,
          approve: false,
          isOpen: newRestaurant.isOpen
        }])
        .select();

      if (error) {
        setRestaurantSaveMessage('저장에 실패했습니다: ' + error.message);
        return;
      }

      setRestaurantSaveMessage('레스토랑이 성공적으로 추가되었습니다!');

      // 추가된 레스토랑의 ID 가져오기
      const newRestaurantId = data[0].r_id || data[0].id;

      setNewRestaurant({
        name: '',
        isOpen: true
      });

      // 카테고리 관리 탭으로 전환하고 새로 추가된 레스토랑 선택
      await loadMyRestaurants();
      setFoodSubMenu('category');
      setSelectedRestaurantId(newRestaurantId.toString());
    } catch (error) {
      console.error('레스토랑 저장 오류:', error);
      setRestaurantSaveMessage('저장 중 오류가 발생했습니다.');
    }
  };

  // 내 레스토랑 목록 로드
  const loadMyRestaurants = async () => {
    setLoadingCategory(true);
    try {
      // admin은 모든 레스토랑, 일반 유저는 본인 레스토랑만
      let query = supabase
        .from('restaurantDataTable')
        .select('*')
        .eq('isOpen', true)
        .order('name', { ascending: true });
      if (user?.loginId !== 'admin') {
        query = query.eq('u_id', user.id);
      }
      const { data: restaurants, error: restaurantError } = await query;

      if (restaurantError) throw restaurantError;

      // 카테고리 테이블 데이터 가져오기
      const { data: categories, error: categoryError } = await supabase
        .from('restaurantCategoryTable')
        .select('*');

      if (categoryError) throw categoryError;

      setMyRestaurants(restaurants || []);
      setRestaurantCategoryFromDB(categories || []);
    } catch (error) {
      console.error('레스토랑 로드 오류:', error);
    } finally {
      setLoadingCategory(false);
    }
  };

  // 카테고리 관리 탭 활성화 시 데이터 로드
  useEffect(() => {
    if (activeTab === 'food' && foodSubMenu === 'category' && user?.id) {
      loadMyRestaurants();
    }
  }, [activeTab, foodSubMenu, user]);

  // admin: restaurantCategoryTable에 있는 r_id로 restaurantDataTable에서 이름 조회 (가나다 순)
  const loadCategorizedRestaurants = async () => {
    setLoadingEdit(true);
    try {
      // 1. restaurantCategoryTable 전체 r_id 조회
      const { data: cats, error: catError } = await supabase
        .from('restaurantCategoryTable')
        .select('r_id')
        .not('r_id', 'is', null);
      if (catError) throw catError;

      const uniqueRIds = [...new Set((cats || []).map(c => c.r_id))];
      console.log('✅ restaurantCategoryTable에서 가져온 r_id 목록:', uniqueRIds);
      console.log('✅ 324가 포함되어 있는가:', uniqueRIds.includes(324));

      if (uniqueRIds.length === 0) {
        setCategorizedRestaurants([]);
        return;
      }

      // 2. restaurantCategoryTable.r_id = restaurantDataTable.id(PK)
      const { data: restaurants, error: rError } = await supabase
        .from('restaurantDataTable')
        .select('id, name')
        .in('id', uniqueRIds)
        .order('name', { ascending: true });
      if (rError) throw rError;

      console.log('✅ 드롭다운에 표시될 레스토랑 목록:', restaurants?.map(r => `${r.id}:${r.name}`));
      setCategorizedRestaurants(restaurants || []);
    } catch (e) {
      console.error('카테고리 목록 로드 실패:', e);
    } finally {
      setLoadingEdit(false);
    }
  };

  // admin: 레스토랑 선택 시 restaurantCategoryTable에서 기존 값 불러오기
  const handleEditRestaurantSelect = async (rid) => {
    setEditRestaurantId(rid);
    setEditCategoryMessage('');
    if (!rid) {
      setEditCategoryRecordId(null);
      setEditCategoryData({ mealTime: '', mealKind: '', location: '', location2: '', drinkYN: 'N', category: '', signature: '', partyNumMin: 1, partyNumMax: 10 });
      return;
    }
    const { data, error } = await supabase
      .from('restaurantCategoryTable')
      .select('*')
      .eq('r_id', parseInt(rid))
      .limit(1)
      .single();
    if (!error && data) {
      setEditCategoryRecordId(data.id);
      setEditCategoryData({
        mealTime: data.mealTime || '',
        mealKind: data.mealKind || '',
        location: data.location || '',
        location2: data.location2 || '',
        drinkYN: data.drinkYN || 'N',
        category: data.category || '',
        signature: data.signature || '',
        partyNumMin: data.partyNumMin ?? 1,
        partyNumMax: data.partyNumMax ?? 10,
      });
    }
  };

  // admin: 카테고리 수정 저장
  const handleUpdateCategory = async () => {
    setEditCategoryMessage('');
    if (!editCategoryRecordId) { setEditCategoryMessage('레스토랑을 선택해주세요.'); return; }
    if (!editCategoryData.location || !editCategoryData.location2 || !editCategoryData.category) {
      setEditCategoryMessage('대분류, 소분류, 카테고리는 필수 항목입니다.');
      return;
    }
    try {
      const { error } = await supabase
        .from('restaurantCategoryTable')
        .update({
          mealTime: editCategoryData.mealTime || null,
          mealKind: editCategoryData.mealKind || null,
          location: editCategoryData.location,
          location2: editCategoryData.location2,
          drinkYN: editCategoryData.drinkYN,
          category: editCategoryData.category,
          signature: editCategoryData.signature || null,
          partyNumMin: editCategoryData.partyNumMin,
          partyNumMax: editCategoryData.partyNumMax,
        })
        .eq('id', editCategoryRecordId);
      if (error) { setEditCategoryMessage('수정 실패: ' + error.message); return; }
      setEditCategoryMessage('수정이 완료되었습니다!');
      loadCategorizedRestaurants();
    } catch (e) {
      console.error('카테고리 수정 오류:', e);
      setEditCategoryMessage('수정 중 오류가 발생했습니다.');
    }
  };

  // 카테고리 저장 핸들러
  const handleSaveCategory = async () => {
    setCategorySaveMessage('');

    if (!selectedRestaurantId) {
      setCategorySaveMessage('레스토랑을 선택해주세요.');
      return;
    }

    if (!categoryData.location || !categoryData.location2 || !categoryData.category) {
      setCategorySaveMessage('대분류, 소분류, 카테고리는 필수 항목입니다.');
      return;
    }

    try {
      // 선택된 레스토랑의 이름 찾기
      const selectedRestaurant = myRestaurants.find(r => {
        const rid = r.r_id || r.id;
        return rid === parseInt(selectedRestaurantId);
      });

      if (!selectedRestaurant) {
        setCategorySaveMessage('레스토랑을 찾을 수 없습니다.');
        return;
      }

      const { error } = await supabase
        .from('restaurantCategoryTable')
        .insert([{
          r_id: parseInt(selectedRestaurantId),
          r_name: selectedRestaurant.name,
          mealTime: categoryData.mealTime || null,
          mealKind: categoryData.mealKind || null,
          location: categoryData.location,
          location2: categoryData.location2,
          drinkYN: categoryData.drinkYN,
          category: categoryData.category,
          signature: categoryData.signature || null,
          partyNumMin: categoryData.partyNumMin,
          partyNumMax: categoryData.partyNumMax
        }]);

      if (error) {
        setCategorySaveMessage('저장에 실패했습니다: ' + error.message);
        return;
      }

      setCategorySaveMessage('카테고리가 성공적으로 추가되었습니다!');
      setSelectedRestaurantId('');
      setCategoryData({
        mealTime: '',
        mealKind: '',
        location: '',
        location2: '',
        drinkYN: 'N',
        category: '',
        signature: '',
        partyNumMin: 1,
        partyNumMax: 10
      });

      // 데이터 새로고침
      loadMyRestaurants();
    } catch (error) {
      console.error('카테고리 저장 오류:', error);
      setCategorySaveMessage('저장 중 오류가 발생했습니다.');
    }
  };

  // 대분류 선택 시 소분류 초기화
  const handleLocationChange = (value) => {
    setCategoryData(prev => ({
      ...prev,
      location: value,
      location2: '' // 대분류 변경 시 소분류 초기화
    }));
  };

  // 카테고리 입력 처리
  const handleCategoryChange = (field, value) => {
    let processedValue = value;
    if (field === 'partyNumMin' || field === 'partyNumMax') {
      processedValue = value === '' ? 1 : parseInt(value);
      if (isNaN(processedValue)) {
        processedValue = 1;
      }
    }
    setCategoryData(prev => ({ ...prev, [field]: processedValue }));
  };

  // 고유 카테고리 추출 함수
  const getUniqueCategories = () => {
    const categories = new Set();
    restaurantCategoryFromDB.forEach(item => {
      if (item.category) {
        categories.add(item.category);
      }
    });
    return Array.from(categories).sort();
  };

  // 대분류 목록 추출
  const getUniqueLocations = () => {
    const locations = new Set();
    restaurantCategoryFromDB.forEach(item => {
      if (item.location) {
        locations.add(item.location);
      }
    });
    return Array.from(locations).sort();
  };

  // 선택된 대분류에 따른 소분류 목록 추출
  const getLocation2Options = () => {
    if (!categoryData.location) return [];
    const location2s = new Set();
    restaurantCategoryFromDB.forEach(item => {
      if (item.location === categoryData.location && item.location2) {
        location2s.add(item.location2);
      }
    });
    return Array.from(location2s).sort();
  };

  // 선택된 mealTime에 따른 mealKind 목록 추출
  const getMealKindOptions = () => {
    if (!categoryData.mealTime) return [];
    const mealKinds = new Set();
    restaurantCategoryFromDB.forEach(item => {
      if (item.mealTime === categoryData.mealTime && item.mealKind) {
        mealKinds.add(item.mealKind);
      }
    });
    return Array.from(mealKinds).sort();
  };

  // 카테고리가 이미 있는 레스토랑 ID 목록
  const getCategorizedRestaurantIds = () => {
    return new Set(restaurantCategoryFromDB.map(cat => cat.r_id));
  };

  // 카테고리가 없는 내 레스토랑만 필터링 (name 가나다 순)
  const getUncategorizedMyRestaurants = () => {
    const categorizedIds = getCategorizedRestaurantIds();
    return myRestaurants
      .filter(restaurant => {
        const rid = restaurant.r_id || restaurant.id;
        return !categorizedIds.has(rid);
      })
      .sort((a, b) => (a.name || '').localeCompare(b.name || '', 'ko'));
  };

  // 비밀번호 변경 핸들러
  const handlePasswordChange = async (e) => {
    e.preventDefault();
    setPasswordMessage('');

    if (newPassword !== confirmPassword) {
      setPasswordMessage('새 비밀번호가 일치하지 않습니다.');
      return;
    }

    if (newPassword.length < 4) {
      setPasswordMessage('비밀번호는 최소 4자 이상이어야 합니다.');
      return;
    }

    try {
      // 현재 비밀번호 확인
      const { data: userData, error: checkError } = await supabase
        .from('userTable')
        .select('password')
        .eq('id', user.id)
        .single();

      if (checkError || !userData) {
        setPasswordMessage('사용자 정보를 찾을 수 없습니다.');
        return;
      }

      if (userData.password !== currentPassword) {
        setPasswordMessage('현재 비밀번호가 일치하지 않습니다.');
        return;
      }

      // 비밀번호 업데이트
      const { error: updateError } = await supabase
        .from('userTable')
        .update({ password: newPassword })
        .eq('id', user.id);

      if (updateError) {
        setPasswordMessage('비밀번호 변경에 실패했습니다.');
        return;
      }

      setPasswordMessage('비밀번호가 성공적으로 변경되었습니다.');
      setCurrentPassword('');
      setNewPassword('');
      setConfirmPassword('');
    } catch (error) {
      console.error('비밀번호 변경 오류:', error);
      setPasswordMessage('비밀번호 변경 중 오류가 발생했습니다.');
    }
  };

  // 번호가 당첨번호에 포함되는지 확인
  const isWinningNumber = (number) => {
    if (!winningNumbers) return false;
    return [
      winningNumbers.num1,
      winningNumbers.num2,
      winningNumbers.num3,
      winningNumbers.num4,
      winningNumbers.num5,
      winningNumbers.num6,
    ].includes(number);
  };

  // 선택된 회차의 저장된 게임 가져오기
  const selectedRoundGames = selectedRound && selectedRound !== 'summary' ? savedGames[selectedRound] : null;

  // 이번주 선택번호 (최신회차 + 1)
  const thisWeekGames = nextRound ? savedGames[nextRound] : null;

  useEffect(() => {
    if (!authLoading && !user) {
      navigate('/login');
    }
  }, [user, authLoading, navigate]);

  // 인증 로딩 중이면 로딩 표시
  if (authLoading) {
    return <div className="mypage"><div className="loading">로딩 중...</div></div>;
  }

  // 로딩 완료 후 user가 없으면 null 반환 (useEffect에서 리다이렉트)
  if (!user) {
    return null;
  }

  return (
    <div className="mypage">
      <div className="mypage-container">
        <h1>🎰 마이페이지</h1>

        {/* 탭 네비게이션 */}
        <div className="tab-navigation">
          <button
            className={`tab-btn ${activeTab === 'profile' ? 'active' : ''}`}
            onClick={() => setActiveTab('profile')}
          >
            기본정보
          </button>
          <button
            className={`tab-btn ${activeTab === 'lotto' ? 'active' : ''}`}
            onClick={() => setActiveTab('lotto')}
          >
            로또
          </button>
          <button
            className={`tab-btn ${activeTab === 'food' ? 'active' : ''}`}
            onClick={() => setActiveTab('food')}
          >
            오늘 뭐먹지
          </button>
          <button
            className={`tab-btn ${activeTab === 'taste' ? 'active' : ''}`}
            onClick={() => setActiveTab('taste')}
          >
            취향 알기
          </button>
        </div>

        {/* 탭 컨텐츠 */}
        <div className="tab-content">
          {/* 기본정보 탭 */}
          {activeTab === 'profile' && (
            <div className="profile-tab">
              <div className="user-info-card">
                <h2>사용자 정보</h2>
                <div className="info-item">
                  <span className="label">아이디:</span>
                  <span className="value">{user.loginId}</span>
                </div>
                <div className="info-item">
                  <span className="label">가입일:</span>
                  <span className="value">{new Date(user.createdAt).toLocaleDateString('ko-KR')}</span>
                </div>
              </div>

              <div className="password-change-card">
                <h2>비밀번호 변경</h2>
                <form onSubmit={handlePasswordChange}>
                  <div className="form-group">
                    <label>현재 비밀번호</label>
                    <input
                      type="password"
                      value={currentPassword}
                      onChange={(e) => setCurrentPassword(e.target.value)}
                      required
                    />
                  </div>
                  <div className="form-group">
                    <label>새 비밀번호</label>
                    <input
                      type="password"
                      value={newPassword}
                      onChange={(e) => setNewPassword(e.target.value)}
                      required
                    />
                  </div>
                  <div className="form-group">
                    <label>새 비밀번호 확인</label>
                    <input
                      type="password"
                      value={confirmPassword}
                      onChange={(e) => setConfirmPassword(e.target.value)}
                      required
                    />
                  </div>
                  {passwordMessage && (
                    <div className={`password-message ${passwordMessage.includes('성공') ? 'success' : 'error'}`}>
                      {passwordMessage}
                    </div>
                  )}
                  <button type="submit" className="change-password-btn">
                    비밀번호 변경
                  </button>
                </form>
              </div>
            </div>
          )}

          {/* 로또 탭 */}
          {activeTab === 'lotto' && (
            <div className="lotto-tab">
              {/* 이번주 선택번호 */}
              <div className="this-week-section">
                <h2>🎲 이번주 선택번호 {nextRound && `(${nextRound}회)`}</h2>
                {loading || !nextRound ? (
                  <div className="loading">로딩 중...</div>
                ) : !thisWeekGames || thisWeekGames.length === 0 ? (
                  <div className="no-selection">이번주는 선택하지 않았습니다.</div>
                ) : (
                  <div className="games-grid">
                    {thisWeekGames.sort((a, b) => a.g_number - b.g_number).map((game, index) => (
                      <div key={game.id || index} className="saved-game-item">
                        <span className="game-number">게임 {game.g_number}</span>
                        <div className="game-balls">
                          <span className="ball">{game.count1}</span>
                          <span className="ball">{game.count2}</span>
                          <span className="ball">{game.count3}</span>
                          <span className="ball">{game.count4}</span>
                          <span className="ball">{game.count5}</span>
                          <span className="ball">{game.count6}</span>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              {/* 회차 선택 */}
              <div className="round-selector-section">
                <h2>🎯 당첨 확인</h2>
                <div className="round-selector">
                  <label htmlFor="round-select">회차 선택:</label>
                  <select
                    id="round-select"
                    value={selectedRound || ''}
                    onChange={(e) => {
                      const value = e.target.value;
                      setSelectedRound(value === 'summary' ? 'summary' : Number(value));
                    }}
                  >
                    {roundOptions.map((round) => (
                      <option key={round} value={round}>
                        {round === 'summary' ? '📊 요약보기' : `${round}회차`}
                      </option>
                    ))}
                  </select>
                </div>

                {/* 요약보기 */}
                {selectedRound === 'summary' ? (
                  <div className="summary-view">
                    <h3>최근 5회차 당첨 요약</h3>
                    {loading || !latestRound ? (
                      <div className="loading">로딩 중...</div>
                    ) : (
                      <div className="summary-list">
                        {[latestRound + 1, ...Array.from({ length: 4 }, (_, i) => latestRound - i)].map((round) => {
                          const games = savedGames[round];
                          if (!games || games.length === 0) {
                            return (
                              <div key={round} className="summary-item">
                                <span className="summary-round">{round}회</span>
                                <span className="summary-result no-play">선택하지 않음</span>
                              </div>
                            );
                          }

                          // 해당 회차의 당첨번호를 가져와서 등수 계산 필요
                          return (
                            <SummaryRoundItem key={round} round={round} games={games} />
                          );
                        })}
                      </div>
                    )}
                  </div>
                ) : (
                  <>
                    {/* 선택된 회차의 당첨번호 표시 */}
                    {winningNumbers && (
                      <div className="winning-numbers">
                        <h3>당첨번호</h3>
                        <div className="winning-balls">
                          <span className="ball winning">{winningNumbers.num1}</span>
                          <span className="ball winning">{winningNumbers.num2}</span>
                          <span className="ball winning">{winningNumbers.num3}</span>
                          <span className="ball winning">{winningNumbers.num4}</span>
                          <span className="ball winning">{winningNumbers.num5}</span>
                          <span className="ball winning">{winningNumbers.num6}</span>
                          <span className="plus">+</span>
                          <span className="ball bonus">{winningNumbers.bonus}</span>
                        </div>
                      </div>
                    )}

                    {/* 선택된 회차의 게임 표시 */}
                    {loading ? (
                      <div className="loading">로딩 중...</div>
                    ) : !selectedRoundGames || selectedRoundGames.length === 0 ? (
                      <div className="no-selection">해당 주는 선택하지 않았습니다.</div>
                    ) : (
                      <div className="selected-round-games">
                        <h3>{selectedRound}회차 내 게임 ({selectedRoundGames.length}개)</h3>
                        <div className="games-grid">
                          {selectedRoundGames.sort((a, b) => a.g_number - b.g_number).map((game, index) => (
                            <div key={game.id || index} className="saved-game-item">
                              <span className="game-number">게임 {game.g_number}</span>
                              <div className="game-balls">
                                <span className={`ball ${isWinningNumber(game.count1) ? 'matched' : ''}`}>
                                  {game.count1}
                                </span>
                                <span className={`ball ${isWinningNumber(game.count2) ? 'matched' : ''}`}>
                                  {game.count2}
                                </span>
                                <span className={`ball ${isWinningNumber(game.count3) ? 'matched' : ''}`}>
                                  {game.count3}
                                </span>
                                <span className={`ball ${isWinningNumber(game.count4) ? 'matched' : ''}`}>
                                  {game.count4}
                                </span>
                                <span className={`ball ${isWinningNumber(game.count5) ? 'matched' : ''}`}>
                                  {game.count5}
                                </span>
                                <span className={`ball ${isWinningNumber(game.count6) ? 'matched' : ''}`}>
                                  {game.count6}
                                </span>
                              </div>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}
                  </>
                )}
              </div>
            </div>
          )}

          {/* 오늘 뭐먹지 탭 */}
          {activeTab === 'food' && (
            <div className="food-tab">
              {/* 서브메뉴 */}
              <div className="food-submenu">
                <button
                  className={`submenu-btn ${foodSubMenu === 'restaurant' ? 'active' : ''}`}
                  onClick={() => setFoodSubMenu('restaurant')}
                >
                  레스토랑 관리
                </button>
                <button
                  className={`submenu-btn ${foodSubMenu === 'category' ? 'active' : ''}`}
                  onClick={() => setFoodSubMenu('category')}
                >
                  카테고리 추가
                </button>
                {user?.loginId === 'admin' && (
                  <button
                    className={`submenu-btn ${foodSubMenu === 'categoryEdit' ? 'active' : ''}`}
                    onClick={() => { setFoodSubMenu('categoryEdit'); loadCategorizedRestaurants(); }}
                  >
                    카테고리 관리
                  </button>
                )}
              </div>

              {/* 레스토랑 관리 */}
              {foodSubMenu === 'restaurant' && (
                <div className="food-admin-card">
                  <h2>🍽️ 레스토랑 관리</h2>
                  <p className="description">
                    새로운 레스토랑을 등록할 수 있습니다. 카테고리까지 등록해야 조회가 가능합니다.
                  </p>

                  <div className="form-section">
                    <div className="form-group">
                      <label>레스토랑 이름 *</label>
                      <input
                        type="text"
                        value={newRestaurant.name}
                        onChange={(e) => setNewRestaurant(prev => ({ ...prev, name: e.target.value }))}
                        placeholder="예: 봉천 한정식"
                      />
                    </div>

                    <div className="form-group">
                      <label>공유 여부</label>
                      <select
                        value={newRestaurant.isOpen}
                        onChange={(e) => setNewRestaurant(prev => ({ ...prev, isOpen: e.target.value === 'true' }))}
                        className="select-box"
                      >
                        <option value="true">O (공유함)</option>
                        <option value="false">X (공유안함)</option>
                      </select>
                    </div>

                    <button onClick={handleSaveRestaurant} className="save-btn">
                      💾 레스토랑 추가하기
                    </button>

                    {restaurantSaveMessage && (
                      <div className={`save-message ${restaurantSaveMessage.includes('성공') ? 'success' : 'error'}`}>
                        {restaurantSaveMessage}
                      </div>
                    )}
                  </div>
                </div>
              )}

              {/* 카테고리 관리 */}
              {foodSubMenu === 'category' && (
                <div className="food-admin-card">
                  <h2>🏷️ 카테고리 추가</h2>
                  <p className="description">
                    {user?.loginId === 'admin'
                      ? '모든 레스토랑에 카테고리를 할당할 수 있습니다.'
                      : '내가 등록한 레스토랑에 카테고리를 할당할 수 있습니다.'}
                  </p>

                  {loadingCategory ? (
                    <div className="loading">로딩 중...</div>
                  ) : (
                    <div className="form-section">
                      {/* 레스토랑 선택 */}
                      <div className="form-group">
                        <label>레스토랑 선택 *</label>
                        <select
                          value={selectedRestaurantId}
                          onChange={(e) => setSelectedRestaurantId(e.target.value)}
                          className="select-box"
                        >
                          <option value="">레스토랑을 선택하세요</option>
                          {getUncategorizedMyRestaurants().map(restaurant => {
                            const rid = restaurant.r_id || restaurant.id;
                            return (
                              <option key={rid} value={rid}>
                                {restaurant.name}
                              </option>
                            );
                          })}
                        </select>
                      </div>

                      {/* 대분류 */}
                      <div className="form-group">
                        <label>대분류 *</label>
                        <select
                          value={categoryData.location}
                          onChange={(e) => handleLocationChange(e.target.value)}
                          className="select-box"
                        >
                          <option value="">선택하세요</option>
                          <option value="추후 입력">추후 입력</option>
                          {getUniqueLocations().map(loc => (
                            <option key={loc} value={loc}>{loc}</option>
                          ))}
                        </select>
                      </div>

                      {/* 소분류 */}
                      <div className="form-group">
                        <label>소분류 *</label>
                        <select
                          value={categoryData.location2}
                          onChange={(e) => handleCategoryChange('location2', e.target.value)}
                          className="select-box"
                          disabled={!categoryData.location}
                        >
                          <option value="">선택하세요</option>
                          <option value="추후 입력">추후 입력</option>
                          {getLocation2Options().map(loc2 => (
                            <option key={loc2} value={loc2}>{loc2}</option>
                          ))}
                        </select>
                      </div>

                      {/* 카테고리 */}
                      <div className="form-group">
                        <label>카테고리 *</label>
                        <select
                          value={categoryData.category}
                          onChange={(e) => handleCategoryChange('category', e.target.value)}
                          className="select-box"
                        >
                          <option value="">선택하세요</option>
                          {getUniqueCategories().map(cat => (
                            <option key={cat} value={cat}>{cat}</option>
                          ))}
                        </select>
                      </div>

                      {/* 점심/저녁 */}
                      <div className="form-group">
                        <label>점심/저녁</label>
                        <select
                          value={categoryData.mealTime}
                          onChange={(e) => handleCategoryChange('mealTime', e.target.value)}
                          className="select-box"
                        >
                          <option value="">선택하세요</option>
                          <option value="점심">점심</option>
                          <option value="저녁">저녁</option>
                        </select>
                      </div>

                      {/* 식사 종류 */}
                      <div className="form-group">
                        <label>식사 종류</label>
                        <select
                          value={categoryData.mealKind}
                          onChange={(e) => handleCategoryChange('mealKind', e.target.value)}
                          className="select-box"
                          disabled={!categoryData.mealTime}
                        >
                          <option value="">선택하세요</option>
                          {getMealKindOptions().map(kind => (
                            <option key={kind} value={kind}>{kind}</option>
                          ))}
                        </select>
                      </div>

                      {/* 주류 여부 */}
                      <div className="form-group">
                        <label>주류 가능 여부</label>
                        <select
                          value={categoryData.drinkYN}
                          onChange={(e) => handleCategoryChange('drinkYN', e.target.value)}
                          className="select-box"
                        >
                          <option value="Y">Y (가능)</option>
                          <option value="N">N (불가능)</option>
                        </select>
                      </div>

                      {/* 시그니처 메뉴 */}
                      <div className="form-group">
                        <label>시그니처 메뉴</label>
                        <input
                          type="text"
                          value={categoryData.signature}
                          onChange={(e) => handleCategoryChange('signature', e.target.value)}
                          placeholder="예: 제육볶음"
                        />
                      </div>

                      {/* 인원수 */}
                      <div className="party-num-group">
                        <div className="form-group">
                          <label>최소 인원</label>
                          <input
                            type="number"
                            min="1"
                            value={categoryData.partyNumMin}
                            onChange={(e) => handleCategoryChange('partyNumMin', e.target.value)}
                          />
                        </div>
                        <div className="form-group">
                          <label>최대 인원</label>
                          <input
                            type="number"
                            min="1"
                            value={categoryData.partyNumMax}
                            onChange={(e) => handleCategoryChange('partyNumMax', e.target.value)}
                          />
                        </div>
                      </div>

                      <button onClick={handleSaveCategory} className="save-btn">
                        💾 카테고리 저장하기
                      </button>

                      {categorySaveMessage && (
                        <div className={`save-message ${categorySaveMessage.includes('성공') ? 'success' : 'error'}`}>
                          {categorySaveMessage}
                        </div>
                      )}
                    </div>
                  )}
                </div>
              )}
              {/* admin 카테고리 수정 */}
              {foodSubMenu === 'categoryEdit' && user?.loginId === 'admin' && (
                <div className="food-admin-card">
                  <h2>✏️ 카테고리 관리</h2>
                  <p className="description">카테고리가 등록된 레스토랑의 값을 수정합니다.</p>
                  {loadingEdit ? (
                    <div className="loading">로딩 중...</div>
                  ) : (
                    <div className="form-section">
                      <div className="form-group">
                        <label>레스토랑 선택 *</label>
                        <select
                          value={editRestaurantId}
                          onChange={(e) => handleEditRestaurantSelect(e.target.value)}
                          className="select-box"
                        >
                          <option value="">레스토랑을 선택하세요</option>
                          {categorizedRestaurants.map(r => (
                            <option key={r.id} value={r.id}>{r.name}</option>
                          ))}
                        </select>
                      </div>

                      {editCategoryRecordId && (
                        <>
                          <div className="form-group">
                            <label>대분류 *</label>
                            <input type="text" value={editCategoryData.location}
                              onChange={(e) => setEditCategoryData(prev => ({ ...prev, location: e.target.value, location2: '' }))}
                              className="input-box" />
                          </div>
                          <div className="form-group">
                            <label>소분류 *</label>
                            <input type="text" value={editCategoryData.location2}
                              onChange={(e) => setEditCategoryData(prev => ({ ...prev, location2: e.target.value }))}
                              className="input-box" />
                          </div>
                          <div className="form-group">
                            <label>카테고리 *</label>
                            <input type="text" value={editCategoryData.category}
                              onChange={(e) => setEditCategoryData(prev => ({ ...prev, category: e.target.value }))}
                              className="input-box" />
                          </div>
                          <div className="form-group">
                            <label>점심/저녁</label>
                            <select value={editCategoryData.mealTime}
                              onChange={(e) => setEditCategoryData(prev => ({ ...prev, mealTime: e.target.value }))}
                              className="select-box">
                              <option value="">선택하세요</option>
                              <option value="점심">점심</option>
                              <option value="저녁">저녁</option>
                            </select>
                          </div>
                          <div className="form-group">
                            <label>식사 종류</label>
                            <input type="text" value={editCategoryData.mealKind}
                              onChange={(e) => setEditCategoryData(prev => ({ ...prev, mealKind: e.target.value }))}
                              className="input-box" />
                          </div>
                          <div className="form-group">
                            <label>주류 가능 여부</label>
                            <select value={editCategoryData.drinkYN}
                              onChange={(e) => setEditCategoryData(prev => ({ ...prev, drinkYN: e.target.value }))}
                              className="select-box">
                              <option value="Y">Y (가능)</option>
                              <option value="N">N (불가능)</option>
                            </select>
                          </div>
                          <div className="form-group">
                            <label>시그니처 메뉴</label>
                            <input type="text" value={editCategoryData.signature}
                              onChange={(e) => setEditCategoryData(prev => ({ ...prev, signature: e.target.value }))}
                              placeholder="예: 제육볶음" className="input-box" />
                          </div>
                          <div className="party-num-group">
                            <div className="form-group">
                              <label>최소 인원</label>
                              <input type="number" min="1" value={editCategoryData.partyNumMin}
                                onChange={(e) => setEditCategoryData(prev => ({ ...prev, partyNumMin: parseInt(e.target.value) || 1 }))} />
                            </div>
                            <div className="form-group">
                              <label>최대 인원</label>
                              <input type="number" min="1" value={editCategoryData.partyNumMax}
                                onChange={(e) => setEditCategoryData(prev => ({ ...prev, partyNumMax: parseInt(e.target.value) || 1 }))} />
                            </div>
                          </div>
                          <button onClick={handleUpdateCategory} className="save-btn">
                            💾 수정 저장하기
                          </button>
                        </>
                      )}

                      {editCategoryMessage && (
                        <div className={`save-message ${editCategoryMessage.includes('완료') ? 'success' : 'error'}`}>
                          {editCategoryMessage}
                        </div>
                      )}
                    </div>
                  )}
                </div>
              )}
            </div>
          )}

          {/* 취향 알기 탭 */}
          {activeTab === 'taste' && (
            <div className="taste-tab">
              <div className="taste-admin-card">
                <h2>💫 JW의 취향</h2>
                <p className="description">각 질문에 대한 JW의 취향을 확인해보세요.</p>
                {tasteLoading ? (
                  <div className="loading">문항 불러오는 중...</div>
                ) : (
                  <div className="taste-q-list">
                    {tasteQuestions.map((q, i) => (
                      <div key={q.id} className={`taste-q-item ${myTasteActive[q.id] === false ? 'inactive' : ''}`}>
                        <div className="taste-q-header">
                          <span className="taste-q-num">{i + 1}</span>
                          <span className="taste-q-title">{q.title || `문항 ${i + 1}`}</span>
                          <span className="taste-q-category">{q.category}</span>
                          <span className={`taste-active-badge ${myTasteActive[q.id] !== false ? 'on' : 'off'}`}>
                            {myTasteActive[q.id] !== false ? '활성' : '비활성'}
                          </span>
                        </div>
                        <div className="taste-choice-group">
                          <div className={`taste-choice-btn ${myTasteAnswers[q.id] === '1' ? 'selected' : ''}`}>
                            <span className="taste-choice-emoji">{q.emoji_a}</span>
                            <span>{q.text_a}</span>
                          </div>
                          <span className="taste-vs">VS</span>
                          <div className={`taste-choice-btn ${myTasteAnswers[q.id] === '2' ? 'selected' : ''}`}>
                            <span className="taste-choice-emoji">{q.emoji_b}</span>
                            <span>{q.text_b}</span>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          )}
        </div>

        <div className="action-buttons">
          <button className="home-btn" onClick={() => navigate('/')}>
            🏠 홈으로
          </button>
          <button className="logout-btn" onClick={handleLogout}>
            🚪 로그아웃
          </button>
        </div>
      </div>
    </div>
  );
}
