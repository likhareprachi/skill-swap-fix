import { db, auth } from '../firebase/firebase-config.js';
import { ref, onValue, push, set } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-database.js";

// Load Featured Skills
const skillsGrid = document.getElementById('dynamic-skills-container');
const searchBar = document.getElementById('search-bar');

function loadSkills() {
    if (!skillsGrid) return;

    // Listen for skills
    const skillsRef = ref(db, 'skills');
    onValue(skillsRef, (snapshot) => {
        const data = snapshot.val();
        let allSkills = [];

        if (data) {
            // Convert object to array for easier filtering
            allSkills = Object.keys(data).map(key => ({ ...data[key], id: key }));
        }

        const renderSkills = (skills) => {
            skillsGrid.innerHTML = '';
            if (skills.length > 0) {
                skills.forEach(skill => {
                    const card = `
                        <div class="card">
                            <h3>${skill.skillName}</h3>
                            <span class="provider">by ${skill.providerName}</span>
                            <p>${skill.description}</p>
                            <button class="btn-secondary request-btn" data-id="${skill.id}" data-provider="${skill.providerId}">Request Skill</button>
                        </div>
                    `;
                    skillsGrid.innerHTML += card;
                });

                // Attach event listeners regarding request buttons
                document.querySelectorAll('.request-btn').forEach(btn => {
                    btn.addEventListener('click', handleRequest);
                });
            } else {
                skillsGrid.innerHTML = '<p>No matching skills found. Be the first to add one!</p>';
            }
        };

        // Initial Render
        renderSkills(allSkills);

        // Search Listener
        if (searchBar) {
            searchBar.addEventListener('input', (e) => {
                const term = e.target.value.toLowerCase();
                const filtered = allSkills.filter(skill =>
                    skill.skillName.toLowerCase().includes(term) ||
                    (skill.description && skill.description.toLowerCase().includes(term))
                );
                renderSkills(filtered);
            });
        }
    });
}

function handleRequest(e) {
    if (!auth.currentUser) {
        alert("Please login to request a skill.");
        window.location.href = 'login.html';
        return;
    }

    const skillId = e.target.getAttribute('data-id');
    const providerId = e.target.getAttribute('data-provider');
    const requesterId = auth.currentUser.uid;
    const requesterName = auth.currentUser.email; // Using email as name for simplicity or fetch profile

    if (providerId === requesterId) {
        alert("You cannot request your own skill!");
        return;
    }

    // Create Request
    const requestsRef = ref(db, 'requests');
    const newRequestRef = push(requestsRef);
    set(newRequestRef, {
        skillId: skillId,
        providerId: providerId,
        requesterId: requesterId,
        requesterName: requesterName,
        status: 'pending',
        timestamp: Date.now()
    }).then(() => {
        alert("Request sent successfully!");
        // Send Notification to Provider
        const notifRef = push(ref(db, 'notifications/' + providerId));
        set(notifRef, {
            message: `New skill request from ${requesterName}`,
            timestamp: Date.now(),
            seen: false
        });
    }).catch(err => console.error(err));
}

// Global Notifications (Bell Icon) - kept as fallback if auth.js didn't catch it
const notificationBadge = document.querySelector('.notification-badge');

if (auth.currentUser) {
    const myNotifs = ref(db, 'notifications/' + auth.currentUser.uid);
    onValue(myNotifs, (snapshot) => {
        const data = snapshot.val();
        if (data) {
            const count = Object.values(data).filter(n => !n.seen).length;
            if (notificationBadge) {
                notificationBadge.textContent = count > 0 ? count : '';
                notificationBadge.style.display = count > 0 ? 'block' : 'none';
            }
        }
    });
}

document.addEventListener('DOMContentLoaded', loadSkills);
