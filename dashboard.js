import { db, auth } from '../firebase/firebase-config.js';
import { ref, onValue, push, set, update, remove } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-database.js";
import { onAuthStateChanged } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-auth.js"; // Import auth state listener

onAuthStateChanged(auth, (user) => {
    if (user) {
        loadUserProfile(user);
        loadMySkills(user.uid);
        loadCommunitySkills(user.uid);
        loadIncomingRequests(user.uid);
        loadMyRequests(user.uid);
        loadNotifications(user.uid);
    } else {
        window.location.href = 'login.html';
    }
});

// Load Community Skills (Explore)
function loadCommunitySkills(uid) {
    const skillsRef = ref(db, 'skills');
    const exploreList = document.getElementById('explore-skills-list');

    onValue(skillsRef, (snapshot) => {
        if (!exploreList) return;
        exploreList.innerHTML = '';

        const data = snapshot.val();
        let hasSkills = false;

        if (data) {
            Object.keys(data).forEach(key => {
                const skill = data[key];
                // Show only skills NOT created by me
                if (skill.providerId !== uid) {
                    hasSkills = true;
                    // Create Card
                    const card = document.createElement('div');
                    card.className = "card";
                    card.style.padding = '1.5rem';
                    card.style.marginBottom = '0';
                    card.style.display = 'flex';
                    card.style.flexDirection = 'column';
                    card.style.justifyContent = 'space-between';

                    card.innerHTML = `
                        <div>
                            <div style="display:flex; justify-content:space-between; align-items:start; margin-bottom:1rem;">
                                <h4 style="font-size: 1.2rem; color: var(--white); margin:0;">${skill.skillName}</h4>
                                <span style="font-size: 0.8rem; background: var(--accent-color); color: var(--primary-color); padding: 2px 8px; border-radius: 4px;">⏱ ${skill.duration || 'Flexible'}</span>
                            </div>
                            <p style="opacity: 0.8; margin-bottom: 1rem; flex-grow:1;">${skill.description}</p>
                            <div style="display:flex; align-items:center; gap:0.5rem; margin-bottom:1rem;">
                                <div style="width:24px; height:24px; border-radius:50%; background:rgba(255,255,255,0.2); display:flex; justify-content:center; align-items:center; font-size:0.8rem;">
                                    ${(skill.providerName || 'U')[0].toUpperCase()}
                                </div>
                                <small style="opacity:0.6">By ${skill.providerName || 'Unknown'}</small>
                            </div>
                        </div>
                        <button onclick="sendSkillRequest('${key}', '${skill.providerId}', '${skill.skillName}', '${skill.providerName}')" class="btn-primary" style="width:100%;">Request Mentorship</button>
                    `;
                    exploreList.appendChild(card);
                }
            });
        }

        if (!hasSkills) {
            exploreList.innerHTML = '<p style="opacity: 0.7;">No skills found from other users yet.</p>';
        }
    });
}

// Send Request Logic
window.sendSkillRequest = (skillId, providerId, skillName, providerName) => {
    const user = auth.currentUser;
    if (!user) return;

    // Check if already requested (Simple check could be optimized)
    // For now, we just push a new request
    const newReqRef = push(ref(db, 'requests'));
    set(newReqRef, {
        requesterId: user.uid,
        requesterName: user.email, // Or fetch username
        providerId: providerId,
        providerName: providerName,
        skillId: skillId,
        skillName: skillName,
        status: 'pending',
        timestamp: Date.now()
    }).then(() => {
        alert(`Request sent to ${providerName} for ${skillName}!`);
        // Notify the provider
        push(ref(db, 'notifications/' + providerId), {
            message: `New mentorship request from ${user.email} for ${skillName}`,
            timestamp: Date.now(),
            seen: false
        });
    });
};

