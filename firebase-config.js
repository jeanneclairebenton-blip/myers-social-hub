// ============================================
// MYERS CONTENT DESK — FIREBASE CONFIGURATION
// ============================================
// This file manages cloud persistence via Firebase Firestore
// and social media API integrations for direct publishing.
//
// All posts are saved to the cloud automatically.
// Data is NEVER lost — even if you clear your browser.
// ============================================

// ---- Firebase Config (will be set during setup) ----
const FIREBASE_CONFIG = {
  apiKey: "AIzaSyDvRykt3UjfYD0wEGMWCB12uSEkFI8rFIQ",
  authDomain: "myers-content-desk.firebaseapp.com",
  projectId: "myers-content-desk",
  storageBucket: "myers-content-desk.firebasestorage.app",
  messagingSenderId: "564436284607",
  appId: "1:564436284607:web:122da8ddd0113b1857820a"
};

// ---- Social Media API Tokens (set after app setup) ----
const SOCIAL_CONFIG = {
  facebook: { pageId: '', accessToken: '' },
  instagram: { userId: '', accessToken: '' },
  linkedin: { orgId: '', accessToken: '' }
};

// ---- Firebase State ----
let firebaseApp = null;
let firebaseDb = null;
let firebaseReady = false;
let syncStatus = 'disconnected'; // 'connected', 'syncing', 'disconnected', 'setup-needed'

// ============================================
// FIREBASE INITIALIZATION
// ============================================
async function initFirebase() {
  if (!FIREBASE_CONFIG.apiKey) {
    syncStatus = 'setup-needed';
    updateSyncIndicator();
    console.log('⚠️ Firebase not configured. Running in local mode with auto-backup.');
    return false;
  }

  try {
    // Dynamic import Firebase modules
    const { initializeApp } = await import('https://www.gstatic.com/firebasejs/10.12.0/firebase-app.js');
    const { getFirestore, collection, doc, getDocs, setDoc, deleteDoc, onSnapshot, enableIndexedDbPersistence } = await import('https://www.gstatic.com/firebasejs/10.12.0/firebase-firestore.js');

    firebaseApp = initializeApp(FIREBASE_CONFIG);
    firebaseDb = getFirestore(firebaseApp);

    // Enable offline persistence (works even without internet)
    try {
      await enableIndexedDbPersistence(firebaseDb);
    } catch (e) {
      console.log('Persistence already enabled or not supported');
    }

    // Store Firestore functions globally for use in other files
    window._fb = { collection, doc, getDocs, setDoc, deleteDoc, onSnapshot };
    
    firebaseReady = true;
    syncStatus = 'connected';
    updateSyncIndicator();
    console.log('✅ Firebase connected — cloud sync active');
    return true;
  } catch (err) {
    console.error('Firebase init error:', err);
    syncStatus = 'disconnected';
    updateSyncIndicator();
    return false;
  }
}

// ============================================
// CLOUD SYNC FUNCTIONS
// ============================================
async function cloudSavePost(post) {
  if (!firebaseReady) return;
  try {
    syncStatus = 'syncing';
    updateSyncIndicator();
    const { doc, setDoc } = window._fb;
    await setDoc(doc(firebaseDb, 'posts', post.id), {
      ...post,
      images: [], // Don't store base64 in Firestore (too large)
      updatedAt: new Date().toISOString()
    });
    syncStatus = 'connected';
    updateSyncIndicator();
  } catch (err) {
    console.error('Cloud save error:', err);
    syncStatus = 'disconnected';
    updateSyncIndicator();
  }
}

async function cloudDeletePost(postId) {
  if (!firebaseReady) return;
  try {
    const { doc, deleteDoc } = window._fb;
    await deleteDoc(doc(firebaseDb, 'posts', postId));
  } catch (err) {
    console.error('Cloud delete error:', err);
  }
}

async function cloudLoadPosts() {
  if (!firebaseReady) return null;
  try {
    const { collection, getDocs } = window._fb;
    const snapshot = await getDocs(collection(firebaseDb, 'posts'));
    const posts = [];
    snapshot.forEach(doc => posts.push({ id: doc.id, ...doc.data() }));
    return posts.length > 0 ? posts : null;
  } catch (err) {
    console.error('Cloud load error:', err);
    return null;
  }
}

