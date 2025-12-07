import { db, auth } from '../firebase/firebase-config.js';
import { ref, onValue, push, set } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-database.js";
import { onAuthStateChanged } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-auth.js";

let currentUser = null;

// Auth State Listener
onAuthStateChanged(auth, (user) => {
    currentUser = user;
    updateNav(user);
    loadAllSkills(user ? user.uid : null);
});

function updateNav(user) {
    const loginBtn = document.getElementById('login-link');
    const dashboardBtn = document.getElementById('dashboard-link');

    if (user) {
        loginBtn.style.display = 'none';
        dashboardBtn.style.display = 'block';
    } else {
        loginBtn.style.display = 'block';
        dashboardBtn.style.display = 'none';
    }
}

// Load Skills
function loadAllSkills(uid) {
    const skillsRef = ref(db, 'skills');
    const container = document.getElementById('skills-container');
    const searchInput = document.getElementById('skill-search');

    onValue(skillsRef, (snapshot) => {
        const data = snapshot.val();
        let allSkills = [];

        if (data) {
            Object.keys(data).forEach(key => {
                const skill = data[key];
                // Don't show my own skills
                if (!uid || skill.providerId !== uid) {
                    allSkills.push({ id: key, ...skill });
                }
            });
        }

        renderSkills(allSkills);

        // Search functionality
        searchInput.addEventListener('input', (e) => {
            const term = e.target.value.toLowerCase();
            const filtered = allSkills.filter(s =>
                s.skillName.toLowerCase().includes(term) ||
                s.description.toLowerCase().includes(term)
            );
            renderSkills(filtered);
        });
    });
}

function renderSkills(skills) {
    const container = document.getElementById('skills-container');
    container.innerHTML = '';

    if (skills.length === 0) {
        container.innerHTML = '<p style="color: white; text-align: center; grid-column: 1/-1; opacity: 0.7;">No skills found matching your search.</p>';
        return;
    }

    skills.forEach(skill => {
        const card = document.createElement('div');
        card.className = 'mentor-card';

        const initial = (skill.providerName || 'U')[0].toUpperCase();

        card.innerHTML = `
            <div>
                <div class="mentor-header">
                    <div class="mentor-avatar">${initial}</div>
                    <div>
                        <h3 style="color: var(--primary-color); font-size: 1.1rem; margin: 0;">${skill.providerName || 'Student'}</h3>
                        <small style="color: #666;">Looking to teach</small>
                    </div>
                </div>
                
                <h2 style="color: var(--primary-color); font-size: 1.4rem; margin-bottom: 0.5rem;">${skill.skillName}</h2>
                <div class="skill-badge">Duration: ${skill.duration || 'Flexible'}</div>
                <p style="color: #555; line-height: 1.5; margin: 1rem 0;">${skill.description}</p>
            </div>
            
            <button onclick="requestSkill('${skill.id}', '${skill.providerId}', '${skill.skillName}', '${skill.providerName}')" 
                class="btn-primary" style="width: 100%; margin-top: 1rem;">
                Request Mentorship
            </button>
        `;
        container.appendChild(card);
    });
}

// Request Function
window.requestSkill = (skillId, providerId, skillName, providerName) => {
    if (!currentUser) {
        window.location.href = 'login.html';
        return;
    }

    // Logic to send request
    const newReqRef = push(ref(db, 'requests'));
    set(newReqRef, {
        requesterId: currentUser.uid,
        requesterName: currentUser.email,
        providerId: providerId,
        providerName: providerName,
        skillId: skillId,
        skillName: skillName,
        status: 'pending',
        timestamp: Date.now()
    }).then(() => {
        showToast(`Request sent to ${providerName}!`);
        // Notification
        push(ref(db, 'notifications/' + providerId), {
            message: `New mentorship request from ${currentUser.email} for ${skillName}`,
            timestamp: Date.now(),
            seen: false
        });
    }).catch(err => {
        console.error(err);
        showToast("Error sending request.");
    });
};

function showToast(msg) {
    const toast = document.getElementById('toast');
    toast.textContent = msg;
    toast.style.display = 'block';
    setTimeout(() => {
        toast.style.display = 'none';
    }, 3000);
}
