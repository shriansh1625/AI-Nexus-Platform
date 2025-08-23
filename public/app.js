// Import Firebase services
import { initializeApp } from "https://www.gstatic.com/firebasejs/11.6.1/firebase-app.js";
import { 
    getAuth, 
    onAuthStateChanged, 
    GoogleAuthProvider, 
    signInWithPopup, 
    createUserWithEmailAndPassword, 
    signInWithEmailAndPassword, 
    signOut 
} from "https://www.gstatic.com/firebasejs/11.6.1/firebase-auth.js";
import { 
    getFirestore, 
    doc, 
    setDoc, 
    addDoc, 
    collection, 
    query, 
    where, 
    getDocs,
    orderBy,
    onSnapshot
} from "https://www.gstatic.com/firebasejs/11.6.1/firebase-firestore.js";

// --- IMPORTANT: PASTE YOUR FIREBASE CONFIG HERE ---
const firebaseConfig = {
  apiKey: "%VITE_FIREBASE_API_KEY%",
  authDomain: "%VITE_FIREBASE_AUTH_DOMAIN%",
  projectId: "%VITE_FIREBASE_PROJECT_ID%",
  storageBucket: "%VITE_FIREBASE_STORAGE_BUCKET%",
  messagingSenderId: "%VITE_FIREBASE_MESSAGING_SENDER_ID%",
  appId: "%VITE_FIREBASE_APP_ID%",
  measurementId: "G-45HW7G81K1"
};
// ----------------------------------------------------

// Initialize Firebase
const app = initializeApp(firebaseConfig);
const auth = getAuth(app);
const db = getFirestore(app);

// DOM Elements
const authScreen = document.getElementById('auth-screen');
const appScreen = document.getElementById('app');
const googleSignInBtn = document.getElementById('google-signin-btn');
const emailLoginBtn = document.getElementById('email-login-btn');
const emailSignupBtn = document.getElementById('email-signup-btn');
const logoutBtn = document.getElementById('logout-btn');
const emailInput = document.getElementById('email');
const passwordInput = document.getElementById('password');
const authError = document.getElementById('auth-error');

const modelSelector = document.getElementById('model-selector');
const chatContainer = document.getElementById('chat-container');
const messageInput = document.getElementById('message-input');
const sendBtn = document.getElementById('send-btn');
const conversationHistory = document.getElementById('conversation-history');
const userProfile = document.getElementById('user-profile');
const sidebar = document.getElementById('sidebar');
const openSidebarBtn = document.getElementById('open-sidebar-btn');
const closeSidebarBtn = document.getElementById('close-sidebar-btn');

let currentConversationId = null;
let currentUserId = null;
let currentMessages = []; // New variable to hold current chat messages


// --- Particle Constellation Effect ---
const canvas = document.getElementById('particle-canvas');
const ctx = canvas.getContext('2d');
canvas.width = window.innerWidth;
canvas.height = window.innerHeight;
let particlesArray;
const mouse = { x: null, y: null, radius: (canvas.height / 120) * (canvas.width / 120) };
window.addEventListener('mousemove', (event) => { mouse.x = event.x; mouse.y = event.y; });
class Particle { constructor(x, y, directionX, directionY, size, color) { this.x = x; this.y = y; this.directionX = directionX; this.directionY = directionY; this.size = size; this.color = color; } draw() { ctx.beginPath(); ctx.arc(this.x, this.y, this.size, 0, Math.PI * 2, false); ctx.fillStyle = 'rgba(173, 216, 230, 0.5)'; ctx.fill(); } update() { if (this.x > canvas.width || this.x < 0) { this.directionX = -this.directionX; } if (this.y > canvas.height || this.y < 0) { this.directionY = -this.directionY; } this.x += this.directionX; this.y += this.directionY; this.draw(); } }
function initParticles() { particlesArray = []; let numberOfParticles = (canvas.height * canvas.width) / 9000; for (let i = 0; i < numberOfParticles; i++) { let size = (Math.random() * 2) + 1; let x = (Math.random() * ((innerWidth - size * 2) - (size * 2)) + size * 2); let y = (Math.random() * ((innerHeight - size * 2) - (size * 2)) + size * 2); let directionX = (Math.random() * 0.4) - 0.2; let directionY = (Math.random() * 0.4) - 0.2; let color = 'rgba(173, 216, 230, 0.5)'; particlesArray.push(new Particle(x, y, directionX, directionY, size, color)); } }
function connectParticles() { let opacityValue = 1; for (let a = 0; a < particlesArray.length; a++) { for (let b = a; b < particlesArray.length; b++) { let distance = ((particlesArray[a].x - particlesArray[b].x) * (particlesArray[a].x - particlesArray[b].x)) + ((particlesArray[a].y - particlesArray[b].y) * (particlesArray[a].y - particlesArray[b].y)); if (distance < (canvas.width / 7) * (canvas.height / 7)) { opacityValue = 1 - (distance / 20000); ctx.strokeStyle = `rgba(148, 163, 184, ${opacityValue})`; ctx.lineWidth = 1; ctx.beginPath(); ctx.moveTo(particlesArray[a].x, particlesArray[a].y); ctx.lineTo(particlesArray[b].x, particlesArray[b].y); ctx.stroke(); } } } }
function animateParticles() { requestAnimationFrame(animateParticles); ctx.clearRect(0, 0, innerWidth, innerHeight); for (let i = 0; i < particlesArray.length; i++) { particlesArray[i].update(); } connectParticles(); }
initParticles(); animateParticles();
window.addEventListener('resize', () => { canvas.width = innerWidth; canvas.height = innerHeight; mouse.radius = (canvas.height / 120) * (canvas.width / 120); initParticles(); });


