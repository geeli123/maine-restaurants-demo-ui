import { supabase } from './config/supabase'
import {
  fetchRestaurants,
  fetchReviews,
  updateRestaurant,
  updateReview,
  createRestaurant,
  fetchReviewsForRestaurant,
  createReview,
  deleteReview
} from './services/adminService.js'

function decodeHTMLEntities(text) {
  if (!text) return text
  const textarea = document.createElement('textarea')
  textarea.innerHTML = text
  return textarea.value
}

const PREDEFINED_KEYWORDS = {
  "Cuisine": ["American", "Italian", "Mexican", "Chinese", "Japanese", "Thai", "Indian", "French", "Mediterranean", "Vietnamese", "Spanish", "Greek", "Korean", "Southern", "BBQ", "New American", "Caribbean", "Middle Eastern", "Cajun/Creole", "Ethiopian", "Peruvian", "Cuban", "Brazilian", "German", "Irish", "British", "Tex-Mex", "Soul Food", "Pan-Asian", "Fusion", "Turkish", "Lebanese", "Filipino", "Moroccan", "African", "Latin American"].sort(),
  "Specialty": ["Seafood", "Steakhouse", "Pizza", "Burgers", "Sushi", "Tacos", "Sandwiches", "Soup", "Salad", "Wings", "Ramen", "Hot Pot", "Dim Sum", "Fried Chicken", "Tapas", "Pasta", "Bakery", "Ice Cream/Gelato", "Noodles", "Dumplings", "Poke", "Bagels", "Bubble Tea", "Hot Dogs", "Comfort Food", "Charcuterie", "Crêpes", "Pancakes/Waffles", "Oysters", "Gastropub"].sort(),
  "Dietary": ["Vegan Options", "Vegetarian Options", "Gluten-Free Options", "Healthy", "Dairy-Free Options", "Nut-Free Options", "Keto-Friendly", "Paleo-Friendly", "Halal", "Kosher", "Organic", "Farm-to-Table", "Plant-Based", "Pescatarian", "Low-Carb", "Sugar-Free Options", "Allergy-Friendly", "Macrobiotic"].sort(),
  "Meal Type": ["Breakfast", "Brunch", "Lunch", "Dinner", "Late Night", "Dessert", "Coffee", "Cocktails", "Beer", "Wine", "Happy Hour", "Afternoon Tea", "Buffet", "Tasting Menu", "Small Plates", "Smoothies/Juices", "Bottomless Brunch", "Pre-Theater Menu", "Pub Grub", "Mocktails", "Craft Beer", "Spirits/Liquor", "Cafe Fare"].sort(),
  "Ambiance": ["Casual", "Date Night", "Fine Dining", "Family-Friendly", "Kid-Friendly", "Romantic", "Trendy", "Upscale", "Divey", "Outdoor Seating", "Patio", "Waterfront", "Good for Groups", "Live Music", "Cozy", "Intimate", "Rooftop", "Speakeasy", "Sports Bar", "Pet-Friendly/Dog-Friendly", "Historic", "Scenic View", "Themed", "Rustic", "Industrial", "Quiet", "Lively", "Neighborhood Gem", "Instagrammable/Photogenic", "Minimalist", "Lounge"].sort(),
  "Service": ["Quick Bite", "Takeout", "Delivery", "Fast Service", "Drive-Through", "Curbside Pickup", "Catering", "BYOB", "Private Dining", "Walk-Ins Welcome", "Reservations Recommended/Required", "Food Truck", "Contactless Ordering", "Ghost Kitchen/Virtual Restaurant", "Table Service", "Counter Service", "24-Hour"].sort()
}

// Application State
const state = {
  user: null,
  activeTab: 'restaurants', // 'restaurants' or 'reviews'
  searchQuery: '',
  statusFilter: 'ALL',
  businessStatusFilter: 'ALL',
  items: [],
  loading: false,
  error: null,
  editingItem: null,
  isAddingNew: false,
  allRestaurants: [],
  // Restaurant reviews management
  selectedRestaurant: null,
  restaurantReviews: [],
  loadingReviews: false,
  reviewsError: null,
  isAddingReview: false,
  editingReviewInModal: null,
  reviewActionMessage: null
}

const root = document.getElementById('root')

async function checkSession() {
  const { data: { session } } = await supabase.auth.getSession()
  state.user = session?.user || null
  
  supabase.auth.onAuthStateChange((event, session) => {
    state.user = session?.user || null
    if (state.user) {
      loadData()
    } else {
      render()
    }
  })
}

