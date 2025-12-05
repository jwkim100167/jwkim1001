import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import menuDatabase from '../data/menuDatabase.json';
import './Momok.css';

const Momok = () => {
  const navigate = useNavigate();
  const [step, setStep] = useState(0);
  const [answers, setAnswers] = useState({
    location: null,
    concept: null,
    people: null,
    budget: null,
    amount: null,
    taste: null,
    foodType: null,
    atmosphere: null,
    menuStyle: null,
    excludeCategory: null
  });
  const [result, setResult] = useState(null);

  const questions = [
    {
      id: 'location',
      question: '어느 방향인가요?',
      icon: '📍',
      options: ['무교동', '명동', '종각', '근처', '관계없음']
    },
    {
      id: 'concept',
      question: '어떤 컨셉인가요?',
      icon: '🎯',
      options: ['일상', '약속', '점심회식']
    },
    {
      id: 'people',
      question: '인원은 몇 명인가요?',
      icon: '👥',
      options: ['혼밥', '2~4인', '5인이상']
    },
    {
      id: 'budget',
      question: '예산은 어느 정도인가요?',
      icon: '💰',
      options: ['가성비', '적당', '상관없음']
    },
    {
      id: 'amount',
      question: '양은 어느 정도가 좋나요?',
      icon: '🍚',
      options: ['적음', '적당함', '많음']
    },
    {
      id: 'taste',
      question: '어떤 맛을 원하시나요?',
      icon: '👅',
      options: ['담백', '고소', '감칠', '단짠', '기름진']
    },
    {
      id: 'foodType',
      question: '국물/면/밥 중 선호하는 게 있나요?',
      icon: '🍜',
      options: ['국물', '면', '밥', '상관없음']
    },
    {
      id: 'atmosphere',
      question: '식사 분위기는 어떤 게 좋나요?',
      icon: '⏱️',
      options: ['빨리', '느긋', '상관없음']
    },
    {
      id: 'menuStyle',
      question: '메뉴 스타일은 어떤 게 좋나요?',
      icon: '🍽️',
      options: ['나눠 먹기', '한 그릇']
    },
    {
      id: 'excludeCategory',
      question: '어제 먹었던 카테고리를 제외해주세요',
      icon: '🚫',
      options: ['한식', '중식', '일식', '양식', '분식', '기타', '없음']
    }
  ];

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

  const filterAndShowResult = (userAnswers) => {
    let filteredMenus = menuDatabase.menus;

    // 위치 필터링
    if (userAnswers.location && userAnswers.location !== '관계없음') {
      filteredMenus = filteredMenus.filter(menu =>
        menu.location.includes(userAnswers.location)
      );
    }

    // 컨셉 필터링
    if (userAnswers.concept) {
      filteredMenus = filteredMenus.filter(menu =>
        menu.concept.includes(userAnswers.concept)
      );
    }

    // 인원 필터링
    if (userAnswers.people) {
      filteredMenus = filteredMenus.filter(menu =>
        menu.people.includes(userAnswers.people)
      );
    }

    // 예산 필터링
    if (userAnswers.budget && userAnswers.budget !== '상관없음') {
      filteredMenus = filteredMenus.filter(menu =>
        menu.budget.includes(userAnswers.budget)
      );
    }

    // 양 필터링
    if (userAnswers.amount) {
      filteredMenus = filteredMenus.filter(menu =>
        menu.amount.includes(userAnswers.amount)
      );
    }

    // 맛 필터링
    if (userAnswers.taste) {
      filteredMenus = filteredMenus.filter(menu =>
        menu.taste.includes(userAnswers.taste)
      );
    }

    // 음식 종류 필터링 (국물/면/밥)
    if (userAnswers.foodType && userAnswers.foodType !== '상관없음') {
      filteredMenus = filteredMenus.filter(menu =>
        menu.foodType.includes(userAnswers.foodType)
      );
    }

    // 식사 분위기 필터링
    if (userAnswers.atmosphere && userAnswers.atmosphere !== '상관없음') {
      filteredMenus = filteredMenus.filter(menu =>
        menu.atmosphere.includes(userAnswers.atmosphere)
      );
    }

    // 메뉴 스타일 필터링
    if (userAnswers.menuStyle) {
      filteredMenus = filteredMenus.filter(menu =>
        menu.menuStyle.includes(userAnswers.menuStyle)
      );
    }

    // 카테고리 제외
    if (userAnswers.excludeCategory && userAnswers.excludeCategory !== '없음') {
      filteredMenus = filteredMenus.filter(menu =>
        menu.category !== userAnswers.excludeCategory
      );
    }

    // 랜덤으로 하나 선택
    if (filteredMenus.length > 0) {
      const randomMenu = filteredMenus[Math.floor(Math.random() * filteredMenus.length)];
      setResult(randomMenu);
    } else {
      setResult({ name: '조건에 맞는 메뉴가 없습니다', category: '다시 시도해주세요' });
    }

    setStep(questions.length); // 결과 화면으로
  };

  const handleReset = () => {
    setStep(0);
    setAnswers({
      location: null,
      concept: null,
      people: null,
      budget: null,
      amount: null,
      taste: null,
      foodType: null,
      atmosphere: null,
      menuStyle: null,
      excludeCategory: null
    });
    setResult(null);
  };

  const handlePrevious = () => {
    if (step > 0) {
      setStep(step - 1);
    }
  };

  return (
    <div className="momok">
      <div className="momok-container">
        <div className="momok-header">
          <h1>🍽️ MOMOK</h1>
          <p>오늘 점심 뭐 먹지? 고민 끝!</p>
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
                {questions[step].options.map((option, index) => (
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
              <h2 className="result-title">추천 메뉴</h2>
              <div className="result-menu-name">{result?.name}</div>
              <div className="result-category">{result?.category}</div>

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
