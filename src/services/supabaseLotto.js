import { supabase } from '../supabaseClient'

/**
 * Supabase에서 모든 로또 데이터 가져오기 (페이지네이션)
 * @returns {Promise<Object>} { data: [...], totalRounds: number, lastUpdated: string }
 */
export async function getAllLottoDataFromSupabase() {
  try {
    // 페이지네이션으로 전체 데이터 가져오기
    let allData = []
    let page = 0
    const pageSize = 1000
    let hasMore = true

    console.log('🔌 Supabase에서 페이지네이션으로 전체 데이터 가져오기...')

    while (hasMore) {
      const start = page * pageSize
      const end = start + pageSize - 1

      const { data, error } = await supabase
        .from('lottoTable')
        .select('*')
        .order('number', { ascending: true })
        .range(start, end)

      if (error) {
        console.error('❌ Supabase 데이터 조회 실패:', error)
        return null
      }

      allData = [...allData, ...data]
      console.log(`  📦 페이지 ${page + 1}: ${data.length}개 조회 (총 ${allData.length}개)`)

      // 더 이상 데이터가 없으면 종료
      if (data.length < pageSize) {
        hasMore = false
      }

      page++
    }

    console.log(`✅ 전체 ${allData.length}개 데이터 로드 완료`)

    // Supabase 데이터 구조를 기존 JSON 형태로 변환
    const formattedData = allData.map(item => ({
      round: item.number,
      date: item.date,
      num1: item.count1,
      num2: item.count2,
      num3: item.count3,
      num4: item.count4,
      num5: item.count5,
      num6: item.count6,
      bonus: item.bonus
    }))

    return {
      data: formattedData,
      totalRounds: formattedData.length,
      lastUpdated: new Date().toISOString(),
      format: 'supabase'
    }
  } catch (err) {
    console.error('❌ Supabase 조회 중 예외 발생:', err)
    return null
  }
}

/**
 * 특정 회차의 로또 번호 가져오기
 * @param {number} round - 회차 번호
 * @returns {Promise<Object|null>} 로또 데이터
 */
export async function getLottoNumberByRoundFromSupabase(round) {
  try {
    const { data, error } = await supabase
      .from('lottoTable')
      .select('*')
      .eq('number', round)
      .single()

    if (error) {
      console.error('❌ 특정 회차 조회 실패:', error)
      return null
    }

    if (!data) return null

    return {
      round: data.number,
      date: data.date,
      num1: data.count1,
      num2: data.count2,
      num3: data.count3,
      num4: data.count4,
      num5: data.count5,
      num6: data.count6,
      bonus: data.bonus
    }
  } catch (err) {
    console.error('❌ 특정 회차 조회 중 예외 발생:', err)
    return null
  }
}

/**
 * 최신 로또 번호 가져오기
 * @returns {Promise<Object|null>} 최신 로또 데이터
 */
export async function getLatestLottoNumberFromSupabase() {
  try {
    const { data, error } = await supabase
      .from('lottoTable')
      .select('*')
      .order('number', { ascending: false })
      .limit(1)
      .single()

    if (error) {
      console.error('❌ 최신 회차 조회 실패:', error)
      return null
    }

    if (!data) return null

    return {
      round: data.number,
      date: data.date,
      num1: data.count1,
      num2: data.count2,
      num3: data.count3,
      num4: data.count4,
      num5: data.count5,
      num6: data.count6,
      bonus: data.bonus
    }
  } catch (err) {
    console.error('❌ 최신 회차 조회 중 예외 발생:', err)
    return null
  }
}

/**
 * 로또 데이터 통계 가져오기
 * @returns {Promise<Object>} { totalRounds, minRound, maxRound }
 */
export async function getLottoStatsFromSupabase() {
  try {
    const { count, error: countError } = await supabase
      .from('lottoTable')
      .select('*', { count: 'exact', head: true })

    if (countError) {
      console.error('❌ 통계 조회 실패:', countError)
      return null
    }

    const { data: minMax, error: minMaxError } = await supabase
      .from('lottoTable')
      .select('number')
      .order('number', { ascending: true })
      .limit(1)

    const { data: maxData, error: maxError } = await supabase
      .from('lottoTable')
      .select('number')
      .order('number', { ascending: false })
      .limit(1)

    if (minMaxError || maxError) {
      console.error('❌ min/max 조회 실패')
      return { totalRounds: count }
    }

    return {
      totalRounds: count,
      minRound: minMax?.[0]?.number || 1,
      maxRound: maxData?.[0]?.number || count
    }
  } catch (err) {
    console.error('❌ 통계 조회 중 예외 발생:', err)
    return null
  }
}

/**
 * 생성된 로또 게임을 generateTable에 저장
 * @param {string} userId - 사용자 ID (userTable의 id)
 * @param {number} lottoNumber - 로또 회차 (l_number)
 * @param {Array<Array<number>>} games - 생성된 게임 배열 [[1,2,3,4,5,6], [7,8,9,10,11,12], ...]
 * @returns {Promise<Object>} { success: boolean, savedCount: number, error?: string }
 */
