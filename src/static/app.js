document.addEventListener("DOMContentLoaded", () => {
  const activitiesList = document.getElementById("activities-list");
  const activitySelect = document.getElementById("activity");
  const signupForm = document.getElementById("signup-form");
  const messageDiv = document.getElementById("message");

  // Function to fetch activities from API
  async function fetchActivities() {
    try {
      const response = await fetch("/activities");
      const activities = await response.json();

      // Clear loading message
      activitiesList.innerHTML = "";

      // Populate activities list
      Object.entries(activities).forEach(([name, details]) => {
        const activityCard = document.createElement("div");
        activityCard.className = "activity-card";

        const spotsLeft = details.max_participants - details.participants.length;

        const participantsList = details.participants.length > 0 
          ? `<ul class="participants-list">${details.participants.map(p => `<li>${p}</li>`).join('')}</ul>`
          : '<p>No participants yet</p>';

        activityCard.innerHTML = `
          <h4>${name}</h4>
          <p>${details.description}</p>
          <p><strong>Schedule:</strong> ${details.schedule}</p>
          <p><strong>Availability:</strong> <span class="spots-left">${spotsLeft}</span> spots left</p>
          <p class="participants">
            <strong>Participants:</strong> ${details.participants.length}/${details.max_participants}
          </p>
          <div class="participants-names">
            <strong>Names:</strong>
            ${participantsList}
          </div>
        `;

        activitiesList.appendChild(activityCard);

        // Add option to select dropdown
        const option = document.createElement("option");
        option.value = name;
        option.textContent = name;
        activitySelect.appendChild(option);
      });
    } catch (error) {
      activitiesList.innerHTML = "<p>Failed to load activities. Please try again later.</p>";
      console.error("Error fetching activities:", error);
    }
  }

  async function loadActivities() {
    try {
      const response = await fetch('/activities');
      const activities = await response.json();
      // populate the select dropdown for signup form (clear safely)
      const activitySelect = document.getElementById('activity');
      activitySelect.innerHTML = '<option value="">-- Select an activity --</option>';
      Object.keys(activities).forEach(name => {
        const option = document.createElement('option');
        option.value = name;
        option.textContent = name;
        activitySelect.appendChild(option);
      });

      try {
        renderActivities(activities);
      } catch (err) {
        console.error('Error rendering activities:', err);
      }
    } catch (error) {
      console.error('Error loading activities:', error);
    }
  }

  function escapeHtml(str) {
    return String(str || '')
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;")
      .replace(/"/g, "&quot;")
      .replace(/'/g, "&#039;");
  }

  function renderActivities(activities) {
    const container = document.getElementById('activities-list');
    container.innerHTML = '';

    Object.entries(activities).forEach(([name, activity]) => {
      const card = document.createElement('div');
      card.className = 'activity-card';

      // Build participants HTML
      const participants = Array.isArray(activity.participants) ? activity.participants : [];
      let participantsHTML = '';
      if (participants.length === 0) {
        participantsHTML = `<div class="participants empty">📭 No participants yet</div>`;
      } else {
        participantsHTML = `<div class="participants">
            <div class="participants-title">👥 Participants (${participants.length})</div>
            <ul class="participants-list">`;
        participants.forEach(p => {
          // each participant item includes a remove button
          participantsHTML += `<li class="participant-item"><span class="participant-name">${escapeHtml(p)}</span>
              <button class="remove-participant" data-activity="${escapeHtml(name)}" data-email="${escapeHtml(p)}" aria-label="Remove participant">✖</button>
            </li>`;
        });
        participantsHTML += `</ul></div>`;
      }

      // Get schedule and availability
      const schedule = activity.schedule || 'Not specified';
      const availability = activity.availability || 'Not specified';

      card.innerHTML = `
          <h3 class="activity-title">${escapeHtml(name)}</h3>
          <p class="activity-desc">${escapeHtml(activity.description || '')}</p>

          <div class="activity-details">
              <div class="detail-item">
                  <span class="detail-label">📅 Schedule:</span>
                  <span class="detail-value">${escapeHtml(schedule)}</span>
              </div>
              <div class="detail-item">
                  <span class="detail-label">✅ Availability:</span>
                  <span class="detail-value">${escapeHtml(availability)}</span>
              </div>
          </div>

          ${participantsHTML}

          <form class="signup-form" data-activity="${escapeHtml(name)}">
              <input name="email" type="email" placeholder="student@example.com" required />
              <button type="submit">Sign Up</button>
          </form>
          <div class="signup-msg" aria-live="polite"></div>
      `;

      // wire up the form submit
      const form = card.querySelector('.signup-form');
      const msg = card.querySelector('.signup-msg');
      form.addEventListener('submit', async (e) => {
          e.preventDefault();
          const email = form.email.value.trim();
          if (!email) return;
          const activityName = form.dataset.activity;
          try {
              const res = await fetch(`/activities/${encodeURIComponent(activityName)}/signup?email=${encodeURIComponent(email)}`, { method: 'POST' });
              if (!res.ok) {
                  const err = await res.json();
                  msg.textContent = err.detail || 'Signup failed';
                  msg.className = 'signup-msg error';
              } else {
                  msg.textContent = `✨ Signed up ${email}`;
                  msg.className = 'signup-msg success';
                  form.reset();
              // refresh to update participants list
              try {
              await loadActivities();
              } catch (loadErr) {
              console.error('Failed to refresh activities after signup:', loadErr);
              }
              }
          } catch (err) {
              msg.textContent = 'Network error';
              msg.className = 'signup-msg error';
          }
      });

      container.appendChild(card);

      // attach remove handlers for participant delete buttons in this card
      const removeButtons = card.querySelectorAll('.remove-participant');
      removeButtons.forEach(btn => {
        btn.addEventListener('click', async (e) => {
          e.preventDefault();
          const activityName = btn.dataset.activity;
          const email = btn.dataset.email;
          const confirmMsg = `Unregister ${email} from ${activityName}?`;
          if (!confirm(confirmMsg)) return;

          try {
            const res = await fetch(`/activities/${encodeURIComponent(activityName)}/participants?email=${encodeURIComponent(email)}`, { method: 'DELETE' });
            if (!res.ok) {
              const err = await res.json();
              msg.textContent = err.detail || 'Failed to remove participant';
              msg.className = 'signup-msg error';
            } else {
              const result = await res.json();
              msg.textContent = result.message;
              msg.className = 'signup-msg success';
              await loadActivities();
            }
          } catch (err) {
            msg.textContent = 'Network error';
            msg.className = 'signup-msg error';
          }
        });
      });
    });
  }

  // Handle form submission
  signupForm.addEventListener("submit", async (event) => {
    event.preventDefault();

    const email = document.getElementById("email").value;
    const activity = document.getElementById("activity").value;

    try {
      const response = await fetch(
        `/activities/${encodeURIComponent(activity)}/signup?email=${encodeURIComponent(email)}`,
        {
          method: "POST",
        }
      );

      const result = await response.json();

      if (response.ok) {
        messageDiv.textContent = result.message;
        messageDiv.className = "success";
        signupForm.reset();
        // refresh activities to show updated participants and availability
        await loadActivities();
      } else {
        messageDiv.textContent = result.detail || "An error occurred";
        messageDiv.className = "error";
      }

      messageDiv.classList.remove("hidden");

      // Hide message after 5 seconds
      setTimeout(() => {
        messageDiv.classList.add("hidden");
      }, 5000);
    } catch (error) {
      messageDiv.textContent = "Failed to sign up. Please try again.";
      messageDiv.className = "error";
      messageDiv.classList.remove("hidden");
      console.error("Error signing up:", error);
    }
  });

  // Initialize app
  // Initialize app using the renderer that shows participants + delete buttons
  loadActivities();
});
