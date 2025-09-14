// meal.js - handles meal suggestion form and API call

document.addEventListener('DOMContentLoaded', () => {
  const form = document.getElementById('meal-form');
  const resultDiv = document.getElementById('meal-result');

  if (form) {
    form.addEventListener('submit', async (e) => {
      e.preventDefault();
      const allergies = form.allergies.value.split(',').map(s => s.trim()).filter(Boolean);
      const dislikes = form.dislikes.value.split(',').map(s => s.trim()).filter(Boolean);
      const goal = form.goal.value.trim();
      const additional_preferences = form.additional_preferences.value.trim();
      resultDiv.textContent = 'Loading...';
      try {
        const res = await fetch('/api/llm/suggest-meal', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ allergies, dislikes, goal, additional_preferences })
        });
        const data = await res.json();
        resultDiv.textContent = data.result || data.error || 'No response.';
      } catch (err) {
        resultDiv.textContent = 'Error: ' + err.message;
      }
    });
  }
});
