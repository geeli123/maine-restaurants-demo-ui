import { supabase } from '../config/supabase'

export async function fetchRestaurants(search = '', status = 'ALL') {
  let query = supabase.from('restaurants_1').select('*')
  
  if (search) {
    query = query.ilike('name', `%${search}%`)
  }
  
  if (status !== 'ALL') {
    query = query.eq('status', status)
  }
  
  query = query.order('created_at', { ascending: false }).limit(50)
  
  const { data, error } = await query
  if (error) throw error
  return data
}

export async function fetchReviews(search = '', status = 'ALL') {
  let query = supabase.from('restaurant_reviews_1').select('*, restaurants_1(name)')
  
  if (search) {
    query = query.ilike('title', `%${search}%`)
  }
  
  if (status !== 'ALL') {
    query = query.eq('status', status)
  }
  
  query = query.order('created_at', { ascending: false }).limit(50)
  
  const { data, error } = await query
  if (error) throw error
  return data
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