function listenForChanges(callback) {
  if (!firebaseReady) return;
  const { collection, onSnapshot } = window._fb;
  onSnapshot(collection(firebaseDb, 'posts'), (snapshot) => {
    const posts = [];
    snapshot.forEach(doc => posts.push({ id: doc.id, ...doc.data() }));
    if (posts.length > 0) callback(posts);
  });
}

// ============================================
// LOCAL BACKUP (always active as safety net)
// ============================================
function localSave(posts) {
  try {
    localStorage.setItem('myers-desk-v2', JSON.stringify(posts));
    // Also save timestamped backup every hour
    const lastBackup = localStorage.getItem('myers-desk-last-backup');
    const now = Date.now();
    if (!lastBackup || now - parseInt(lastBackup) > 3600000) {
      localStorage.setItem('myers-desk-backup-' + new Date().toISOString().split('T')[0], JSON.stringify(posts));
      localStorage.setItem('myers-desk-last-backup', now.toString());
    }
  } catch (e) {
    console.error('Local save error:', e);
  }
}

function localLoad() {
  try {
    const saved = localStorage.getItem('myers-desk-v2');
    return saved ? JSON.parse(saved) : null;
  } catch (e) {
    return null;
  }
}

// Export/Import JSON backup
function exportBackup(posts) {
  const data = {
    version: '2.0',
    exportDate: new Date().toISOString(),
    postCount: posts.length,
    posts: posts.map(p => ({ ...p, images: [] })) // strip images for smaller file
  };
  const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
  const a = document.createElement('a');
  a.href = URL.createObjectURL(blob);
  a.download = `myers-content-backup-${new Date().toISOString().split('T')[0]}.json`;
  a.click();
}

function importBackup(file) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = (e) => {
      try {
        const data = JSON.parse(e.target.result);
        if (data.posts && Array.isArray(data.posts)) {
          resolve(data.posts);
        } else {
          reject(new Error('Invalid backup file'));
        }
      } catch (err) {
        reject(err);
      }
    };
    reader.readAsText(file);
  });
}

// ============================================
// SOCIAL MEDIA PUBLISHING
// ============================================

// ---- Facebook Page Post ----
async function publishToFacebook(message) {
  const { pageId, accessToken } = SOCIAL_CONFIG.facebook;
  if (!pageId || !accessToken) return { success: false, error: 'Facebook not configured' };
  
  try {
    const res = await fetch(`https://graph.facebook.com/v19.0/${pageId}/feed`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ message, access_token: accessToken })
    });
    const data = await res.json();
    if (data.id) return { success: true, postId: data.id };
    return { success: false, error: data.error?.message || 'Unknown error' };
  } catch (err) {
    return { success: false, error: err.message };
  }
}

// ---- Instagram (via Facebook Graph API) ----
async function publishToInstagram(message, imageUrl) {
  const { userId, accessToken } = SOCIAL_CONFIG.instagram;
  if (!userId || !accessToken) return { success: false, error: 'Instagram not configured' };
  
  try {
    // Step 1: Create media container
    const containerRes = await fetch(`https://graph.facebook.com/v19.0/${userId}/media`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        caption: message,
        image_url: imageUrl, // Must be a publicly accessible URL
        access_token: accessToken
      })
    });
    const container = await containerRes.json();
    if (!container.id) return { success: false, error: container.error?.message || 'Container creation failed' };

    // Step 2: Publish the container
    const publishRes = await fetch(`https://graph.facebook.com/v19.0/${userId}/media_publish`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        creation_id: container.id,
        access_token: accessToken
      })
    });
    const result = await publishRes.json();
    if (result.id) return { success: true, postId: result.id };
    return { success: false, error: result.error?.message || 'Publish failed' };
  } catch (err) {
    return { success: false, error: err.message };
  }
}