// --- Error Handling Function ---
function getAuthErrorMessage(errorCode) { switch (errorCode) { case 'auth/invalid-email': return 'Please enter a valid email address.'; case 'auth/user-not-found': case 'auth/wrong-password': return 'Invalid email or password. Please try again.'; case 'auth/email-already-in-use': return 'An account with this email already exists.'; case 'auth/weak-password': return 'Password should be at least 6 characters long.'; case 'auth/missing-password': return 'Please enter your password.'; default: return 'An unexpected error occurred. Please try again.'; } }


// --- Authentication Logic ---
onAuthStateChanged(auth, user => { if (user) { currentUserId = user.uid; authScreen.style.display = 'none'; appScreen.style.display = 'flex'; setupUserProfile(user); loadConversationHistory(user.uid); } else { currentUserId = null; authScreen.style.display = 'flex'; appScreen.style.display = 'none'; chatContainer.innerHTML = `<div class="flex justify-center items-center h-full"><div class="text-center animate-fade-in-up"><i class="fas fa-robot text-6xl text-gray-500 mb-4 title-icon-breathing"></i><h1 class="text-4xl font-bold">AI Nexus</h1><p class="text-gray-400 mt-2">Your conversation begins here. Select a model to get started.</p></div></div>`; conversationHistory.innerHTML = ''; userProfile.innerHTML = ''; } });
googleSignInBtn.addEventListener('click', async () => { authError.textContent = ''; const provider = new GoogleAuthProvider(); try { const result = await signInWithPopup(auth, provider); const user = result.user; const userDocRef = doc(db, "users", user.uid); const docSnap = await getDocs(query(collection(db, "users"), where("uid", "==", user.uid))); if (docSnap.empty) { await setDoc(userDocRef, { uid: user.uid, email: user.email, displayName: user.displayName, photoURL: user.photoURL, createdAt: new Date() }); } } catch (error) { authError.textContent = getAuthErrorMessage(error.code); } });
emailSignupBtn.addEventListener('click', async () => { authError.textContent = ''; try { const userCredential = await createUserWithEmailAndPassword(auth, emailInput.value, passwordInput.value); const user = userCredential.user; await setDoc(doc(db, "users", user.uid), { uid: user.uid, email: user.email, displayName: user.email.split('@')[0], createdAt: new Date() }); } catch (error) { authError.textContent = getAuthErrorMessage(error.code); } });
emailLoginBtn.addEventListener('click', async () => { authError.textContent = ''; try { await signInWithEmailAndPassword(auth, emailInput.value, passwordInput.value); } catch (error) { authError.textContent = getAuthErrorMessage(error.code); } });
logoutBtn.addEventListener('click', async () => { await signOut(auth); });


// --- UI and App Logic ---

// Mobile Sidebar Logic
openSidebarBtn.addEventListener('click', () => sidebar.classList.add('sidebar-open'));
closeSidebarBtn.addEventListener('click', () => sidebar.classList.remove('sidebar-open'));

function setupUserProfile(user) {
    userProfile.innerHTML = `
        <img src="${user.photoURL || 'https://placehold.co/40x40/1f2937/ffffff?text=' + user.displayName.charAt(0)}" alt="User" class="w-10 h-10 rounded-full mr-3">
        <div>
            <p class="font-semibold">${user.displayName}</p>
            <p class="text-sm text-gray-400">${user.email}</p>
        </div>
    `;
}

messageInput.addEventListener('input', () => {
    messageInput.style.height = 'auto';
    messageInput.style.height = (messageInput.scrollHeight) + 'px';
});

sendBtn.addEventListener('click', sendMessage);
messageInput.addEventListener('keydown', (e) => {
    if (e.key === 'Enter' && !e.shiftKey) {
        e.preventDefault();
        sendMessage();
    }
});

