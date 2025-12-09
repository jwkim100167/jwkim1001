import React, { useState, useEffect, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  getRestaurantCategories,
  getRestaurantById,
  getUniqueValues
} from '../services/supabaseRestaurant';
import './Momok.css';

const Momok = () => {
  const navigate = useNavigate();
  const [step, setStep] = useState(0);
  const [answers, setAnswers] = useState({
    mealTime: null,      // 점심/저녁 (데이터 없음)
    mealKind: null,      // 식사 종류 (데이터 없음)
    location: null,      // 위치 (대분류)
    location2: null,     // 위치 (소분류)
    drinkYN: null,       // 주류가능 여부
    category: null,      // 카테고리
    signature: null      // 대표메뉴
  });
  const [result, setResult] = useState(null);
  const [restaurantData, setRestaurantData] = useState([]);
  const [loading, setLoading] = useState(true);

  // Supabase에서 레스토랑 데이터 가져오기
  useEffect(() => {
    const fetchData = async () => {
      try {
        const data = await getRestaurantCategories();
        setRestaurantData(data);
      } catch (error) {
        console.error('레스토랑 데이터 로드 실패:', error);
      } finally {
        setLoading(false);
      }
    };
    fetchData();
  }, []);

  // 동적으로 옵션 생성 - 이전 선택에 따라 필터링
  const getLocationOptions = () => {
    return [...getUniqueValues(restaurantData, 'location'), '상관없음'];
  };

  const getLocation2Options = () => {
    let data = [...restaurantData];
    if (answers.location && answers.location !== '상관없음') {
      data = data.filter(r => r.location === answers.location);
    }
    return [...getUniqueValues(data, 'location2'), '상관없음'];
  };

  const getCategoryOptions = () => {
    let data = [...restaurantData];
    if (answers.mealTime && answers.mealTime !== '상관없음') {
      data = data.filter(r => r.mealTime === answers.mealTime);
    }
    if (answers.location && answers.location !== '상관없음') {
      data = data.filter(r => r.location === answers.location);
    }
    if (answers.location2 && answers.location2 !== '상관없음') {
      data = data.filter(r => r.location2 === answers.location2);
    }
    if (answers.drinkYN && answers.drinkYN !== '상관없음') {
      const drinkValue = answers.drinkYN === '예';
      data = data.filter(r => r.drinkYN === drinkValue);
    }
    return [...getUniqueValues(data, 'category'), '상관없음'];
  };

  const getSignatureOptions = () => {
    let data = [...restaurantData];
    if (answers.mealTime && answers.mealTime !== '상관없음') {
      data = data.filter(r => r.mealTime === answers.mealTime);
    }
    if (answers.location && answers.location !== '상관없음') {
      data = data.filter(r => r.location === answers.location);
    }
    if (answers.location2 && answers.location2 !== '상관없음') {
      data = data.filter(r => r.location2 === answers.location2);
    }
    if (answers.drinkYN && answers.drinkYN !== '상관없음') {
      const drinkValue = answers.drinkYN === '예';
      data = data.filter(r => r.drinkYN === drinkValue);
    }
    if (answers.category && answers.category !== '상관없음') {
      data = data.filter(r => r.category === answers.category);
    }
    return [...getUniqueValues(data, 'signature'), '상관없음'];
  };

  const questions = [
    {
      id: 'mealTime',
      question: '점심인가요, 저녁인가요?',
      icon: '🍽️',
      options: ['점심', '저녁', '상관없음']
    },
    {
      id: 'mealKind',
      question: '어떤 종류의 식사를 원하시나요?',
      icon: '🍴',
      options: ['상관없음']
    },
    {
      id: 'location',
      question: '어느 지역이 좋으세요?',
      icon: '📍',
      getOptions: getLocationOptions
    },
    {
      id: 'location2',
      question: '더 구체적인 위치는?',
      icon: '🗺️',
      getOptions: getLocation2Options
    },
    {
      id: 'drinkYN',
      question: '주류가 가능한 곳이 좋나요?',
      icon: '🍺',
      options: ['예', '아니오', '상관없음']
    },
    {
      id: 'category',
      question: '어떤 카테고리가 좋나요?',
      icon: '🍱',
      getOptions: getCategoryOptions
    },
    {
      id: 'signature',
      question: '대표메뉴는 뭐가 좋나요?',
      icon: '🍜',
      getOptions: getSignatureOptions
    }
  ];

  // 현재 질문의 옵션 가져오기
  const getCurrentOptions = () => {
    const currentQuestion = questions[step];
    if (currentQuestion.options) {
      return currentQuestion.options;
    }
    if (currentQuestion.getOptions) {
      return currentQuestion.getOptions();
    }
    return [];
  };

  const handleAnswer = (questionId, answer) => {
    const newAnswers = { ...answers, [questionId]: answer };
    setAnswers(newAnswers);

    if (step < questions.length - 1) {
      setStep(step + 1);
    } else {
      // 마지막 질문까지 답했으면 필터링 시작
      filterAndShowResult(newAnswers);
    }
  };

  const filterAndShowResult = async (userAnswers) => {
    let filteredRestaurants = [...restaurantData];

    // 점심/저녁 필터링
    if (userAnswers.mealTime && userAnswers.mealTime !== '상관없음') {
      filteredRestaurants = filteredRestaurants.filter(r => r.mealTime === userAnswers.mealTime);
    }

    // 위치 필터링 (대분류)
    if (userAnswers.location && userAnswers.location !== '상관없음') {
      filteredRestaurants = filteredRestaurants.filter(r =>
        r.location === userAnswers.location
      );
    }

    // 위치 필터링 (소분류)
    if (userAnswers.location2 && userAnswers.location2 !== '상관없음') {
      filteredRestaurants = filteredRestaurants.filter(r =>
        r.location2 === userAnswers.location2
      );
    }

    // 주류가능 필터링
    if (userAnswers.drinkYN && userAnswers.drinkYN !== '상관없음') {
      const drinkValue = userAnswers.drinkYN === '예';
      filteredRestaurants = filteredRestaurants.filter(r =>
        r.drinkYN === drinkValue
      );
    }

    // 카테고리 필터링
    if (userAnswers.category && userAnswers.category !== '상관없음') {
      filteredRestaurants = filteredRestaurants.filter(r =>
        r.category === userAnswers.category
      );
    }

    // 대표메뉴 필터링
    if (userAnswers.signature && userAnswers.signature !== '상관없음') {
      filteredRestaurants = filteredRestaurants.filter(r =>
        r.signature === userAnswers.signature
      );
    }

    // 랜덤으로 하나 선택
    if (filteredRestaurants.length > 0) {
      const randomRestaurant = filteredRestaurants[Math.floor(Math.random() * filteredRestaurants.length)];

      try {
        // Supabase에서 상세 정보 가져오기
        const restaurantDetails = await getRestaurantById(randomRestaurant.r_id);
        setResult({
          ...randomRestaurant,
          name: restaurantDetails?.name || '이름 없음',
          address: restaurantDetails?.address || '',
          link: restaurantDetails?.link || ''
        });
      } catch (error) {
        console.error('레스토랑 상세 정보 가져오기 실패:', error);
        setResult({
          ...randomRestaurant,
          name: '이름 없음',
          address: '',
          link: ''
        });
      }
    } else {
      setResult({ name: '조건에 맞는 레스토랑이 없습니다', category: '다시 시도해주세요' });
    }

    setStep(questions.length); // 결과 화면으로
  };

  const handleReset = () => {
    setStep(0);
    setAnswers({
      mealTime: null,
      mealKind: null,
      location: null,
      location2: null,
      drinkYN: null,
      category: null,
      signature: null
    });
    setResult(null);
  };

  const handlePrevious = () => {
    if (step > 0) {
      setStep(step - 1);
    }
  };

  if (loading) {
    return (
      <div className="momok">
        <div className="momok-container">
          <div className="momok-header">
            <h1>🍽️ MOMOK</h1>
            <p>데이터 로딩 중...</p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="momok">
      <div className="momok-container">
        <div className="momok-header">
          <h1>🍽️ MOMOK</h1>
          <p>오늘 뭐 먹지? 레스토랑 추천!</p>
        </div>

        {step < questions.length ? (
          <div className="question-section">
            <div className="progress-bar">
              <div
                className="progress-fill"
                style={{ width: `${((step + 1) / questions.length) * 100}%` }}
              />
            </div>

            <div className="step-indicator">
              {step + 1} / {questions.length}
            </div>

            <div className="question-card">
              <div className="question-icon">{questions[step].icon}</div>
              <h2 className="question-text">{questions[step].question}</h2>

              <div className="options-grid">
                {getCurrentOptions().map((option, index) => (
                  <button
                    key={index}
                    className="option-btn"
                    onClick={() => handleAnswer(questions[step].id, option)}
                  >
                    {option}
                  </button>
                ))}
              </div>
            </div>

            {step > 0 && (
              <button className="prev-btn" onClick={handlePrevious}>
                ← 이전 질문
              </button>
            )}
          </div>
        ) : (
          <div className="result-section">
            <div className="result-card">
              <div className="result-icon">🎉</div>
              <h2 className="result-title">추천 레스토랑</h2>
              <div className="result-menu-name">{result?.name}</div>
              <div className="result-category">{result?.category}</div>
              {result?.signature && (
                <div className="result-signature">대표메뉴: {result.signature}</div>
              )}
              {result?.address && (
                <div className="result-address">📍 {result.address}</div>
              )}
              <div className="result-links">
                {result?.link && (
                  <a href={result.link} target="_blank" rel="noopener noreferrer" className="result-link">
                    리뷰 보기 →
                  </a>
                )}
                {result?.name && result?.name !== '조건에 맞는 레스토랑이 없습니다' && (
                  <a
                    href={`https://map.naver.com/p/search/${encodeURIComponent(result.name + ' ' + (result.address || ''))}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="result-link naver-map-link"
                  >
                    네이버 지도 →
                  </a>
                )}
              </div>

              <div className="result-actions">
                <button className="retry-btn" onClick={handleReset}>
                  🔄 다시 추천받기
                </button>
              </div>
            </div>

            <div className="selected-answers">
              <h3>선택한 조건</h3>
              <div className="answer-tags">
                {Object.entries(answers).map(([key, value]) => {
                  if (value) {
                    const question = questions.find(q => q.id === key);
                    return (
                      <div key={key} className="answer-tag">
                        <span className="answer-label">{question?.icon} {question?.question.replace('?', '')}</span>
                        <span className="answer-value">{value}</span>
                      </div>
                    );
                  }
                  return null;
                })}
              </div>
            </div>
          </div>
        )}

        <button className="back-btn" onClick={() => navigate('/')}>
          ← 홈으로 돌아가기
        </button>

        <div className="momok-footer">
          <p>made by jwkim1001</p>
        </div>
      </div>
    </div>
  );
};

export default Momok;
