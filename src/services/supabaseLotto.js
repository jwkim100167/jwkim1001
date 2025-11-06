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