async function loadData() {
  if (!state.user) return
  
  state.loading = true
  state.error = null
  render()
  
  try {
    if (state.activeTab === 'restaurants') {
      state.items = await fetchRestaurants(state.searchQuery, state.statusFilter, state.businessStatusFilter)
    } else {
      if (state.allRestaurants.length === 0) {
        const { data } = await supabase.from('restaurants_1').select('id, name').order('name')
        state.allRestaurants = data || []
      }
      state.items = await fetchReviews(state.searchQuery, state.statusFilter)
    }
  } catch (err) {
    state.error = err.message
  } finally {
    state.loading = false
    render()
  }
}

// Handlers
window.handleLogin = async (e) => {
  e.preventDefault()
  const email = e.target.email.value
  const password = e.target.password.value
  
  const { error } = await supabase.auth.signInWithPassword({ email, password })
  if (error) {
    alert(error.message)
  }
}

window.handleLogout = async () => {
  await supabase.auth.signOut()
}

window.setTab = (tab) => {
  state.activeTab = tab
  state.searchQuery = ''
  state.statusFilter = 'ALL'
  state.businessStatusFilter = 'ALL'
  loadData()
}

window.handleSearch = (e) => {
  state.searchQuery = e.target.value
  loadData()
}

window.handleStatusFilter = (e) => {
  state.statusFilter = e.target.value
  loadData()
}

window.handleBusinessStatusFilter = (e) => {
  state.businessStatusFilter = e.target.value
  loadData()
}

window.openEditModal = (id) => {
  state.editingItem = state.items.find(item => item.id === id)
  state.isAddingNew = false
  render()
}

window.openAddModal = () => {
  if (state.activeTab === 'restaurants') {
    state.editingItem = {
      name: '',
      status: 'STAGING',
      business_status: 'OPEN',
      address: '',
      keywords: [],
      description: '',
      best_of_2025: false,
      best_of_2024: false,
      best_of_2023: false,
      best_of_2022: false,
      best_of_2021: false
    }
  } else {
    state.editingItem = {
      title: '',
      restaurant_id: state.allRestaurants[0]?.id || '',
      status: 'STAGING',
      short_review: '',
      link: ''
    }
  }
  state.isAddingNew = true
  render()
}

window.closeEditModal = () => {
  state.editingItem = null
  state.isAddingNew = false
  render()
}

// Restaurant Reviews Modal Handlers
window.openRestaurantReviewsModal = async (restaurantId) => {
  let restaurant = state.items.find(item => item.id === restaurantId)
  if (!restaurant) {
    restaurant = state.allRestaurants.find(item => item.id === restaurantId)
  }
  if (!restaurant) {
    try {
      const { data } = await supabase.from('restaurants_1').select('*').eq('id', restaurantId).single()
      restaurant = data
    } catch (err) {
      console.error('Error fetching restaurant details', err)
    }
  }
  if (!restaurant) return

  state.selectedRestaurant = restaurant
  state.restaurantReviews = []
  state.loadingReviews = true
  state.reviewsError = null
  state.isAddingReview = false
  state.editingReviewInModal = null
  state.reviewActionMessage = null
  render()

  try {
    state.restaurantReviews = await fetchReviewsForRestaurant(restaurantId)
  } catch (err) {
    state.reviewsError = err.message
  } finally {
    state.loadingReviews = false
    render()
  }
}

window.closeRestaurantReviewsModal = () => {
  state.selectedRestaurant = null
  state.restaurantReviews = []
  state.loadingReviews = false
  state.reviewsError = null
  state.isAddingReview = false
  state.editingReviewInModal = null
  state.reviewActionMessage = null
  render()
}

window.toggleAddReviewForm = (forceVal) => {
  state.isAddingReview = typeof forceVal === 'boolean' ? forceVal : !state.isAddingReview
  state.editingReviewInModal = null
  state.reviewActionMessage = null
  render()
}

