import { renderRestaurantDetails } from './components/components.js';

window.backToSearch = () => {
  window.location.href = '/results.html';
};

document.addEventListener('DOMContentLoaded', () => {
  const contentArea = document.getElementById('content-area');
  const urlParams = new URLSearchParams(window.location.search);
  const id = urlParams.get('id');

  // Read the previously saved results to fetch details
  const savedResultsStr = sessionStorage.getItem('last_search_results');
  let results = [];
  try {
    if (savedResultsStr) results = JSON.parse(savedResultsStr);
  } catch (e) { }

  const restaurant = results.find(r => r.id === id);

  if (restaurant) {
    contentArea.innerHTML = renderRestaurantDetails(restaurant);
  } else {
    contentArea.innerHTML = `
      <div style="padding: 2rem; text-align: center;">
        <p>Restaurant not found or session expired.</p>
        <button class="wizard-btn back-btn" onclick="window.backToSearch()">Back to Search</button>
      </div>
    `;
  }
});