async function sendMessage() {
    const messageText = messageInput.value.trim();
    if (messageText === '' || !currentUserId) return;

    const selectedModel = modelSelector.value;
    messageInput.value = '';
    messageInput.style.height = 'auto';

    if (!currentConversationId) {
        const conversationRef = await addDoc(collection(db, `users/${currentUserId}/conversations`), {
            title: `Chat - ${new Date().toLocaleString()}`,
            createdAt: new Date(),
            model: selectedModel
        });
        currentConversationId = conversationRef.id;
        chatContainer.innerHTML = '';
        currentMessages = []; // Reset messages for new chat
        loadConversationHistory(currentUserId);
    }

    const userMessage = { role: 'user', content: messageText };
    currentMessages.push(userMessage);
    addMessageToUI('user', messageText);
    await addDoc(collection(db, `users/${currentUserId}/conversations/${currentConversationId}/messages`), {
        ...userMessage,
        timestamp: new Date()
    });

    addMessageToUI('assistant', '...', true);

    try {
        // UPDATED: Call the new Vercel backend function
        const functionUrl = '/api/getAiResponse'; 
        const response = await fetch(functionUrl, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                model: selectedModel,
                conversationHistory: currentMessages // Send the current message history
            })
        });

        if (!response.ok) {
            const errorText = await response.text();
            throw new Error(`AI response error: ${errorText}`);
        }

        const data = await response.json();
        const aiResponse = data.response;
        
        const assistantMessage = { role: 'assistant', content: aiResponse };
        currentMessages.push(assistantMessage);

        document.querySelector('.typing-indicator').parentElement.parentElement.remove();
        addMessageToUI('assistant', aiResponse);

        // Save the AI response to Firestore
        await addDoc(collection(db, `users/${currentUserId}/conversations/${currentConversationId}/messages`), {
            ...assistantMessage,
            timestamp: new Date()
        });
        
    } catch (error) {
        console.error("Error calling AI function:", error);
        const errorElement = document.querySelector('.typing-indicator')?.parentElement?.parentElement;
        if (errorElement) {
             errorElement.innerHTML = `<p class="text-red-400">Error: Could not get a response. Check logs for details.</p>`;
        }
    }
}

function addMessageToUI(role, text, isTyping = false) {
    const messageElement = document.createElement('div');
    const icon = role === 'user' 
        ? `<i class="fas fa-user-circle text-2xl text-indigo-400"></i>` 
        : `<i class="fas fa-robot text-2xl text-teal-400"></i>`;
    
    let content;
    if (isTyping) {
        content = `<div class="typing-indicator">
                        <span class="dot"></span><span class="dot"></span><span class="dot"></span>
                   </div>`;
    } else {
        content = `<p class="text-gray-300 whitespace-pre-wrap">${text}</p>`;
    }

    messageElement.innerHTML = `
        <div class="flex items-start gap-4 mb-6">
            ${icon}
            <div class="bg-black/20 border border-white/10 p-4 rounded-lg w-full">
                <p class="font-semibold mb-2 ${role === 'user' ? 'text-indigo-300' : 'text-teal-300'}">${role === 'user' ? 'You' : 'AI Assistant'}</p>
                ${content}
            </div>
        </div>
    `;
    chatContainer.appendChild(messageElement);
    chatContainer.scrollTop = chatContainer.scrollHeight;
}

function loadConversationHistory(userId) {
    const q = query(collection(db, `users/${userId}/conversations`), orderBy("createdAt", "desc"));
    onSnapshot(q, (querySnapshot) => {
        conversationHistory.innerHTML = '<button id="new-chat-btn" class="w-full font-bold py-3 rounded-lg mb-4 transition duration-300">New Chat</button>';
        document.getElementById('new-chat-btn').addEventListener('click', () => {
            currentConversationId = null;
            currentMessages = [];
            chatContainer.innerHTML = `<div class="flex justify-center items-center h-full animate-fade-in-up"><div class="text-center"><i class="fas fa-robot text-6xl text-gray-500 mb-4 title-icon-breathing"></i><h1 class="text-4xl font-bold">AI Nexus</h1><p class="text-gray-400 mt-2">Your conversation begins here. Select a model to get started.</p></div></div>`;
        });

        querySnapshot.forEach((doc) => {
            const conversation = doc.data();
            const convElement = document.createElement('div');
            convElement.className = 'p-3 mb-2 rounded-lg cursor-pointer text-gray-300';
            convElement.textContent = conversation.title;
            convElement.dataset.id = doc.id;
            convElement.addEventListener('click', () => {
                loadConversation(userId, doc.id);
                sidebar.classList.remove('sidebar-open');
            });
            conversationHistory.appendChild(convElement);
        });
    });
}

async function loadConversation(userId, conversationId) {
    currentConversationId = conversationId;
    chatContainer.innerHTML = '';
    currentMessages = []; // Clear previous messages
    const messagesQuery = query(collection(db, `users/${userId}/conversations/${conversationId}/messages`), orderBy("timestamp", "asc"));
    const querySnapshot = await getDocs(messagesQuery);
    querySnapshot.forEach((doc) => {
        const message = doc.data();
        currentMessages.push({ role: message.role, content: message.content });
        addMessageToUI(message.role, message.content);
    });
}

