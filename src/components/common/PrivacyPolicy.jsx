import { useNavigate } from 'react-router-dom';

export default function PrivacyPolicy() {
  const navigate = useNavigate();

  return (
    <div style={{
      minHeight: '100vh',
      background: 'linear-gradient(135deg, #1a1a2e 0%, #16213e 50%, #0f3460 100%)',
      color: 'white',
      padding: '0 0 60px',
    }}>
      <div style={{
        maxWidth: '800px',
        margin: '0 auto',
        padding: '0 20px',
      }}>
        <div style={{
          display: 'flex',
          alignItems: 'center',
          padding: '20px 0',
          borderBottom: '1px solid rgba(255,255,255,0.1)',
          marginBottom: '36px',
        }}>
          <button
            onClick={() => navigate(-1)}
            style={{
              background: 'none',
              border: 'none',
              color: 'rgba(255,255,255,0.7)',
              cursor: 'pointer',
              fontSize: '0.95rem',
              padding: '4px 0',
              marginRight: '16px',
            }}
          >
            ← 뒤로
          </button>
          <h1 style={{ margin: 0, fontSize: '1.4rem', fontWeight: 700 }}>개인정보처리방침</h1>
        </div>

        <Section title="1. 개요">
          <p>미니게임천국(이하 "서비스")은 이용자의 개인정보를 소중히 여기며, 「개인정보 보호법」을 준수합니다.</p>
          <p>본 방침은 서비스가 수집하는 개인정보의 항목, 수집 및 이용 목적, 보유 기간, 제3자 제공 여부 등을 안내합니다.</p>
          <Info>
            <Row label="서비스명" value="미니게임천국 (jwkim100167.github.io)" />
            <Row label="운영자" value="jwkim100167" />
            <Row label="시행일" value="2026년 5월 15일" />
          </Info>
        </Section>

        <Section title="2. 수집하는 개인정보 항목">
          <p>회원가입 및 서비스 이용 과정에서 아래 정보를 수집합니다.</p>
          <Info>
            <Row label="필수" value="로그인 ID, 비밀번호(암호화 저장), 사용자 이름" />
            <Row label="자동 수집" value="접속 IP, 접속 일시, 서비스 이용 기록" />
            <Row label="비회원" value="별도 개인정보 수집 없음" />
          </Info>
        </Section>

        <Section title="3. 개인정보 수집 및 이용 목적">
          <ul style={{ paddingLeft: '20px', lineHeight: 2 }}>
            <li>회원 식별 및 로그인 서비스 제공</li>
            <li>게임·예측 서비스 이용 기록 관리 (로또, KBO, 코브라 게임 등)</li>
            <li>라이프·포인트 등 멤버십 혜택 제공</li>
            <li>서비스 개선 및 오류 대응</li>
          </ul>
        </Section>

        <Section title="4. 개인정보 보유 및 이용 기간">
          <p>회원 탈퇴 또는 이용 목적 달성 시 즉시 파기합니다.</p>
          <p>단, 관련 법령에 따라 일정 기간 보관이 필요한 경우 해당 기간 동안 보관합니다.</p>
        </Section>

        <Section title="5. 개인정보의 제3자 제공">
          <p>서비스는 이용자의 개인정보를 원칙적으로 외부에 제공하지 않습니다.</p>
          <p>단, 아래의 경우는 예외로 합니다.</p>
          <ul style={{ paddingLeft: '20px', lineHeight: 2 }}>
            <li>이용자가 사전에 동의한 경우</li>
            <li>법령의 규정에 의거하거나 수사 목적으로 법령에 정해진 절차에 따라 요구받은 경우</li>
          </ul>
        </Section>

        <Section title="6. 개인정보 처리 위탁">
          <p>서비스는 원활한 운영을 위해 아래 업체에 개인정보 처리를 위탁합니다.</p>
          <Info>
            <Row label="Supabase Inc." value="회원 데이터베이스 저장 및 관리" />
            <Row label="GitHub, Inc." value="서비스 호스팅 (GitHub Pages)" />
          </Info>
        </Section>

        <Section title="7. 광고 서비스 (Google AdSense)">
          <p>본 서비스는 Google AdSense를 통해 광고를 제공합니다. Google은 광고 제공 과정에서 쿠키 등을 사용하여 이용자의 광고 관심 분야를 파악할 수 있습니다.</p>
          <ul style={{ paddingLeft: '20px', lineHeight: 2 }}>
            <li>Google의 광고 쿠키 사용으로 인해 관심 기반 광고가 표시될 수 있습니다.</li>
            <li>Google 개인정보처리방침: <a href="https://policies.google.com/privacy" target="_blank" rel="noopener noreferrer" style={{ color: '#4ecdc4' }}>policies.google.com/privacy</a></li>
            <li>광고 맞춤 설정 해제: <a href="https://www.google.com/settings/ads" target="_blank" rel="noopener noreferrer" style={{ color: '#4ecdc4' }}>google.com/settings/ads</a></li>
          </ul>
        </Section>

        <Section title="8. 이용자의 권리">
          <p>이용자는 언제든지 다음 권리를 행사할 수 있습니다.</p>
          <ul style={{ paddingLeft: '20px', lineHeight: 2 }}>
            <li>개인정보 열람 요구</li>
            <li>개인정보 수정·삭제 요구</li>
            <li>개인정보 처리 정지 요구</li>
          </ul>
          <p>권리 행사는 마이페이지 또는 아래 연락처를 통해 요청하실 수 있습니다.</p>
        </Section>

        <Section title="9. 개인정보 보호책임자">
          <Info>
            <Row label="담당자" value="jwkim100167" />
            <Row label="GitHub" value="github.com/jwkim100167" />
          </Info>
        </Section>

        <Section title="10. 방침 변경 안내">
          <p>본 개인정보처리방침은 법령·서비스 변경에 따라 수정될 수 있으며, 변경 시 서비스 내 공지를 통해 안내합니다.</p>
        </Section>

        <div style={{
          textAlign: 'center',
          marginTop: '40px',
          color: 'rgba(255,255,255,0.4)',
          fontSize: '0.85rem',
        }}>
          시행일: 2026년 5월 15일
        </div>
      </div>
    </div>
  );
}

function Section({ title, children }) {
  return (
    <div style={{ marginBottom: '36px' }}>
      <h2 style={{
        fontSize: '1.1rem',
        fontWeight: 700,
        marginBottom: '12px',
        color: '#facc15',
        borderBottom: '1px solid rgba(250,204,21,0.2)',
        paddingBottom: '8px',
      }}>
        {title}
      </h2>
      <div style={{ lineHeight: 1.8, color: 'rgba(255,255,255,0.85)', fontSize: '0.95rem' }}>
        {children}
      </div>
    </div>
  );
}

function Info({ children }) {
  return (
    <div style={{
      background: 'rgba(255,255,255,0.05)',
      border: '1px solid rgba(255,255,255,0.1)',
      borderRadius: '10px',
      padding: '16px 20px',
      marginTop: '12px',
    }}>
      {children}
    </div>
  );
}

function Row({ label, value }) {
  return (
    <div style={{
      display: 'flex',
      gap: '16px',
      padding: '6px 0',
      borderBottom: '1px solid rgba(255,255,255,0.06)',
    }}>
      <span style={{ minWidth: '120px', color: 'rgba(255,255,255,0.5)', fontSize: '0.9rem' }}>{label}</span>
      <span style={{ fontSize: '0.9rem' }}>{value}</span>
    </div>
  );
}