// Profile Logic
function loadUserProfile(user) {
    const userRef = ref(db, 'users/' + user.uid);
    onValue(userRef, (snapshot) => {
        const data = snapshot.val();
        if (data) {
            document.getElementById('user-name').textContent = data.username || user.email;
            document.getElementById('user-email').textContent = user.email;

            // Pre-fill edit form
            document.getElementById('edit-semester').value = data.semester || "";
            document.getElementById('edit-branch').value = data.branch || "";
            document.getElementById('edit-pic').value = data.profile_picture || "";

            // Populate View Mode
            document.getElementById('view-name').textContent = data.username || user.email;
            document.getElementById('view-email').textContent = user.email;
            document.getElementById('view-bio').textContent = data.bio || "--";
            document.getElementById('view-college').textContent = data.college || "--";
            document.getElementById('view-semester').textContent = data.semester || "--";
            document.getElementById('view-branch').textContent = data.branch || "--";

            // Update profile pics
            const imgEl = document.getElementById('profile-img'); // Sidebar
            const initEl = document.getElementById('profile-initial'); // Sidebar
            const viewImgEl = document.getElementById('view-profile-img'); // View Mode
            const viewInitEl = document.getElementById('view-profile-initial'); // View Mode

            if (data.profile_picture && data.profile_picture !== "default_profile.png") {
                // Sidebar
                imgEl.src = data.profile_picture;
                imgEl.style.display = 'block';
                initEl.style.display = 'none';

                // View Mode
                viewImgEl.src = data.profile_picture;
                viewImgEl.style.display = 'block';
                viewInitEl.style.display = 'none';
            } else {
                const initial = (data.username || user.email)[0].toUpperCase();
                // Sidebar
                imgEl.style.display = 'none';
                initEl.style.display = 'flex';
                initEl.textContent = initial;

                // View Mode
                viewImgEl.style.display = 'none';
                viewInitEl.style.display = 'flex';
                viewInitEl.textContent = initial;
            }
        }
    });

    // Button Logic
    const viewSection = document.getElementById('profile-view');
    const editSection = document.getElementById('profile-edit');
    const openEditBtn = document.getElementById('open-edit-btn');
    const cancelEditBtn = document.getElementById('cancel-edit-btn');

    openEditBtn.addEventListener('click', () => {
        viewSection.style.display = 'none';
        editSection.style.display = 'block';
    });

    cancelEditBtn.addEventListener('click', () => {
        editSection.style.display = 'none';
        viewSection.style.display = 'block';
    });

    // Save Profile Changes
    const saveBtn = document.getElementById('save-profile-btn');
    if (saveBtn) {
        // Remove old listener to avoid duplicates if re-run (though module top-level runs once)
        const newBtn = saveBtn.cloneNode(true);
        saveBtn.parentNode.replaceChild(newBtn, saveBtn);

        newBtn.addEventListener('click', () => {
            const newName = document.getElementById('edit-name').value;
            const newBio = document.getElementById('edit-bio').value;
            const newCollege = document.getElementById('edit-college').value;
            const newSemester = document.getElementById('edit-semester').value;
            const newBranch = document.getElementById('edit-branch').value;
            const newPic = document.getElementById('edit-pic').value;

            update(ref(db, 'users/' + user.uid), {
                username: newName,
                bio: newBio,
                college: newCollege,
                semester: newSemester,
                branch: newBranch,
                profile_picture: newPic
            }).then(() => {
                alert("Profile updated successfully!");
                // Switch back to view
                editSection.style.display = 'none';
                viewSection.style.display = 'block';
            }).catch(err => {
                console.error(err);
                alert("Error updating profile.");
            });
        });
    }
}

// Add Skill
document.getElementById('add-skill-form').addEventListener('submit', (e) => {
    e.preventDefault();
    const skillName = document.getElementById('skill-name').value;
    const skillDesc = document.getElementById('skill-desc').value;
    const skillDuration = document.getElementById('skill-duration').value;

    const user = auth.currentUser;
    if (!user) return;

    // Push to 'skills'
    const newSkillRef = push(ref(db, 'skills'));
    set(newSkillRef, {
        skillName: skillName,
        description: skillDesc,
        duration: skillDuration,
        providerId: user.uid,
        providerName: user.email // Or fetch username
    }).then(() => {
        alert("Skill added!");
        document.getElementById('add-skill-form').reset();
    });
});

// My Skills
function loadMySkills(uid) {
    const skillsRef = ref(db, 'skills');
    const mySkillsList = document.getElementById('my-skills-list');
    const profileSkillsDisplay = document.getElementById('profile-skills-display'); // For View Mode

    onValue(skillsRef, (snapshot) => {
        mySkillsList.innerHTML = '';
        if (profileSkillsDisplay) profileSkillsDisplay.innerHTML = ''; // Clear profile view

        let hasSkills = false;

        const data = snapshot.val();
        if (data) {
            Object.keys(data).forEach(key => {
                const skill = data[key];
                if (skill.providerId === uid) {
                    hasSkills = true;
                    // Render in Manage Skills Tab
                    const card = document.createElement('div');
                    card.className = "card";
                    card.style.padding = '1.5rem';
                    card.style.marginBottom = '0';
                    card.innerHTML = `
                        <div style="display:flex; justify-content:space-between; align-items:start;">
                            <div>
                                <h4 style="font-size: 1.2rem; color: var(--white); margin-bottom: 0.5rem;">${skill.skillName}</h4>
                                <p style="opacity: 0.8; margin-bottom: 0.5rem;">${skill.description}</p>
                                <span style="font-size: 0.9rem; background: var(--accent-color); color: var(--primary-color); padding: 4px 10px; border-radius: 4px; display: inline-block;">⏱ ${skill.duration || 'Flexible'}</span>
                            </div>
                            <button onclick="deleteSkill('${key}')" class="btn-secondary" style="padding: 0.5rem 1rem; font-size: 0.9rem; background: rgba(255,0,0,0.1); color: #ff6b6b; border: 1px solid rgba(255,0,0,0.2);">Delete</button>
                        </div>
                    `;
                    mySkillsList.appendChild(card);

                    // Render in Profile View Tab
                    if (profileSkillsDisplay) {
                        const card = document.createElement('div');
                        card.style.background = 'rgba(255,255,255,0.05)';
                        card.style.padding = '1rem';
                        card.style.borderRadius = '10px';
                        card.style.border = '1px solid rgba(255,255,255,0.1)';

                        card.innerHTML = `
                            <strong style="color: var(--accent-color); display:block; font-size:1.1rem;">${skill.skillName}</strong>
                            <p style="font-size: 0.9rem; margin: 0.5rem 0; opacity: 0.8;">${skill.description}</p>
                            <span style="font-size: 0.8rem; background: var(--accent-color); color: var(--primary-color); padding: 2px 8px; border-radius: 4px;">⏱ ${skill.duration || 'Flexible'}</span>
                        `;
                        profileSkillsDisplay.appendChild(card);
                    }
                }
            });
        }

        if (!hasSkills && profileSkillsDisplay) {
            profileSkillsDisplay.innerHTML = '<p style="opacity: 0.7;">No skills listed yet.</p>';
        }
    });
}