window.handleCreateReview = async (e) => {
  e.preventDefault()
  if (!state.selectedRestaurant) return

  const formData = new FormData(e.target)
  const title = formData.get('title')?.trim()
  if (!title) {
    alert('Please enter a review title.')
    return
  }

  const reviewPayload = {
    restaurant_id: state.selectedRestaurant.id,
    title: title,
    status: formData.get('status') || 'STAGING',
    short_review: formData.get('short_review')?.trim() || null,
    content: formData.get('content')?.trim() || null,
    link: formData.get('link')?.trim() || null,
    is_reviewed: formData.get('is_reviewed') === 'true'
  }

  try {
    await createReview(reviewPayload)
    state.isAddingReview = false
    state.reviewActionMessage = { type: 'success', text: 'Review created successfully!' }
    state.restaurantReviews = await fetchReviewsForRestaurant(state.selectedRestaurant.id)
    render()
  } catch (err) {
    alert('Failed to create review: ' + err.message)
  }
}

window.handleEditReviewInModal = (reviewId) => {
  const review = state.restaurantReviews.find(r => r.id === reviewId)
  if (!review) return
  state.editingReviewInModal = review
  state.isAddingReview = false
  state.reviewActionMessage = null
  render()
}

window.handleCancelEditReviewInModal = () => {
  state.editingReviewInModal = null
  render()
}

window.handleUpdateReviewInModal = async (e) => {
  e.preventDefault()
  if (!state.editingReviewInModal || !state.selectedRestaurant) return

  const formData = new FormData(e.target)
  const title = formData.get('title')?.trim()
  if (!title) {
    alert('Please enter a review title.')
    return
  }

  const updates = {
    title: title,
    status: formData.get('status') || 'STAGING',
    short_review: formData.get('short_review')?.trim() || null,
    content: formData.get('content')?.trim() || null,
    link: formData.get('link')?.trim() || null,
    is_reviewed: formData.get('is_reviewed') === 'true'
  }

  try {
    await updateReview(state.editingReviewInModal.id, updates)
    state.editingReviewInModal = null
    state.reviewActionMessage = { type: 'success', text: 'Review updated successfully!' }
    state.restaurantReviews = await fetchReviewsForRestaurant(state.selectedRestaurant.id)
    render()
  } catch (err) {
    alert('Failed to update review: ' + err.message)
  }
}

window.handleDeleteReviewInModal = async (reviewId) => {
  if (!confirm('Are you sure you want to delete this review?')) return
  try {
    await deleteReview(reviewId)
    state.reviewActionMessage = { type: 'success', text: 'Review deleted successfully!' }
    state.restaurantReviews = await fetchReviewsForRestaurant(state.selectedRestaurant.id)
    render()
  } catch (err) {
    alert('Failed to delete review: ' + err.message)
  }
}

window.addKeywordUI = () => {
  const select = document.getElementById('keyword-select')
  const kw = select.value
  if (!kw) return
  
  const container = document.getElementById('keywords-container')
  if (container.querySelector(`span[data-kw="${kw}"]`)) return
  
  const span = document.createElement('span')
  span.className = 'keyword-badge'
  span.dataset.kw = kw
  span.innerHTML = `
    ${kw} 
    <button type="button" onclick="this.parentElement.remove()">&times;</button>
    <input type="hidden" name="keywords" value="${kw}" />
  `
  container.appendChild(span)
  select.value = ''
}

window.handleSave = async (e) => {
  e.preventDefault()
  const formData = new FormData(e.target)
  const updates = Object.fromEntries(formData.entries())
  
  if (state.activeTab === 'restaurants') {
    updates.business_status = formData.get('business_status') || 'OPEN'
    updates.keywords = formData.getAll('keywords')
    ;[2025, 2024, 2023, 2022, 2021].forEach(year => {
      updates[`best_of_${year}`] = formData.get(`best_of_${year}`) === 'true'
    })
  }
  
  try {
    if (state.isAddingNew) {
      if (state.activeTab === 'restaurants') {
        await createRestaurant(updates)
      } else {
        await createReview(updates)
      }
    } else {
      if (state.activeTab === 'restaurants') {
        await updateRestaurant(state.editingItem.id, updates)
      } else {
        await updateReview(state.editingItem.id, updates)
      }
    }
    window.closeEditModal()
    loadData()
  } catch (err) {
    alert('Failed to save: ' + err.message)
  }
}

// Render Functions
function renderLogin() {
  return `
    <div class="login-container">
      <h2>Admin Login</h2>
      <form class="login-form" onsubmit="window.handleLogin(event)">
        <label>
          Email
          <input type="email" name="email" required />
        </label>
        <label>
          Password
          <input type="password" name="password" required />
        </label>
        <button type="submit">Log In</button>
      </form>
    </div>
  `
}

