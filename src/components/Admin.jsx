import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { useEffect, useState } from 'react';
import { supabase } from '../supabaseClient';
import './Admin.css';

export default function Admin() {
  const { user, logout, loading: authLoading } = useAuth();
  const navigate = useNavigate();
  const [activeTab, setActiveTab] = useState('profile');

  // 비밀번호 변경 상태
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [passwordMessage, setPasswordMessage] = useState('');

  // 취향 알기 탭 상태
  const [tasteQuestions, setTasteQuestions] = useState([]);
  const [jwAnswers, setJwAnswers] = useState({});
  const [isActive, setIsActive] = useState({});
  const [tasteLoading, setTasteLoading] = useState(false);
  const [tasteSaveMsg, setTasteSaveMsg] = useState('');
  const [newQuestion, setNewQuestion] = useState({
    category: 'food', title: '',
    emoji_a: '', text_a: '', emoji_b: '', text_b: '', jw_answer: '1',
  });
  const [addMsg, setAddMsg] = useState('');
  const [isAdding, setIsAdding] = useState(false);

  // 오늘 뭐먹지 - 카테고리 관리 상태 (categorized 레스토랑 수정)
  const [categorizedRestaurants, setCategorizedRestaurants] = useState([]);
  const [selectedRestaurantId, setSelectedRestaurantId] = useState('');
  const [editCategoryRecordId, setEditCategoryRecordId] = useState(null);
  const [editCategoryData, setEditCategoryData] = useState({
    mealTime: '', mealKind: '', location: '', location2: '',
    drinkYN: 'N', category: '', signature: '', partyNumMin: 1, partyNumMax: 10
  });
  const [editBobYN, setEditBobYN] = useState(false);
  const [filterBobYN, setFilterBobYN] = useState(null); // null=전체, true=노출, false=미노출
  const [saveMessage, setSaveMessage] = useState('');
  const [loadingRestaurants, setLoadingRestaurants] = useState(false);

  useEffect(() => {
    if (!authLoading && (!user || user.loginId !== 'admin')) {
      navigate('/');
    }
  }, [user, authLoading, navigate]);

  // 카테고리가 등록된 레스토랑 목록 로드
  // restaurantCategoryTable.r_id → restaurantDataTable.id(PK) 관계
  const loadCategorizedRestaurants = async () => {
    setLoadingRestaurants(true);
    try {
      // 1. restaurantCategoryTable에서 r_id 목록 가져오기
      const { data: cats, error: catError } = await supabase
        .from('restaurantCategoryTable')
        .select('r_id')
        .not('r_id', 'is', null);
      if (catError) throw catError;

      const uniqueRIds = [...new Set((cats || []).map(c => c.r_id))];
      if (uniqueRIds.length === 0) {
        setCategorizedRestaurants([]);
        return;
      }

      // 2. restaurantDataTable.id(PK) 기준으로 이름 + bobYN 가져오기
      const { data: restaurants, error: rError } = await supabase
        .from('restaurantDataTable')
        .select('id, name, bobYN')
        .in('id', uniqueRIds)
        .order('name', { ascending: true });
      if (rError) throw rError;

      setCategorizedRestaurants(restaurants || []);
    } catch (e) {
      console.error('카테고리 목록 로드 실패:', e);
    } finally {
      setLoadingRestaurants(false);
    }
  };

  useEffect(() => {
    if (activeTab === 'food') {
      loadCategorizedRestaurants();
    }
    if (activeTab === 'taste') {
      loadTasteQuestions();
    }
  }, [activeTab]);

  // 취향 알기 문항 로드
  const loadTasteQuestions = async () => {
    setTasteLoading(true);
    setTasteSaveMsg('');
    const { data, error } = await supabase
      .from('taste_match_questions')
      .select('id, sort_order, category, title, emoji_a, text_a, emoji_b, text_b, jw_answer')
      .order('sort_order', { ascending: true });
    if (!error && data) {
      setTasteQuestions(data);
      const initial = {};
      const initialActive = {};
      data.forEach(q => {
        initial[q.id] = q.jw_answer;
        initialActive[q.id] = q.is_active !== false;
      });
      setJwAnswers(initial);
      setIsActive(initialActive);
    }
    setTasteLoading(false);
  };

  // 기존 result 전체 재계산
  const recalculateAllResults = async (sortedQs, newJwAnswers, newIsActive) => {
    const activeItems = sortedQs
      .map((q, i) => ({ q, i }))
      .filter(({ q }) => newIsActive[q.id] !== false);
    if (activeItems.length === 0) return;

    const { data: allResults } = await supabase
      .from('taste_match_results')
      .select('id, answers');
    if (!allResults || allResults.length === 0) return;

    await Promise.all(
      allResults.map(result => {
        const matchCount = activeItems.filter(({ q, i }) =>
          result.answers?.[i] === newJwAnswers[q.id]
        ).length;
        const scoreNum = Math.round((matchCount / activeItems.length) * 100);
        return supabase
          .from('taste_match_results')
          .update({ score: `${scoreNum}%` })
          .eq('id', result.id);
      })
    );
  };

  // 취향 알기 전체 저장 + 결과 재계산
  const handleSaveTasteAnswers = async () => {
    setTasteSaveMsg('저장 중...');
    try {
      await Promise.all(
        tasteQuestions.map(q =>
          supabase
            .from('taste_match_questions')
            .update({ jw_answer: jwAnswers[q.id], is_active: isActive[q.id] !== false })
            .eq('id', q.id)
        )
      );
      setTasteSaveMsg('결과 재계산 중...');
      await recalculateAllResults(tasteQuestions, jwAnswers, isActive);
      setTasteSaveMsg('저장 완료! 기존 결과 재계산 완료 ✅');
    } catch (e) {
      setTasteSaveMsg('저장 실패: ' + e.message);
    }
  };

  // 질문 추가
  const handleAddQuestion = async () => {
    if (!newQuestion.title.trim() || !newQuestion.text_a.trim() || !newQuestion.text_b.trim()) {
      setAddMsg('제목, 선택지A, 선택지B는 필수 항목입니다.');
      return;
    }
    setIsAdding(true);
    setAddMsg('추가 중...');
    try {
      // 1. 현재 max sort_order 조회
      const { data: maxData } = await supabase
        .from('taste_match_questions')
        .select('sort_order')
        .order('sort_order', { ascending: false })
        .limit(1);
      const nextOrder = (maxData?.[0]?.sort_order ?? 0) + 1;

      // 2. 질문 INSERT
      await supabase.from('taste_match_questions').insert([{
        sort_order: nextOrder,
        category: newQuestion.category,
        title: newQuestion.title.trim(),
        emoji_a: newQuestion.emoji_a.trim(),
        text_a: newQuestion.text_a.trim(),
        emoji_b: newQuestion.emoji_b.trim(),
        text_b: newQuestion.text_b.trim(),
        jw_answer: newQuestion.jw_answer,
        is_active: true,
      }]);

      // 3. 기존 results의 answers 끝에 '0' 추가
      const { data: allResults } = await supabase
        .from('taste_match_results').select('id, answers');
      if (allResults && allResults.length > 0) {
        await Promise.all(
          allResults.map(r =>
            supabase.from('taste_match_results')
              .update({ answers: (r.answers || '') + '0' })
              .eq('id', r.id)
          )
        );
      }

      // 4. 질문 목록 새로고침 후 점수 재계산
      setAddMsg('점수 재계산 중...');
      const { data: freshQs } = await supabase
        .from('taste_match_questions')
        .select('id, sort_order, category, title, emoji_a, text_a, emoji_b, text_b, jw_answer, is_active')
        .order('sort_order', { ascending: true });
      if (freshQs) {
        setTasteQuestions(freshQs);
        const newJwAnswers = {};
        const newIsActive = {};
        freshQs.forEach(q => {
          newJwAnswers[q.id] = q.jw_answer;
          newIsActive[q.id] = q.is_active !== false;
        });
        setJwAnswers(newJwAnswers);
        setIsActive(newIsActive);
        await recalculateAllResults(freshQs, newJwAnswers, newIsActive);
      }

      setNewQuestion({ category: 'food', title: '', emoji_a: '', text_a: '', emoji_b: '', text_b: '', jw_answer: '1' });
      setAddMsg('질문 추가 완료! 기존 결과 재계산 완료 ✅');
    } catch (e) {
      setAddMsg('추가 실패: ' + e.message);
    } finally {
      setIsAdding(false);
    }
  };

  // 질문 삭제
  const handleDeleteQuestion = async (questionId, questionIndex) => {
    if (!window.confirm(`이 질문을 삭제하면 모든 기존 결과가 재계산됩니다.\n계속하시겠습니까?`)) return;
    setTasteSaveMsg('삭제 중...');
    try {
      // 1. 질문 DELETE
      await supabase.from('taste_match_questions').delete().eq('id', questionId);

      // 2. 모든 results의 answers에서 해당 index 문자 제거
      const { data: allResults } = await supabase
        .from('taste_match_results').select('id, answers');
      if (allResults && allResults.length > 0) {
        await Promise.all(
          allResults.map(r => {
            const ans = r.answers || '';
            const newAns = ans.slice(0, questionIndex) + ans.slice(questionIndex + 1);
            return supabase.from('taste_match_results')
              .update({ answers: newAns })
              .eq('id', r.id);
          })
        );
      }

      // 3. 남은 질문 새로고침 후 점수 재계산
      setTasteSaveMsg('점수 재계산 중...');
      const { data: freshQs } = await supabase
        .from('taste_match_questions')
        .select('id, sort_order, category, title, emoji_a, text_a, emoji_b, text_b, jw_answer, is_active')
        .order('sort_order', { ascending: true });
      if (freshQs) {
        setTasteQuestions(freshQs);
        const newJwAnswers = {};
        const newIsActive = {};
        freshQs.forEach(q => {
          newJwAnswers[q.id] = q.jw_answer;
          newIsActive[q.id] = q.is_active !== false;
        });
        setJwAnswers(newJwAnswers);
        setIsActive(newIsActive);
        await recalculateAllResults(freshQs, newJwAnswers, newIsActive);
      }
      setTasteSaveMsg('삭제 완료! 기존 결과 재계산 완료 ✅');
    } catch (e) {
      setTasteSaveMsg('삭제 실패: ' + e.message);
    }
  };

  // 레스토랑 선택 시 restaurantCategoryTable에서 기존 값 불러오기
  const handleRestaurantSelect = async (id) => {
    setSelectedRestaurantId(id);
    setSaveMessage('');
    if (!id) {
      setEditCategoryRecordId(null);
      setEditCategoryData({ mealTime: '', mealKind: '', location: '', location2: '', drinkYN: 'N', category: '', signature: '', partyNumMin: 1, partyNumMax: 10 });
      setEditBobYN(false);
      return;
    }
    // restaurantCategoryTable에서 카테고리 데이터 로드
    const { data: catData, error: catError } = await supabase
      .from('restaurantCategoryTable')
      .select('*')
      .eq('r_id', parseInt(id))
      .limit(1)
      .single();
    if (!catError && catData) {
      setEditCategoryRecordId(catData.id);
      setEditCategoryData({
        mealTime: catData.mealTime || '',
        mealKind: catData.mealKind || '',
        location: catData.location || '',
        location2: catData.location2 || '',
        drinkYN: catData.drinkYN || 'N',
        category: catData.category || '',
        signature: catData.signature || '',
        partyNumMin: catData.partyNumMin ?? 1,
        partyNumMax: catData.partyNumMax ?? 10,
      });
    }
    // restaurantDataTable에서 bobYN 로드
    const { data: rData } = await supabase
      .from('restaurantDataTable')
      .select('bobYN')
      .eq('id', parseInt(id))
      .single();
    setEditBobYN(rData?.bobYN ?? false);
  };

  // 카테고리 수정 저장
  const handleSaveCategory = async () => {
    setSaveMessage('');
    if (!editCategoryRecordId) { setSaveMessage('레스토랑을 선택해주세요.'); return; }
    if (!editCategoryData.location || !editCategoryData.location2 || !editCategoryData.category) {
      setSaveMessage('대분류, 소분류, 카테고리는 필수 항목입니다.');
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
      if (error) { setSaveMessage('수정 실패: ' + error.message); return; }

      // restaurantDataTable.bobYN 업데이트
      const { error: bobError } = await supabase
        .from('restaurantDataTable')
        .update({ bobYN: editBobYN })
        .eq('id', parseInt(selectedRestaurantId));
      if (bobError) { setSaveMessage('bobYN 수정 실패: ' + bobError.message); return; }

      setSaveMessage('수정이 완료되었습니다!');
    } catch (e) {
      console.error('카테고리 수정 오류:', e);
      setSaveMessage('수정 중 오류가 발생했습니다.');
    }
  };

  const handleLogout = () => {
    logout();
    navigate('/');
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

  if (authLoading) {
    return <div className="admin"><div className="loading">로딩 중...</div></div>;
  }

  if (!user || user.loginId !== 'admin') {
    return null;
  }

  return (
    <div className="admin">
      <div className="admin-container">
        <h1>📊 관리자 페이지</h1>

        <div className="tab-navigation">
          <button
            className={`tab-btn ${activeTab === 'profile' ? 'active' : ''}`}
            onClick={() => setActiveTab('profile')}
          >
            기본정보
          </button>
          <button
            className={`tab-btn ${activeTab === 'lotto' ? 'active' : ''}`}
            onClick={() => navigate('/lottoadmin')}
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

        <div className="tab-content">
          {/* 기본정보 탭 */}
          {activeTab === 'profile' && (
            <div className="profile-tab">
              <div className="user-info-card">
                <h2>관리자 정보</h2>
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

          {/* 오늘 뭐먹지 탭 */}
          {activeTab === 'food' && (
            <div className="food-tab">
              <div className="food-admin-card">
                <h2>✏️ 오늘 뭐먹지 - 카테고리 관리</h2>
                <p className="description">
                  restaurantCategoryTable에 등록된 레스토랑의 카테고리를 수정합니다.
                </p>

                {loadingRestaurants ? (
                  <div className="loading">데이터 로딩 중...</div>
                ) : (
                  <div className="form-section">
                    <div className="form-group">
                      <label>MOMOK-멤버십 노출 필터 (bobYN)</label>
                      <div className="radio-group">
                        <label>
                          <input type="radio" name="filterBobYN" value="all"
                            checked={filterBobYN === null}
                            onChange={() => { setFilterBobYN(null); setSelectedRestaurantId(''); setEditCategoryRecordId(null); }} />
                          &nbsp;전체
                        </label>
                        <label>
                          <input type="radio" name="filterBobYN" value="true"
                            checked={filterBobYN === true}
                            onChange={() => { setFilterBobYN(true); setSelectedRestaurantId(''); setEditCategoryRecordId(null); }} />
                          &nbsp;노출
                        </label>
                        <label>
                          <input type="radio" name="filterBobYN" value="false"
                            checked={filterBobYN === false}
                            onChange={() => { setFilterBobYN(false); setSelectedRestaurantId(''); setEditCategoryRecordId(null); }} />
                          &nbsp;미노출
                        </label>
                      </div>
                    </div>

                    <div className="form-group">
                      <label>레스토랑 선택 *</label>
                      <select
                        value={selectedRestaurantId}
                        onChange={(e) => handleRestaurantSelect(e.target.value)}
                        className="select-box"
                      >
                        <option value="">레스토랑을 선택하세요</option>
                        {categorizedRestaurants
                          .filter(r => filterBobYN === null || r.bobYN === filterBobYN)
                          .map(r => (
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
                        <div className="form-group">
                          <label>MOMOK-멤버십 노출 (bobYN)</label>
                          <div className="radio-group">
                            <label>
                              <input type="radio" name="bobYN" value="true"
                                checked={editBobYN === true}
                                onChange={() => setEditBobYN(true)} />
                              &nbsp;노출
                            </label>
                            <label>
                              <input type="radio" name="bobYN" value="false"
                                checked={editBobYN === false}
                                onChange={() => setEditBobYN(false)} />
                              &nbsp;미노출
                            </label>
                          </div>
                        </div>
                        <button onClick={handleSaveCategory} className="save-btn">
                          💾 수정 저장하기
                        </button>
                      </>
                    )}

                    {saveMessage && (
                      <div className={`save-message ${saveMessage.includes('완료') ? 'success' : 'error'}`}>
                        {saveMessage}
                      </div>
                    )}
                  </div>
                )}
              </div>
            </div>
          )}

          {/* 취향 알기 탭 */}
          {activeTab === 'taste' && (
            <div className="taste-tab">
              <div className="taste-admin-card">
                <h2>💫 취향 알기 - JW 답변 설정</h2>
                <p className="description">
                  각 문항에서 JW의 답변을 선택하세요. 선택 후 하단 "전체 저장" 버튼을 눌러주세요.
                </p>
                {tasteLoading ? (
                  <div className="loading">문항 불러오는 중...</div>
                ) : (
                  <>
                    <div className="taste-q-list">
                      {tasteQuestions.map((q, i) => (
                        <div key={q.id} className={`taste-q-item ${isActive[q.id] === false ? 'inactive' : ''}`}>
                          <div className="taste-q-header">
                            <span className="taste-q-num">{i + 1}</span>
                            <span className="taste-q-title">{q.title || `문항 ${i + 1}`}</span>
                            <span className="taste-q-category">{q.category}</span>
                            <button
                              className={`taste-active-toggle ${isActive[q.id] !== false ? 'on' : 'off'}`}
                              onClick={() => setIsActive(prev => ({ ...prev, [q.id]: prev[q.id] === false }))}
                              title={isActive[q.id] !== false ? '클릭 시 비활성화 (점수 제외)' : '클릭 시 활성화 (점수 포함)'}
                            >
                              {isActive[q.id] !== false ? '활성' : '비활성'}
                            </button>
                            <button
                              className="taste-delete-btn"
                              onClick={() => handleDeleteQuestion(q.id, i)}
                              title="질문 삭제"
                            >
                              🗑️
                            </button>
                          </div>
                          <div className="taste-choice-group">
                            <button
                              className={`taste-choice-btn ${jwAnswers[q.id] === '1' ? 'selected' : ''}`}
                              onClick={() => setJwAnswers(prev => ({ ...prev, [q.id]: '1' }))}
                            >
                              <span className="taste-choice-emoji">{q.emoji_a}</span>
                              <span>{q.text_a}</span>
                            </button>
                            <span className="taste-vs">VS</span>
                            <button
                              className={`taste-choice-btn ${jwAnswers[q.id] === '2' ? 'selected' : ''}`}
                              onClick={() => setJwAnswers(prev => ({ ...prev, [q.id]: '2' }))}
                            >
                              <span className="taste-choice-emoji">{q.emoji_b}</span>
                              <span>{q.text_b}</span>
                            </button>
                          </div>
                        </div>
                      ))}
                    </div>

                    <button className="save-btn" onClick={handleSaveTasteAnswers}>
                      💾 전체 저장
                    </button>
                    {tasteSaveMsg && (
                      <div className={`save-message ${tasteSaveMsg.includes('완료') ? 'success' : 'error'}`}>
                        {tasteSaveMsg}
                      </div>
                    )}

                    {/* 질문 추가 폼 */}
                    <div className="taste-add-form">
                      <h3 className="taste-add-title">➕ 질문 추가</h3>
                      <div className="taste-add-grid">
                        <div className="form-group">
                          <label>카테고리</label>
                          <select
                            value={newQuestion.category}
                            onChange={e => setNewQuestion(p => ({ ...p, category: e.target.value }))}
                            className="select-box"
                          >
                            <option value="food">🍔 food</option>
                            <option value="life">🏠 life</option>
                            <option value="relation">👥 relation</option>
                            <option value="dilemma">🔥 dilemma</option>
                          </select>
                        </div>
                        <div className="form-group">
                          <label>질문 제목 *</label>
                          <input
                            type="text"
                            placeholder="예: 달달한 것 vs 매운 것"
                            value={newQuestion.title}
                            onChange={e => setNewQuestion(p => ({ ...p, title: e.target.value }))}
                            className="input-box"
                          />
                        </div>
                        <div className="taste-add-choices">
                          <div className="taste-add-choice">
                            <label>이모지 A</label>
                            <input type="text" placeholder="🍰" value={newQuestion.emoji_a}
                              onChange={e => setNewQuestion(p => ({ ...p, emoji_a: e.target.value }))}
                              className="input-box taste-emoji-input" />
                            <label>선택지 A *</label>
                            <input type="text" placeholder="달달한 것" value={newQuestion.text_a}
                              onChange={e => setNewQuestion(p => ({ ...p, text_a: e.target.value }))}
                              className="input-box" />
                          </div>
                          <div className="taste-add-choice">
                            <label>이모지 B</label>
                            <input type="text" placeholder="🌶️" value={newQuestion.emoji_b}
                              onChange={e => setNewQuestion(p => ({ ...p, emoji_b: e.target.value }))}
                              className="input-box taste-emoji-input" />
                            <label>선택지 B *</label>
                            <input type="text" placeholder="매운 것" value={newQuestion.text_b}
                              onChange={e => setNewQuestion(p => ({ ...p, text_b: e.target.value }))}
                              className="input-box" />
                          </div>
                        </div>
                        <div className="form-group">
                          <label>JW의 답변</label>
                          <div className="radio-group">
                            <label>
                              <input type="radio" name="newJwAnswer" value="1"
                                checked={newQuestion.jw_answer === '1'}
                                onChange={() => setNewQuestion(p => ({ ...p, jw_answer: '1' }))} />
                              &nbsp;A
                            </label>
                            <label>
                              <input type="radio" name="newJwAnswer" value="2"
                                checked={newQuestion.jw_answer === '2'}
                                onChange={() => setNewQuestion(p => ({ ...p, jw_answer: '2' }))} />
                              &nbsp;B
                            </label>
                          </div>
                        </div>
                      </div>
                      <button
                        className="save-btn"
                        onClick={handleAddQuestion}
                        disabled={isAdding}
                      >
                        {isAdding ? '추가 중...' : '➕ 질문 추가하기'}
                      </button>
                      {addMsg && (
                        <div className={`save-message ${addMsg.includes('완료') ? 'success' : addMsg.includes('실패') || addMsg.includes('필수') ? 'error' : ''}`}>
                          {addMsg}
                        </div>
                      )}
                    </div>
                  </>
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
