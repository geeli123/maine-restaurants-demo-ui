import { supabase } from '../config/supabase'

export async function fetchRestaurants(search = '', status = 'ALL', businessStatus = 'ALL', page = 1, pageSize = 50) {
  let query = supabase.from('restaurants_1').select('*', { count: 'exact' })
  
  if (search) {
    query = query.ilike('name', `%${search}%`)
  }
  
  if (status !== 'ALL') {
    query = query.eq('status', status)
  }

  if (businessStatus !== 'ALL') {
    query = query.eq('business_status', businessStatus)
  }
  
  query = query.order('created_at', { ascending: false })

  if (page && pageSize) {
    const from = (page - 1) * pageSize
    const to = from + pageSize - 1
    query = query.range(from, to)
  }
  
  const { data, count, error } = await query
  if (error) throw error
  return { data: data || [], count: count ?? (data ? data.length : 0) }
}

export async function fetchBestOfRestaurants(search = '', year = 'ALL', status = 'ALL', businessStatus = 'ALL', page = 1, pageSize = 50) {
  let query = supabase.from('restaurants_1').select('*', { count: 'exact' })
  
  if (search) {
    query = query.ilike('name', `%${search}%`)
  }
  
  if (status !== 'ALL') {
    query = query.eq('status', status)
  }

  if (businessStatus !== 'ALL') {
    query = query.eq('business_status', businessStatus)
  }

  const BEST_OF_YEARS = [2026, 2025, 2024, 2023, 2022, 2021]

  if (year && year !== 'ALL') {
    query = query.eq(`best_of_${year}`, true)
  } else {
    const orCondition = BEST_OF_YEARS.map(y => `best_of_${y}.eq.true`).join(',')
    query = query.or(orCondition)
  }
  
  query = query.order('name', { ascending: true })

  if (page && pageSize) {
    const from = (page - 1) * pageSize
    const to = from + pageSize - 1
    query = query.range(from, to)
  }
  
  const { data, count, error } = await query
  if (error) throw error
  return { data: data || [], count: count ?? (data ? data.length : 0) }
}

export async function fetchReviews(search = '', status = 'ALL', page = 1, pageSize = 50) {
  let query = supabase.from('restaurant_reviews_1').select('*, restaurants_1(name)', { count: 'exact' })
  
  if (search) {
    query = query.ilike('title', `%${search}%`)
  }
  
  if (status !== 'ALL') {
    query = query.eq('status', status)
  }
  
  query = query.order('created_at', { ascending: false })

  if (page && pageSize) {
    const from = (page - 1) * pageSize
    const to = from + pageSize - 1
    query = query.range(from, to)
  }
  
  const { data, count, error } = await query
  if (error) throw error
  return { data: data || [], count: count ?? (data ? data.length : 0) }
}

export async function updateRestaurant(id, updates) {
  const { data, error } = await supabase
    .from('restaurants_1')
    .update(updates)
    .eq('id', id)
    .select()
    
  if (error) throw error
  return data
}

export async function updateReview(id, updates) {
  const { data, error } = await supabase
    .from('restaurant_reviews_1')
    .update(updates)
    .eq('id', id)
    .select()
    
  if (error) throw error
  return data
}

export async function createRestaurant(restaurantData) {
  const { data, error } = await supabase
    .from('restaurants_1')
    .insert([restaurantData])
    .select()
    
  if (error) throw error
  return data
}

export async function fetchReviewsForRestaurant(restaurantId) {
  const { data, error } = await supabase
    .from('restaurant_reviews_1')
    .select('*')
    .eq('restaurant_id', restaurantId)
    .order('created_at', { ascending: false })
    
  if (error) throw error
  return data || []
}

export async function createReview(reviewData) {
  const { data, error } = await supabase
    .from('restaurant_reviews_1')
    .insert([reviewData])
    .select()
    
  if (error) throw error
  return data
}

export async function deleteReview(id) {
  const { data, error } = await supabase
    .from('restaurant_reviews_1')
    .delete()
    .eq('id', id)
    
  if (error) throw error
  return data
}