function renderEditModal() {
  if (!state.editingItem) return ''
  
  const item = state.editingItem
  const isRest = state.activeTab === 'restaurants'
  
  return `
    <div class="modal-overlay" onclick="if(event.target === this) window.closeEditModal()">
      <div class="modal-content">
        <div class="modal-header">
          <h2>${state.isAddingNew ? 'Add' : 'Edit'} ${isRest ? 'Restaurant' : 'Review'}</h2>
          <button class="close-btn" onclick="window.closeEditModal()">&times;</button>
        </div>
        <form class="edit-form" onsubmit="window.handleSave(event)">
          <label>
            Name/Title
            <input type="text" name="${isRest ? 'name' : 'title'}" value="${(isRest ? item.name : item.title) || ''}" required />
          </label>
          
          ${isRest ? `
            <div class="form-row">
              <label style="flex: 1;">
                Curation Status
                <select name="status">
                  <option value="STAGING" ${item.status === 'STAGING' ? 'selected' : ''}>STAGING</option>
                  <option value="ACTIVE" ${item.status === 'ACTIVE' ? 'selected' : ''}>ACTIVE</option>
                  <option value="APPROVED" ${item.status === 'APPROVED' ? 'selected' : ''}>APPROVED</option>
                  <option value="DISCARDED" ${item.status === 'DISCARDED' ? 'selected' : ''}>DISCARDED</option>
                </select>
              </label>

              <label style="flex: 1;">
                Business Status (Operational)
                <select name="business_status">
                  <option value="OPEN" ${(item.business_status || 'OPEN') === 'OPEN' ? 'selected' : ''}>OPEN</option>
                  <option value="CLOSED_TEMPORARILY" ${item.business_status === 'CLOSED_TEMPORARILY' ? 'selected' : ''}>CLOSED_TEMPORARILY</option>
                  <option value="CLOSED_PERMANENTLY" ${item.business_status === 'CLOSED_PERMANENTLY' ? 'selected' : ''}>CLOSED_PERMANENTLY</option>
                </select>
              </label>
            </div>
          ` : `
            <label>
              Curation Status
              <select name="status">
                <option value="STAGING" ${item.status === 'STAGING' ? 'selected' : ''}>STAGING</option>
                <option value="ACTIVE" ${item.status === 'ACTIVE' ? 'selected' : ''}>ACTIVE</option>
                <option value="APPROVED" ${item.status === 'APPROVED' ? 'selected' : ''}>APPROVED</option>
                <option value="DISCARDED" ${item.status === 'DISCARDED' ? 'selected' : ''}>DISCARDED</option>
              </select>
            </label>
          `}

          ${isRest ? `
            <label>
              Address
              <input type="text" name="address" value="${item.address || ''}" />
            </label>
            <label>
              Keywords
              <div style="display: flex; gap: 0.5rem; margin-bottom: 0.5rem;">
                <select id="keyword-select" style="flex: 1; padding: 0.5rem; border: 1px solid #cbd5e1; border-radius: 4px;">
                  <option value="">Select a keyword...</option>
                  ${Object.entries(PREDEFINED_KEYWORDS).map(([category, kws]) => `
                    <optgroup label="${category}">
                      ${kws.map(kw => `<option value="${kw}">${kw}</option>`).join('')}
                    </optgroup>
                  `).join('')}
                </select>
                <button type="button" class="add-btn" onclick="window.addKeywordUI()" style="padding: 0.5rem 1rem; background: #0ea5e9; color: white; border: none; border-radius: 4px; cursor: pointer;">Add</button>
              </div>
              <div id="keywords-container" style="display: flex; gap: 0.5rem; flex-wrap: wrap;">
                ${(item.keywords || []).map(kw => `
                  <span class="keyword-badge" data-kw="${kw}">
                    ${kw} 
                    <button type="button" onclick="this.parentElement.remove()">&times;</button>
                    <input type="hidden" name="keywords" value="${kw}" />
                  </span>
                `).join('')}
              </div>

            <fieldset style="border: 1px solid #cbd5e1; border-radius: 4px; padding: 0.5rem; margin-top: 0.5rem;">
              <legend style="font-weight: 500; font-size: 0.875rem;">Best Of Badges</legend>
              ${[2025, 2024, 2023, 2022, 2021].map(year => `
                <label style="flex-direction: row; align-items: center; gap: 0.5rem; font-weight: normal;">
                  <input type="checkbox" name="best_of_${year}" value="true" ${item[`best_of_${year}`] ? 'checked' : ''} />
                  Best of ${year}
                </label>
              `).join('')}
            </fieldset>
            <label>
              Description
              <textarea name="description">${item.description || ''}</textarea>
            </label>
          ` : `
            <label>
              Restaurant
              <select name="restaurant_id" required>
                <option value="">Select a restaurant...</option>
                ${state.allRestaurants.map(r => `
                  <option value="${r.id}" ${item.restaurant_id === r.id ? 'selected' : ''}>${r.name}</option>
                `).join('')}
              </select>
            </label>
            <label>
              Short Review
              <textarea name="short_review">${item.short_review || ''}</textarea>
            </label>
            <label>
              Link
              <input type="url" name="link" value="${item.link || ''}" />
            </label>
          `}
          
          <div class="form-actions">
            <button type="button" class="cancel-btn" onclick="window.closeEditModal()">Cancel</button>
            <button type="submit" class="save-btn">Save Changes</button>
          </div>
        </form>
      </div>
    </div>
  `
}

