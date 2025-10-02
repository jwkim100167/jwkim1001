// SQLite WASM 데이터베이스 서비스
let db = null;

// SQLite 초기화
export const initDatabase = async () => {
  try {
    // SQLite WASM 로드
    const sqlite3InitModule = await import('@sqlite.org/sqlite-wasm');
    const sqlite3 = await sqlite3InitModule.default();
    
    console.log('🗄️ SQLite WASM 초기화 완료');
    
    // 메모리 데이터베이스 생성
    db = new sqlite3.oo1.DB(':memory:');
    
    // 테이블 생성
    await createTables();
    
    console.log('✅ 로또 데이터베이스 초기화 완료');
    return true;
  } catch (error) {
    console.error('❌ 데이터베이스 초기화 실패:', error);
    return false;
  }
};

// 테이블 생성
const createTables = async () => {
  try {
    // 로또 당첨번호 테이블
    db.exec(`
      CREATE TABLE IF NOT EXISTS lotto_results (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        round INTEGER UNIQUE NOT NULL,
        date TEXT NOT NULL,
        num1 INTEGER NOT NULL,
        num2 INTEGER NOT NULL,
        num3 INTEGER NOT NULL,
        num4 INTEGER NOT NULL,
        num5 INTEGER NOT NULL,
        num6 INTEGER NOT NULL,
        bonus INTEGER NOT NULL,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
      )
    `);

    // 사용자 제외 번호 설정 테이블
    db.exec(`
      CREATE TABLE IF NOT EXISTS user_exclude_settings (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        exclude_numbers TEXT NOT NULL,
        exclude_types TEXT,
        auto_exclude_enabled BOOLEAN DEFAULT FALSE,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
      )
    `);

    // 사용자 필수 포함 번호 설정 테이블
    db.exec(`
      CREATE TABLE IF NOT EXISTS user_include_settings (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        include_numbers TEXT NOT NULL,
        number_game_counts TEXT,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
      )
    `);

    // 생성된 로또 게임 기록 테이블
    db.exec(`
      CREATE TABLE IF NOT EXISTS generated_games (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        game_type TEXT NOT NULL, -- 'single' or 'multiple'
        numbers TEXT NOT NULL, -- JSON 형태로 저장
        exclude_settings TEXT,
        include_settings TEXT,
        prevent_exact_duplicates BOOLEAN DEFAULT TRUE,
        prevent_partial_duplicates BOOLEAN DEFAULT FALSE,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP
      )
    `);

    console.log('📊 데이터베이스 테이블 생성 완료');
  } catch (error) {
    console.error('❌ 테이블 생성 실패:', error);
    throw error;
  }
};

// 로또 데이터 저장
export const saveLottoResults = async (lottoData) => {
  if (!db) {
    console.error('데이터베이스가 초기화되지 않았습니다');
    return false;
  }

  try {
    // 기존 데이터 삭제
    db.exec('DELETE FROM lotto_results');

    // 새 데이터 삽입
    const insertStmt = db.prepare(`
      INSERT OR REPLACE INTO lotto_results 
      (round, date, num1, num2, num3, num4, num5, num6, bonus)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
    `);

    for (const item of lottoData.data) {
      let numbers = [];
      if (item.numbers) {
        numbers = item.numbers;
      } else {
        numbers = [item.num1, item.num2, item.num3, item.num4, item.num5, item.num6];
      }

      insertStmt.bind([
        item.round,
        item.date || `${item.round}회차`,
        numbers[0] || 0,
        numbers[1] || 0,
        numbers[2] || 0,
        numbers[3] || 0,
        numbers[4] || 0,
        numbers[5] || 0,
        item.bonusNumber || item.bonus || 0
      ]);
      insertStmt.step();
      insertStmt.reset();
    }

    insertStmt.finalize();

    // 메타데이터 업데이트 (별도 테이블 또는 설정으로 관리)
    const count = db.selectValue('SELECT COUNT(*) FROM lotto_results');
    console.log(`✅ 로또 데이터 저장 완료: ${count}개 회차`);

    return true;
  } catch (error) {
    console.error('❌ 로또 데이터 저장 실패:', error);
    return false;
  }
};

