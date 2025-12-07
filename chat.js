import { db, auth } from '../firebase/firebase-config.js';
import { ref, onValue, push, set, update, get } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-database.js";
import { onAuthStateChanged } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-auth.js";

let currentUser = null;
let currentChatPartner = null;
let currentChatId = null;

onAuthStateChanged(auth, (user) => {
    if (user) {
        currentUser = user;
        loadChatList(user.uid);
    } else {
        window.location.href = 'login.html';
    }
});

function loadChatList(uid) {
    const requestsRef = ref(db, 'requests');
    const usersList = document.querySelector('.users-list');

    onValue(requestsRef, async (snapshot) => {
        usersList.innerHTML = '';
        const header = document.createElement('div');
        header.style.padding = '1rem';
        header.style.borderBottom = '1px solid rgba(255,255,255,0.1)';
        header.style.fontWeight = 'bold';
        header.textContent = 'Chats';
        usersList.appendChild(header);

        const data = snapshot.val();
        if (data) {
            const chatPartners = new Set();
            const partnerIds = new Set();

            // Identify partners from accepted requests
            Object.values(data).forEach(req => {
                if (req.status === 'accepted') {
                    if (req.requesterId === uid) {
                        partnerIds.add(req.providerId);
                    } else if (req.providerId === uid) {
                        partnerIds.add(req.requesterId);
                    }
                }
            });

            if (partnerIds.size === 0) {
                const p = document.createElement('p');
                p.style.padding = '1rem';
                p.style.opacity = '0.6';
                p.style.fontSize = '0.9rem';
                p.textContent = "No active chats. Request a skill to start!";
                usersList.appendChild(p);
                return;
            }

            // Fetch details for each partner
            for (const partnerId of partnerIds) {
                const partnerSnapshot = await get(ref(db, 'users/' + partnerId));
                const partnerData = partnerSnapshot.val();

                const name = partnerData ? (partnerData.username || 'User') : 'Unknown User';
                const initial = name[0].toUpperCase();

                const div = document.createElement('div');
                div.className = 'user-list-item';
                div.style.padding = '1rem';
                div.style.borderBottom = '1px solid rgba(255,255,255,0.05)';
                div.style.cursor = 'pointer';
                div.style.display = 'flex';
                div.style.alignItems = 'center';
                div.style.gap = '10px';
                div.style.transition = 'background 0.2s';

                div.onmouseover = () => { div.style.background = 'rgba(255,255,255,0.05)'; };
                div.onmouseout = () => { if (currentChatPartner?.id !== partnerId) div.style.background = 'transparent'; };

                div.innerHTML = `
                    <div style="width: 35px; height: 35px; border-radius: 50%; background: var(--secondary-color); color: var(--primary-color); display: flex; align-items: center; justify-content: center; font-weight: bold; font-size: 0.9rem;">
                        ${initial}
                    </div>
                    <div>
                        <div style="color: var(--white); font-weight: 500;">${name}</div>
                        <div style="color: rgba(255,255,255,0.5); font-size: 0.8rem;">Click to chat</div>
                    </div>
                `;

                div.onclick = () => {
                    // Highlight active
                    document.querySelectorAll('.user-list-item').forEach(el => el.style.background = 'transparent');
                    div.style.background = 'rgba(255,255,255,0.1)';

                    selectChat({ id: partnerId, name: name });
                };

                usersList.appendChild(div);
            }
        } else {
            const p = document.createElement('p');
            p.style.padding = '1rem';
            p.style.opacity = '0.6';
            p.style.fontSize = '0.9rem';
            p.textContent = "No active chats.";
            usersList.appendChild(p);
        }
    });
}

function selectChat(partner) {
    currentChatPartner = partner;
    // Generate unique chat ID: sort UIDs
    const ids = [currentUser.uid, partner.id].sort();
    currentChatId = ids[0] + "_" + ids[1];

    document.getElementById('chat-with-name').textContent = partner.name;
    document.querySelector('.chat-input').disabled = false;
    document.querySelector('.send-btn').disabled = false;
    document.querySelector('.chat-input').focus();

    loadMessages(currentChatId);
}

function loadMessages(chatId) {
    const messagesBox = document.querySelector('.messages-box');
    const messagesRef = ref(db, 'chats/' + chatId);

    onValue(messagesRef, (snapshot) => {
        messagesBox.innerHTML = '';
        const data = snapshot.val();
        if (data) {
            Object.entries(data).forEach(([key, msg]) => {
                const wrapper = document.createElement('div');
                wrapper.className = `message ${msg.senderId === currentUser.uid ? 'sent' : 'received'}`;

                // Style the message bubbles via inline styles for simplicity, or rely on CSS

                const isMe = msg.senderId === currentUser.uid;
                wrapper.style.alignSelf = isMe ? 'flex-end' : 'flex-start';
                wrapper.style.maxWidth = '70%';
                wrapper.style.padding = '0.8rem 1.2rem';
                wrapper.style.borderRadius = '15px';
                wrapper.style.marginBottom = '0.5rem';
                wrapper.style.background = isMe ? 'var(--accent-color)' : 'rgba(255,255,255,0.1)';
                wrapper.style.color = isMe ? 'var(--primary-color)' : 'var(--white)';

                // Add seen status for sent messages
                let statusInfo = '';
                if (isMe) {
                    const statusColor = msg.seen ? '#007bff' : 'rgba(0,0,0,0.5)';
                    // statusInfo = `<span style="font-size:0.7em; margin-left:5px; color:${statusColor}">✓</span>`;
                    // simplifying for now
                }

                wrapper.innerHTML = `${msg.text}`;
                messagesBox.appendChild(wrapper);

                // Mark received messages as seen
                if (!isMe && !msg.seen) {
                    update(ref(db, 'chats/' + chatId + '/' + key), { seen: true });
                }
            });
            // Scroll to bottom
            messagesBox.scrollTop = messagesBox.scrollHeight;
        }
    });
}

// Send Message
document.querySelector('.send-btn').addEventListener('click', sendMessage);
document.querySelector('.chat-input').addEventListener('keypress', (e) => {
    if (e.key === 'Enter') sendMessage();
});

function sendMessage() {
    if (!currentChatId || !currentUser) return;

    const input = document.querySelector('.chat-input');
    const text = input.value.trim();
    if (text === "") return;

    const messagesRef = ref(db, 'chats/' + currentChatId);
    push(messagesRef, {
        senderId: currentUser.uid,
        text: text,
        timestamp: Date.now(),
        seen: false
    });

    input.value = '';
}