window.deleteSkill = (key) => {
    remove(ref(db, 'skills/' + key));
};

// Incoming Requests (People asking for MY skills)
function loadIncomingRequests(uid) {
    const requestsRef = ref(db, 'requests');
    const incomingList = document.getElementById('incoming-requests-list');

    onValue(requestsRef, (snapshot) => {
        incomingList.innerHTML = '';
        const data = snapshot.val();
        if (data) {
            Object.keys(data).forEach(key => {
                const req = data[key];
                if (req.providerId === uid && req.status === 'pending') {
                    const div = document.createElement('div');
                    div.className = 'request-item';
                    div.innerHTML = `
                        <p>Request from <strong>${req.requesterName}</strong> for your skill.</p>
                        <button onclick="updateRequest('${key}', 'accepted', '${req.requesterId}')" class="btn-primary">Accept</button>
                        <button onclick="updateRequest('${key}', 'rejected', '${req.requesterId}')" class="btn-secondary">Reject</button>
                    `;
                    incomingList.appendChild(div);
                }
            });
        }
    });
}

window.updateRequest = (reqKey, status, requesterId) => {
    update(ref(db, 'requests/' + reqKey), {
        status: status
    }).then(() => {
        // Send Notification
        push(ref(db, 'notifications/' + requesterId), {
            message: `Your skill request was ${status}`,
            timestamp: Date.now(),
            seen: false
        });

        if (status === 'accepted') {
            // Create a chat room? 
            // Ideally we create a chat room ID and link both users.
            // For simplicity, we can assume chat.html will show a list of "Accepted" interactions.
        }
    });
};

// My Sent Requests
function loadMyRequests(uid) {
    const requestsRef = ref(db, 'requests');
    const sentList = document.getElementById('sent-requests-list');

    onValue(requestsRef, (snapshot) => {
        sentList.innerHTML = '';
        const data = snapshot.val();
        if (data) {
            Object.keys(data).forEach(key => {
                const req = data[key];
                if (req.requesterId === uid) {
                    const div = document.createElement('div');
                    div.innerHTML = `
                        Request for skill (ID: ${req.skillId}) - Status: <strong>${req.status}</strong>
                    `;
                    sentList.appendChild(div);
                }
            });
        }
    });
}

// Notifications
function loadNotifications(uid) {
    const notifList = document.getElementById('notifications-list');
    const notifRef = ref(db, 'notifications/' + uid);

    onValue(notifRef, (snapshot) => {
        notifList.innerHTML = '';
        const data = snapshot.val();
        if (data) {
            // Sort by timestamp if possible, but object keys are usually ordered by push ID which is time-based
            Object.entries(data).reverse().forEach(([key, notif]) => {
                const li = document.createElement('li');
                li.style.padding = '1rem';
                li.style.borderBottom = '1px solid rgba(255,255,255,0.1)';
                li.style.background = notif.seen ? 'transparent' : 'rgba(107, 185, 240, 0.1)';

                const time = new Date(notif.timestamp).toLocaleString();
                li.innerHTML = `
                    <p>${notif.message}</p>
                    <small style="opacity:0.6">${time}</small>
                `;
                notifList.appendChild(li);

                // Mark as seen immediately when loaded in this view (simple approach)
                if (!notif.seen) {
                    update(ref(db, 'notifications/' + uid + '/' + key), { seen: true });
                }
            });
        }
    });
}
