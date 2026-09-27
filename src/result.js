import { renderRestaurantDetails, renderLoadingSpinner } from './components/components.js';
import { supabase } from './config/supabase.js';

window.backToSearch = () => {
  window.location.href = '/results.html';
};

document.addEventListener('DOMContentLoaded', async () => {
  const contentArea = document.getElementById('content-area');
  const urlParams = new URLSearchParams(window.location.search);
  const id = urlParams.get('id');

  if (!id) {
    contentArea.innerHTML = `
      <div style="padding: 2rem; text-align: center;">
        <p>No restaurant specified.</p>
        <button class="wizard-btn back-btn" onclick="window.backToSearch()">Back to Search</button>
      </div>
    `;
    return;
  }

  // Read the previously saved results to fetch details
  const savedResultsStr = sessionStorage.getItem('last_search_results');
  let results = [];
  try {
    if (savedResultsStr) results = JSON.parse(savedResultsStr);
  } catch (e) { }

  let restaurant = results.find(r => r.id === id);

  if (restaurant) {
    contentArea.innerHTML = renderRestaurantDetails(restaurant);

    // If additional_addresses is missing from cached item, refresh in background
    if (restaurant.additional_addresses === undefined) {
      try {
        const { data } = await supabase
          .from('restaurants_1')
          .select('*, restaurant_reviews_1(*)')
          .eq('id', id)
          .single();
        if (data) {
          restaurant = {
            ...restaurant,
            ...data,
            reviews: data.restaurant_reviews_1 || restaurant.reviews || []
          };
          contentArea.innerHTML = renderRestaurantDetails(restaurant);
        }
      } catch (e) {
        console.error('Background refresh failed:', e);
      }
    }
  } else {
    // If not in session storage (e.g. direct URL visit), fetch from Supabase
    contentArea.innerHTML = renderLoadingSpinner('Loading restaurant details...');
    try {
      const { data, error } = await supabase
        .from('restaurants_1')
        .select('*, restaurant_reviews_1(*)')
        .eq('id', id)
        .single();

      if (error || !data) {
        throw new Error(error?.message || 'Restaurant not found');
      }

      restaurant = {
        ...data,
        reviews: (data.restaurant_reviews_1 || []).filter(r => r.status === 'APPROVED' || r.status === 'ACTIVE' || !r.status)
      };

      contentArea.innerHTML = renderRestaurantDetails(restaurant);
    } catch (err) {
      console.error('Error fetching restaurant:', err);
      contentArea.innerHTML = `
        <div style="padding: 2rem; text-align: center;">
          <p>Restaurant not found or could not be loaded.</p>
          <button class="wizard-btn back-btn" onclick="window.backToSearch()">Back to Search</button>
        </div>
      `;
    }
  }
});