function renderRestaurantReviewsModal() {
  if (!state.selectedRestaurant) return ''
  const restaurant = state.selectedRestaurant

  return `
    <div class="modal-overlay" onclick="if(event.target === this) window.closeRestaurantReviewsModal()">
      <div class="modal-content modal-large">
        <div class="modal-header">
          <div>
            <div style="display: flex; align-items: center; gap: 0.75rem; flex-wrap: wrap;">
              <h2 style="margin: 0; font-size: 1.5rem; color: #0f172a;">${restaurant.name}</h2>
              <span class="status-badge status-${restaurant.status}" title="Curation Status">${restaurant.status}</span>
              <span class="business-status-badge business-status-${restaurant.business_status || 'OPEN'}" title="Business Status">● ${restaurant.business_status || 'OPEN'}</span>
            </div>
            ${restaurant.address ? `<div style="color: #64748b; font-size: 0.875rem; margin-top: 0.25rem;">📍 ${restaurant.address}</div>` : ''}
            ${restaurant.keywords && restaurant.keywords.length > 0 ? `
              <div style="display: flex; gap: 0.35rem; flex-wrap: wrap; margin-top: 0.5rem;">
                ${restaurant.keywords.slice(0, 5).map(kw => `
                  <span class="keyword-badge" style="font-size: 0.75rem; padding: 0.15rem 0.45rem;">${kw}</span>
                `).join('')}
                ${restaurant.keywords.length > 5 ? `<span style="font-size: 0.75rem; color: #64748b; align-self: center;">+${restaurant.keywords.length - 5} more</span>` : ''}
              </div>
            ` : ''}
          </div>
          <button class="close-btn" onclick="window.closeRestaurantReviewsModal()" title="Close">&times;</button>
        </div>

        <div class="reviews-management-bar">
          <div class="reviews-count-tag">
            <strong>${state.restaurantReviews.length}</strong> ${state.restaurantReviews.length === 1 ? 'Review' : 'Reviews'}
          </div>
          <button 
            type="button" 
            class="add-review-toggle-btn ${state.isAddingReview ? 'is-active' : ''}"
            onclick="window.toggleAddReviewForm()"
          >
            ${state.isAddingReview ? '✕ Cancel' : '+ Add New Review'}
          </button>
        </div>

        ${state.reviewActionMessage ? `
          <div class="alert-banner alert-${state.reviewActionMessage.type}">
            <span>${state.reviewActionMessage.text}</span>
            <button type="button" class="alert-close-btn" onclick="state.reviewActionMessage = null; render()">&times;</button>
          </div>
        ` : ''}

        ${state.isAddingReview ? `
          <div class="review-form-card">
            <div class="review-form-header">
              <h3>Create Review for "${restaurant.name}"</h3>
            </div>
            <form onsubmit="window.handleCreateReview(event)" class="review-admin-form">
              <div class="form-row">
                <label style="flex: 2;">
                  Review Title <span style="color: #ef4444;">*</span>
                  <input type="text" name="title" placeholder="e.g., Stellar Seafood by the Harbor" required />
                </label>
                <label style="flex: 1;">
                  Status
                  <select name="status">
                    <option value="ACTIVE" selected>ACTIVE</option>
                    <option value="STAGING">STAGING</option>
                    <option value="APPROVED">APPROVED</option>
                    <option value="DISCARDED">DISCARDED</option>
                  </select>
                </label>
              </div>

              <label>
                Short Review / Highlight Summary
                <textarea name="short_review" placeholder="A concise summary or excerpt from the critic/user review..."></textarea>
              </label>

              <label>
                Full Content / Article Body (Optional)
                <textarea name="content" placeholder="Full review body, notes, or article content..."></textarea>
              </label>

              <div class="form-row" style="align-items: center;">
                <label style="flex: 2;">
                  Source / Article URL (Optional)
                  <input type="url" name="link" placeholder="https://www.pressherald.com/..." />
                </label>
                <label style="flex: 1; margin-top: 1rem;">
                  <span style="display: inline-flex; align-items: center; gap: 0.5rem; font-weight: normal; cursor: pointer;">
                    <input type="checkbox" name="is_reviewed" value="true" checked />
                    Mark as Curated
                  </span>
                </label>
              </div>

              <div class="form-actions">
                <button type="button" class="cancel-btn" onclick="window.toggleAddReviewForm(false)">Cancel</button>
                <button type="submit" class="save-btn">+ Create Review</button>
              </div>
            </form>
          </div>
        ` : ''}

        ${state.editingReviewInModal ? `
          <div class="review-form-card edit-mode">
            <div class="review-form-header">
              <h3>Edit Review</h3>
              <button type="button" class="close-btn" style="font-size: 1.25rem;" onclick="window.handleCancelEditReviewInModal()">&times;</button>
            </div>
            <form onsubmit="window.handleUpdateReviewInModal(event)" class="review-admin-form">
              <div class="form-row">
                <label style="flex: 2;">
                  Review Title <span style="color: #ef4444;">*</span>
                  <input type="text" name="title" value="${decodeHTMLEntities(state.editingReviewInModal.title || '')}" required />
                </label>
                <label style="flex: 1;">
                  Status
                  <select name="status">
                    <option value="STAGING" ${state.editingReviewInModal.status === 'STAGING' ? 'selected' : ''}>STAGING</option>
                    <option value="ACTIVE" ${state.editingReviewInModal.status === 'ACTIVE' ? 'selected' : ''}>ACTIVE</option>
                    <option value="APPROVED" ${state.editingReviewInModal.status === 'APPROVED' ? 'selected' : ''}>APPROVED</option>
                    <option value="DISCARDED" ${state.editingReviewInModal.status === 'DISCARDED' ? 'selected' : ''}>DISCARDED</option>
                  </select>
                </label>
              </div>

              <label>
                Short Review / Summary
                <textarea name="short_review">${state.editingReviewInModal.short_review || ''}</textarea>
              </label>

              <label>
                Full Content / Article Body (Optional)
                <textarea name="content">${state.editingReviewInModal.content || ''}</textarea>
              </label>

              <div class="form-row" style="align-items: center;">
                <label style="flex: 2;">
                  Source / Article URL
                  <input type="url" name="link" value="${state.editingReviewInModal.link || ''}" />
                </label>
                <label style="flex: 1; margin-top: 1rem;">
                  <span style="display: inline-flex; align-items: center; gap: 0.5rem; font-weight: normal; cursor: pointer;">
                    <input type="checkbox" name="is_reviewed" value="true" ${state.editingReviewInModal.is_reviewed ? 'checked' : ''} />
                    Mark as Curated
                  </span>
                </label>
              </div>

              <div class="form-actions">
                <button type="button" class="cancel-btn" onclick="window.handleCancelEditReviewInModal()">Cancel</button>
                <button type="submit" class="save-btn">Save Changes</button>
              </div>
            </form>
          </div>
        ` : ''}

        <div class="reviews-list-container">
          ${state.loadingReviews ? `
            <div style="text-align: center; padding: 2.5rem; color: #64748b;">
              <div style="display: inline-block; width: 24px; height: 24px; border: 3px solid #cbd5e1; border-top-color: #0284c7; border-radius: 50%; animation: spin 1s linear infinite; margin-bottom: 0.5rem;"></div>
              <p style="margin: 0;">Loading reviews for ${restaurant.name}...</p>
            </div>
          ` : state.reviewsError ? `
            <div style="color: #ef4444; padding: 1rem; background: #fee2e2; border-radius: 6px; border: 1px solid #fecaca;">
              <strong>Error loading reviews:</strong> ${state.reviewsError}
            </div>
          ` : state.restaurantReviews.length === 0 ? `
            <div class="empty-reviews-state">
              <div style="font-size: 2.5rem; margin-bottom: 0.5rem;">📝</div>
              <h4 style="margin: 0 0 0.5rem 0; color: #1e293b;">No reviews found for this restaurant</h4>
              <p style="color: #64748b; font-size: 0.9rem; margin: 0 0 1rem 0;">
                Click "<strong>+ Add New Review</strong>" above to write or attach a review.
              </p>
              <button 
                type="button" 
                class="save-btn" 
                onclick="window.toggleAddReviewForm(true)"
                style="font-size: 0.875rem;"
              >
                + Add First Review
              </button>
            </div>
          ` : `
            <div class="reviews-grid">
              ${state.restaurantReviews.map(review => `
                <div class="admin-review-card">
                  <div class="admin-review-card-header">
                    <div style="flex: 1; min-width: 0;">
                      <h4 class="admin-review-title">
                        ${review.link ? `
                          <a href="${review.link}" target="_blank" rel="noopener noreferrer" title="Open source link">
                            ${decodeHTMLEntities(review.title)} <span style="font-size: 0.8rem;">↗</span>
                          </a>
                        ` : `
                          <span>${decodeHTMLEntities(review.title)}</span>
                        `}
                      </h4>
                      <div class="admin-review-meta">
                        <span class="status-badge status-${review.status}">${review.status}</span>
                        ${review.created_at ? `<span>Added ${new Date(review.created_at).toLocaleDateString()}</span>` : ''}
                        ${review.is_reviewed ? `<span style="color: #166534; background: #dcfce7; padding: 1px 6px; border-radius: 4px; font-size: 0.7rem; font-weight: 500;">Curated</span>` : ''}
                      </div>
                    </div>
                    <div class="admin-review-actions">
                      <button type="button" class="action-btn edit-btn" onclick="window.handleEditReviewInModal('${review.id}')" title="Edit this review">
                        Edit
                      </button>
                      <button type="button" class="action-btn delete-btn" onclick="window.handleDeleteReviewInModal('${review.id}')" title="Delete this review">
                        Delete
                      </button>
                    </div>
                  </div>

                  ${review.short_review ? `
                    <div class="admin-review-snippet">
                      ${review.short_review}
                    </div>
                  ` : ''}

                  ${review.content ? `
                    <details class="admin-review-full-content" style="margin-top: 0.75rem;">
                      <summary style="cursor: pointer; color: #0284c7; font-size: 0.85rem; font-weight: 500;">
                        View Full Article Content
                      </summary>
                      <div style="margin-top: 0.5rem; font-size: 0.875rem; line-height: 1.6; color: #475569; white-space: pre-wrap; background: #f8fafc; padding: 0.75rem; border-radius: 4px; border: 1px solid #e2e8f0;">
                        ${review.content}
                      </div>
                    </details>
                  ` : ''}
                </div>
              `).join('')}
            </div>
          `}
        </div>
      </div>
    </div>
  `
}