export async function saveGeneratedGames(userId, lottoNumber, games) {
  try {
    console.log('💾 생성된 게임 저장 시작:', { userId, lottoNumber, gameCount: games.length })

    // null이 아닌 게임만 처리
    const validGames = games.filter(game => game !== null)
    if (validGames.length === 0) {
      return { success: false, savedCount: 0, error: '저장할 게임이 없습니다.' }
    }

    let savedCount = 0
    let allData = []

    // 각 게임을 개별적으로 저장 (UPSERT 방식)
    for (let index = 0; index < games.length; index++) {
      const gameNumbers = games[index]

      // null인 슬롯은 건너뛰기
      if (!gameNumbers) {
        continue
      }

      const gameRecord = {
        u_id: userId,
        l_number: lottoNumber,
        g_number: index + 1,
        count1: gameNumbers[0],
        count2: gameNumbers[1],
        count3: gameNumbers[2],
        count4: gameNumbers[3],
        count5: gameNumbers[4],
        count6: gameNumbers[5],
        round_num: lottoNumber
      }

      console.log(`📝 게임 ${index + 1} 저장 시도:`, gameRecord)

      // 기존 게임이 있는지 확인
      const { data: existing } = await supabase
        .from('generateTable')
        .select('id')
        .eq('u_id', userId)
        .eq('l_number', lottoNumber)
        .eq('g_number', index + 1)
        .single()

      if (existing) {
        // UPDATE
        console.log(`🔄 게임 ${index + 1} 업데이트`)
        const { data, error } = await supabase
          .from('generateTable')
          .update({
            count1: gameNumbers[0],
            count2: gameNumbers[1],
            count3: gameNumbers[2],
            count4: gameNumbers[3],
            count5: gameNumbers[4],
            count6: gameNumbers[5]
          })
          .eq('id', existing.id)
          .select()

        if (error) {
          console.error(`❌ 게임 ${index + 1} 업데이트 실패:`, error)
        } else {
          savedCount++
          allData.push(data[0])
        }
      } else {
        // INSERT
        console.log(`➕ 게임 ${index + 1} 새로 저장`)
        const { data, error } = await supabase
          .from('generateTable')
          .insert(gameRecord)
          .select()

        if (error) {
          console.error(`❌ 게임 ${index + 1} 저장 실패:`, error)
        } else {
          savedCount++
          allData.push(data[0])
        }
      }
    }

    console.log(`✅ 게임 저장 완료: ${savedCount}개`)
    return { success: true, savedCount, data: allData }

  } catch (err) {
    console.error('❌ 게임 저장 중 예외 발생:', err)
    return { success: false, savedCount: 0, error: err.message }
  }
}

/**
 * 사용자의 저장된 게임 가져오기
 * @param {string} userId - 사용자 ID
 * @param {number} lottoNumber - 로또 회차 (선택사항, 없으면 전체)
 * @returns {Promise<Array>} 저장된 게임 목록
 */
export async function getSavedGames(userId, lottoNumber = null) {
  try {
    console.log('🔍 저장된 게임 조회:', { userId, lottoNumber })

    let query = supabase
      .from('generateTable')
      .select('*')
      .eq('u_id', userId)
      .order('created_at', { ascending: false })

    if (lottoNumber) {
      query = query.eq('l_number', lottoNumber)
    }

    const { data, error } = await query

    if (error) {
      console.error('❌ 저장된 게임 조회 실패:', error)
      return []
    }

    console.log('✅ 저장된 게임 조회 완료:', data.length, '개')
    console.log('📋 조회된 데이터:', data)
    // 원본 데이터 반환 (g_number는 숫자 그대로 유지)
    return data

  } catch (err) {
    console.error('❌ 저장된 게임 조회 중 예외 발생:', err)
    return []
  }
}

/**
 * 저장된 게임 삭제
 * @param {string} userId - 사용자 ID
 * @param {number} lottoNumber - 로또 회차
 * @returns {Promise<Object>} { success: boolean, deletedCount: number }
 */
export async function deleteSavedGames(userId, lottoNumber) {
  try {
    console.log('🗑️ 게임 삭제 시작:', { userId, lottoNumber })

    const { data, error } = await supabase
      .from('generateTable')
      .delete()
      .eq('u_id', userId)
      .eq('l_number', lottoNumber)
      .select()

    if (error) {
      console.error('❌ 게임 삭제 실패:', error)
      return { success: false, deletedCount: 0 }
    }

    console.log('✅ 게임 삭제 성공:', data.length, '개')
    return { success: true, deletedCount: data.length }

  } catch (err) {
    console.error('❌ 게임 삭제 중 예외 발생:', err)
    return { success: false, deletedCount: 0 }
  }
}
