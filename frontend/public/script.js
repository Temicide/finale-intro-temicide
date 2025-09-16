(function () {
  const API_BASE =
  window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1'
    ? 'http://localhost:3222/api'
    : '/api';

  // Simple state
  let userId = localStorage.getItem('croissantfit_user_id');
  let username = localStorage.getItem('croissantfit_username');

  function setAuthTokens(id, name) {
    userId = id;
    username = name;
    localStorage.setItem('croissantfit_user_id', id);
    localStorage.setItem('croissantfit_username', name);
    updateAuthUI();
  }

  function clearAuthTokens() {
    userId = null;
    username = null;
    localStorage.removeItem('croissantfit_user_id');
    localStorage.removeItem('croissantfit_username');
    updateAuthUI();
  }

  // Elements
  const form = document.getElementById('planner-form');
  const resultsStatus = document.getElementById('results-status');
  const aiOutput = document.getElementById('ai-output');
  const favList = document.getElementById('favorites-list');
  const refreshFavBtn = document.getElementById('refresh-favorites');
  const favDailyPlanBtn = document.getElementById('favorite-daily-plan');

  // Auth Modal Elements
  const authModal = document.getElementById('auth-modal');
  const closeAuthModalBtn = document.getElementById('close-auth-modal');
  const showAuthModalBtn = document.getElementById('show-auth-modal');
  const loginTab = document.getElementById('login-tab');
  const registerTab = document.getElementById('register-tab');
  const loginFormContainer = document.getElementById('login-form-container');
  const registerFormContainer = document.getElementById('register-form-container');
  const loginForm = document.getElementById('login-form');
  const registerForm = document.getElementById('register-form');
  const authButtonsDiv = document.querySelector('.auth-buttons');

  function updateAuthUI() {
    if (userId && username) {
      authButtonsDiv.innerHTML = `<button id="logout-btn" class="btn secondary">Logout (${username})</button>`;
      document.getElementById('logout-btn').addEventListener('click', logout);
    } else {
      authButtonsDiv.innerHTML = `<button id="show-auth-modal" class="btn ghost">Login / Register</button>`;
      document.getElementById('show-auth-modal').addEventListener('click', () => showAuthModal('login'));
    }
    loadFavorites(); // Reload favorites based on current user
  }

  function showStatus(text, isLoading = false) {
    if (resultsStatus) {
      if (isLoading) {
        resultsStatus.innerHTML = `<span class="loading"></span> ${text}`;
      } else {
        resultsStatus.textContent = text || '';
      }
    }
  }

  function parseCSV(input) {
    return (input || '')
      .split(',')
      .map((s) => s.trim())
      .filter(Boolean);
  }

  function createEl(tag, opts = {}) {
    const el = document.createElement(tag);
    if (opts.className) el.className = opts.className;
    if (opts.text) el.textContent = opts.text;
    if (opts.html) el.innerHTML = opts.html;
    return el;
  }

  // Auth Modal Functions
  function showAuthModal(tab = 'login') {
    authModal.classList.remove('hidden');
    switchAuthTab(tab);
  }

  function hideAuthModal() {
    authModal.classList.add('hidden');
  }

  function switchAuthTab(tab) {
    if (tab === 'login') {
      loginTab.classList.add('active');
      registerTab.classList.remove('active');
      loginFormContainer.classList.remove('hidden');
      registerFormContainer.classList.add('hidden');
    } else {
      registerTab.classList.add('active');
      loginTab.classList.remove('active');
      registerFormContainer.classList.remove('hidden');
      loginFormContainer.classList.add('hidden');
    }
  }

  async function postJSON(url, body) {
    try {
      const res = await fetch(url, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body || {}),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(data?.error || 'Request failed');
      return data;
    } catch (err) {
      console.error('API Error:', err);
      throw err;
    }
  }

  async function getJSON(url) {
    try {
      const res = await fetch(url);
      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(data?.error || 'Request failed');
      return data;
    } catch (err) {
      console.error('API Error:', err);
      throw err;
    }
  }

  async function putJSON(url, body) {
    try {
      const res = await fetch(url, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body || {}),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(data?.error || 'Request failed');
      return data;
    } catch (err) {
      console.error('API Error:', err);
      throw err;
    }
  }

  async function deleteJSON(url) {
    try {
      const res = await fetch(url, { method: 'DELETE' });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(data?.error || 'Request failed');
      return data;
    } catch (err) {
      console.error('API Error:', err);
      throw err;
    }
  }

  function renderMealPlan(plan) {
    aiOutput.innerHTML = '';
    if (!plan || !plan.daily_meal_plan) {
      aiOutput.innerHTML = '<div class="empty-state"><p>No meal plan generated. Try adjusting your preferences!</p></div>';
      return;
    }

    const daily = plan.daily_meal_plan;
    const header = createEl('div', { className: 'meal-card' });
    const titleRow = createEl('div', { className: 'meal-head' });
    const title = createEl('h3', { className: 'meal-title', text: daily.title || 'Daily Meal Plan' });
    const macros = createEl('div');
    macros.innerHTML = `
      <span class="pill">🔥 ${daily.total_calories ?? '—'} kcal</span>
      <span class="pill">💪 ${daily.total_macros?.protein ?? '—'}g protein</span>
      <span class="pill">🍞 ${daily.total_macros?.carbohydrates ?? daily.total_macros?.carbs ?? '—'}g carbs</span>
      <span class="pill">🥑 ${daily.total_macros?.fat ?? '—'}g fat</span>
    `;
    titleRow.appendChild(title);
    titleRow.appendChild(macros);
    header.appendChild(titleRow);
    aiOutput.appendChild(header);

    // Show favorite daily plan button and attach listener
    if (favDailyPlanBtn) {
      favDailyPlanBtn.classList.remove('hidden');
      favDailyPlanBtn.onclick = () => saveDailyPlanAsFavorite(daily);
    }

    (daily.meals || []).forEach((m) => {
      const card = createEl('div', { className: 'meal-card' });
      const head = createEl('div', { className: 'meal-head' });
      head.appendChild(createEl('h4', { className: 'meal-title', text: m.name || 'Meal' }));
      const macro = createEl('div', { className: 'macro' });
      macro.innerHTML = `
        <span class="pill">🔥 ${m.calories ?? '—'} kcal</span>
        <span class="pill">💪 ${m.protein ?? '—'}g protein</span>
        <span class="pill">🍞 ${m.carbs ?? '—'}g carbs</span>
        <span class="pill">🥑 ${m.fat ?? '—'}g fat</span>
      `;
      head.appendChild(macro);
      card.appendChild(head);

      if (m.meal_type) {
        const mealTypeTag = createEl('span', { className: 'pill type-tag', text: m.meal_type });
        head.appendChild(mealTypeTag);
      }

      if (m.description) card.appendChild(createEl('p', { className: 'meal-desc', text: m.description }));

      const tags = createEl('div');
      (m.ingredients || []).slice(0, 6).forEach((ing) => tags.appendChild(createEl('span', { className: 'pill', text: ing })));
      card.appendChild(tags);

      const actions = createEl('div', { className: 'fav-actions' });
      const btnFav = createEl('button', { className: 'btn success', text: '⭐ Favorite' });
      btnFav.addEventListener('click', () => saveFavoriteFromMeal(m));
      actions.appendChild(btnFav);
      card.appendChild(actions);

      aiOutput.appendChild(card);
    });
  }

  async function saveDailyPlanAsFavorite(dailyPlan) {
    try {
      const combinedIngredients = dailyPlan.meals.flatMap(m => m.ingredients || []);
      const combinedInstructions = dailyPlan.meals.flatMap(m => m.instructions || []);
      const mealNames = dailyPlan.meals.map(m => `<li>${m.name || 'Unnamed Meal'}</li>`);

      const fullPlanMeal = {
        name: dailyPlan.title || 'Daily Meal Plan',
        description: `<ul>${mealNames.join('')}</ul>` || 'A personalized daily meal plan.',
        type: 'daily_plan',
        meal_names: mealNames,
        instructions: combinedInstructions,
        nutritional_info: {
          calories: dailyPlan.total_calories || 0,
          protein: dailyPlan.total_macros?.protein || 0,
          carbohydrates: dailyPlan.total_macros?.carbohydrates || dailyPlan.total_macros?.carbs || 0,
          fat: dailyPlan.total_macros?.fat || 0,
          fiber: dailyPlan.total_macros?.fiber || 0,
        },
      };
      await saveFavoriteFromMeal(fullPlanMeal);
      showStatus('✅ Daily meal plan saved to favorites!');
    } catch (err) {
      showStatus('❌ Failed to save daily meal plan: ' + err.message);
    }
  }

  async function saveFavoriteFromMeal(meal) {
    let payload;
    try {
      payload = {
        name: meal.name || 'Meal',
        description: meal.description || '',
        type: meal.type || 'single_meal',
        ingredients: meal.ingredients || [],
        meal_names: meal.meal_names || [],
        instructions: meal.instructions || [],
        nutritional_info: {
          calories: Number(meal.calories ?? meal.nutritional_info?.calories ?? 0),
          protein: Number(meal.protein ?? meal.nutritional_info?.protein ?? 0),
          carbohydrates: Number(meal.carbs ?? meal.nutritional_info?.carbohydrates ?? meal.nutritional_info?.carbs ?? 0),
          fat: Number(meal.fat ?? meal.nutritional_info?.fat ?? 0),
          fiber: Number(meal.fiber ?? meal.nutritional_info?.fiber ?? 0),
        },
        meal_type: meal.meal_type || undefined,
        user_id: userId,
      };
      const res = await postJSON(`${API_BASE}/mongo/favouriteMeals`, payload);
      showStatus('✅ Saved to favorites!');
      await loadFavorites();
      return res;
    } catch (err) {
      showStatus('❌ Save failed: ' + err.message);
      const favorites = JSON.parse(localStorage.getItem('croissantfit_favorites') || '[]');
      favorites.push({ ...payload, _id: Date.now().toString() });
      localStorage.setItem('croissantfit_favorites', JSON.stringify(favorites));
      showStatus('✅ Saved locally!');
      await loadFavorites();
    }
  }

  function favoriteCard(meal) {
    const card = createEl('div', { className: 'fav-card' });
    const titleText = meal.type === 'daily_plan' ? `🗓️ Daily Plan: ${meal.name}` : meal.name;
    card.appendChild(createEl('h4', { text: titleText, className: 'meal-title' }));
    if (meal.meal_type) {
      const mealTypeTag = createEl('span', { className: 'pill type-tag', text: meal.meal_type });
      card.appendChild(mealTypeTag);
    }
    if (meal.description) card.appendChild(createEl('p', { className: 'small', html: meal.description }));
    
    const nutritionInfo = createEl('div', { className: 'small' });
    nutritionInfo.innerHTML = `
      🔥 ${meal.nutritional_info?.calories ?? '—'} kcal • 
      💪 ${meal.nutritional_info?.protein ?? '—'}g protein •
      🍞 ${meal.nutritional_info?.carbohydrates ?? '—'}g carbs •
      🥑 ${meal.nutritional_info?.fat ?? '—'}g fat
    `;
    card.appendChild(nutritionInfo);

    const tags = createEl('div');
    if (meal.type === 'daily_plan') {
      (meal.meal_names || []).forEach((name) => tags.appendChild(createEl('span', { className: 'pill', text: name })));
    } else {
      (meal.ingredients || []).slice(0, 4).forEach((ing) => tags.appendChild(createEl('span', { className: 'pill', text: ing })));
    }
    card.appendChild(tags);

    const actions = createEl('div', { className: 'fav-actions' });
    const btnView = createEl('button', { className: 'btn ghost', text: '👁️ Details' });
    btnView.addEventListener('click', () => showFavoriteDetail(meal));
    const btnEdit = createEl('button', { className: 'btn', text: '✏️ Edit' });
    btnEdit.addEventListener('click', () => editFavoritePrompt(meal));
    const btnDelete = createEl('button', { className: 'btn danger', text: '🗑️ Delete' });
    btnDelete.addEventListener('click', () => deleteFavorite(meal._id));
    actions.appendChild(btnView);
    actions.appendChild(btnEdit);
    actions.appendChild(btnDelete);
    card.appendChild(actions);

    return card;
  }

  function showFavoriteDetail(meal) {
    const details = [
      `🔥 Calories: ${meal.nutritional_info?.calories ?? '—'} kcal`,
      `💪 Protein: ${meal.nutritional_info?.protein ?? '—'} g`,
      `🍞 Carbs: ${meal.nutritional_info?.carbohydrates ?? '—'} g`,
      `🥑 Fat: ${meal.nutritional_info?.fat ?? '—'} g`,
      `🌾 Fiber: ${meal.nutritional_info?.fiber ?? '—'} g`,
    ].join('\n');

    const ingredientsList = (meal.ingredients || []).length ? 
      '\n\n📋 Ingredients:\n• ' + (meal.ingredients || []).join('\n• ') : '';
    
    const mealNamesList = (meal.type === 'daily_plan' && (meal.meal_names || []).length) ?
      '\n\n🍽️ Meals:\n• ' + (meal.meal_names || []).join('\n• ') : '';

    const mealTypeDisplay = meal.meal_type ? ` [${meal.meal_type}]` : '';

    const instructionsList = (meal.instructions || []).length ? 
      '\n\n📝 Instructions:\n• ' + (meal.instructions || []).join('\n• ') : '';

    alert(`🍽️ ${meal.name}${mealTypeDisplay}\n\n${meal.description.replace(/<[^>]*>/g, '') || 'No description available.'}\n\n${details}${meal.type === 'daily_plan' ? mealNamesList : ingredientsList}${instructionsList}`);
  }

  async function editFavoritePrompt(meal) {
    const newName = prompt('✏️ Edit meal name:', meal.name);
    if (newName == null) return;
    const newDesc = prompt('✏️ Edit description:', meal.description || '');
    if (newDesc == null) return;
    
    try {
      const updated = {
        ...meal,
        name: newName,
        description: newDesc,
      };
      
      try {
        const res = await putJSON(`${API_BASE}/mongo/favouriteMeals/${meal._id}`, updated);
        showStatus('✅ Favorite updated!');
      } catch (err) {
        const favorites = JSON.parse(localStorage.getItem('croissantfit_favorites') || '[]');
        const index = favorites.findIndex(f => f._id === meal._id);
        if (index !== -1) {
          favorites[index] = updated;
          localStorage.setItem('croissantfit_favorites', JSON.stringify(favorites));
          showStatus('✅ Updated locally!');
        }
      }
      
      await loadFavorites();
    } catch (err) {
      showStatus('❌ Update failed: ' + err.message);
    }
  }

  async function deleteFavorite(id) {
    if (!confirm('🗑️ Delete this favorite meal?')) return;
    
    try {
      try {
        await deleteJSON(`${API_BASE}/mongo/favouriteMeals/${id}`);
        showStatus('✅ Favorite deleted!');
      } catch (err) {
        const favorites = JSON.parse(localStorage.getItem('croissantfit_favorites') || '[]');
        const filtered = favorites.filter(f => f._id !== id);
        localStorage.setItem('croissantfit_favorites', JSON.stringify(filtered));
        showStatus('✅ Deleted locally!');
      }
      
      await loadFavorites();
    } catch (err) {
      showStatus('❌ Delete failed: ' + err.message);
    }
  }

  async function loadFavorites() {
    favList.innerHTML = '';
    
    try {
      let meals = [];
      
      try {
        const res = await getJSON(`${API_BASE}/mongo/favouriteMeals?user_id=${encodeURIComponent(userId)}`);
        meals = res?.data || [];
      } catch (err) {
        meals = JSON.parse(localStorage.getItem('croissantfit_favorites') || '[]');
      }
      
      if (!meals.length) {
        favList.innerHTML = '<div class="empty-state"><p>No favorite meals yet. Start by generating some meal suggestions!</p></div>';
        return;
      }
      
      meals.forEach((m) => favList.appendChild(favoriteCard(m)));
    } catch (err) {
      favList.innerHTML = '<div class="empty-state"><p>❌ Failed to load favorites. Check your connection!</p></div>';
    }
  }

  async function handleGeneratePlan(e) {
    e?.preventDefault?.();
    showStatus('Generating your personalized meal plan...', true);
    aiOutput.innerHTML = '<div class="empty-state"><span class="loading"></span><p>AI is crafting your perfect meal plan...</p></div>';
    
    const payload = {
      goal: form.goal.value || undefined,
      current_weight: form.current_weight.value || undefined,
      target_weight: form.target_weight.value || undefined,
      activity_level: form.activity_level.value || undefined,
      workout_days_per_week: form.workout_days_per_week.value || undefined,
      workout_type: form.workout_type.value || undefined,
      allergies: parseCSV(form.allergies.value).filter(val => val.toLowerCase() !== 'none'),
      dislikes: parseCSV(form.dislikes.value).filter(val => val.toLowerCase() !== 'none'),
      favorite_foods: parseCSV(form.favorite_foods.value).filter(val => val.toLowerCase() !== 'none'),
      additional_preferences: form.additional_preferences.value || undefined,
    };
    
    try {
      const res = await postJSON(`${API_BASE}/llm/meal-plan`, payload);
      const plan = res?.data || res;
      renderMealPlan(plan);
      showStatus('🎉 Meal plan ready!');
    } catch (err) {
      aiOutput.innerHTML = `<div class="empty-state"><p>❌ Failed to generate meal plan: ${err.message}<br><br>💡 Make sure your backend is running on localhost:3222</p></div>`;
      showStatus('');
    }
  }

  async function handleRegister(e) {
    e.preventDefault();
    const email = registerForm.elements['register-email'].value;
    const password = registerForm.elements['register-password'].value;
    const username = registerForm.elements['register-username'].value;

    try {
      const res = await postJSON(`${API_BASE}/user/register`, { email, password, username });
      if (res.success) {
        showStatus('✅ Registration successful! Please log in.');
        switchAuthTab('login');
        loginForm.elements['login-email'].value = email;
      } else {
        showStatus(`❌ Registration failed: ${res.error}`);
      }
    } catch (err) {
      showStatus(`❌ Registration failed: ${err.message}`);
    }
  }

  async function handleLogin(e) {
    e.preventDefault();
    const email = loginForm.elements['login-email'].value;
    const password = loginForm.elements['login-password'].value;

    console.log('Attempting login with:', { email, password });

    try {
      const res = await postJSON(`${API_BASE}/user/login`, { email, password });
      console.log('Login response:', res);
      if (res.success && res.userId) {
        setAuthTokens(res.userId, res.username);
        showStatus('✅ Login successful!');
        hideAuthModal();
        loadFavorites();
      } else {
        showStatus(`❌ Login failed: ${res.error || 'Unknown error'}`);
      }
    } catch (err) {
      console.error('Login API Error:', err);
      showStatus(`❌ Login failed: ${err.message}`);
    }
  }

  function logout() {
    clearAuthTokens();
    showStatus('👋 Logged out.');
    aiOutput.innerHTML = '<div class="empty-state"><p>Generate your first meal plan to see AI-powered suggestions here!</p></div>';
  }

  // Wire events
  if (form) form.addEventListener('submit', handleGeneratePlan);
  if (refreshFavBtn) refreshFavBtn.addEventListener('click', loadFavorites);

  // Auth Modal Events
  if (showAuthModalBtn) showAuthModalBtn.addEventListener('click', () => showAuthModal('login'));
  if (closeAuthModalBtn) closeAuthModalBtn.addEventListener('click', hideAuthModal);
  if (loginTab) loginTab.addEventListener('click', () => switchAuthTab('login'));
  if (registerTab) registerTab.addEventListener('click', () => switchAuthTab('register'));
  if (loginForm) loginForm.addEventListener('submit', handleLogin);
  if (registerForm) registerForm.addEventListener('submit', handleRegister);

  // Initial load
  updateAuthUI();
  showStatus('Ready to create your meal plan! 🚀');
})();