function renderDashboard() {
  return `
    <div class="admin-app">
      <header class="admin-header">
        <h1>Admin Dashboard</h1>
        <div style="display: flex; gap: 1rem; align-items: center;">
          <a href="/" style="color: #64748b; text-decoration: none;">View Main Site</a>
          <button onclick="window.handleLogout()" class="wizard-btn back-btn" style="padding: 0.5rem 1rem;">Logout</button>
        </div>
      </header>

      <div class="tabs">
        <button class="tab-btn ${state.activeTab === 'restaurants' ? 'active' : ''}" onclick="window.setTab('restaurants')">Restaurants</button>
        <button class="tab-btn ${state.activeTab === 'reviews' ? 'active' : ''}" onclick="window.setTab('reviews')">Reviews</button>
      </div>

      <div class="dashboard-controls" style="display: flex; gap: 1rem; flex-wrap: wrap;">
        <input type="text" placeholder="Search by name or title..." value="${state.searchQuery}" onchange="window.handleSearch(event)" style="flex: 1; min-width: 200px;" />
        <select onchange="window.handleStatusFilter(event)">
          <option value="ALL" ${state.statusFilter === 'ALL' ? 'selected' : ''}>All Curation Statuses</option>
          <option value="STAGING" ${state.statusFilter === 'STAGING' ? 'selected' : ''}>STAGING</option>
          <option value="ACTIVE" ${state.statusFilter === 'ACTIVE' ? 'selected' : ''}>ACTIVE</option>
          <option value="APPROVED" ${state.statusFilter === 'APPROVED' ? 'selected' : ''}>APPROVED</option>
          <option value="DISCARDED" ${state.statusFilter === 'DISCARDED' ? 'selected' : ''}>DISCARDED</option>
        </select>
        ${state.activeTab === 'restaurants' ? `
          <select onchange="window.handleBusinessStatusFilter(event)">
            <option value="ALL" ${state.businessStatusFilter === 'ALL' ? 'selected' : ''}>All Business Statuses</option>
            <option value="OPEN" ${state.businessStatusFilter === 'OPEN' ? 'selected' : ''}>OPEN</option>
            <option value="CLOSED_TEMPORARILY" ${state.businessStatusFilter === 'CLOSED_TEMPORARILY' ? 'selected' : ''}>CLOSED_TEMPORARILY</option>
            <option value="CLOSED_PERMANENTLY" ${state.businessStatusFilter === 'CLOSED_PERMANENTLY' ? 'selected' : ''}>CLOSED_PERMANENTLY</option>
          </select>
        ` : ''}
        <button onclick="window.openAddModal()" style="padding: 0.5rem 1rem; background: #0ea5e9; color: white; border: none; border-radius: 4px; cursor: pointer; font-weight: 500;">+ Add New</button>
      </div>

      ${state.loading ? '<p>Loading data...</p>' : ''}
      ${state.error ? `<p style="color: red;">${state.error}</p>` : ''}

      <div class="data-table-container">
        <table class="data-table">
          <thead>
            <tr>
              <th>Name / Title</th>
              ${state.activeTab === 'restaurants' ? `
                <th>Curation</th>
                <th>Business Status</th>
              ` : `
                <th>Status</th>
              `}
              <th>Date Added</th>
              <th>Actions</th>
            </tr>
          </thead>
          <tbody>
            ${state.items.map(item => `
              ${state.activeTab === 'restaurants' ? `
                <tr class="clickable-restaurant-row" onclick="window.openRestaurantReviewsModal('${item.id}')">
                  <td style="font-weight: 500;">
                    <div class="restaurant-name-cell">
                      <button type="button" class="restaurant-name-link" onclick="event.stopPropagation(); window.openRestaurantReviewsModal('${item.id}')" title="Click to view reviews & add reviews">
                        ${item.name}
                      </button>
                      ${item.address ? `<div class="restaurant-subtext">📍 ${item.address}</div>` : ''}
                    </div>
                  </td>
                  <td><span class="status-badge status-${item.status}">${item.status}</span></td>
                  <td><span class="business-status-badge business-status-${item.business_status || 'OPEN'}">● ${item.business_status || 'OPEN'}</span></td>
                  <td style="color: #64748b;">${new Date(item.created_at).toLocaleDateString()}</td>
                  <td>
                    <div class="actions-cell" onclick="event.stopPropagation()">
                      <button type="button" class="action-btn reviews-action-btn" onclick="window.openRestaurantReviewsModal('${item.id}')" title="View & Add Reviews">
                        Reviews
                      </button>
                      <button type="button" class="action-btn edit-btn" onclick="window.openEditModal('${item.id}')" title="Edit Restaurant Details">
                        Edit
                      </button>
                    </div>
                  </td>
                </tr>
              ` : `
                <tr>
                  <td style="font-weight: 500;">
                    <div>${decodeHTMLEntities(item.title)}</div>
                    ${item.restaurants_1?.name ? `<div class="restaurant-subtext">Restaurant: <strong>${item.restaurants_1.name}</strong></div>` : ''}
                  </td>
                  <td><span class="status-badge status-${item.status}">${item.status}</span></td>
                  <td style="color: #64748b;">${new Date(item.created_at).toLocaleDateString()}</td>
                  <td>
                    <button type="button" class="action-btn edit-btn" onclick="window.openEditModal('${item.id}')">Edit</button>
                  </td>
                </tr>
              `}
            `).join('')}
            ${state.items.length === 0 && !state.loading ? '<tr><td colspan="5" style="text-align: center; color: #64748b;">No items found.</td></tr>' : ''}
          </tbody>
        </table>
      </div>

      ${renderEditModal()}
      ${renderRestaurantReviewsModal()}
    </div>
  `
}

function render() {
  if (!state.user) {
    root.innerHTML = renderLogin()
  } else {
    root.innerHTML = renderDashboard()
  }
}

// Initialize
async function init() {
  await checkSession()
  if (state.user) {
    loadData()
  }
  render()
}

document.addEventListener('DOMContentLoaded', init)
