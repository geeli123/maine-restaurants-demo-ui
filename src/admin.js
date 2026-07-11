import { supabase } from './config/supabase'
import { fetchRestaurants, fetchReviews, updateRestaurant, updateReview } from './services/adminService.js'

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
  items: [],
  loading: false,
  error: null,
  editingItem: null,
  allRestaurants: []
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
      state.items = await fetchRestaurants(state.searchQuery, state.statusFilter)
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

window.openEditModal = (id) => {
  state.editingItem = state.items.find(item => item.id === id)
  render()
}

window.closeEditModal = () => {
  state.editingItem = null
  render()
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
    updates.keywords = formData.getAll('keywords')
    [2025, 2024, 2023, 2022, 2021].forEach(year => {
      updates[`best_of_${year}`] = formData.get(`best_of_${year}`) === 'true'
    })
  }
  
  try {
    if (state.activeTab === 'restaurants') {
      await updateRestaurant(state.editingItem.id, updates)
    } else {
      await updateReview(state.editingItem.id, updates)
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
          <h2>Edit ${isRest ? 'Restaurant' : 'Review'}</h2>
          <button class="close-btn" onclick="window.closeEditModal()">&times;</button>
        </div>
        <form class="edit-form" onsubmit="window.handleSave(event)">
          <label>
            Name/Title
            <input type="text" name="${isRest ? 'name' : 'title'}" value="${(isRest ? item.name : item.title) || ''}" required />
          </label>
          
          <label>
            Curation Status
            <select name="status">
              <option value="STAGING" ${item.status === 'STAGING' ? 'selected' : ''}>STAGING</option>
              <option value="ACTIVE" ${item.status === 'ACTIVE' ? 'selected' : ''}>ACTIVE</option>
              <option value="APPROVED" ${item.status === 'APPROVED' ? 'selected' : ''}>APPROVED</option>
              <option value="DISCARDED" ${item.status === 'DISCARDED' ? 'selected' : ''}>DISCARDED</option>
            </select>
          </label>

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
            </label>
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

      <div class="dashboard-controls">
        <input type="text" placeholder="Search by name or title..." value="${state.searchQuery}" onchange="window.handleSearch(event)" />
        <select onchange="window.handleStatusFilter(event)">
          <option value="ALL" ${state.statusFilter === 'ALL' ? 'selected' : ''}>All Statuses</option>
          <option value="STAGING" ${state.statusFilter === 'STAGING' ? 'selected' : ''}>STAGING</option>
          <option value="ACTIVE" ${state.statusFilter === 'ACTIVE' ? 'selected' : ''}>ACTIVE</option>
          <option value="APPROVED" ${state.statusFilter === 'APPROVED' ? 'selected' : ''}>APPROVED</option>
          <option value="DISCARDED" ${state.statusFilter === 'DISCARDED' ? 'selected' : ''}>DISCARDED</option>
        </select>
      </div>

      ${state.loading ? '<p>Loading data...</p>' : ''}
      ${state.error ? `<p style="color: red;">${state.error}</p>` : ''}

      <div class="data-table-container">
        <table class="data-table">
          <thead>
            <tr>
              <th>Name / Title</th>
              <th>Status</th>
              <th>Date Added</th>
              <th>Actions</th>
            </tr>
          </thead>
          <tbody>
            ${state.items.map(item => `
              <tr>
                <td style="font-weight: 500;">${state.activeTab === 'restaurants' ? item.name : item.title}</td>
                <td><span class="status-badge status-${item.status}">${item.status}</span></td>
                <td style="color: #64748b;">${new Date(item.created_at).toLocaleDateString()}</td>
                <td>
                  <button class="edit-btn" onclick="window.openEditModal('${item.id}')">Edit</button>
                </td>
              </tr>
            `).join('')}
            ${state.items.length === 0 && !state.loading ? '<tr><td colspan="4" style="text-align: center; color: #64748b;">No items found.</td></tr>' : ''}
          </tbody>
        </table>
      </div>

      ${renderEditModal()}
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