// 로또 데이터 조회
export const getLottoResults = async () => {
  if (!db) {
    console.error('데이터베이스가 초기화되지 않았습니다');
    return null;
  }

  try {
    const results = db.selectObjects(`
      SELECT 
        round,
        date,
        num1, num2, num3, num4, num5, num6,
        bonus,
        created_at,
        updated_at
      FROM lotto_results 
      ORDER BY round ASC
    `);

    // localStorage 형태와 호환되도록 변환
    const formattedData = {
      data: results.map(row => ({
        round: row.round,
        date: row.date,
        numbers: [row.num1, row.num2, row.num3, row.num4, row.num5, row.num6],
        bonusNumber: row.bonus,
        // 기존 형태와 호환성을 위해
        num1: row.num1,
        num2: row.num2,
        num3: row.num3,
        num4: row.num4,
        num5: row.num5,
        num6: row.num6,
        bonus: row.bonus
      })),
      lastUpdated: new Date().toISOString()
    };

    console.log(`📊 로또 데이터 조회 완료: ${results.length}개 회차`);
    return formattedData;
  } catch (error) {
    console.error('❌ 로또 데이터 조회 실패:', error);
    return null;
  }
};

// 특정 회차 조회
export const getLottoResultByRound = async (round) => {
  if (!db) return null;

  try {
    const result = db.selectObject(`
      SELECT * FROM lotto_results WHERE round = ?
    `, [round]);

    if (result) {
      return {
        round: result.round,
        date: result.date,
        numbers: [result.num1, result.num2, result.num3, result.num4, result.num5, result.num6],
        bonusNumber: result.bonus
      };
    }
    return null;
  } catch (error) {
    console.error('❌ 회차별 조회 실패:', error);
    return null;
  }
};

// 생성된 게임 저장
export const saveGeneratedGame = async (gameData) => {
  if (!db) return false;

  try {
    db.exec(`
      INSERT INTO generated_games 
      (game_type, numbers, exclude_settings, include_settings, 
       prevent_exact_duplicates, prevent_partial_duplicates)
      VALUES (?, ?, ?, ?, ?, ?)
    `, [
      gameData.gameType,
      JSON.stringify(gameData.numbers),
      JSON.stringify(gameData.excludeSettings || {}),
      JSON.stringify(gameData.includeSettings || {}),
      gameData.preventExactDuplicates || true,
      gameData.preventPartialDuplicates || false
    ]);

    console.log('✅ 생성된 게임 저장 완료');
    return true;
  } catch (error) {
    console.error('❌ 생성된 게임 저장 실패:', error);
    return false;
  }
};

// 생성된 게임 기록 조회
export const getGeneratedGames = async (limit = 10) => {
  if (!db) return [];

  try {
    const games = db.selectObjects(`
      SELECT * FROM generated_games 
      ORDER BY created_at DESC 
      LIMIT ?
    `, [limit]);

    return games.map(game => ({
      ...game,
      numbers: JSON.parse(game.numbers),
      excludeSettings: JSON.parse(game.exclude_settings || '{}'),
      includeSettings: JSON.parse(game.include_settings || '{}')
    }));
  } catch (error) {
    console.error('❌ 생성된 게임 기록 조회 실패:', error);
    return [];
  }
};

// 데이터베이스 상태 확인
export const getDatabaseStats = async () => {
  if (!db) return null;

  try {
    const lottoCount = db.selectValue('SELECT COUNT(*) FROM lotto_results');
    const gamesCount = db.selectValue('SELECT COUNT(*) FROM generated_games');
    const minRound = db.selectValue('SELECT MIN(round) FROM lotto_results');
    const maxRound = db.selectValue('SELECT MAX(round) FROM lotto_results');

    return {
      lottoResultsCount: lottoCount,
      generatedGamesCount: gamesCount,
      minRound,
      maxRound,
      isInitialized: true
    };
  } catch (error) {
    console.error('❌ 데이터베이스 상태 조회 실패:', error);
    return {
      isInitialized: false,
      error: error.message
    };
  }
};

// 데이터베이스 초기화 상태 확인
export const isDatabaseInitialized = () => {
  return db !== null;
};