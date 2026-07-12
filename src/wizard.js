import { updateState, getState, toggleFeature } from './state.js';

function initWizard() {
  const state = getState();
  const path = window.location.pathname;

  // Pre-fill state on current page
  if (path.includes('step1')) {
    if (state.cuisine) {
      const radio = document.querySelector(`input[name="cuisine"][value="${state.cuisine}"]`);
      if (radio) {
        radio.checked = true;
        radio.closest('.wizard-option').classList.add('selected');
      }
      document.querySelector('.next-btn').disabled = false;
    }
  } else if (path.includes('step2')) {
    if (state.foodTruck) {
      const radio = document.querySelector(`input[name="foodTruck"][value="${state.foodTruck}"]`);
      if (radio) {
        radio.checked = true;
        radio.closest('.wizard-option').classList.add('selected');
      }
    }
    if (state.seasonal) {
      const radio = document.querySelector(`input[name="seasonal"][value="${state.seasonal}"]`);
      if (radio) {
        radio.checked = true;
        radio.closest('.wizard-option').classList.add('selected');
      }
    }
    document.querySelector('.next-btn').disabled = !(state.foodTruck && state.seasonal);
  } else if (path.includes('step3')) {
    if (state.vibe) {
      const radio = document.querySelector(`input[name="vibe"][value="${state.vibe}"]`);
      if (radio) {
        radio.checked = true;
        radio.closest('.wizard-option').classList.add('selected');
      }
      document.querySelector('.next-btn').disabled = false;
    }
  } else if (path.includes('step4')) {
    state.features.forEach(feature => {
      const checkbox = document.querySelector(`input[value="${feature}"]`);
      if (checkbox) {
        checkbox.checked = true;
        checkbox.closest('.wizard-option').classList.add('selected');
      }
    });
  }
}

window.handleWizardChange = (field, value) => {
  updateState({ [field]: value });
  
  // Visual update
  document.querySelectorAll(`input[name="${field}"]`).forEach(input => {
    input.closest('.wizard-option').classList.remove('selected');
  });
  const checked = document.querySelector(`input[name="${field}"]:checked`);
  if (checked) {
    checked.closest('.wizard-option').classList.add('selected');
  }

  // Button enabling logic
  const path = window.location.pathname;
  if (path.includes('step1') || path.includes('step3')) {
    document.querySelector('.next-btn').disabled = false;
  } else if (path.includes('step2')) {
    const state = getState();
    document.querySelector('.next-btn').disabled = !(state.foodTruck && state.seasonal);
  }
};

window.handleWizardFeatureToggle = (feature) => {
  toggleFeature(feature);
  const checkbox = document.querySelector(`input[value="${feature}"]`);
  if (checkbox) {
    if (checkbox.checked) {
      checkbox.closest('.wizard-option').classList.add('selected');
    } else {
      checkbox.closest('.wizard-option').classList.remove('selected');
    }
  }
};

window.nextWizardStep = () => {
  const path = window.location.pathname;
  if (path.includes('step1')) window.location.href = '/step2.html';
  else if (path.includes('step2')) window.location.href = '/step3.html';
  else if (path.includes('step3')) window.location.href = '/step4.html';
};

window.prevWizardStep = () => {
  const path = window.location.pathname;
  if (path.includes('step2')) window.location.href = '/step1.html';
  else if (path.includes('step3')) window.location.href = '/step2.html';
  else if (path.includes('step4')) window.location.href = '/step3.html';
};

window.submitWizard = () => {
  window.location.href = '/results.html';
};

document.addEventListener('DOMContentLoaded', initWizard);