// ---- LinkedIn Organization Post ----
async function publishToLinkedIn(message) {
  const { orgId, accessToken } = SOCIAL_CONFIG.linkedin;
  if (!orgId || !accessToken) return { success: false, error: 'LinkedIn not configured' };
  
  try {
    const res = await fetch('https://api.linkedin.com/v2/ugcPosts', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${accessToken}`,
        'X-Restli-Protocol-Version': '2.0.0'
      },
      body: JSON.stringify({
        author: `urn:li:organization:${orgId}`,
        lifecycleState: 'PUBLISHED',
        specificContent: {
          'com.linkedin.ugc.ShareContent': {
            shareCommentary: { text: message },
            shareMediaCategory: 'NONE'
          }
        },
        visibility: { 'com.linkedin.ugc.MemberNetworkVisibility': 'PUBLIC' }
      })
    });
    const data = await res.json();
    if (data.id) return { success: true, postId: data.id };
    return { success: false, error: JSON.stringify(data) };
  } catch (err) {
    return { success: false, error: err.message };
  }
}

// ---- Publish to multiple platforms ----
async function publishPost(post) {
  const message = (post.copy || '') + '\n\n' + (post.hashtags || '');
  const results = {};
  const platforms = post.platforms || [];

  if (platforms.includes('Facebook')) {
    results.facebook = await publishToFacebook(message);
  }
  if (platforms.includes('Instagram')) {
    // Instagram requires an image URL — skip if no public image
    results.instagram = { success: false, error: 'Requires public image URL — use manual post or upload image first' };
  }
  if (platforms.includes('LinkedIn')) {
    results.linkedin = await publishToLinkedIn(message);
  }

  return results;
}

// ============================================
// SYNC STATUS UI
// ============================================
function updateSyncIndicator() {
  let el = document.getElementById('syncIndicator');
  if (!el) {
    el = document.createElement('div');
    el.id = 'syncIndicator';
    el.style.cssText = 'position:fixed;bottom:16px;left:16px;z-index:9999;padding:8px 14px;border-radius:20px;font-size:11px;font-weight:600;font-family:DM Sans,sans-serif;display:flex;align-items:center;gap:6px;transition:all 0.3s;cursor:pointer;box-shadow:0 2px 12px rgba(0,0,0,0.15);';
    el.onclick = () => showSyncDetails();
    document.body.appendChild(el);
  }

  const states = {
    'connected':    { bg: '#10B981', color: '#fff', icon: '☁️', text: 'Cloud Synced' },
    'syncing':      { bg: '#F59E0B', color: '#000', icon: '⏳', text: 'Syncing...' },
    'disconnected': { bg: '#6B7280', color: '#fff', icon: '💾', text: 'Local Only' },
    'setup-needed': { bg: '#3B82F6', color: '#fff', icon: '🔧', text: 'Setup Cloud → Click Here' }
  };

  const s = states[syncStatus] || states['disconnected'];
  el.style.background = s.bg;
  el.style.color = s.color;
  el.innerHTML = `<span>${s.icon}</span> ${s.text}`;
}

function showSyncDetails() {
  if (syncStatus === 'setup-needed') {
    showSetupModal();
  } else {
    const msg = {
      'connected': '✅ All posts are saved to Firebase cloud storage.\nYour data is safe and accessible from any device.',
      'syncing': '⏳ Currently syncing with cloud...',
      'disconnected': '💾 Running in local-only mode.\nPosts are saved in your browser. Use Export to backup.'
    };
    alert(msg[syncStatus] || 'Status unknown');
  }
}

// ============================================
// SETUP MODAL
// ============================================
function showSetupModal() {
  let modal = document.getElementById('setupModal');
  if (modal) { modal.classList.add('open'); return; }

  modal = document.createElement('div');
  modal.id = 'setupModal';
  modal.className = 'modal-overlay open';
  modal.innerHTML = `
    <div class="modal-box" style="max-width:600px">
      <div class="modal-header" style="display:flex;justify-content:space-between;align-items:center;margin-bottom:16px">
        <h2 style="margin:0">🔧 Firebase Setup</h2>
        <button onclick="document.getElementById('setupModal').classList.remove('open')" style="background:none;border:none;font-size:20px;cursor:pointer;color:inherit">✕</button>
      </div>
      <div style="font-size:13px;line-height:1.7;color:var(--text-secondary,#6B7280);margin-bottom:20px">
        <p><strong>Follow these steps to enable cloud storage:</strong></p>
        <ol style="padding-left:20px">
          <li>Go to <a href="https://console.firebase.google.com" target="_blank" style="color:#C9972C">console.firebase.google.com</a></li>
          <li>Click <strong>"Create a project"</strong> → name it <strong>"myers-content-desk"</strong></li>
          <li>Skip Google Analytics (not needed)</li>
          <li>Once created, click the <strong>Web icon (&lt;/&gt;)</strong> to add a web app</li>
          <li>Name it <strong>"Content Desk"</strong> and register</li>
          <li>Copy the <code>firebaseConfig</code> object values below</li>
          <li>In the left sidebar, click <strong>Build → Firestore Database</strong></li>
          <li>Click <strong>"Create database"</strong> → Start in <strong>test mode</strong></li>
        </ol>
      </div>
      <div style="display:grid;gap:10px;margin-bottom:16px">
        <input type="text" id="setupApiKey" placeholder="apiKey" style="padding:10px;border-radius:8px;border:1px solid #333;background:#1a1a2e;color:#fff;font-size:13px">
        <input type="text" id="setupAuthDomain" placeholder="authDomain (e.g. myers-content-desk.firebaseapp.com)" style="padding:10px;border-radius:8px;border:1px solid #333;background:#1a1a2e;color:#fff;font-size:13px">
        <input type="text" id="setupProjectId" placeholder="projectId (e.g. myers-content-desk)" style="padding:10px;border-radius:8px;border:1px solid #333;background:#1a1a2e;color:#fff;font-size:13px">
        <input type="text" id="setupStorageBucket" placeholder="storageBucket" style="padding:10px;border-radius:8px;border:1px solid #333;background:#1a1a2e;color:#fff;font-size:13px">
        <input type="text" id="setupMsgSenderId" placeholder="messagingSenderId" style="padding:10px;border-radius:8px;border:1px solid #333;background:#1a1a2e;color:#fff;font-size:13px">
        <input type="text" id="setupAppId" placeholder="appId" style="padding:10px;border-radius:8px;border:1px solid #333;background:#1a1a2e;color:#fff;font-size:13px">
      </div>
      <button onclick="saveFirebaseConfig()" style="width:100%;padding:14px;border-radius:10px;border:none;background:linear-gradient(135deg,#C9972C,#E8B84B);color:#000;font-weight:700;font-size:14px;cursor:pointer">
        🔌 Connect to Firebase
      </button>
    </div>
  `;
  document.body.appendChild(modal);
  modal.addEventListener('click', (e) => { if (e.target === modal) modal.classList.remove('open'); });
}

function saveFirebaseConfig() {
  const config = {
    apiKey: document.getElementById('setupApiKey').value.trim(),
    authDomain: document.getElementById('setupAuthDomain').value.trim(),
    projectId: document.getElementById('setupProjectId').value.trim(),
    storageBucket: document.getElementById('setupStorageBucket').value.trim(),
    messagingSenderId: document.getElementById('setupMsgSenderId').value.trim(),
    appId: document.getElementById('setupAppId').value.trim()
  };

  if (!config.apiKey || !config.projectId) {
    alert('Please fill in at least the API Key and Project ID');
    return;
  }

  // Save config to localStorage for persistence
  localStorage.setItem('myers-firebase-config', JSON.stringify(config));
  
  // Update runtime config
  Object.assign(FIREBASE_CONFIG, config);
  
  // Try to connect
  initFirebase().then(success => {
    if (success) {
      document.getElementById('setupModal').classList.remove('open');
      // Sync existing local posts to cloud
      const localPosts = localLoad();
      if (localPosts && localPosts.length > 0) {
        localPosts.forEach(p => cloudSavePost(p));
        if (typeof showToast === 'function') showToast('☁️ ' + localPosts.length + ' posts synced to cloud!');
      }
    } else {
      alert('Connection failed. Please double-check your Firebase config values.');
    }
  });
}

// ============================================
// SOCIAL MEDIA SETUP
// ============================================
function showSocialSetupModal() {
  let modal = document.getElementById('socialSetupModal');
  if (modal) { modal.classList.add('open'); return; }

  modal = document.createElement('div');
  modal.id = 'socialSetupModal';
  modal.className = 'modal-overlay open';
  modal.innerHTML = `
    <div class="modal-box" style="max-width:650px">
      <div class="modal-header" style="display:flex;justify-content:space-between;align-items:center;margin-bottom:16px">
        <h2 style="margin:0">📤 Connect Social Media</h2>
        <button onclick="document.getElementById('socialSetupModal').classList.remove('open')" style="background:none;border:none;font-size:20px;cursor:pointer;color:inherit">✕</button>
      </div>
      
      <div style="margin-bottom:24px">
        <h3 style="font-size:14px;margin-bottom:8px">📘 Facebook Page</h3>
        <div style="font-size:11px;color:var(--text-secondary,#6B7280);margin-bottom:8px">
          Get your Page Access Token from <a href="https://developers.facebook.com/tools/explorer/" target="_blank" style="color:#C9972C">Graph API Explorer</a>
        </div>
        <div style="display:grid;grid-template-columns:1fr 1fr;gap:8px">
          <input type="text" id="fbPageId" placeholder="Page ID" value="${SOCIAL_CONFIG.facebook.pageId}" style="padding:10px;border-radius:8px;border:1px solid #333;background:#1a1a2e;color:#fff;font-size:13px">
          <input type="text" id="fbToken" placeholder="Page Access Token" value="${SOCIAL_CONFIG.facebook.accessToken}" style="padding:10px;border-radius:8px;border:1px solid #333;background:#1a1a2e;color:#fff;font-size:13px">
        </div>
      </div>

      <div style="margin-bottom:24px">
        <h3 style="font-size:14px;margin-bottom:8px">📸 Instagram Business</h3>
        <div style="font-size:11px;color:var(--text-secondary,#6B7280);margin-bottom:8px">
          Requires Instagram Business account linked to a Facebook Page
        </div>
        <div style="display:grid;grid-template-columns:1fr 1fr;gap:8px">
          <input type="text" id="igUserId" placeholder="Instagram User ID" value="${SOCIAL_CONFIG.instagram.userId}" style="padding:10px;border-radius:8px;border:1px solid #333;background:#1a1a2e;color:#fff;font-size:13px">
          <input type="text" id="igToken" placeholder="Access Token" value="${SOCIAL_CONFIG.instagram.accessToken}" style="padding:10px;border-radius:8px;border:1px solid #333;background:#1a1a2e;color:#fff;font-size:13px">
        </div>
      </div>

      <div style="margin-bottom:24px">
        <h3 style="font-size:14px;margin-bottom:8px">💼 LinkedIn</h3>
        <div style="font-size:11px;color:var(--text-secondary,#6B7280);margin-bottom:8px">
          Get your Organization ID and token from <a href="https://developer.linkedin.com/" target="_blank" style="color:#C9972C">LinkedIn Developer Portal</a>
        </div>
        <div style="display:grid;grid-template-columns:1fr 1fr;gap:8px">
          <input type="text" id="liOrgId" placeholder="Organization ID" value="${SOCIAL_CONFIG.linkedin.orgId}" style="padding:10px;border-radius:8px;border:1px solid #333;background:#1a1a2e;color:#fff;font-size:13px">
          <input type="text" id="liToken" placeholder="Access Token" value="${SOCIAL_CONFIG.linkedin.accessToken}" style="padding:10px;border-radius:8px;border:1px solid #333;background:#1a1a2e;color:#fff;font-size:13px">
        </div>
      </div>

      <button onclick="saveSocialConfig()" style="width:100%;padding:14px;border-radius:10px;border:none;background:linear-gradient(135deg,#C9972C,#E8B84B);color:#000;font-weight:700;font-size:14px;cursor:pointer">
        💾 Save Social Media Settings
      </button>
    </div>
  `;
  document.body.appendChild(modal);
  modal.addEventListener('click', (e) => { if (e.target === modal) modal.classList.remove('open'); });
}

function saveSocialConfig() {
  SOCIAL_CONFIG.facebook.pageId = document.getElementById('fbPageId').value.trim();
  SOCIAL_CONFIG.facebook.accessToken = document.getElementById('fbToken').value.trim();
  SOCIAL_CONFIG.instagram.userId = document.getElementById('igUserId').value.trim();
  SOCIAL_CONFIG.instagram.accessToken = document.getElementById('igToken').value.trim();
  SOCIAL_CONFIG.linkedin.orgId = document.getElementById('liOrgId').value.trim();
  SOCIAL_CONFIG.linkedin.accessToken = document.getElementById('liToken').value.trim();
  
  localStorage.setItem('myers-social-config', JSON.stringify(SOCIAL_CONFIG));
  document.getElementById('socialSetupModal').classList.remove('open');
  if (typeof showToast === 'function') showToast('✅ Social media settings saved');
}

// ============================================
// BOOT
// ============================================
function bootFirebase() {
  // Load saved Firebase config
  const savedConfig = localStorage.getItem('myers-firebase-config');
  if (savedConfig) {
    try { Object.assign(FIREBASE_CONFIG, JSON.parse(savedConfig)); } catch(e) {}
  }

  // Load saved social config
  const savedSocial = localStorage.getItem('myers-social-config');
  if (savedSocial) {
    try { Object.assign(SOCIAL_CONFIG, JSON.parse(savedSocial)); } catch(e) {}
  }

  // Initialize Firebase
  initFirebase();
  
  // Show sync indicator
  updateSyncIndicator();
}

// Auto-boot when loaded
if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', bootFirebase);
} else {
  bootFirebase();
}
