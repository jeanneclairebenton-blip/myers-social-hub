// ==================== STATE ====================
let posts = [];
let uploadedFiles = [];
let editingId = null;
let currentFilter = { status: 'all', pillar: 'all' };
let weekOffset = 0;
let monthOffset = 0;
let currentView = 'week';

const PILLAR_COLORS = {
  Welcome:'#8B5CF6', Mentor:'#0EA5E9', 'Agent Win':'#10B981',
  Education:'#C9972C', Culture:'#EC4899', Spotlight:'#F59E0B',
  Evolution:'#6366F1', Awards:'#DC2626'
};

// Optimal posting times by day (research-backed: Sprout Social + HubSpot 2025 data)
const OPTIMAL_TIMES = {
  0: ['10:00 AM','5:00 PM'],  // Sunday
  1: ['7:00 AM','11:00 AM','5:00 PM'],  // Monday — LinkedIn peak
  2: ['9:00 AM','12:00 PM','6:00 PM'],  // Tuesday — FB peak
  3: ['9:00 AM','11:00 AM','3:00 PM'],  // Wednesday — mid-week
  4: ['10:00 AM','1:00 PM','5:00 PM'],  // Thursday — LinkedIn 2nd peak
  5: ['9:00 AM','12:00 PM'],  // Friday — casual
  6: ['10:00 AM','4:00 PM'],  // Saturday
};
function getOptimalTime(dateISO) {
  const dayPosts = posts.filter(p => p.date === dateISO);
  const usedTimes = dayPosts.map(p => p.time);
  const dow = new Date(dateISO+'T12:00:00').getDay();
  const slots = OPTIMAL_TIMES[dow] || ['9:00 AM'];
  const available = slots.find(t => !usedTimes.includes(t));
  return available || slots[0];
}

// Track which library posts have been posted to social
let postedLibraryIds = JSON.parse(localStorage.getItem('myers_posted_library') || '[]');
function markLibraryPosted(libId) {
  if (!postedLibraryIds.includes(libId)) {
    postedLibraryIds.push(libId);
    localStorage.setItem('myers_posted_library', JSON.stringify(postedLibraryIds));
  }
}

// ==================== TRENDING DATA ====================
const TRENDING = {
  hashtags: [
    {tag:'#RealEstateInvesting',vol:'2.4M',change:'+34%',dir:'up'},
    {tag:'#HouseFlipping',vol:'890K',change:'+28%',dir:'up'},
    {tag:'#WealthBuilding2026',vol:'340K',change:'+52%',dir:'up'},
    {tag:'#PassiveIncome',vol:'5.1M',change:'+12%',dir:'up'},
    {tag:'#DFWRealEstate',vol:'156K',change:'+18%',dir:'up'},
    {tag:'#InvestorAgent',vol:'45K',change:'+95%',dir:'up'},
    {tag:'#FixAndFlip',vol:'420K',change:'+8%',dir:'up'},
    {tag:'#RealEstateAgent',vol:'3.2M',change:'-2%',dir:'down'},
  ],
  times: [
    {slot:'7:00 – 8:00 AM',platform:'LinkedIn',note:'Decision-makers scrolling'},
    {slot:'9:00 – 11:00 AM',platform:'Facebook',note:'Peak engagement'},
    {slot:'11:00 AM – 1:00 PM',platform:'Instagram',note:'Lunch-break browsing'},
    {slot:'5:00 – 6:00 PM',platform:'LinkedIn',note:'Post-work recruiting'},
    {slot:'7:00 – 9:00 PM',platform:'IG Reels / TikTok',note:'Prime video time'},
  ],
  ideas: [
    {icon:'🏗️',title:'3D Printed Homes Feature',desc:'Topic is +180% — perfect for Spotlight pillar'},
    {icon:'📊',title:'"The Math Always Wins" Series',desc:'Deal breakdowns with real numbers dominate'},
    {icon:'🤝',title:'Commission Split Comparison',desc:'"90% commission" posts get massive engagement'},
    {icon:'📖',title:'Micro-Lessons from Josh',desc:'Turn book excerpts into carousel quote cards'},
    {icon:'🏠',title:'Before/After Reel',desc:'Quick-cut reveal is #1 format in RE right now'},
  ]
};

// ==================== CAPTION TEMPLATES ====================
const CAPTIONS = {
  Welcome: (n) => `👋 Welcome to the Myers family!\n\n[Agent name, 1-2 sentences on background — why they chose Myers].\n\nWe're building something special here. Let's get to work. 🏠💰\n\nDM us "JOIN" to learn how you can build wealth through real estate.`,
  Mentor: () => `📖 From "The Investor-Agent Playbook" by Josh DeShong:\n\n"[Paste 3 punchy sentences from the book]"\n\n💬 Which line hit hardest? Drop it below 👇\n\nFull chapter available for Myers agents only.`,
  'Agent Win': () => `🏠 AGENT WIN 🔥\n\n[Agent Name] just closed another deal:\n\n📍 [Neighborhood/City]\n💰 Purchase: $[X]\n🔨 Rehab: $[X]\n🏷️ Sold/ARV: $[X]\n📈 PROFIT: $[X]\n📅 Days to close: [X]\n\nBefore → After ↓\n\nThis is what investing through Myers looks like.`,
  Education: () => `🎤 Last week's guest speaker dropped GOLD.\n\n3 takeaways every investor-agent needs:\n\n1️⃣ [Point one]\n2️⃣ [Point two]\n3️⃣ [Point three]\n\nWant access to training like this every week? DM us about joining Myers.`,
  Culture: () => `🎉 Another incredible Myers event in the books!\n\n[What happened, the vibe, why it matters]\n\nAt Myers, we don't just build wealth — we build relationships. 🤝\n\nNext event: [Date] | Don't miss it!`,
  Spotlight: () => `💡 INNOVATION SPOTLIGHT\n\nMeet [Agent Name] — one of the few people in DFW doing [what they do].\n\n[2-3 sentences on what they're building and why it matters]\n\nWe attract operators, not order-takers. 🚀`,
  Evolution: () => `🥕 Big news at Myers.\n\nWe've partnered with [Partner] to [what it unlocks].\n\n[2-3 sentences on the impact for agents and sellers]\n\nStay tuned — walkthrough coming next week.`,
  Awards: () => `🏆 [MONTH] AGENT OF THE MONTH\n\nCongratulations to [Agent Name]!\n\n📊 [Key stat or achievement]\n\n[1-2 sentences on what makes them exceptional]\n\nThis is the caliber of agents at Myers. Want to compete at this level?`
};

const HASHTAG_SETS = {
  Welcome: '#WelcomeToMyers #TeamMyers #NewAgent #InvestorAgent #DFWRealEstate #MyersHomebuyers #RealEstateCareers #WealthBuilding',
  Mentor: '#JoshDeShong #RealEstateWisdom #InvestorMindset #WealthBuilding #BookExcerpt #MyersHomebuyers #RealEstateBooks',
  'Agent Win': '#HouseFlip #BeforeAndAfter #RealEstateInvesting #FlipProfit #FixAndFlip #MyersHomebuyers #DFWInvestor',
  Education: '#RealEstateTraining #InvestorAgent #DFWRealEstate #RealEstateEducation #AgentTraining #MyersHomebuyers',
  Culture: '#MyersFamily #RealEstateCulture #DFWAgents #TeamMyers #BrokerageCulture #RealEstateLife',
  Spotlight: '#Innovation #FutureOfRealEstate #PropTech #MyersHomebuyers #RealEstateInnovation',
  Evolution: '#CompanyGrowth #MyersHomebuyers #RealEstateTech #BigNews #Partnership',
  Awards: '#AgentOfTheMonth #TopProducer #MyersHomebuyers #DFWRealEstate #RealEstateAwards'
};

// ==================== HELPERS ====================
const uid = () => Math.random().toString(36).slice(2,10);
const todayISO = () => new Date().toISOString().split('T')[0];
const addDays = (iso, n) => { const d = new Date(iso+'T12:00:00'); d.setDate(d.getDate()+n); return d.toISOString().split('T')[0]; };
const getMonday = (iso) => { const d = new Date(iso+'T12:00:00'); const day = d.getDay(); d.setDate(d.getDate() - day + (day===0?-6:1)); return d.toISOString().split('T')[0]; };
const fmtDate = (iso) => new Date(iso+'T12:00:00').toLocaleDateString('en-US',{weekday:'short',month:'short',day:'numeric'});

function save() {
  localSave(posts);
  // If a single post was just saved, sync it to cloud
  if (window._lastSavedPost) {
    cloudSavePost(window._lastSavedPost);
    window._lastSavedPost = null;
  }
}
async function load() {
  // Try cloud first, fall back to local
  const cloudPosts = await cloudLoadPosts();
  if (cloudPosts && cloudPosts.length > 0) {
    posts = cloudPosts;
    localSave(posts);
    return;
  }
  const saved = localLoad();
  if (saved) { posts = saved; return; }
  // Seed data
  const mon = getMonday(todayISO());
  const next = addDays(mon, 7);
  posts = [
    {id:uid(),date:next,time:'11:30 AM',pillar:'Welcome',platforms:['Facebook','Instagram','LinkedIn'],status:'Draft',copy:CAPTIONS.Welcome(),hashtags:HASHTAG_SETS.Welcome,visualNotes:'Headshot + gold welcome banner',notes:'',images:[],createdAt:new Date().toISOString()},
    {id:uid(),date:addDays(next,1),time:'7:00 AM',pillar:'Mentor',platforms:['LinkedIn'],status:'Draft',copy:CAPTIONS.Mentor(),hashtags:HASHTAG_SETS.Mentor,visualNotes:'Quote graphic — gold accent, serif type',notes:'',images:[],createdAt:new Date().toISOString()},
    {id:uid(),date:addDays(next,1),time:'9:30 AM',pillar:'Mentor',platforms:['Facebook','Instagram'],status:'Draft',copy:CAPTIONS.Mentor(),hashtags:HASHTAG_SETS.Mentor,visualNotes:'Book cover image + quote overlay',notes:'',images:[],createdAt:new Date().toISOString()},
    {id:uid(),date:addDays(next,2),time:'10:00 AM',pillar:'Education',platforms:['Facebook','Instagram','LinkedIn'],status:'Draft',copy:CAPTIONS.Education(),hashtags:HASHTAG_SETS.Education,visualNotes:'Photo from class OR 15-30 sec clip',notes:'',images:[],createdAt:new Date().toISOString()},
    {id:uid(),date:addDays(next,2),time:'7:00 PM',pillar:'Education',platforms:['Instagram','TikTok'],status:'Draft',copy:'🎤 60-second clip from this week\'s guest speaker — the mic drop moment.\n\n[Video clip]',hashtags:HASHTAG_SETS.Education,visualNotes:'Vertical video clip, add captions',notes:'',images:[],createdAt:new Date().toISOString()},
    {id:uid(),date:addDays(next,3),time:'9:00 AM',pillar:'Agent Win',platforms:['Facebook','Instagram'],status:'Draft',copy:CAPTIONS['Agent Win'](),hashtags:HASHTAG_SETS['Agent Win'],visualNotes:'Before/after carousel (3-5 photos). Numbers overlay.',notes:'',images:[],createdAt:new Date().toISOString()},
    {id:uid(),date:addDays(next,3),time:'8:00 PM',pillar:'Agent Win',platforms:['Instagram','TikTok','YouTube'],status:'Draft',copy:'🏠 Before → After in 15 seconds.\n\n$52K profit. Our agents don\'t just sell houses — they BUILD WEALTH.\n\n[Quick-cut reveal reel]',hashtags:HASHTAG_SETS['Agent Win'],visualNotes:'15s quick-cut before/after reel, trending audio',notes:'',images:[],createdAt:new Date().toISOString()},
    {id:uid(),date:addDays(next,4),time:'9:00 AM',pillar:'Culture',platforms:['Facebook','Instagram'],status:'Draft',copy:CAPTIONS.Culture(),hashtags:HASHTAG_SETS.Culture,visualNotes:'Event photos, candid shots',notes:'',images:[],createdAt:new Date().toISOString()},
    {id:uid(),date:addDays(next,4),time:'7:00 PM',pillar:'Culture',platforms:['Instagram','TikTok'],status:'Draft',copy:'🎉 Event hype reel — "See you tonight!" vibes\n\n[Quick energy montage from past events]',hashtags:HASHTAG_SETS.Culture,visualNotes:'Montage reel, upbeat audio',notes:'',images:[],createdAt:new Date().toISOString()},
  ];
  save();
}

// ==================== RENDER ====================
function render() {
  updateCounts();
  if (currentView === 'week') renderWeek();
  else if (currentView === 'month') renderMonth();
  else renderList();
}

function updateCounts() {
  const all = posts.length;
  document.getElementById('countAll').textContent = all;
  ['Draft','Pending','Approved','Scheduled','Posted'].forEach(s => {
    document.getElementById('count'+s).textContent = posts.filter(p=>p.status===s).length;
  });
}

function getFiltered() {
  return posts.filter(p => {
    if (currentFilter.status !== 'all' && p.status !== currentFilter.status) return false;
    if (currentFilter.pillar !== 'all' && p.pillar !== currentFilter.pillar) return false;
    return true;
  });
}

function renderWeek() {
  const monday = addDays(getMonday(todayISO()), weekOffset * 7);
  const days = Array.from({length:7},(_,i) => addDays(monday,i));
  const dayNames = ['Mon','Tue','Wed','Thu','Fri','Sat','Sun'];
  const today = todayISO();

  // Week label
  const s = new Date(monday+'T12:00:00');
  const e = new Date(addDays(monday,6)+'T12:00:00');
  document.getElementById('weekLabel').textContent = s.toLocaleDateString('en-US',{month:'short',day:'numeric'}) + ' – ' + e.toLocaleDateString('en-US',{month:'short',day:'numeric',year:'numeric'});

  const filtered = getFiltered();
  const grid = document.getElementById('weekGrid');
  grid.innerHTML = days.map((d,i) => {
    const isToday = d === today;
    const date = new Date(d+'T12:00:00');
    const dayPosts = filtered.filter(p=>p.date===d).sort((a,b)=>(a.time||'').localeCompare(b.time||''));
    return `<div class="day-col${isToday?' today':''}" data-date="${d}" ondragover="event.preventDefault();this.classList.add('drag-over')" ondragleave="this.classList.remove('drag-over')" ondrop="handleDrop(event,'${d}');this.classList.remove('drag-over')">
      <div class="day-head">
        <div class="day-name">${dayNames[i]}</div>
        <div class="day-num${isToday?' today-num':''}">${date.getDate()}</div>
        ${isToday?'<div class="today-badge">Today</div>':''}
      </div>
      ${dayPosts.map(p => renderChip(p)).join('')}
      <div style="text-align:center;margin-top:4px">
        <button class="btn-sm" style="font-size:10px;padding:2px 8px" onclick="openNewPostOnDate('${d}')">+</button>
      </div>
    </div>`;
  }).join('');
}

function renderChip(p) {
  const color = PILLAR_COLORS[p.pillar]||'#6B7280';
  const hasImg = p.images && p.images.length > 0;
  const plats = (p.platforms||[]).map(pl => {
    const icons = {Facebook:'📘',Instagram:'📸',LinkedIn:'💼',TikTok:'🎵',YouTube:'📺'};
    return `<span class="chip-plat">${icons[pl]||''}</span>`;
  }).join('');
  return `<div class="post-chip" style="border-left-color:${color}" draggable="true" ondragstart="dragPost(event,'${p.id}')" onclick="openEditPost('${p.id}')">
    <div class="chip-top">
      <span class="chip-pillar" style="color:${color}">${p.pillar}</span>
      ${p.time?`<span style="font-size:8px;color:#6B7280;margin-left:auto">${p.time}</span>`:''}
      ${hasImg?`<span class="chip-img-badge">📷${p.images.length}</span>`:''}
    </div>
    <div class="chip-copy">${(p.copy||'').substring(0,80)}</div>
    <div class="chip-bottom">
      <div class="chip-platforms">${plats}</div>
      <span class="chip-status status-${p.status}">${p.status}</span>
    </div>
  </div>`;
}

// ==================== DRAG & DROP ====================
function dragPost(e, id) {
  e.dataTransfer.setData('text/plain', id);
  e.target.style.opacity = '0.4';
  setTimeout(() => { e.target.style.opacity = '1'; }, 300);
}
function handleDrop(e, newDate) {
  e.preventDefault();
  const id = e.dataTransfer.getData('text/plain');
  const post = posts.find(p => p.id === id);
  if (!post) return;
  post.date = newDate;
  post.time = getOptimalTime(newDate);
  post.updatedAt = new Date().toISOString();
  window._lastSavedPost = post;
  save(); render();
  showToast(`📅 Moved to ${fmtDate(newDate)} at ${post.time} (optimal)`);
}

function renderList() {
  const filtered = getFiltered().sort((a,b) => a.date.localeCompare(b.date) || (a.time||'').localeCompare(b.time||''));
  const el = document.getElementById('listContent');
  if (!filtered.length) { el.innerHTML = '<div style="text-align:center;padding:60px;color:#6B7280;font-family:Fraunces,serif;font-size:18px">No posts match these filters.</div>'; return; }
  el.innerHTML = filtered.map(p => {
    const color = PILLAR_COLORS[p.pillar]||'#6B7280';
    const plats = (p.platforms||[]).map(pl => {
      const icons = {Facebook:'📘',Instagram:'📸',LinkedIn:'💼',TikTok:'🎵',YouTube:'📺'};
      return `<span class="post-plat-icon">${icons[pl]||''}</span>`;
    }).join('');
    const imgs = (p.images||[]).map((img,i) => `<img src="${img}" class="post-thumb" alt="Photo ${i+1}">`).join('');
    const hashtags = (p.hashtags||'').split(/\s+/).filter(h=>h.startsWith('#')).map(h=>`<span class="post-hashtag">${h}</span>`).join('');
    const approveBtn = p.status==='Pending'?`<button class="action-btn approve" onclick="event.stopPropagation();setStatus('${p.id}','Approved')">✓ Approve</button>`:'';
    const reviewBtn = p.status==='Draft'?`<button class="action-btn review" onclick="event.stopPropagation();setStatus('${p.id}','Pending')">📤 Send to Review</button>`:'';
    return `<div class="post-row" style="border-left:4px solid ${color}" onclick="openEditPost('${p.id}')">
      <div class="post-meta">
        <div class="post-pillar-tag" style="color:${color}"><span style="width:8px;height:8px;border-radius:50%;background:${color};display:inline-block"></span>${p.pillar}</div>
        <div class="post-date">${fmtDate(p.date)}</div>
        ${p.time?`<div class="post-time-tag">⏰ ${p.time}</div>`:''}
        <div class="post-platforms-row">${plats}</div>
      </div>
      <div class="post-body">
        <div class="post-caption">${(p.copy||'').substring(0,300)}${(p.copy||'').length>300?'…':''}</div>
        ${hashtags?`<div class="post-hashtags-row">${hashtags}</div>`:''}
        ${imgs?`<div class="post-images">${imgs}</div>`:''}
        ${p.visualNotes?`<div style="font-size:11px;color:#6B7280;border-left:2px solid var(--gold);padding-left:8px;margin-top:4px"><strong style="color:var(--gold);font-size:9px;letter-spacing:0.1em;text-transform:uppercase">Visual</strong><br>${p.visualNotes}</div>`:''}
      </div>
      <div class="post-actions" onclick="event.stopPropagation()">
        <span class="chip-status status-${p.status}" style="font-size:10px;padding:3px 8px">${p.status}</span>
        <select class="post-status-select" onchange="setStatus('${p.id}',this.value)">
          ${['Draft','Pending','Approved','Scheduled','Posted'].map(s=>`<option value="${s}"${p.status===s?' selected':''}>${s}</option>`).join('')}
        </select>
        ${approveBtn}${reviewBtn}
        ${(p.status==='Approved'||p.status==='Scheduled')?`<button class="action-btn" style="background:#10B981;color:#fff" onclick="publishPostNow('${p.id}')">📤 Publish</button>`:''}
        <button class="action-btn" onclick="deletePost('${p.id}')">🗑 Delete</button>
      </div>
    </div>`;
  }).join('');
}



// ==================== FILTERS ====================
function filterByStatus(s) {
  currentFilter.status = s;
  document.querySelectorAll('.stat-pill').forEach(p => p.classList.toggle('active', p.dataset.status===s));
  render();
}
function filterByPillar(p) { currentFilter.pillar = p; render(); }
function setView(v) {
  currentView = v;
  document.querySelectorAll('.vt').forEach(b => b.classList.toggle('active', b.dataset.view===v));
  document.querySelectorAll('.view-panel').forEach(p => p.classList.remove('active'));
  document.getElementById(v+'View').classList.add('active');
  render();
}
function changeWeek(d) { if(d===0) weekOffset=0; else weekOffset+=d; render(); }
function changeMonth(d) { if(d===0) monthOffset=0; else monthOffset+=d; render(); }

function renderMonth() {
  const today = new Date();
  const viewMonth = new Date(today.getFullYear(), today.getMonth() + monthOffset, 1);
  const year = viewMonth.getFullYear();
  const month = viewMonth.getMonth();
  const todayStr = todayISO();
  const filtered = getFiltered();

  document.getElementById('monthLabel').textContent = viewMonth.toLocaleDateString('en-US', {month:'long', year:'numeric'});

  // Day headers
  const dayNames = ['Mon','Tue','Wed','Thu','Fri','Sat','Sun'];
  document.getElementById('monthDayHeaders').innerHTML = dayNames.map(d => `<div>${d}</div>`).join('');

  // Build 6-week grid starting from Monday
  const firstOfMonth = new Date(year, month, 1);
  const dow = firstOfMonth.getDay();
  const startOffset = dow === 0 ? -6 : 1 - dow;
  const cells = [];
  for (let i = 0; i < 42; i++) {
    const d = new Date(year, month, 1 + startOffset + i);
    const iso = d.toISOString().split('T')[0];
    cells.push({ iso, day: d.getDate(), isCurrent: d.getMonth() === month, isToday: iso === todayStr });
  }
  // Trim last row if all outside month
  const trimmed = cells.slice(0, cells.slice(35).some(c => c.isCurrent) ? 42 : 35);

  document.getElementById('monthGrid').innerHTML = trimmed.map(c => {
    const dayPosts = filtered.filter(p => p.date === c.iso).sort((a,b) => (a.time||'').localeCompare(b.time||''));
    const maxShow = 3;
    const chips = dayPosts.slice(0, maxShow).map(p => {
      const color = PILLAR_COLORS[p.pillar] || '#6B7280';
      return `<div class="mc-chip" style="border-color:${color};color:${color};background:${color}14" onclick="event.stopPropagation();openEditPost('${p.id}')">${p.pillar}${p.time ? ' '+p.time : ''}</div>`;
    }).join('');
    const more = dayPosts.length > maxShow ? `<div class="mc-more">+${dayPosts.length - maxShow} more</div>` : '';
    return `<div class="month-cell${c.isCurrent?'':' other-month'}${c.isToday?' today-cell':''}" onclick="openNewPostOnDate('${c.iso}')">
      <div class="mc-day${c.isToday?' today-day':''}">${c.day}</div>
      ${chips}${more}
    </div>`;
  }).join('');

  // Legend
  document.getElementById('monthLegend').innerHTML = Object.entries(PILLAR_COLORS).map(([name, color]) => 
    `<div class="ml-item"><div class="ml-dot" style="background:${color}"></div>${name}</div>`
  ).join('');
}

// ==================== MODAL ====================
function openUpload() { editingId=null; resetForm(); document.getElementById('modalTitle').textContent='Upload & Create Post'; document.getElementById('postModal').classList.add('open'); }
function openNewPost() { editingId=null; resetForm(); document.getElementById('modalTitle').textContent='New Post'; document.getElementById('postModal').classList.add('open'); }
function openNewPostOnDate(date) { editingId=null; resetForm(); document.getElementById('postDate').value=date; document.getElementById('modalTitle').textContent='New Post'; document.getElementById('postModal').classList.add('open'); }
function openEditPost(id) {
  const p = posts.find(x=>x.id===id); if(!p) return;
  editingId = id;
  document.getElementById('modalTitle').textContent = 'Edit Post';
  document.getElementById('postDate').value = p.date;
  document.getElementById('postTime').value = p.time || '11:00 AM';
  document.getElementById('postPillar').value = p.pillar;
  document.getElementById('postStatus').value = p.status;
  document.getElementById('postCopy').value = p.copy || '';
  document.getElementById('postHashtags').value = p.hashtags || '';
  document.getElementById('postVisualNotes').value = p.visualNotes || '';
  document.getElementById('postNotes').value = p.notes || '';
  // Platforms
  document.querySelectorAll('.plat-check input').forEach(cb => { cb.checked = (p.platforms||[]).includes(cb.value); });
  // Images
  uploadedFiles = [...(p.images||[])];
  renderUploadedGrid();
  document.getElementById('postModal').classList.add('open');
}
function closeModal() { document.getElementById('postModal').classList.remove('open'); uploadedFiles=[]; }

function resetForm() {
  document.getElementById('postDate').value = todayISO();
  document.getElementById('postTime').value = '11:00 AM';
  document.getElementById('postPillar').value = 'Welcome';
  document.getElementById('postStatus').value = 'Draft';
  document.getElementById('postCopy').value = '';
  document.getElementById('postHashtags').value = '';
  document.getElementById('postVisualNotes').value = '';
  document.getElementById('postNotes').value = '';
  document.querySelectorAll('.plat-check input').forEach((cb,i) => { cb.checked = i < 3; });
  uploadedFiles = [];
  renderUploadedGrid();
}

// ==================== FILE UPLOAD ====================
function handleDrop(e) { e.preventDefault(); e.currentTarget.classList.remove('dragover'); handleFiles(e.dataTransfer.files); }
function handleFiles(files) {
  Array.from(files).forEach(f => {
    if (!f.type.startsWith('image/') && !f.type.startsWith('video/')) return;
    const reader = new FileReader();
    reader.onload = (ev) => { uploadedFiles.push(ev.target.result); renderUploadedGrid(); };
    reader.readAsDataURL(f);
  });
}
function renderUploadedGrid() {
  const grid = document.getElementById('uploadedGrid');
  if (!uploadedFiles.length) { grid.innerHTML = ''; return; }
  grid.innerHTML = uploadedFiles.map((src,i) => {
    const isVideo = src.startsWith('data:video');
    return `<div class="uploaded-item">
      ${isVideo ? `<video src="${src}" muted></video>` : `<img src="${src}" alt="Upload ${i+1}">`}
      ${i===0?'<div class="cover-badge">COVER</div>':''}
      <button class="remove-btn" onclick="removeUpload(${i})">✕</button>
    </div>`;
  }).join('');
}
function removeUpload(i) { uploadedFiles.splice(i,1); renderUploadedGrid(); }

// ==================== AI SUGGEST ====================
function suggestCaption() {
  const pillar = document.getElementById('postPillar').value;
  const fn = CAPTIONS[pillar];
  if (fn) document.getElementById('postCopy').value = fn();
  showToast('✨ Caption template loaded');
}
function suggestHashtags() {
  const pillar = document.getElementById('postPillar').value;
  document.getElementById('postHashtags').value = HASHTAG_SETS[pillar] || '#MyersHomebuyers #DFWRealEstate';
  showToast('🔥 Trending hashtags loaded');
}

// ==================== SAVE / DELETE ====================
function savePost() {
  const data = {
    id: editingId || uid(),
    date: document.getElementById('postDate').value,
    time: document.getElementById('postTime').value,
    pillar: document.getElementById('postPillar').value,
    status: document.getElementById('postStatus').value,
    copy: document.getElementById('postCopy').value,
    hashtags: document.getElementById('postHashtags').value,
    visualNotes: document.getElementById('postVisualNotes').value,
    notes: document.getElementById('postNotes').value,
    platforms: [...document.querySelectorAll('.plat-check input:checked')].map(cb=>cb.value),
    images: [...uploadedFiles],
    createdAt: editingId ? (posts.find(p=>p.id===editingId)||{}).createdAt : new Date().toISOString(),
    updatedAt: new Date().toISOString()
  };
  if (editingId) { posts = posts.map(p => p.id===editingId ? data : p); }
  else {
    posts.push(data);
    // Also add to Content Library
    const libEntry = {
      id: 'user_' + data.id, ch: 'user', theme: data.pillar + ' — ' + (data.copy||'').substring(0,30).replace(/\n/g,' ') + '...',
      facebook: data.copy || '', linkedin: data.copy || '',
      image: (data.images && data.images.length > 0) ? data.images[0] : ''
    };
    userLibraryPosts.push(libEntry);
    localStorage.setItem('myers_user_library', JSON.stringify(userLibraryPosts));
  }
  window._lastSavedPost = data;
  save(); closeModal(); render();
  showToast(editingId ? '✅ Post updated & synced' : '✅ Post created & added to Library');
}
function deletePost(id) { if(!confirm('Delete this post?')) return; posts=posts.filter(p=>p.id!==id); cloudDeletePost(id); save(); render(); showToast('🗑 Post deleted'); }
function setStatus(id,status) {
  const post = posts.find(p=>p.id===id);
  posts=posts.map(p=>p.id===id?{...p,status,updatedAt:new Date().toISOString()}:p);
  const updated = posts.find(p=>p.id===id);
  if (updated) { window._lastSavedPost = updated; }
  save(); render(); showToast(`Status → ${status}`);
}

// ==================== PUBLISH TO SOCIAL MEDIA ====================
async function publishPostNow(id) {
  const post = posts.find(p=>p.id===id);
  if (!post) return;
  if (!confirm('Publish this post to ' + (post.platforms||[]).join(', ') + '?')) return;
  showToast('📤 Publishing...');
  const results = await publishPost(post);
  let successCount = 0;
  let errors = [];
  Object.entries(results).forEach(([platform, result]) => {
    if (result.success) successCount++;
    else errors.push(platform + ': ' + result.error);
  });
  if (successCount > 0) {
    setStatus(id, 'Posted');
    // Mark library source as posted
    if (post.librarySourceId) { markLibraryPosted(post.librarySourceId); }
    showToast('✅ Published to ' + successCount + ' platform(s)!');
  }
  if (errors.length > 0) {
    setTimeout(() => alert('Some platforms had issues:\n\n' + errors.join('\n')), 500);
  }
}

// ==================== BACKUP ====================
function downloadBackup() { exportBackup(posts); showToast('💾 Backup downloaded'); }
async function uploadBackup() {
  const input = document.createElement('input');
  input.type = 'file'; input.accept = '.json';
  input.onchange = async (e) => {
    try {
      const imported = await importBackup(e.target.files[0]);
      posts = imported;
      posts.forEach(p => cloudSavePost(p));
      save(); render();
      showToast('✅ ' + imported.length + ' posts restored from backup');
    } catch(err) { alert('Import failed: ' + err.message); }
  };
  input.click();
}

// ==================== EXPORT ====================
function exportCSV() {
  const header = ['Date','Time','Pillar','Platforms','Status','Caption','Hashtags','Visual Notes','Review Notes'];
  const rows = [...posts].sort((a,b)=>a.date.localeCompare(b.date)).map(p => [
    p.date, p.time||'', p.pillar, (p.platforms||[]).join('; '), p.status,
    (p.copy||'').replace(/"/g,'""'), (p.hashtags||'').replace(/"/g,'""'),
    (p.visualNotes||'').replace(/"/g,'""'), (p.notes||'').replace(/"/g,'""')
  ]);
  const csv = [header,...rows].map(r => r.map(c=>`"${c}"`).join(',')).join('\n');
  const blob = new Blob([csv],{type:'text/csv'});
  const a = document.createElement('a'); a.href = URL.createObjectURL(blob);
  a.download = `myers-content-${todayISO()}.csv`; a.click();
  showToast('⬇️ CSV exported');
}

// ==================== TOAST ====================
function showToast(msg) {
  const t = document.getElementById('toast'); t.textContent=msg; t.classList.add('show');
  setTimeout(()=>t.classList.remove('show'), 2500);
}

// ==================== INIT ====================
document.addEventListener('DOMContentLoaded', async () => {
  await load();
  filterByStatus('all');
  render();
  renderDashboard();
  renderGeneratorFields();
  renderHubTrends();
  // Set library badge
  const lb = document.getElementById('libraryBadge');
  if (lb && typeof LIBRARY_POSTS !== 'undefined') lb.textContent = getAllLibraryItems().length;
  // Listen for real-time cloud changes
  listenForChanges((cloudPosts) => {
    posts = cloudPosts;
    localSave(posts);
    render();
  });
});

// ==================== TAB SWITCHING ====================
function switchTab(tab) {
  document.querySelectorAll('.tab-panel').forEach(p => p.classList.remove('active'));
  document.querySelectorAll('.tab-btn').forEach(b => b.classList.remove('active'));
  document.getElementById('panel-' + tab).classList.add('active');
  const btn = document.querySelector(`[data-tab="${tab}"]`);
  if (btn) btn.classList.add('active');
  if (tab === 'dashboard') renderDashboard();
  if (tab === 'queue') renderQueue();
  if (tab === 'library') renderLibrary();
}

// ==================== CONTENT LIBRARY ====================
// User-generated posts saved to library
let userLibraryPosts = JSON.parse(localStorage.getItem('myers_user_library') || '[]');

const LIBRARY_POSTS = [
{id:'lib1',ch:'ch1',theme:'Disruption Hook',image:'post-images/post1.png',facebook:`Those who adapt early appear visionary. Those who adapt late feel blindsided. Those who never adapt disappear quietly.\n\nReal estate isn't being disrupted overnight. It's been shifting for years — most people just weren't paying attention.\n\nTechnology crossed the moat. Investors crossed the moat. Wholesalers crossed it with speed, scale, and aggression that traditional agents weren't built to counter.\n\nThe question isn't whether the shift is happening.\nThe question is which side of it you're standing on.\n\n🏠 The future belongs to the investor-agent.\n\n#RealEstate #InvestorAgent #Adapt #MyersHomebuyers #DFWRealEstate`,linkedin:`"Those who adapt early appear visionary. Those who adapt late feel blindsided. Those who never adapt disappear quietly."\n\nI've watched this pattern play out across industries — and real estate is no exception.\n\nFor over a century, the agent sat at the center of the transaction. The license was the moat. But moats only protect you as long as outsiders lack the tools to cross them.\n\nTechnology crossed it. Investors crossed it. Then wholesalers crossed it with speed, scale, and aggression.\n\nThis isn't a crisis. It's an evolution.\n\nThe future belongs to the investor-agent.\n\n#RealEstate #ThoughtLeadership #InvestorAgent #Disruption`},
{id:'lib2',ch:'ch1',theme:'History Lesson',image:'post-images/post2.png',facebook:`Did you know the first real estate agents were basically… wholesalers?\n\nBefore licensing. Before regulation. Before fiduciary duty. Agents operated on "net listings" — the seller named their price, and the agent kept EVERYTHING above it.\n\nSeller wants $80K. Agent finds a buyer at $95K. Agent pockets $15K.\n\nSound familiar? That's exactly how assignment fees work today.\n\nHistory doesn't repeat itself. But it rhymes. 👀\n\n#RealEstateHistory #Wholesaling #InvestorAgent #MyersHomebuyers`,linkedin:`The first real estate agents operated exactly like today's wholesalers.\n\nBefore licensing, agents used "net listings" — the seller stated a price, and the agent kept anything above it. If a seller wanted $80,000 and the agent found a buyer at $95,000, the agent kept the $15,000 spread.\n\nStructurally, this is the same mechanism wholesalers use when they contract at one price and assign at a higher one.\n\nBoth capture spread. Both rely on controlling a transaction. And in both cases, the market eventually demands professionalization.\n\nThe question: will you be ahead of that curve, or behind it?\n\n#RealEstate #Wholesaling #IndustryEvolution`},
{id:'lib3',ch:'ch1',theme:'Glengarry Glen Ross',image:'post-images/post3.png',facebook:`Remember Alec Baldwin's famous speech in Glengarry Glen Ross?\n\n🎬 "Always Be Closing."\n\nMost people think it was just a movie. It wasn't. It was a theatrical compression of a VERY real era in real estate — when deals were driven by force, not service.\n\nHere's the uncomfortable truth: That same energy exists in wholesaling right now. New operators flood in chasing fast fees. Training is inconsistent. Ethics depend on the individual.\n\nBut history teaches us: these conditions are a STAGE in a cycle, not a permanent state.\n\nTraditional agents went through this exact phase. They matured. They professionalized.\n\nThe future doesn't belong to closers. It belongs to professionals.\n\n#GlengarryGlenRoss #RealEstate #Wholesaling #MyersHomebuyers`,linkedin:`Glengarry Glen Ross wasn't fiction. It was a mirror.\n\nThe 1992 film depicted an era when real estate deals were driven by force, not service. When closing was the only metric that mattered.\n\nIt's not difficult to draw a straight line from that environment to the current wholesaler ecosystem:\n\n→ New operators flood in chasing fast fees\n→ Training is inconsistent\n→ Ethics depend on the individual\n→ Transparency is optional\n\nBut these conditions aren't permanent. They're a stage in an industry's maturation cycle.\n\nTraditional agents went through this exact evolution. They professionalized. They became regulated and trusted.\n\nThat same pressure is now bearing down on wholesaling.\n\n#Leadership #RealEstate #ProfessionalDevelopment`},
{id:'lib4',ch:'ch1',theme:'Investor-Agent Identity',image:'post-images/post4.png',facebook:`What does the future real estate professional look like?\n\nSomeone who:\n🧠 Thinks like an investor\n📊 Analyzes like a lender\n🤝 Speaks like a fiduciary\n📈 Operates like a business owner\n⚡ Acts with the speed of a wholesaler\n💰 Earns with the flexibility of someone who can do BOTH\n\nThis isn't a trend. This is the next evolutionary stage of real estate.\n\nAt Myers Home Buyers, we're not waiting for the future. We're building it.\n\nReady to evolve? Drop a 🔥 below.\n\n#InvestorAgent #MyersHomebuyers #RealEstateCareer #BuildWealth`,linkedin:`The real estate industry is converging around a new professional identity.\n\nTraditional agents can't deliver what today's consumer demands. Pure wholesalers can't deliver it either.\n\nThe future professional is someone who:\n\n• Thinks like an investor\n• Analyzes like a lender\n• Speaks like a fiduciary\n• Operates like a business owner\n• Acts with the speed of a wholesaler\n• Earns with the flexibility of someone who can do both\n\nThe investor-agent isn't a trend. It's the standard that's emerging.\n\n#RealEstate #CareerDevelopment #InvestorAgent #FutureOfWork`},
{id:'lib5',ch:'ch1',theme:'The Moat is Gone',image:'post-images/post5.png',facebook:`"Moats only protect an industry as long as outsiders lack the tools to cross them."\n\nFor over 100 years, the real estate license was the moat. If you wanted to buy or sell, you needed an agent. Period.\n\nThen technology crossed it.\nThen investors crossed it.\nThen wholesalers crossed it — with speed, scale, and aggression.\n\nThe old moat is gone. 🏰\n\nThe new moat? Capability.\n\nCan you evaluate a deal? Structure a creative offer? Assign a contract? Flip a property? List it retail?\n\nThe agents who can do ALL of it — those are the ones who are untouchable.\n\n#CompetitiveAdvantage #RealEstate #InvestorAgent #MyersHomebuyers`,linkedin:`The real estate license used to be a moat. It's not anymore.\n\nFor more than a century, access to information, pricing, and negotiation moved through one professional. The license acted as a barrier to entry.\n\nBut moats only protect an industry as long as outsiders lack the tools to cross them.\n\nTechnology crossed it. Investors crossed it. Wholesalers crossed it.\n\nThe new competitive moat isn't a credential. It's capability — the ability to evaluate, price, structure, contract, assign, buy, sell, rent, flip, or refer.\n\nThat's the investor-agent advantage.\n\n#Strategy #RealEstate #CompetitiveAdvantage #ProfessionalGrowth`},
{id:'lib6',ch:'ch1',theme:'Uncomfortable Truth',image:'post-images/post6.png',facebook:`Agents weren't attacked. They were standing still.\n\nI know that's uncomfortable to hear. But it's the truth.\n\nFor years, agents believed they were "holding the line" against investor encroachment. But investors and wholesalers weren't coming for them — they were simply moving FASTER.\n\nThe consumer changed. They don't care about your traditional value proposition anymore.\n\nThey care about:\n✅ Clarity\n✅ Certainty\n✅ Optionality\n✅ Speed\n\nIf you can only do half the job, you're going to lose to someone who can do ALL of it.\n\nTime to evolve. 💪\n\n#HardTruth #RealEstate #InvestorAgent #MyersHomebuyers`,linkedin:`Real estate agents weren't being attacked. They were standing still.\n\nFor years, agents believed they were holding the line against investor encroachment. The truth is simpler: investors and wholesalers were just moving faster.\n\nThe consumer's expectations have fundamentally shifted. They care about:\n\n→ Clarity\n→ Certainty\n→ Optionality\n→ Speed\n\nThey want a professional who can operate on both sides of the table — with the sophistication of an investor and the accountability of an agent.\n\nOnly an investor-agent can deliver that.\n\n#RealEstate #IndustryInsight #Adaptation #Leadership`},
{id:'lib7',ch:'ch1',theme:'Market Cycle Proof',image:'post-images/post7.png',facebook:`What happens to YOUR income when the market shifts?\n\nTraditional agents panic when listings slow down.\nWholesalers panic when spreads shrink.\n\nInvestor-agents? They REPOSITION.\n\n📉 When listings slow → they buy.\n📈 When investors panic → they sell.\n🔄 When spreads shrink → they pivot.\n📋 When regulation tightens → they're already compliant.\n\nInvestor-agents don't fear change. They benefit from it.\n\n🏠 Ready to become market-proof?\n\n#MarketProof #InvestorAgent #MyersHomebuyers #DFW`,linkedin:`The most valuable professionals in real estate aren't dependent on market cycles. They move inside them.\n\nWhen listings slow, they buy. When investors panic, they sell. When spreads shrink, they reposition. When regulation tightens, they're already compliant.\n\nThis is the core advantage of the investor-agent model: optionality.\n\nTraditional agents are bound by a model designed for another era. Investor-agents stand at the intersection.\n\nInvestor-agents don't fear change. They benefit from it.\n\n#RealEstate #Investing #Adaptability #Leadership #Strategy`},
{id:'lib8',ch:'ch1',theme:'The Inevitable Future',image:'post-images/post8.png',facebook:`This transition isn't a question of IF. It's a question of WHEN.\n\nEvery profession eventually consolidates around the operators who combine capability with trust.\n\n🔹 Wholesaling cannot remain unregulated forever.\n🔹 Traditional agents cannot remain indispensable forever.\n\nThe market WILL merge these two roles — the same way it merged net listers into fiduciary agents decades ago.\n\nYou can fight the current. Or you can learn to swim with it.\n\nThe future belongs to the investor-agent. 🏠🔥\n\n#Evolution #RealEstate #InvestorAgent #MyersHomebuyers`,linkedin:`Every profession eventually consolidates around operators who combine capability with trust.\n\nIn its current form, wholesaling cannot remain unregulated. In its current form, the traditional agent model cannot remain indispensable.\n\nThe market will merge these two roles — just as it merged net listers into fiduciary agents decades ago.\n\nThis isn't disruption. It's evolution. And evolution doesn't wait for permission.\n\nThe future belongs to the investor-agent.\n\n#FutureOfRealEstate #ThoughtLeadership #Strategy`},
{id:'lib9',ch:'ch1',theme:'Recruitment CTA',image:'post-images/post9.png',facebook:`Still just listing houses? There's a bigger game being played.\n\nWhile traditional agents fight over the same shrinking pie, investor-agents are building wealth on BOTH sides of the transaction.\n\nAt Myers Home Buyers, our agents don't just sell real estate — they INVEST in it.\n\n✅ Full training on acquisitions & dispositions\n✅ Access to real deal flow\n✅ Learn to wholesale, flip, AND list\n✅ Build your own portfolio while you earn\n\nThe real estate agent of the future isn't coming. They're already here.\n\nDM me "INVESTOR" to learn how. 👇\n\n#HiringNow #InvestorAgent #MyersHomebuyers #DFW #JoinUs`,linkedin:`The real estate industry is evolving. Is your career evolving with it?\n\nAt Myers Home Buyers, we're building the next generation of real estate professionals — investor-agents who can:\n\n→ Evaluate deals like investors\n→ Structure offers with creative financing\n→ Execute acquisitions and dispositions\n→ List and sell at retail\n→ Build personal wealth through their own portfolios\n\nThis isn't a side hustle. It's the future of the profession.\n\nIf you're a licensed agent ready to expand — I'd like to hear from you.\n\n#Careers #RealEstate #InvestorAgent #Hiring #DFW`},
{id:'lib10',ch:'ch1',theme:'Quote Card — Loopholes',image:'post-images/post10a.png',facebook:`"You cannot build a long-term industry on practices that professionals themselves treat as loopholes. You must evolve into a standard the market trusts."\n\n— From Chapter 1: The Rise of the Investor-Agent\n\nThis line hit different. I've watched brilliant people build careers on temporary advantages — then lose everything when the rules changed.\n\nThe agents who survived weren't the fastest. They were the ones who professionalized BEFORE they were forced to.\n\n🔥 Book dropping soon. Stay tuned.\n\n#BookQuote #InvestorAgent #MyersHomebuyers #ComingSoon`,linkedin:`"You cannot build a long-term industry on practices that professionals themselves treat as loopholes. You must evolve into a standard the market trusts."\n\n— Chapter 1: The Rise of the Investor-Agent\n\nThis principle applies far beyond real estate. Every industry goes through a phase where early operators exploit structural gaps. The ones who endure are those who build trust before regulation forces them to.\n\nMore details on the book coming soon.\n\n#ThoughtLeadership #RealEstate #BookQuote #ProfessionalEvolution`},
{id:'lib11',ch:'ch1',theme:'Mindset Challenge',image:'post-images/post11.png',facebook:`The real question from Chapter 1 isn't about real estate. It's about YOU.\n\nWill you understand history well enough to see what comes next?\n\nWill you adopt the mindset of someone who can close ANY type of deal in ANY type of market?\n\nOr will you cling to an identity designed for a world that doesn't exist anymore?\n\nThis chapter isn't meant to be admired. It's meant to be STEPPED INTO. 🚶‍♂️\n\nThe future belongs to the investor-agent.\nThe future belongs to the ones who MOVE.\n\nTag someone who needs to hear this. 👇\n\n#Mindset #RealEstate #InvestorAgent #PersonalGrowth`,linkedin:`"Whether you'll understand the history well enough to see what comes next. Whether you adopt the mindset of someone who can close any type of deal in any type of market — or whether you cling to an identity designed for a world that doesn't exist anymore."\n\nThe professionals who thrive through transitions aren't necessarily the most talented. They're the most adaptable.\n\nThey study patterns. They respect history. And they move before the market forces them to.\n\nThe future belongs to the investor-agent.\n\n#Leadership #Mindset #Adaptation #RealEstate`},
{id:'lib12',ch:'ch1',theme:'Comparison Chart',image:'post-images/post12.png',facebook:`Traditional Agent vs. Wholesaler vs. Investor-Agent 👇\n\n🔴 Traditional Agent:\n— Lists & shows properties\n— Earns commission only\n— Dependent on market cycles\n\n🟡 Wholesaler:\n— Contracts & assigns deals\n— Earns assignment fees\n— Regulatory risk\n\n🟢 Investor-Agent:\n— Does ALL of the above\n— Multiple revenue streams\n— Market-cycle proof\n— Builds personal wealth\n\nThe market will merge these roles. It always does.\n\nWhich one are you? Which one do you WANT to be?\n\n#Comparison #InvestorAgent #MyersHomebuyers #ChooseYourPath`,linkedin:`The market is converging three professional identities into one.\n\nTraditional Agent → Commission-based, market dependent, limited flexibility\nWholesaler → Assignment fees, regulatory risk, no formal structure\nInvestor-Agent → Both revenue streams, market-proof, wealth building built in\n\nTraditional agents are bound by a model designed for another era. Pure wholesalers are bound by a business without structure. Investor-agents stand at the intersection.\n\nEvery profession consolidates around operators who combine capability with trust.\n\n#RealEstate #Strategy #CareerPlanning #InvestorAgent`},
{id:'lib13',ch:'ch1',theme:'Controversial Hot Take',image:'post-images/post13.png',facebook:`Hot take: Most real estate agents are about to become irrelevant.\n\nNot because they're bad at their jobs.\nNot because the market is crashing.\nNot because of AI or Zillow.\n\nBecause the CONSUMER changed — and agents didn't change with them.\n\nToday's seller wants:\n⚡ Speed\n🎯 Certainty\n🔄 Options\n💰 A professional who can buy OR sell\n\nIf you can only list a house, you're bringing a knife to a gunfight.\n\nThe investor-agent model isn't just better. It's INEVITABLE.\n\nAgree or disagree? Drop your take below. 👇\n\n#HotTake #RealEstate #InvestorAgent #Debate`,linkedin:`The traditional agent model is approaching obsolescence. Here's why.\n\nIt's not about technology replacing agents. It's about consumer expectations outpacing what the traditional model can deliver.\n\nToday's consumer wants clarity, certainty, optionality, and speed. They want a professional who can operate on both sides of the table.\n\nThe traditional agent can't deliver that range. The pure wholesaler can't deliver the trust.\n\nThe market is consolidating around a new professional identity: the investor-agent.\n\nWhere do you see the agent model heading?\n\n#RealEstate #FutureOfWork #IndustryTrends #Discussion`},
{id:'lib14',ch:'ch1',theme:'Book Teaser',image:'post-images/post14.png',facebook:`I wrote a book. 📖\n\nNot because I wanted to be an author. Because I got tired of watching good people get left behind by an industry that's evolving faster than they can keep up.\n\nChapter 1 is called "The Rise of the Investor-Agent" — and it lays out exactly what's happening in real estate right now:\n\n📌 Why the agent model is crumbling\n📌 Why wholesaling can't stay unregulated\n📌 What the NEXT professional looks like\n📌 And why history has already shown us the playbook\n\nThe future belongs to the investor-agent.\n\nWant early access? Comment "BOOK" below. 📚🔥\n\n#NewBook #ComingSoon #InvestorAgent #MyersHomebuyers`,linkedin:`I've spent years watching the real estate industry evolve — and I finally put the playbook on paper.\n\nChapter 1 — "The Rise of the Investor-Agent" — traces the historical parallel between early unregulated agents and today's wholesaling ecosystem.\n\nKey insights:\n→ The agent's moat has been crossed by technology, investors, and wholesalers\n→ Wholesaling mirrors the pre-regulation era of real estate agents\n→ The market always consolidates around capability + trust\n→ The investor-agent model is the natural evolution\n\nMore details coming soon.\n\n#Book #ThoughtLeadership #RealEstate #InvestorAgent`},
{id:'lib15',ch:'ch1',theme:'Micro Post',image:'post-images/post15.png',facebook:`Investor-agents don't fear change.\nThey benefit from it.\n\nThat's it. That's the post. 🔥\n\n#InvestorAgent #MyersHomebuyers #NoFear`,linkedin:`"Industries rarely shift because someone announces a revolution. They shift because the underlying mechanics become impossible to ignore."\n\nReal estate is in the middle of that shift right now. The only question is whether you see it.\n\n#RealEstate #Leadership #IndustryShift`},
{id:'lib16',ch:'ch2',theme:'The Two Questions',image:'',facebook:`Real investors don't ask, "Is there money in the deal?"\n\nThey ask, "Is this the best place for my money relative to everything else I can do with it?"\n\nThe gap between those two questions is the gap between surviving and becoming a force.\n\nWholesalers hunt for spreads.\nNew flippers hunt for margins.\nReal investors compare returns to risk-free alternatives, other opportunities, and the velocity of their own capital.\n\nThey don't care how big a profit looks.\nThey care about the return AFTER adjusting for risk, time, exposure, and market conditions.\n\nWhich question are you asking? 👇\n\n#InvestorMindset #RealEstate #MyersHomebuyers #ThinkDifferent`,linkedin:`"Is there money in the deal?" vs. "Is this the best place for my money relative to everything else I can do with it?"\n\nThe gap between those two questions separates operators who survive from operators who become a force.\n\nWholesalers hunt spreads. New flippers hunt margins. Real investors compare returns to risk-free alternatives, to other opportunities, and to the velocity of their own capital.\n\nThey don't evaluate profit in a vacuum. They evaluate it relative to everything else they could be doing with that same dollar.\n\nThis is the core shift in Chapter 2.\n\n#RealEstate #InvestorMindset #Strategy #CapitalAllocation`},
{id:'lib17',ch:'ch2',theme:'The $800K Mistake',image:'',facebook:`Someone paid $800,000 for a luxury home with a $2.3M–$2.6M ARV.\n\nSounds great, right? 🤔\n\nI offered $400,000 on the same property. Here's why:\n\n🔴 Repairs were $1.3M — capital-intensive, prone to overruns\n🔴 Only ~$100K left in the deal at $800K\n🔴 Luxury buyers disappear FAST in any hiccup\n🔴 Holding costs on a multi-million dollar property? BRUTAL\n🔴 One market shift = entire margin evaporated\n\nThey saw PROFIT.\nI saw EXPOSURE.\n\nThey paid for optimism.\nI paid for discipline.\n\nA year later, they learned the difference. 💰\n\n#RealEstate #InvestorMindset #RiskManagement #MyersHomebuyers`,linkedin:`A luxury home with an ARV between $2.3M and $2.6M. On paper, the upside was compelling.\n\nBut the repairs were $1.3M — capital-intensive, operationally difficult, prone to cost overruns.\n\nI offered $400,000.\n\nSomeone else offered $800,000, leaving barely $100,000 in the deal.\n\nWhy did I walk?\n\n→ At that price point, one market hiccup vaporizes the entire margin\n→ Luxury buyers can disappear faster than any other segment\n→ Holding costs stack relentlessly — taxes, utilities, insurance, interest\n→ If the market turned, the operator would bleed tens of thousands per month\n\nThey saw profit. I saw exposure.\nThey paid for optimism. I paid for discipline.\n\nTime is money. In bad markets, it becomes the most expensive cost in the underwriting.\n\n#RealEstate #RiskManagement #InvestorThinking #Leadership`},
{id:'lib18',ch:'ch2',theme:'The $20K House Truth',image:'',facebook:`In 2015, I bought a property for $20,000.\n$80,000 rehab. $150,000 ARV.\n\nInstead of flipping it, I wholesaled it for $80,000.\n\nThe buyer did less rehab, turned it into a rental.\n\nThat house? Worth $350,000 today. 📈\n\nDid I make a mistake? No.\n\nMy model at the time: velocity of money > long-term hold.\nThe buyer's model: appreciation + cash flow > quick profit.\n\nBoth decisions were rational.\nBoth matched different investment theses.\n\nThe point isn't what the house became.\nThe point is that the DECISION must match the MODEL.\n\nMost operators don't even have a model. They act on instinct and FOMO.\n\nThat's amateur thinking.\n\n#InvestorAgent #RealEstate #MyersHomebuyers #Velocity`,linkedin:`I bought a property for $20,000 with an $80,000 rehab requirement and a $150,000 ARV.\n\nInstead of flipping it, I wholesaled it for $80,000.\n\nThat house is worth $350,000 today.\n\nWas it a mistake? No. My decision matched my model at the time: velocity of money over long-term hold.\n\nThe buyer had a different model — they optimized for a rental they believed would appreciate. Their return profile was anchored in a different timeline.\n\nThe lesson isn't about what the house became. It's that the decision must match the model.\n\nMost operators don't do this. They act on instinct, emotion, or FOMO. They copy what the last person did. They treat each deal as standalone instead of one option on a broader menu.\n\nProfessionals evaluate deals the way asset managers evaluate stocks.\n\n#RealEstate #InvestorMindset #Strategy #WealthBuilding`},
{id:'lib19',ch:'ch2',theme:'Deal A vs Deal B',image:'',facebook:`POP QUIZ 📊\n\nWhich deal would you take?\n\n🅰️ DEAL A:\n• All-in: $300,000\n• ARV: $360,000\n• Profit: $60,000\n• Return: 20%\n• Absorption: 8 months\n• Capital locked: 6–8 months\n\n🅱️ DEAL B:\n• All-in: $150,000\n• ARV: $195,000\n• Profit: $45,000\n• Return: 30%\n• Absorption: 2 months\n• Capital locked: 3 months\n\nMost amateurs choose Deal A because the dollar amount is bigger.\n\nProfessionals choose Deal B because the return is superior, the exposure is lower, and the velocity is FASTER.\n\nOne makes you feel good.\nThe other makes you wealthy. 💰\n\nDrop your answer below 👇\n\n#RealEstate #InvestorMindset #DealAnalysis #MyersHomebuyers`,linkedin:`A test of investor thinking:\n\nDeal A\n→ $300K all-in, $360K ARV, $60K profit, 20% return\n→ 8-month absorption, 6-8 months capital locked\n\nDeal B\n→ $150K all-in, $195K ARV, $45K profit, 30% return\n→ 2-month absorption, 3 months capital locked\n\nMost operators choose Deal A because the dollar amount is larger.\n\nProfessionals choose Deal B because:\n• Higher percentage return\n• Lower capital exposure\n• Faster velocity = more turns per year\n• Less market risk during hold period\n\nOne makes you feel good. The other makes you wealthy.\n\nVelocity beats vanity. Every time.\n\n#RealEstate #Investing #DealAnalysis #Strategy`},
{id:'lib20',ch:'ch2',theme:'Infinite Return',image:'',facebook:`I bought a home for $40,000.\nSpent $40,000 in rehab.\nProperty worth: $175,000.\n\nThe market was trending toward sellers.\nThe area was gentrifying.\nBrick exterior — lower maintenance risk.\n\nAnd the capstone? The bank refinanced ALL of my cash out.\n\n♾️ INFINITE RETURN.\n\n$0 left in the deal.\nA long-term asset with durable fundamentals.\n\nI still own it today.\n\nThis is investor logic:\n✅ Low basis\n✅ Predictable exit\n✅ Strong renter demand\n✅ Zero capital exposure\n\nThat's not a "good deal."\nThat's a high-probability WEALTH ENGINE.\n\n#BRRRR #RealEstate #InfiniteReturn #MyersHomebuyers #WealthBuilding`,linkedin:`$40,000 purchase. $40,000 rehab. $175,000 value.\n\nBalanced market trending toward sellers. Gentrifying area. Brick exterior — lower maintenance risk.\n\nThe bank refinanced all of my cash out.\n\nInfinite return. Zero capital exposure. A long-term asset with durable fundamentals.\n\nI still own it today.\n\nThis is investor logic at its purest:\n→ Low basis\n→ Predictable exit\n→ Strong renter demand\n→ No capital left at risk\n\nThat's not a "good deal." That's a high-probability wealth engine.\n\n#RealEstate #BRRRR #InfiniteReturn #WealthBuilding #InvestorMindset`},
{id:'lib21',ch:'ch2',theme:'Buy-Box Discipline',image:'',facebook:`A buy-box is NOT a preference list.\nIt's a RISK MANAGEMENT TOOL. 🛡️\n\nIt prevents you from making emotional decisions disguised as opportunities.\n\nMy buy-box has always been rule-based:\n📍 Strong elementary school anchors\n📊 Score-based thresholds\n🚫 Avoiding high-end unless the risk premium is obvious\n📈 Targeting cap rates that match market conditions\n💰 Adjusting return requirements as competition shifts\n\nThe buy-box evolves, but the logic stays constant:\n\n⬆️ Require MORE reward when risk increases\n⬇️ Accept LESS reward when risk decreases\n\nMost operators do the OPPOSITE.\nThey loosen standards when deals are scarce.\nThey tighten standards when deals are abundant.\n\nThis is why most operators plateau.\n\n#BuyBox #RealEstate #DisciplineOverEmotion #MyersHomebuyers`,linkedin:`A buy-box is not a preference list. It is a risk-management tool.\n\nIt prevents operators from making emotional decisions disguised as opportunities.\n\nMy buy-box has always been rule-based:\n\n• Strong elementary school anchors\n• Avoiding high-end properties unless the risk premium was obvious\n• Targeting cap rates appropriate to market conditions\n• Adjusting return thresholds as capital availability and competition shift\n• Pulling back when economic speculation intensifies\n• Expanding when institutional buyers create a liquidity backstop\n\nThe buy-box evolves, but the logic stays constant:\n\nRequire more reward when risk increases. Accept less reward when risk decreases.\n\nMost operators do the opposite — and that's why they plateau.\n\n#RealEstate #RiskManagement #BuyBox #InvestorDiscipline`},
{id:'lib22',ch:'ch2',theme:'FOMO Graveyard',image:'',facebook:`Every industry has a graveyard full of people who chased momentum instead of evaluating the underlying economics.\n\nReal estate just makes those mistakes more expensive. 💀\n\nThe $800K luxury overpay wasn't a mistake. It was an EMOTIONAL outcome:\n\n😰 The buyer sat on their hands for months\n😤 Got desperate\n🤥 Started inventing narratives about "appreciation potential"\n\nThey ignored:\n❌ Absorption rate\n❌ Rising interest rates\n❌ Declining prices in 2024–2025\n❌ Holding costs\n❌ Risk stacking\n\nThey didn't make a financial decision.\nThey made a PSYCHOLOGICAL one.\n\nIf the deal only works in the best-case scenario, it isn't a deal.\nIt's a LIABILITY waiting for confirmation.\n\n#FOMO #RealEstate #InvestorMindset #MyersHomebuyers`,linkedin:`The $800,000 overpay on the luxury deal wasn't a calculation error. It was an emotional outcome.\n\nThe buyer had been sitting on their hands for months. They got desperate. They started inventing narratives about appreciation potential.\n\nThey ignored:\n→ Absorption rate\n→ Rising interest rates\n→ Declining prices\n→ Holding costs\n→ Risk stacking\n\nThey didn't make a financial decision. They made a psychological one.\n\nEvery industry has a graveyard full of people who chased momentum instead of evaluating the underlying economics.\n\nIf the deal only works in the best-case scenario, it isn't a deal. It's a liability waiting for confirmation.\n\n#RealEstate #InvestorMindset #RiskManagement #DisciplinedInvesting`},
{id:'lib23',ch:'ch2',theme:'Gambler vs Professional',image:'',facebook:`This chapter is about rewiring the way you evaluate deals so you operate like a PROFESSIONAL, not a gambler. 🎰➡️📊\n\nGamblers ask: "Can I make money?"\nProfessionals ask: "What else could this capital be doing?"\n\nGamblers see a spread and assume it's worth pursuing.\nProfessionals compare the return to risk-free alternatives.\n\nGamblers treat profit as an absolute.\nProfessionals treat profit as a RELATIVE measure.\n\nThat misunderstanding destroys more operators than competition ever will.\n\nMost people who enter real estate don't suffer from lack of effort.\nThey suffer from lack of JUDGMENT.\n\n#InvestorAgent #RealEstate #Mindset #MyersHomebuyers #Discipline`,linkedin:`Most people who enter real estate don't suffer from lack of effort. They suffer from lack of judgment.\n\nThey chase dollar signs instead of evaluating opportunity. They confuse activity with progress. They treat profit as an absolute, not a relative measure.\n\nThat misunderstanding destroys more operators than competition ever will.\n\nEmotional operators ask, "Can I make money?"\nProfessional operators ask, "What else could this capital be doing?"\n\nThe difference is why some people end up with a handful of wins and others end up with a portfolio.\n\n#RealEstate #InvestorMindset #ProfessionalDevelopment #Strategy`},
{id:'lib24',ch:'ch2',theme:'Velocity Over Vanity',image:'',facebook:`Which would you rather have?\n\n💵 One $60K deal that takes 8 months\n\nor\n\n💰💰 Two $45K deals that take 3 months each\n\nThe math:\n• Option A: $60,000 in 8 months\n• Option B: $90,000 in 6 months\n\nVelocity. Beats. Vanity.\n\nEvery. Single. Time.\n\nStop chasing the big number.\nStart chasing the FAST number.\n\nYour capital should be WORKING, not sitting. 🏃‍♂️\n\n#CapitalVelocity #RealEstate #InvestorAgent #MyersHomebuyers`,linkedin:`Always prioritize velocity over vanity.\n\nA $60,000 profit that takes 8 months locks your capital and compounds risk.\n\nTwo $45,000 profits that take 3 months each yield $90,000 in 6 months — with lower exposure on each transaction.\n\nThe dollar amount of a single deal tells you almost nothing. The velocity at which you can deploy and redeploy capital tells you everything.\n\nProfessionals optimize for turns per year, not trophy deals.\n\n#RealEstate #CapitalVelocity #InvestorMindset #WealthBuilding`},
{id:'lib25',ch:'ch2',theme:'Quote — Judgment Compounds',image:'',facebook:`"Your judgment — not your hustle — is what compounds."\n\n— Chapter 2: Thinking Like an Investor, Not a Wholesaler\n\nRead that again.\n\nYou can outwork everyone in the room and still lose.\nYou can close 50 deals and still be broke.\nYou can grind 80 hours a week and still plateau.\n\nBecause effort without judgment is just expensive exercise.\n\nThe operators who build WEALTH are the ones who learn to THINK.\n\n📖 Book dropping soon.\n\n#BookQuote #InvestorMindset #MyersHomebuyers #WealthBuilding`,linkedin:`"Your judgment — not your hustle — is what compounds."\n\n— Chapter 2: Thinking Like an Investor, Not a Wholesaler\n\nThis single line captures the difference between operators who accumulate wins and operators who build portfolios.\n\nEffort is table stakes. Judgment is the differentiator.\n\nThe professionals who consistently build wealth aren't necessarily the hardest workers. They're the clearest thinkers.\n\n#ThoughtLeadership #RealEstate #BookQuote #InvestorMindset`},
{id:'lib26',ch:'ch2',theme:'Market Adaptation',image:'',facebook:`When institutions started buying at higher price points, a new dynamic emerged:\n\n📉 Downside risk DECREASED.\n\nThey acted as a predictable liquidity floor. They didn't need perfect properties — they needed yield at scale.\n\nSo what did I do?\n\n✅ Tightened my margins (because risk decreased)\n✅ Compared returns to the new institutional floor\n✅ Increased volume 30% WITHOUT taking on more risk\n\nThis is RELATIVE thinking.\n\nYou don't cling to arbitrary profit thresholds.\nYou adapt in relation to the market's buyer base.\nYou move your box with the environment, not with your emotions.\n\n#MarketAdaptation #RealEstate #InvestorAgent #MyersHomebuyers`,linkedin:`When institutions began increasing the price points at which they would acquire properties, a new dynamic emerged: downside risk decreased.\n\nThese buyers acted as a predictable liquidity floor. They didn't need perfect properties. They needed yield at scale.\n\nI tightened my margins because my risk had decreased. I compared my required return to the new floor created by institutional demand.\n\nOur volume increased 30% that year without taking on additional risk.\n\nThis is relative thinking. You don't cling to arbitrary profit thresholds. You adapt in relation to the market's buyer base. You adjust targets as risk changes.\n\n#RealEstate #InstitutionalInvesting #Strategy #MarketAdaptation`},
{id:'lib27',ch:'ch2',theme:'Exposure vs Profit',image:'',facebook:`They saw profit. 💰\nI saw exposure. ⚠️\n\nThis is the difference between a wholesaler and an investor.\n\nA wholesaler sees a number and chases it.\nAn investor sees a number and STRESS-TESTS it.\n\nWhat happens if:\n❓ Repairs go 20% over budget?\n❓ The market dips 5%?\n❓ It takes 3 extra months to sell?\n❓ Interest rates tick up?\n❓ Your buyer disappears?\n\nIf the deal can't survive those scenarios, it's not a deal.\n\nIt's a BET.\n\nInvestors don't make bets.\nThey make calculated decisions with defined downside.\n\n#RiskManagement #RealEstate #InvestorAgent #MyersHomebuyers`,linkedin:`In every deal, there are two perspectives:\n\nThe operator who sees profit.\nThe investor who sees exposure.\n\nThe operator looks at the dollar amount and stops thinking. The investor stress-tests every assumption:\n\n→ What if repairs exceed budget by 20%?\n→ What if the market corrects 5%?\n→ What if absorption takes 3 additional months?\n→ What if interest rates increase during the hold?\n\nIf the deal can't survive those scenarios, it isn't a deal. It's a bet.\n\nInvestors don't make bets. They make calculated decisions with defined downside.\n\n#RealEstate #RiskManagement #InvestorThinking #ProfessionalDevelopment`},
{id:'lib28',ch:'ch2',theme:'The Three Habits',image:'',facebook:`Investor thinking requires THREE habits:\n\n1️⃣ Always compare opportunities.\nNever evaluate a deal in a vacuum. What else could your capital be doing RIGHT NOW?\n\n2️⃣ Always adjust return requirements to risk.\nMore risk = demand more reward. Less risk = accept lower returns. Simple. Most people do the opposite.\n\n3️⃣ Always prioritize velocity over vanity.\nA fast nickel beats a slow dime. Every time.\n\nEmotional operators ask, "Can I make money?"\nProfessional operators ask, "What else could this capital be doing?"\n\nThe difference is why some people end up with a handful of wins...\n\n...and others end up with a PORTFOLIO. 🏗️\n\nSave this. Share this. Live this.\n\n#InvestorMindset #RealEstate #WealthBuilding #MyersHomebuyers`,linkedin:`Investor thinking requires three habits:\n\n1. Always compare opportunities.\nNever evaluate a deal in isolation. Compare returns to risk-free alternatives, to other available deals, and to the velocity of your own capital.\n\n2. Always adjust return requirements to risk.\nRequire more reward when risk increases. Accept less reward when risk decreases.\n\n3. Always prioritize velocity over vanity.\nA higher-percentage, faster-turning deal will always outperform a higher-dollar, slower deal over a career.\n\nEmotional operators ask, "Can I make money?"\nProfessional operators ask, "What else could this capital be doing?"\n\nThat distinction is the difference between a handful of wins and a portfolio.\n\n#RealEstate #InvestorMindset #WealthBuilding #ProfessionalGrowth`},
{id:'lib29',ch:'ch2',theme:'Activity vs Judgment',image:'',facebook:`Hustle culture lied to you. 🫠\n\nYou don't need more deals.\nYou don't need more hours.\nYou don't need more "volume."\n\nYou need better JUDGMENT.\n\nThe operators who win aren't grinding 80 hours a week.\nThey're spending 2 hours thinking about what the other guy spent 20 hours chasing.\n\nActivity ≠ Progress.\nProfit ≠ Opportunity.\nBusy ≠ Building.\n\nThis chapter gives you the lens.\nThe rest of the book gives you the system.\n\n📖 Chapter 2: Thinking Like an Investor, Not a Wholesaler.\n\n#Mindset #RealEstate #InvestorAgent #MyersHomebuyers #StopGrinding`,linkedin:`Most people who enter real estate don't suffer from lack of effort. They suffer from lack of judgment.\n\nThey chase dollar signs instead of evaluating opportunity.\nThey confuse activity with progress.\nThey treat profit as an absolute, not a relative measure.\n\nThe operators who build lasting wealth aren't necessarily the busiest. They're the ones who've learned to evaluate, compare, and decide with clarity.\n\nChapter 2 — "Thinking Like an Investor, Not a Wholesaler" — is about rewiring the way you evaluate deals so you operate like a professional, not a gambler.\n\nThis chapter gives you the lens. The rest of the book gives you the system.\n\n#RealEstate #InvestorMindset #ThoughtLeadership #BookPreview`},
{id:'lib30',ch:'ch2',theme:'Micro Post — Best Case',image:'',facebook:`If the deal only works in the best-case scenario...\n\nIt isn't a deal.\n\nIt's a liability waiting for confirmation. 💀\n\n#InvestorMindset #RealEstate #MyersHomebuyers #Truth`,linkedin:`"If the deal only works in the best-case scenario, it isn't a deal. It's a liability waiting for confirmation."\n\nThe clearest test of any investment: can it survive imperfect conditions?\n\nIf the answer is no, pass. Every time.\n\n#RealEstate #InvestorThinking #RiskManagement`},
{id:'lib31',ch:'ch5',theme:'The 10-Minute Rule',image:'',facebook:`Most operators lose deals in the first 10 minutes.\n\nNot because they said the wrong thing.\nBecause they said TOO MUCH. 🤐\n\nThey explain assignment mechanics.\nThey talk about walking contractors through.\nThey answer questions the seller hasn't even asked.\n\nThe real professional takes a different approach:\nSimple. Quiet. Confident. Clear.\n\nYou keep the seller's attention on the NUMBER — not the noise.\n\nYou don't mention access until price is agreed.\nYou don't talk about showings upfront.\nYou don't walk into hypothetical explanations.\n\nIf you don't make it complicated, the seller won't either.\n\nThis is how professionals lock up deals. 🔒\n\n#DealMaking #RealEstate #InvestorAgent #MyersHomebuyers`,linkedin:`Most operators lose deals in the first ten minutes because they say too much.\n\nThey explain assignment mechanics. They discuss contractor walkthroughs. They try to answer questions the seller hasn't even thought of.\n\nThe professional approach is different: simple, quiet, confident, and clear.\n\nKeep the seller's attention on the number — not the noise.\n\n→ Don't mention access until price is agreed\n→ Don't talk about showings upfront\n→ Don't walk into hypothetical explanations\n\nIf you don't make it complicated, the seller won't either.\n\n#RealEstate #Negotiation #InvestorAgent #ProfessionalDevelopment`},
{id:'lib32',ch:'ch5',theme:'The Option Period Script',image:'',facebook:`Want the exact script I use for option periods? Here it is:\n\n🎯 "I use the option period to evaluate my options, review everything with my investment partners, and make sure I didn't miss anything. It's essentially my mistake period."\n\nThat's it.\n\nNo deep dive.\nNo mechanical explanation.\nNo long-winded justification.\n\nBecause if you don't make it complicated, the seller won't either.\n\nAnd here's the structure:\n📌 Standard deal: 10 days\n📌 Confident deal: 7 days\n📌 High conviction: No option period\n📌 Super high conviction: Immediate close\n\nConfidence comes from underwriting, not stalling.\n\nSave this. Use this. Close more deals. ✅\n\n#Script #RealEstate #DealClosing #MyersHomebuyers`,linkedin:`The option period script that's closed hundreds of deals:\n\n"I use the option period to evaluate my options, review everything with my investment partners, and make sure I didn't miss anything. It's essentially my mistake period."\n\nNo deep dive. No mechanical explanation.\n\nStructure:\n→ Standard deal: 10 days\n→ Confident deal: 7 days\n→ High conviction: No option period\n→ Super high conviction: Immediate close\n\nA long option period doesn't save a bad deal. A short one doesn't hurt a good one.\n\nConfidence comes from underwriting, not stalling.\n\n#RealEstate #Scripts #Negotiation #InvestorAgent`},
{id:'lib33',ch:'ch5',theme:'80% Showings Rule',image:'',facebook:`Our dispo structure is deliberate:\n\n🏠 80% — Showings (Auction-Style)\n⚡ 20% — FCFS ("Buy Now")\n\nNot both. Never both.\n\nRunning auctions and FCFS simultaneously confuses buyers and DAMAGES your credibility.\n\nHere's why showings dominate:\n\n🔥 They create urgency\n🔥 They create competition\n🔥 They create FOMO\n🔥 They reveal who your REAL buyers are\n\nWhen you become known for delivering great deals, investors begin shaping their schedules around YOUR showing calendar.\n\nThat predictability? It's a market ASSET.\n\nDon't ruin it with inconsistency.\n\nProfessionals use psychology ethically to increase performance.\nShowings do exactly that.\n\n#Dispositions #RealEstate #InvestorAgent #MyersHomebuyers`,linkedin:`Our disposition structure is deliberate: 80% showings (auction-style), 20% FCFS.\n\nNot both simultaneously. Never both.\n\nRunning auctions and first-come-first-served at the same time confuses buyers and damages credibility.\n\nA showing is fundamentally psychological:\n→ It creates urgency\n→ It creates competition\n→ It creates FOMO\n→ It reveals who your real buyers are\n\nWhen you deliver consistently, investors begin shaping their schedules around your showing calendar. That predictability becomes a market asset.\n\nProfessionals use psychology ethically to increase performance. Showings do exactly that.\n\n#RealEstate #Dispositions #InvestorRelations #Strategy`},
{id:'lib34',ch:'ch5',theme:'Double Close Ethics',image:'',facebook:`We double close. We do NOT assign outward.\n\nHere's why: 👇\n\n✅ We remain a party to the transaction\n✅ Title insurance protects us\n✅ Transparency increases\n✅ Homeowners are not misled\n✅ We avoid regulatory gray areas\n✅ We avoid state licensing issues\n✅ We uphold the ethical standard\n\nDouble closing is slower.\nDouble closing is more expensive.\nDouble closing is also more PROFESSIONAL.\n\nProfessionals choose the path that:\n🛡️ Reduces risk\n🔍 Increases clarity\n🏗️ Upholds the reputation of the brand\n\nThis is the investor-agent standard.\n\n#DoubleClose #Ethics #RealEstate #MyersHomebuyers`,linkedin:`Our position is clear: we double close. We do not assign outward.\n\nWhy?\n→ We remain a party to the transaction\n→ Title insurance protects us\n→ Transparency increases\n→ Homeowners are not misled\n→ We avoid regulatory gray areas tied to assignments\n→ We uphold the ethical standard of the investor-agent model\n\nDouble closing is slower. Double closing is more expensive.\n\nDouble closing is also more professional.\n\nProfessionals choose the path that reduces risk, increases clarity, and upholds the reputation of the brand.\n\n#RealEstate #Ethics #DoubleClose #ProfessionalStandards`},
{id:'lib35',ch:'ch5',theme:'Deposits Create Certainty',image:'',facebook:`The bidding rules that changed everything:\n\n⏱️ Bids due: 15 min after top of the hour\n💰 Deposit: Minimum $5,000 NON-REFUNDABLE\n📋 Proof of funds: Not required\n🎯 Target profit: $7,000 minimum per deal\n\nBut the rule that matters MOST?\n\nNon-refundable deposits create CERTAINTY.\nAssignments create ANXIETY.\nDouble closes create PROFESSIONALISM.\n\nWe also speak to every buyer. Not just for safety — but because we know exactly who can close and who cannot.\n\nWhen your system filters ability through deposits instead of documents, you eliminate 90% of tire-kickers.\n\nStructured control = predictable results. 📊\n\n#DealStructure #RealEstate #InvestorAgent #MyersHomebuyers`,linkedin:`Our bidding structure is simple and strict:\n\n→ Bids due 15 minutes after the top of the hour\n→ Minimum $5,000 non-refundable deposit\n→ Proof of funds not required (deposits filter ability)\n→ $7,000 minimum profit target per deal\n\nThe principle that drives everything:\n\nNon-refundable deposits create certainty.\nAssignments create anxiety.\nDouble closes create professionalism.\n\nWe speak to every buyer — not just for safety, but because we know exactly who can close and who cannot.\n\nStructured control produces predictable results.\n\n#RealEstate #Dispositions #DealStructure #InvestorAgent`},
{id:'lib36',ch:'ch5',theme:'The Smooth Timeline',image:'',facebook:`A predictable, professional deal timeline:\n\n📝 Contract signed: Day 0\n🏠 Showing scheduled: Days 3–5\n👥 Investor attendance: 5–10 buyers\n💰 Bids received: Immediately after showing\n🏆 Highest bid selected: Same day\n🔑 Closing: 14–30 days\n\nIf you can't close a clean deal in 14 days, the problem isn't the title company.\n\nThe problem is your SYSTEMS.\n\nThe secret to smooth deals? A deep buyer bench.\n\nOnce we hit ~600 verified investors, we could sell nearly everything we put under contract.\n\nA strong buyer ecosystem stabilizes the ENTIRE front side of your business. 🏗️\n\n#DealTimeline #RealEstate #Systems #MyersHomebuyers`,linkedin:`A predictable, professional deal timeline:\n\nContract signed → Day 0\nShowing scheduled → Days 3-5\nInvestor attendance → 5-10 buyers\nBids received → Immediately after showing\nHighest bid selected → Same day\nClosing → 14-30 days\n\nIf you cannot close a clean deal in 14 days, the problem is not the title company. The problem is your systems.\n\nThe key: a deep buyer bench. Once we reached approximately 600 verified investors, we could sell nearly everything we put under contract.\n\nA strong buyer ecosystem stabilizes the entire front side of your business.\n\n#RealEstate #Systems #DealFlow #Operations`},
{id:'lib37',ch:'ch5',theme:'Chaos = Structure Avoided',image:'',facebook:`Chaos is simply structure AVOIDED.\n\nChaotic deals always include:\n❌ Delayed access\n❌ Bad or unclear estimates\n❌ Poor investor turnout\n❌ Last-minute bidding\n❌ Hesitation to cancel\n❌ Hidden title issues discovered late\n❌ Seller surprise\n❌ Investor backing out without deposit\n\nIn EVERY case, the root cause is the same:\n\nSomeone avoided an uncomfortable conversation. 😬\n\nSuccess isn't determined by what you do when things go right.\n\nIt's determined by what you do the MOMENT something goes wrong.\n\nProfessionals call immediately.\nAmateurs wait and hope.\n\nWhich one are you?\n\n#Leadership #RealEstate #InvestorAgent #MyersHomebuyers`,linkedin:`Chaos is simply structure avoided.\n\nChaotic deals typically include:\n→ Delayed access\n→ Bad or unclear estimates\n→ Poor investor turnout\n→ Last-minute bidding\n→ Hesitation to cancel\n→ Hidden title issues discovered late\n→ Investor backing out without a deposit\n\nIn every case, the root cause is the same: someone avoided an uncomfortable conversation.\n\nSuccess in a deal business isn't determined by what you do when things go right. It's determined by what you do the moment something goes wrong.\n\nProfessionals call immediately. Amateurs wait and hope.\n\n#RealEstate #Operations #Leadership #ProfessionalDevelopment`},
{id:'lib38',ch:'ch5',theme:'Set Expectations Early',image:'',facebook:`The biggest mistake new operators make during option periods:\n\nThey fail to set homeowner expectations. 🚨\n\nThey say:\n😬 "It'll be fine."\n😬 "We're good."\n😬 "We'll figure it out."\n\nThey SHOULD say:\n✅ "If the deal is tight, I'll tell you."\n✅ "If something doesn't look right, I'll have someone verify."\n✅ "I appreciate the opportunity and I'll be transparent."\n\nSellers can tolerate UNCERTAINTY.\nThey cannot tolerate SURPRISES.\n\nIf something is going sideways — you call IMMEDIATELY.\nNot at the last minute.\nNot when it's too late.\n\nProblems rarely solve themselves.\nBut they almost never create conflict when addressed EARLY.\n\n#Communication #RealEstate #InvestorAgent #MyersHomebuyers`,linkedin:`The biggest mistake new operators make during the option period is simple: they fail to set homeowner expectations.\n\nInstead of vague reassurances, professionals say:\n→ "If the deal is tight, I'll tell you."\n→ "If something doesn't look right, I'll have someone verify the numbers."\n→ "I appreciate the opportunity and I'll be transparent along the way."\n\nSellers can tolerate uncertainty. They cannot tolerate surprises.\n\nIf something is going sideways, you call immediately. Not at the last minute. Not when it's too late.\n\nProblems rarely solve themselves. But they almost never create conflict when addressed early.\n\n#RealEstate #Communication #ProfessionalDevelopment #Leadership`},
{id:'lib39',ch:'ch5',theme:'Operator to Owner',image:'',facebook:`You don't run deals.\nYou run a SYSTEM:\n\n✅ Clear script\n✅ Clean contract\n✅ Defined option period\n✅ Predictable showing calendar\n✅ Controlled bidding\n✅ Strong buyer pool\n✅ Non-refundable deposits\n✅ Double close professionalism\n✅ Early expectation management\n✅ Tight communication with sellers\n\nWhen your timeline is predictable, your REVENUE becomes predictable.\n\nAnd when your revenue is predictable, you can SCALE — because the business becomes something more than your personal effort.\n\nThis is the evolution from operator to OWNER. 🏗️\n\nIt's not the market that creates consistency.\nIt's your system.\n\n#Systems #Scale #RealEstate #MyersHomebuyers #BusinessOwner`,linkedin:`You don't run deals. You run a system.\n\n→ Clear script\n→ Clean contract\n→ Defined option period\n→ Predictable showing calendar\n→ Controlled bidding\n→ Strong buyer pool\n→ Non-refundable deposits\n→ Double close professionalism\n→ Early expectation management\n→ Tight communication with sellers\n\nWhen your timeline is predictable, your revenue becomes predictable. And when your revenue is predictable, you can scale — because the business becomes something more than your personal effort.\n\nThis is the evolution from operator to owner.\n\nIt's not the market that creates consistency. It's your system.\n\n#RealEstate #Systems #Scale #Leadership #Operations`},
{id:'lib40',ch:'ch5',theme:'Micro Post — Call Immediately',image:'',facebook:`Professionals call immediately.\nAmateurs wait and hope.\n\nThat's the entire difference. 📞\n\n#RealEstate #Leadership #MyersHomebuyers #Truth`,linkedin:`"Success in a deal business isn't determined by what you do when things go right. It's determined by what you do the moment something goes wrong."\n\nProfessionals call immediately. Amateurs wait and hope.\n\n#RealEstate #Leadership #Operations`},
{id:'lib41',ch:'ch3',theme:'Why Deal Businesses Collapse',image:'',facebook:`The #1 reason deal businesses collapse isn't leads.\nIt isn't competition.\nIt isn't the market.\n\nIt's this: They never understood the economics that powered the business in the first place. 📉\n\nThey track spreads instead of systems.\nRevenue instead of reserves.\nActivity instead of capacity.\n\nThey celebrate the size of a single assignment fee instead of the repeatability of a model.\n\nThey behave like PRODUCERS, not OWNERS.\n\nThe difference between a high-income hustle and a high-profit business?\n\nFinancial infrastructure.\n\nAnd almost nobody builds it.\n\n#BusinessBasics #RealEstate #InvestorAgent #MyersHomebuyers`,linkedin:`The number-one reason deal businesses collapse — especially wholesaling and fix-and-flip — is simple:\n\nThey never understood the economics that powered the business in the first place.\n\nThey track spreads instead of systems. Revenue instead of reserves. Activity instead of capacity.\n\nThey celebrate the size of a single assignment fee instead of the repeatability of a model.\n\nThey behave like producers, not owners.\n\nThis is the difference between a high-income hustle and a high-profit business.\n\n#RealEstate #BusinessStrategy #UnitEconomics #Leadership`},
{id:'lib42',ch:'ch3',theme:'The 33% Rule',image:'',facebook:`The number that determines if your deal business lives or dies:\n\n📊 CAC (Customer Acquisition Cost)\n\nCAC = Total Marketing Spend ÷ Deals Closed\n\nThe rule is ABSOLUTE:\n\n🟢 CAC under 33% of avg revenue → HEALTHY\n🟡 CAC at 35% → Margins shrinking\n🔴 CAC at 45% → Reserves drying up\n💀 CAC at 60% → Borrowed time\n\nIf your average revenue per deal is $20,000:\n\n✅ $6,600 CAC = sustainable\n⚠️ $7,000 = warning\n🚨 $9,000 = danger\n💀 $12,000 = you're dying (whether you feel it or not)\n\nThe moment CAC creeps above 33%, the business begins consuming itself.\n\nThis is where ALMOST every operator fails.\n\nNot because the model is bad.\nBecause they don't understand their own math.\n\n#CAC #RealEstate #BusinessMath #MyersHomebuyers`,linkedin:`CAC — Customer Acquisition Cost — is the survival number for every deal business.\n\nCAC per deal = Total marketing spend ÷ Number of deals closed\n\nThe rule is absolute: CAC must never exceed 33% of your average revenue per deal.\n\nIf your average revenue per deal is $20,000:\n→ $6,600 CAC = sustainable\n→ $7,000 = margins start shrinking\n→ $9,000 = reserves dry up\n→ $12,000 = borrowed time\n\nThe moment CAC creeps above 33%, the business begins consuming itself.\n\nThis is where almost every operator fails. Not because the model is bad. Because they don't understand their own math.\n\n#RealEstate #UnitEconomics #BusinessStrategy #Operations`},
{id:'lib43',ch:'ch3',theme:'The $100K LexisNexis Disaster',image:'',facebook:`A virtual assistant — who should NEVER have had login access — used our LexisNexis account to run searches for other investors.\n\nThe bill? $100,000. 💸\n\nNo villain. No scam.\nJust bad internal discipline.\n\nBut that wasn't the only lesson:\n\n💰 A payroll provider accidentally sent nearly our ENTIRE operating balance to the IRS.\n\n📦 A distribution company we PAID to place door hangers... dumped thousands of them in someone's backyard.\n\nWe paid for air.\n\nEvery dollar is a soldier. 🪖\nMismanage enough of them and the business loses the war.\n\nCash doesn't care about your intentions.\nIt only cares about your controls.\n\n#CashManagement #RealEstate #LessonsLearned #MyersHomebuyers`,linkedin:`Three expensive lessons in cash management:\n\n1. A virtual assistant — who should never have had login access — used our LexisNexis account to run searches for other investors. The bill: $100,000.\n\n2. A payroll provider accidentally sent nearly our entire operating balance to the IRS. We were made whole, but the lesson was permanent.\n\n3. We paid a distribution company to place door hangers. A homeowner called furious: "There are thousands of flyers in my backyard." They dumped them. We paid for air.\n\nNo villains. No scams. Just bad internal discipline.\n\nCash doesn't care about your intentions. It only cares about your controls.\n\nEvery dollar is a soldier. Mismanage enough of them and the business loses the war.\n\n#RealEstate #CashManagement #BusinessLessons #Leadership`},
{id:'lib44',ch:'ch3',theme:'Consistency > Max Profit',image:'',facebook:`The insight that changed how we built our business:\n\nThe bigger the spread, the LESS repeat business we did with the buyer. 🤯\n\nThink about that.\n\n→ First-time buyers paid the most\n→ They often overpaid relative to risk\n→ They rarely bought again\n→ The "big wins" were usually one-offs\n\nConsistent spreads came from EXPERIENCED operators — people making rational, repeatable decisions.\n\nAnd they bought again. And again. And again.\n\nMost wholesalers chase the highest spread.\nThey never notice that CONSISTENCY — not maximum profit — is what grows a business.\n\nYou cannot scale without consistent buyers.\nAnd you cannot get consistent buyers if your margins only work for the inexperienced.\n\n#ScaleSmarter #RealEstate #InvestorAgent #MyersHomebuyers`,linkedin:`Here's the insight most operators miss:\n\nThe bigger the spread, the less repeat business we did with the investor who bought from us.\n\nFirst-time or inexperienced buyers paid the most. They often overpaid relative to risk. They rarely bought again. The "big wins" were usually one-offs.\n\nConsistent spreads came from experienced operators — people making rational, repeatable decisions. And they bought again and again.\n\nMost wholesalers never track this. They chase the highest spread. They never notice that consistency — not maximum profit — is what grows a business.\n\nYou cannot scale without consistent buyers.\n\n#RealEstate #UnitEconomics #Scaling #Strategy`},
{id:'lib45',ch:'ch3',theme:'3 Months vs 6 Months',image:'',facebook:`How much runway does your business have?\n\nBe honest. 👇\n\n📊 3 months of reserves = SURVIVAL\nYou can weather a bad quarter.\n\n📊 6 months of reserves = FREEDOM\nYou can:\n✅ Hire before you need to\n✅ Experiment without fear\n✅ Invest when others retreat\n✅ Reject deals that don't fit your model\n✅ Replace talent without panic\n✅ Scale deliberately instead of reactively\n\nMost operators never reach 6 months.\n\nNot because they lack income.\nBecause they lack DISCIPLINE.\n\nAfter the first time I hit 6 months of reserves, I rarely wanted less.\n\nReserves aren't just oxygen.\nThey're your competitive advantage.\n\n#Reserves #CashManagement #RealEstate #MyersHomebuyers`,linkedin:`I always targeted 3-6 months of corporate reserves, including my salary.\n\nAfter the first time I hit 6 months, I rarely wanted less.\n\n3 months = survival. You can weather a bad quarter.\n\n6 months = freedom. You can:\n→ Hire before you need to\n→ Experiment without fear\n→ Invest when others retreat\n→ Reject deals that don't fit your model\n→ Replace talent without panic\n→ Scale deliberately instead of reactively\n\nMost operators never reach this point. Not because they lack income — but because they lack discipline.\n\n#RealEstate #CashManagement #BusinessStrategy #Leadership`},
{id:'lib46',ch:'ch3',theme:'The 25-47 Lead Sweet Spot',image:'',facebook:`The insight that changed our hiring discipline forever:\n\nEvery acquisitions agent has a lead capacity threshold where performance PEAKS. 📈\n\n🎯 25–47 leads per month.\n\n⬇️ Below that: underperformance\n⬆️ Above that: burnout and dropped opportunities\n\nThis single metric determines:\n• When to hire\n• When to stop feeding leads\n• When someone is overwhelmed vs underperforming\n\nIf you want predictable revenue, you MUST protect that equilibrium.\n\nMost companies either starve their agents or drown them.\n\nNeither produces results.\nBoth waste money.\n\n#Hiring #RealEstate #Acquisitions #MyersHomebuyers`,linkedin:`Every acquisitions agent has a lead capacity threshold where performance peaks: 25-47 leads per month.\n\nBelow that number: underperformance.\nAbove that number: burnout and dropped opportunities.\n\nThis single insight changed our hiring discipline.\n\nIt determined when to hire, when to stop feeding leads, and when someone was overwhelmed versus underperforming.\n\nIf you want predictable revenue, you must protect that equilibrium.\n\nMost companies either starve their agents or drown them. Neither produces results. Both waste money.\n\n#RealEstate #Operations #Hiring #Leadership`},
{id:'lib47',ch:'ch3',theme:'Cost Structure Rules',image:'',facebook:`The correct spending structure for a deal business:\n\n🏢 Office & Overhead: 1–5% of revenue\n(Never exceed 5%. Signing a premium lease before premium revenue is the fastest way to die.)\n\n👥 Staff Compensation: Never exceed 20%\n(This includes YOUR salary. Forces discipline in headcount.)\n\n📣 Marketing: Target 20–25% of revenue\n(Never cross 33%. This buffer is where resilience comes from.)\n\n💰 Acquisitions Pay:\n→ 12.5% on flips\n→ 15% on wholesales\n→ Up to 20% on self-generated deals\n\nAcquisitions is the most valuable role because it creates new revenue.\n\nIf you don't reward that correctly, they leave.\nAnd your business leaves with them. 🚶‍♂️\n\n#BusinessStructure #RealEstate #Compensation #MyersHomebuyers`,linkedin:`There is a correct structure for spending money in a deal business. Deviate from it long enough and the business breaks.\n\nOffice & Overhead: 1-5% of annual revenue (never exceed 5%)\nStaff Compensation: Never exceed 20% of revenue (including your salary)\nMarketing: Target 20-25% of revenue (never cross 33%)\n\nAcquisitions Compensation:\n→ 12.5% on flips\n→ 15% on wholesales\n→ Up to 20% on self-generated deals\n\nAcquisitions is the most valuable role because it creates new revenue. If you don't reward that correctly, they leave — and your business leaves with them.\n\nCompensation must be tied to performance. Not tenure. Not personality. Not effort.\n\n#RealEstate #BusinessStructure #Compensation #Operations`},
{id:'lib48',ch:'ch3',theme:'Marketing is Probability',image:'',facebook:`Marketing is NOT an expense.\nIt's a controlled experiment in probability. 🧪\n\nBut you MUST understand the inputs:\n\n📬 Direct Mail: $100–$1,500/lead, ~$500 qualified\n💻 PPC: $500–$600/lead, 7–10% conversion\n📺 Radio/TV: Highest cost, 30% conversion, dangerous variance\n\nHere's where amateurs drown:\n\nThey track cost per LEAD.\nThey should track cost per QUALIFIED LEAD.\n\nA business scales on qualified conversations — not form fills, not clicks, not postcards.\n\nOur target: 10% blended conversion on qualified leads across ALL channels.\n\nAcquisitions agents who supplemented with:\n🚪 Door knocking\n📋 Pre-foreclosure outreach\n🤝 Agent relationships\n\n...produced INFINITE ROI when the only cost was courage.\n\n#Marketing #RealEstate #LeadGen #MyersHomebuyers`,linkedin:`Marketing is not an expense. It's a controlled experiment in probability.\n\nBut you must understand the inputs:\n\n→ Direct Mail: $100-$1,500 per lead, ~$500 per qualified lead\n→ PPC (Major Markets): $500-$600 per lead, 7-10% conversion\n→ Radio/TV: Highest cost per lead, 30% conversion, dangerous variance\n\nThe distinction that separates professionals from amateurs: tracking cost per qualified lead, not cost per lead.\n\nA business scales on qualified conversations — not form fills, not clicks, not postcards.\n\nOur target was a 10% blended conversion rate on qualified leads across all channels.\n\n#RealEstate #Marketing #LeadGeneration #BusinessStrategy`},
{id:'lib49',ch:'ch3',theme:'Hustler to CEO',image:'',facebook:`Producers ask:\n"How many deals can I close this month?"\n\nOwners ask:\n"How do I make sure deals happen every month — with or WITHOUT me?" 🏗️\n\nBudgeting, cash management, and unit economics aren't accounting tasks.\n\nThey are the OPERATING SYSTEM behind every business that survives long enough to scale.\n\nOnce you understand these mechanics:\n📊 Chaos becomes predictable\n📈 Predictable becomes scalable\n🏢 Scalable becomes transferable\n\nThis is where you stop being a hustler.\nThis is where you start being a CEO.\n\n#CEO #RealEstate #Scale #MyersHomebuyers #BusinessOwner`,linkedin:`Producers ask: "How many deals can I close this month?"\n\nOwners ask: "How do I make sure deals happen every month — with or without me?"\n\nBudgeting, cash management, and unit economics aren't accounting tasks. They are the operating system behind every business that survives long enough to scale.\n\nOnce you understand these mechanics, the chaos of the deal business becomes predictable. Once it becomes predictable, it becomes scalable. Once it becomes scalable, it becomes transferable.\n\nThis is where you stop being a hustler. This is where you start being a CEO.\n\n#RealEstate #Leadership #Scale #BusinessStrategy`},
{id:'lib50',ch:'ch3',theme:'Micro Post — Every Dollar',image:'',facebook:`Every dollar is a soldier. 🪖\n\nMismanage enough of them and the business loses the war.\n\nCash doesn't care about your intentions.\nIt only cares about your controls.\n\n#CashManagement #RealEstate #MyersHomebuyers`,linkedin:`"Cash doesn't care about your intentions. It only cares about your controls."\n\nEvery dollar is a soldier. Mismanage enough of them and the business loses the war.\n\n#RealEstate #CashManagement #BusinessDiscipline`},
{id:'lib51',ch:'ch4',theme:'Comp Like an Investor',image:'',facebook:`The biggest ARV mistake operators make:\n\nIt's not picking the wrong comp.\nIt's not overestimating finishes.\nIt's not misunderstanding square footage.\n\nIt's this: They find comps to JUSTIFY their price, not comps to SUPPORT it. 🎯\n\nThis mindset infects:\n❌ Wholesalers trying to push a deal\n❌ New agents trying to impress a seller\n❌ Investors trying to force a number into their buy-box\n❌ Teams trying to hit quota\n\nThe truth is simple:\n\nIf you comp like an INVESTOR, you make money.\nIf you comp like a STORYTELLER, you lose money.\n\nProfessionals think like buyers.\nAmateurs think like marketers.\n\n#Valuation #RealEstate #InvestorAgent #MyersHomebuyers`,linkedin:`The biggest ARV mistake operators make isn't picking the wrong comp. It isn't overestimating finishes or misunderstanding square footage.\n\nIt's this: they find comps to justify their price, not comps to support it.\n\nThis mindset infects wholesalers trying to push a deal, agents trying to impress a seller, investors trying to force numbers into their buy-box, and teams trying to hit quota.\n\nIf you comp like an investor, you make money.\nIf you comp like a storyteller, you lose money.\n\nProfessionals think like buyers. Amateurs think like marketers.\n\n#RealEstate #Valuation #InvestorThinking #Strategy`},
{id:'lib52',ch:'ch4',theme:'The 75% Rule is Broken',image:'',facebook:`Nothing is abused more than the "75% of ARV minus repairs" formula. 🚫\n\nHere's how novice wholesalers misuse it:\n\n1️⃣ Pull Zillow Zestimate\n2️⃣ Multiply by 0.75\n3️⃣ Subtract a made-up repair number\n4️⃣ Call it "a deal"\n5️⃣ Wonder why no buyer shows up 🤷\n\nThis is especially disastrous in rural areas where:\n📉 Inventory moves slowly\n👻 Buyers are sparse\n⏰ Time risk is enormous\n\nThe discount must be MUCH steeper than 75%.\n\nThe only correct discount is the one justified by RISK, not by guru math.\n\nThe worse the absorption, the larger the required margin.\n\nFormulas don't survive markets.\nOnly LOGIC does.\n\n#RealEstate #Wholesaling #ARV #MyersHomebuyers`,linkedin:`Nothing is abused more than the "75% of ARV minus repairs" formula.\n\nNovice wholesalers misuse it constantly: pull a Zillow Zestimate, multiply by 0.75, subtract a made-up repair number, call it "a deal," then wonder why no buyer shows up.\n\nThis is especially disastrous in rural areas where inventory moves slowly, buyers are sparse, and time risk is enormous.\n\nThe only correct discount is the one justified by risk, not by guru math.\n\nThe worse the absorption, the larger the required margin. Your discount rate must always flex with risk.\n\nFormulas don't survive markets. Only logic does.\n\n#RealEstate #Wholesaling #Valuation #InvestorMindset`},
{id:'lib53',ch:'ch4',theme:'The 120% Churn Story',image:'',facebook:`In one Dallas neighborhood in the early 2010s, something unusual appeared:\n\n📊 120% churn in 3 months.\n\nMeaning: the number of homes SOLD exceeded the number of homes AVAILABLE.\n\nIf 100 homes sold, only ~80 existed at any given moment.\n\nTextbook definition of a high-velocity market. 🚀\n\nOn paper, agents saw "6+ months average days on market" from MLS aggregates.\n\nBut the MICRO-LEVEL absorption revealed the truth:\nDemand was overwhelming supply.\n\nI recognized it.\nI bought 15 homes in six months.\nI made 40% gross returns. Repeatedly.\n\nMost operators never see these opportunities because they never look at ABSORPTION.\n\nAbsorption is the most powerful indicator in residential valuation — and the least used.\n\n#Absorption #RealEstate #DealFlow #MyersHomebuyers`,linkedin:`In one Dallas neighborhood in the early 2010s, something unusual appeared: 120% churn in 3 months.\n\nThe number of homes sold exceeded the number of homes available. If 100 homes sold, only ~80 existed at any given moment.\n\nOn paper, agents saw "6+ months average days on market" from broad MLS aggregates. But micro-level absorption revealed the truth: demand was overwhelming supply.\n\nI recognized it. Bought 15 homes in six months. Made 40% gross returns repeatedly.\n\nMost operators never see these opportunities because they never look at absorption.\n\nAbsorption is the most powerful indicator in residential valuation — and the least used.\n\n#RealEstate #MarketAnalysis #Absorption #InvestorMindset`},
{id:'lib54',ch:'ch4',theme:'ARV is a Range',image:'',facebook:`Stop treating ARV as a single number.\n\nIt's a RANGE. And here's exactly how professionals think about it:\n\n📗 Low ARV (100% confidence):\n→ Every comp supports it\n→ Home could sell here in ANY market\n→ This is your BUY number\n\n📕 High ARV (50% confidence):\n→ Fewer comps support it\n→ Only top performers justify it\n→ Buyer MIGHT hit it — might not\n→ This is your SELL hope\n\nProfessionals buy off the LOW.\nProfessionals sell off the HIGH.\n\nAmateurs buy off the HIGH and pray. 🙏\n\nAbsorption tells you how aggressive the high can be — or how conservative the low must be.\n\nThat discipline ALONE separates professionals from everyone else.\n\n#ARV #Valuation #RealEstate #MyersHomebuyers`,linkedin:`Stop treating ARV as a single number. It's a confidence band.\n\nLow ARV (100% confidence):\n→ Every comp supports it\n→ Certain the home could sell here in any market\n\nHigh ARV (50% confidence):\n→ Fewer comps support it\n→ Only top performers justify it\n→ A buyer might hit this number — but might not\n\nProfessionals buy off the low, sell off the high.\nAmateurs buy off the high and pray.\n\nAbsorption determines how aggressive the high ARV can be — or how conservative the low ARV must be.\n\nInstead of treating ARV as a fixed number, treat it as a confidence band. That discipline alone separates professionals from everyone else.\n\n#RealEstate #Valuation #ARV #InvestorMindset`},
{id:'lib55',ch:'ch4',theme:'5 Repair Blind Spots',image:'',facebook:`Even accurate ARV is useless if your repair estimate is FANTASY.\n\nHere are the blind spots that DESTROY margins: 💀\n\n1️⃣ FOUNDATIONS\nLocal expertise matters. Shifting soils or slab issues? Ignoring this is financial suicide.\n\n2️⃣ PLUMBING (Cast Iron)\nCast iron decays at 40–50 years. When it fails, the repair cost ERASES the spread.\n\n3️⃣ ELECTRICAL PANELS\nOld panels can't support modern loads. Replacing them triggers cascading requirements.\n\n4️⃣ STRUCTURAL SURPRISES\n"Minor cracks" often hide framing or settlement issues.\n\n5️⃣ LONG-LEAD PROJECTS\nRoof decks, structural beams, old ACs — all extend timelines, and time compounds holding risk.\n\nThe fix? ALWAYS hire licensed professionals.\nALWAYS disclose your role.\nALWAYS tell sellers you intend to profit.\n\nYou don't shortcut ethics. You shortcut your career if you try.\n\n#Rehab #RealEstate #InvestorAgent #MyersHomebuyers`,linkedin:`Even accurate ARV is useless if your repair estimate is fantasy.\n\nThe blind spots that repeatedly destroy margins:\n\n→ Foundations: Local expertise matters. Ignoring shifting soils is financial suicide.\n→ Plumbing (cast iron): Decays at 40-50 years. Failure erases the entire spread.\n→ Electrical panels: Old panels trigger cascading replacement requirements.\n→ Structural surprises: "Minor cracks" often hide framing or settlement issues.\n→ Long-lead projects: Roof decks, structural beams, old ACs — all extend timelines.\n\nAlways hire licensed professionals where required. Always disclose your role. Always tell sellers you intend to profit.\n\nYou don't shortcut ethics. You shortcut your career if you try.\n\n#RealEstate #Rehab #DueDiligence #InvestorAgent`},
{id:'lib56',ch:'ch4',theme:'The Income Approach Math',image:'',facebook:`Most single-family investors never learn the income approach.\nThat's why they overpay for rentals. 📊\n\nHere's the REAL math:\n\n🏠 Rent: $2,000/month → $24,000/year\n📉 50% expense ratio (SFR average) → $12,000 NOI\n🎯 Target 6.5% cap rate:\n\n$12,000 ÷ 0.065 = $184,615 maximum price\n\nIf other buyers pay $210,000?\nThey aren't wrong — they just have a different risk tolerance.\n\nOr NO understanding of real operating expenses.\n\n⚡ Expense ratios protect you from bad assumptions.\n⚡ Cap rates protect you from bad optimism.\n\nI started picky because I had less money.\nThat saved me.\n\nToday I'm flexible — but the math REMAINS.\n\n#IncomeApproach #CapRate #RealEstate #MyersHomebuyers`,linkedin:`Most single-family investors never learn the income approach. That's why they overpay for rentals and misunderstand yield.\n\nThe reality:\n→ Average expense ratio: ~50% for SFR, ~40% for multifamily\n→ These numbers are not negotiable\n\nExample:\n$2,000/month rent → $24,000/year\n50% expenses → $12,000 NOI\n6.5% cap rate target → $184,615 maximum price\n\nIf other buyers pay $210,000, they aren't wrong — they just have a different risk tolerance, or no understanding of real operating expenses.\n\nExpense ratios protect you from bad assumptions. Cap rates protect you from bad optimism.\n\nI started picky because I had less money. That saved me.\n\n#RealEstate #IncomeApproach #CapRate #InvestorMindset`},
{id:'lib57',ch:'ch4',theme:'Buy Below Replacement Cost',image:'',facebook:`Invitation Homes built a BILLION-dollar business on one simple idea:\n\nBuy below replacement cost. 🏗️\n\nNot ARV.\nNot MLS comps.\nREPLACEMENT COST.\n\nThis is the purest form of the cost approach.\n\nIt works because:\n✅ Insurance data is reliable\n✅ Build cost is quantifiable\n✅ Risk is reduced to a known baseline\n\nYou should never pay more for an existing product than it costs to create a new one — unless the market justifies it with velocity and scarcity.\n\nYou don't need to use this approach daily.\n\nBut understanding it expands your strategic options — especially in markets where build cost EXCEEDS sale price.\n\nThink bigger. Think like an institution.\n\n#CostApproach #RealEstate #Strategy #MyersHomebuyers`,linkedin:`Invitation Homes built a multi-billion dollar business on one simple idea: buy below replacement cost.\n\nNot ARV. Not MLS comps. Replacement cost.\n\nThis is the purest form of the cost approach. It works at institutional scale because:\n→ Insurance data is reliable\n→ Build cost is quantifiable\n→ Risk is reduced to a known baseline\n\nYou should never pay more for an existing product than it costs to create a new one — unless the market justifies it with velocity and scarcity.\n\nYou don't need to use the cost approach daily. But understanding it expands your strategic options — especially in markets where build cost exceeds sale price.\n\n#RealEstate #CostApproach #InstitutionalStrategy #InvestorMindset`},
{id:'lib58',ch:'ch4',theme:'Valuation is a Discipline',image:'',facebook:`Valuation is not a number.\nIt's a DISCIPLINE. 🎯\n\nWhen you bring it all together:\n\n📊 ARV is a RANGE, not a target\n⏱️ Absorption sets your discount\n🔧 Repair risks define your margin\n📈 Expense ratios protect your rental math\n💰 Cap rates protect your long-term wealth\n🏗️ Cost approach expands your strategy\n🤝 Honesty protects your future self\n\nValuation is not an art.\nIt is not a science.\nIt is a DISCIPLINE.\n\nAnd discipline is what keeps you solvent across cycles.\n\nThis is the difference between making money ONCE and making money FOREVER.\n\n#Valuation #RealEstate #InvestorAgent #MyersHomebuyers #Discipline`,linkedin:`Valuation is not a number. It's a discipline.\n\nWhen you bring it all together:\n→ ARV is a range, not a target\n→ Absorption sets your discount\n→ Repair risks define your margin\n→ Expense ratios protect your rental math\n→ Cap rates protect your long-term wealth\n→ Cost approach expands your strategic vision\n→ Honesty protects your future self\n\nValuation is not an art. It is not a science. It is a discipline.\n\nAnd discipline is what keeps you solvent across cycles.\n\nThis chapter is the difference between making money once and making money forever.\n\n#RealEstate #Valuation #Discipline #InvestorMindset`},
{id:'lib59',ch:'ch4',theme:'Micro Post — Honesty',image:'',facebook:`Valuation is not hard.\nValuation with honesty is hard.\nValuation with discipline is rare.\n\nValuation with risk-adjusted logic?\n\nThat's the dividing line between professionals and casualties. ⚔️\n\n#Valuation #RealEstate #MyersHomebuyers #Truth`,linkedin:`"Valuation is not hard. Valuation with honesty is hard. Valuation with discipline is rare. Valuation with risk-adjusted logic is the dividing line between professionals and casualties."\n\nWhich level are you operating at?\n\n#RealEstate #Valuation #InvestorThinking`}
];

function getAllLibraryItems() {
  return [...LIBRARY_POSTS, ...userLibraryPosts];
}

function renderLibrary() {
  const chFilter = document.getElementById('libraryChapterFilter').value;
  const platFilter = document.getElementById('libraryPlatformFilter').value;
  let items = getAllLibraryItems();
  if (chFilter !== 'all') items = items.filter(p => p.ch === chFilter);
  const badge = document.getElementById('libraryBadge');
  if (badge) badge.textContent = getAllLibraryItems().length;

  // Load any image overrides from localStorage
  const imgOverrides = JSON.parse(localStorage.getItem('myers_lib_images') || '{}');

  const grid = document.getElementById('libraryGrid');
  grid.innerHTML = items.map((item, idx) => {
    const showFb = platFilter === 'all' || platFilter === 'facebook';
    const showLi = platFilter === 'all' || platFilter === 'linkedin';
    const isScheduled = posts.some(p => p.librarySourceId === item.id && p.status !== 'Posted');
    const isPublished = posts.some(p => p.librarySourceId === item.id && p.status === 'Posted') || postedLibraryIds.includes(item.id);
    const isApprovalPending = approvals.some(a => a.libId === item.id && a.status === 'pending');
    const statusBadge = isPublished ? '<span style="background:#6B7280;color:#fff;padding:3px 10px;border-radius:20px;font-size:11px;font-weight:600">POSTED</span>' : isScheduled ? '<span style="background:#C9972C;color:#fff;padding:3px 10px;border-radius:20px;font-size:11px;font-weight:600">SCHEDULED</span>' : isApprovalPending ? '<span style="background:#3B82F6;color:#fff;padding:3px 10px;border-radius:20px;font-size:11px;font-weight:600">PENDING APPROVAL</span>' : '';
    const imgSrc = imgOverrides[item.id] !== undefined ? imgOverrides[item.id] : (item.image || '');
    const chLabels = {ch1:'Ch 1',ch2:'Ch 2',ch3:'Ch 3',ch4:'Ch 4',ch5:'Ch 5',user:'Generated'};
    const chLabel = chLabels[item.ch] || item.ch;
    const imagePanel = imgSrc
      ? `<div class="lib-img-panel" id="libimg-${item.id}">
           <img src="${imgSrc}" alt="${item.theme}" style="width:100%;height:100%;object-fit:contain;display:block;background:#f5f3ee" onerror="this.src='';this.alt='Image not found'">
           <div class="lib-img-actions">
             <button class="lib-img-btn" onclick="event.stopPropagation();removeLibImage('${item.id}')" title="Remove image">\u2715</button>
             <button class="lib-img-btn" onclick="event.stopPropagation();replaceLibImage('${item.id}')" title="Replace image">\ud83d\udd04</button>
           </div>
         </div>`
      : `<div class="lib-img-panel lib-img-empty" id="libimg-${item.id}" onclick="replaceLibImage('${item.id}')"
           ondragover="event.preventDefault();this.classList.add('lib-img-dragover')"
           ondragleave="this.classList.remove('lib-img-dragover')"
           ondrop="event.preventDefault();this.classList.remove('lib-img-dragover');dropLibImage(event,'${item.id}')">
           <div style="text-align:center;color:#9CA3AF">
             <div style="font-size:32px;margin-bottom:8px">\ud83d\udcf7</div>
             <div style="font-size:12px;font-weight:600">Drop image here</div>
             <div style="font-size:10px">or click to browse</div>
           </div>
         </div>`;

    return `<div class="card" style="padding:0;overflow:hidden;${isPublished?'opacity:0.5;filter:grayscale(40%)':''}">
      <div style="padding:14px 20px;background:var(--cream);border-bottom:1px solid var(--border);display:flex;justify-content:space-between;align-items:center">
        <div>
          <span style="font-weight:700;font-size:15px">#${idx+1} \u2014 ${item.theme}</span>
          <span style="font-size:11px;color:var(--text-secondary);margin-left:8px">${chLabel}</span>
        </div>
        <div style="display:flex;gap:6px;align-items:center">
          ${statusBadge}
          <button class="btn-sm" onclick="copyLibraryPost('${item.id}','facebook')" style="font-size:11px">Copy FB</button>
          <button class="btn-sm" onclick="copyLibraryPost('${item.id}','linkedin')" style="font-size:11px">Copy LI</button>
          ${isPublished ? '' : `<button class="btn-sm" onclick="scheduleLibraryPost('${item.id}')" style="font-size:11px;background:var(--gold);color:#fff">Schedule</button>`}
          ${isPublished || isScheduled || isApprovalPending ? '' : `<button class="btn-sm" onclick="submitForApproval('${item.id}')" style="font-size:11px;background:#3B82F6;color:#fff">Send for Approval</button>`}
        </div>
      </div>
      <div style="display:grid;grid-template-columns:280px 1fr;min-height:280px">
        ${imagePanel}
        <div style="display:grid;grid-template-columns:${showFb&&showLi?'1fr 1fr':'1fr'};gap:0;overflow-y:auto;max-height:500px">
          ${showFb ? `<div style="padding:16px 20px;${showLi?'border-right:1px solid var(--border)':''}">
            <div style="font-size:11px;font-weight:600;color:#1877F2;margin-bottom:8px;letter-spacing:0.05em">FACEBOOK</div>
            <div style="font-size:13px;line-height:1.7;white-space:pre-wrap;color:var(--text-primary)">${item.facebook}</div>
          </div>` : ''}
          ${showLi ? `<div style="padding:16px 20px">
            <div style="font-size:11px;font-weight:600;color:#0A66C2;margin-bottom:8px;letter-spacing:0.05em">LINKEDIN</div>
            <div style="font-size:13px;line-height:1.7;white-space:pre-wrap;color:var(--text-primary)">${item.linkedin || item.facebook}</div>
          </div>` : ''}
        </div>
      </div>
    </div>`;
  }).join('');
}



// Image management for library posts
function removeLibImage(libId) {
  const overrides = JSON.parse(localStorage.getItem('myers_lib_images') || '{}');
  overrides[libId] = '';
  localStorage.setItem('myers_lib_images', JSON.stringify(overrides));
  renderLibrary();
  showToast('🗑 Image removed');
}

function replaceLibImage(libId) {
  const input = document.createElement('input');
  input.type = 'file';
  input.accept = 'image/*';
  input.onchange = (e) => {
    const file = e.target.files[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (ev) => {
      const overrides = JSON.parse(localStorage.getItem('myers_lib_images') || '{}');
      overrides[libId] = ev.target.result;
      localStorage.setItem('myers_lib_images', JSON.stringify(overrides));
      renderLibrary();
      showToast('✅ Image updated!');
    };
    reader.readAsDataURL(file);
  };
  input.click();
}

function dropLibImage(e, libId) {
  const file = e.dataTransfer.files[0];
  if (!file || !file.type.startsWith('image/')) return;
  const reader = new FileReader();
  reader.onload = (ev) => {
    const overrides = JSON.parse(localStorage.getItem('myers_lib_images') || '{}');
    overrides[libId] = ev.target.result;
    localStorage.setItem('myers_lib_images', JSON.stringify(overrides));
    renderLibrary();
    showToast('✅ Image replaced!');
  };
  reader.readAsDataURL(file);
}

function copyLibraryPost(id, platform) {
  const item = getAllLibraryItems().find(p => p.id === id);
  if (!item) return;
  const text = platform === 'linkedin' ? (item.linkedin || item.facebook) : item.facebook;
  navigator.clipboard.writeText(text).then(() => showToast('✅ Copied ' + platform + ' post!'));
}

function scheduleLibraryPost(id) {
  const item = getAllLibraryItems().find(p => p.id === id);
  if (!item) return;
  // Show schedule picker modal
  const modal = document.getElementById('schedulePickerModal');
  if (!modal) return createScheduleModal(id);
  document.getElementById('schedPickerLibId').value = id;
  document.getElementById('schedPickerDate').value = todayISO();
  document.getElementById('schedPickerDate').min = todayISO();
  const optTime = getOptimalTime(todayISO());
  document.getElementById('schedPickerTimeDisplay').textContent = optTime;
  document.getElementById('schedPickerTheme').textContent = item.theme;
  modal.classList.add('open');
}

function createScheduleModal(libId) {
  const div = document.createElement('div');
  div.id = 'schedulePickerModal';
  div.className = 'modal open';
  div.innerHTML = `<div class="modal-content" style="max-width:420px">
    <input type="hidden" id="schedPickerLibId" value="${libId}">
    <h3 style="margin:0 0 16px">📅 Schedule Post</h3>
    <div style="font-size:14px;color:var(--text-secondary);margin-bottom:12px">Post: <strong id="schedPickerTheme">${getAllLibraryItems().find(p=>p.id===libId)?.theme||''}</strong></div>
    <div class="form-group"><label>Date</label><input type="date" id="schedPickerDate" value="${todayISO()}" min="${todayISO()}" onchange="updateSchedTime()"></div>
    <div class="form-group"><label>Optimal Time (auto-selected)</label><div id="schedPickerTimeDisplay" style="font-size:18px;font-weight:700;color:var(--gold);padding:8px 0">${getOptimalTime(todayISO())}</div><div style="font-size:11px;color:var(--text-secondary)">Based on engagement research for this day</div></div>
    <div class="form-group"><label>Platforms</label><div style="display:flex;gap:12px;flex-wrap:wrap">
      <label class="plat-check"><input type="checkbox" value="Facebook" class="sched-plat" checked> 📘 Facebook</label>
      <label class="plat-check"><input type="checkbox" value="LinkedIn" class="sched-plat" checked> 💼 LinkedIn</label>
      <label class="plat-check"><input type="checkbox" value="Instagram" class="sched-plat"> 📸 Instagram</label>
    </div></div>
    <div style="display:flex;gap:8px;margin-top:16px">
      <button class="pillar-btn" style="flex:1;background:var(--gold);color:#fff" onclick="confirmScheduleLibrary()">📅 Schedule</button>
      <button class="pillar-btn" style="flex:1" onclick="this.closest('.modal').classList.remove('open')">Cancel</button>
    </div>
  </div>`;
  document.body.appendChild(div);
}

function updateSchedTime() {
  const date = document.getElementById('schedPickerDate').value;
  document.getElementById('schedPickerTimeDisplay').textContent = getOptimalTime(date);
}

function confirmScheduleLibrary() {
  const libId = document.getElementById('schedPickerLibId').value;
  const item = getAllLibraryItems().find(p => p.id === libId);
  if (!item) return;
  const date = document.getElementById('schedPickerDate').value;
  const time = document.getElementById('schedPickerTimeDisplay').textContent;
  const platforms = [...document.querySelectorAll('.sched-plat:checked')].map(cb => cb.value);
  const text = item.facebook;
  const hashtags = text.match(/#\w+/g);
  const post = {
    id: uid(), date, time, pillar: 'Mentor',
    platforms, status: 'Scheduled',
    copy: text, hashtags: (hashtags||[]).join(' '),
    visualNotes: 'Book excerpt quote card', notes: 'From Ch1: ' + item.theme,
    images: [], createdAt: new Date().toISOString(),
    librarySourceId: libId
  };
  posts.push(post);
  window._lastSavedPost = post;
  save(); render();
  document.getElementById('schedulePickerModal').classList.remove('open');
  showToast('📅 "' + item.theme + '" scheduled for ' + fmtDate(date) + ' at ' + time);
  switchTab('calendar');
}

// ==================== DASHBOARD ====================
function renderDashboard() {
  const total = posts.length;
  const scheduled = posts.filter(p=>p.status==='Scheduled').length;
  const posted = posts.filter(p=>p.status==='Posted').length;
  document.getElementById('totalPosts').textContent = total;
  document.getElementById('scheduledPosts').textContent = scheduled;
  document.getElementById('postedPosts').textContent = posted;

  // This week summary
  const monday = getMonday(todayISO());
  const days = Array.from({length:5},(_,i)=>addDays(monday,i));
  const dayNames = ['Mon','Tue','Wed','Thu','Fri'];
  const el = document.getElementById('dashWeekPlan');
  const s = new Date(monday+'T12:00:00');
  const e = new Date(addDays(monday,4)+'T12:00:00');
  document.getElementById('dashWeekLabel').textContent = s.toLocaleDateString('en-US',{month:'short',day:'numeric'}) + ' – ' + e.toLocaleDateString('en-US',{month:'short',day:'numeric',year:'numeric'});
  
  el.innerHTML = days.map((d,i)=>{
    const dayPosts = posts.filter(p=>p.date===d);
    const count = dayPosts.length;
    const pillars = [...new Set(dayPosts.map(p=>p.pillar))].join(', ');
    return `<div class="dash-day"><span class="dash-day-label">${dayNames[i]}</span><span class="dash-day-count">${count} post${count!==1?'s':''} ${pillars?'— '+pillars:''}</span></div>`;
  }).join('') || '<div style="padding:20px;text-align:center;color:#6B7280">No posts this week yet</div>';
}

// ==================== QUEUE ====================
function renderQueue() {
  const scheduled = posts.filter(p=>p.status==='Scheduled'||p.status==='Approved').sort((a,b)=>a.date.localeCompare(b.date));
  const el = document.getElementById('queueList');
  if (!scheduled.length) { el.innerHTML = '<div style="text-align:center;padding:60px;color:#6B7280">No posts in queue. Create posts and set status to Scheduled.</div>'; return; }
  el.innerHTML = scheduled.map(p => {
    const COLORS = {Welcome:'#8B5CF6',Mentor:'#0EA5E9','Agent Win':'#10B981',Education:'#C9972C',Culture:'#EC4899',Spotlight:'#F59E0B',Evolution:'#6366F1',Awards:'#DC2626'};
    return `<div class="queue-item" style="border-left:3px solid ${COLORS[p.pillar]||'#ccc'}">
      <div class="queue-time"><div class="time">${p.time||''}</div><div class="date">${fmtDate(p.date)}</div></div>
      <div class="queue-content"><div class="queue-title">${p.pillar} — ${(p.copy||'').substring(0,60)}...</div><div class="queue-desc">${(p.platforms||[]).join(', ')}</div></div>
      <span class="queue-status ${p.status}">${p.status}</span>
      <button class="action-btn" style="background:#10B981;color:#fff;padding:6px 12px;border-radius:4px" onclick="publishPostNow('${p.id}')">📤 Publish</button>
    </div>`;
  }).join('');
}

// ==================== POST GENERATOR ====================
let currentPillar = 'speaker';
let generatedPost = '';

const pillarFields = {
  speaker: [{id:'speakerName',label:'Speaker Name',ph:'e.g. Mike Chen'},{id:'speakerTopic',label:'Topic',ph:'e.g. Creative Financing'},{id:'takeaway1',label:'Takeaway #1',ph:'Biggest insight'},{id:'takeaway2',label:'Takeaway #2',ph:'Second point'},{id:'takeaway3',label:'Takeaway #3',ph:'Third point'}],
  social: [{id:'eventName',label:'Event Name',ph:'e.g. Myers Mixer'},{id:'eventDate',label:'Event Date',ph:'e.g. May 23'},{id:'eventHighlight',label:'Highlights',ph:'Amazing turnout...'}],
  book: [{id:'bookExcerpt',label:'Book Excerpt (paste 2-3 sentences)',ph:'Paste from the book...',type:'textarea'}],
  flip: [{id:'agentName',label:'Agent Name',ph:'e.g. Marcus Johnson'},{id:'agentMarket',label:'Market',ph:'e.g. Fort Worth'},{id:'purchasePrice',label:'Purchase Price',ph:'$142,000'},{id:'rehabCost',label:'Rehab Cost',ph:'$48,000'},{id:'soldPrice',label:'Sold/ARV',ph:'$265,000'},{id:'profit',label:'Profit',ph:'$52,000'}],
  innovation: [{id:'innovTitle',label:'Topic',ph:'e.g. 3D Printing Houses'},{id:'innovAgent',label:'Agent Name',ph:'Who?'},{id:'innovDesc',label:'Description',ph:'What makes this innovative?',type:'textarea'}],
  welcome: [{id:'welName',label:'Agent Name',ph:'e.g. Sarah Mitchell'},{id:'welRole',label:'Role',ph:'e.g. Investor-Agent'},{id:'welFact',label:'Fun Fact',ph:'e.g. Former Marine'}],
  carrot: [{id:'carrotWeek',label:'Week #',ph:'1'},{id:'carrotTopic',label:'Focus',ph:'Building investor website'},{id:'carrotDetail',label:'Key Feature',ph:'What are you showing?',type:'textarea'}],
};

const pillarTemplates = {
  speaker: (f) => `🎤 ${f.speakerName||'[Speaker]'} just gave our agents an incredible session on ${f.speakerTopic||'[Topic]'}.\n\n3 takeaways every investor-agent needs:\n\n1️⃣ ${f.takeaway1||'[Takeaway 1]'}\n2️⃣ ${f.takeaway2||'[Takeaway 2]'}\n3️⃣ ${f.takeaway3||'[Takeaway 3]'}\n\nThis is the training our agents get EVERY WEEK.\nReady to level up? Link in bio 👆`,
  social: (f) => `🎉 Another incredible ${f.eventName||'Myers event'} in the books!\n\n${f.eventHighlight||'The energy was unreal.'}\n\nAt Myers, we don't just build wealth — we build relationships. 🤝\n\nNext event: ${f.eventDate||'[Date]'} | Don't miss it!`,
  book: (f) => `📖 From "The Investor-Agent Playbook" by Josh DeShong:\n\n"${f.bookExcerpt||'[Paste excerpt here]'}"\n\n💬 Which line hit hardest? Drop it below 👇`,
  flip: (f) => `🏠 AGENT INVESTMENT HIGHLIGHT\n\n${f.agentName||'[Agent]'} just crushed it in ${f.agentMarket||'DFW'}.\n\n📍 ${f.agentMarket||'DFW'}\n💰 Purchase: ${f.purchasePrice||'$—'}\n🔨 Rehab: ${f.rehabCost||'$—'}\n🏷️ Sold: ${f.soldPrice||'$—'}\n📈 PROFIT: ${f.profit||'$—'}\n\nOur agents BUILD WEALTH. Want to be next? 🔗`,
  innovation: (f) => `💡 INNOVATION SPOTLIGHT\n\n${f.innovAgent||'[Agent]'} is ${f.innovTitle||'doing something incredible'}.\n\n${f.innovDesc||'[Description]'}\n\nMyers agents are building the future of real estate. 🚀`,
  welcome: (f) => `👋 Welcome to the Myers family, ${f.welName||'[Name]'}!\n\n${f.welFact?f.welFact+'. ':''}Ready to build wealth and change lives. 🏠💰\n\nLet's go! 🚀`,
  carrot: (f) => `🥕 Carrot Walkthrough — Week ${f.carrotWeek||'[X]'}\n\nThis week: ${f.carrotTopic||'[Topic]'}\n\n${f.carrotDetail||'[Details]'}\n\nOur agents have the best tools. Period. 💪`,
};

const pillarHashtags = {
  speaker:['#MyersHomebuyers','#RealEstateTraining','#InvestorAgent','#DFWRealEstate'],
  social:['#MyersFamily','#RealEstateCulture','#DFWAgents','#TeamMyers'],
  book:['#JoshDeShong','#RealEstateWisdom','#InvestorMindset','#WealthBuilding','#BookExcerpt'],
  flip:['#HouseFlip','#BeforeAndAfter','#RealEstateInvesting','#FlipProfit','#MyersHomebuyers'],
  innovation:['#Innovation','#FutureOfRealEstate','#PropTech','#MyersHomebuyers'],
  welcome:['#WelcomeToMyers','#NewAgent','#TeamMyers','#DFWRealEstate'],
  carrot:['#CarrotPartnership','#RealEstateTech','#MyersHomebuyers'],
};

function selectPillar(btn, pillar) {
  currentPillar = pillar;
  document.querySelectorAll('.pillar-selector .pillar-btn').forEach(b => b.classList.remove('active'));
  btn.classList.add('active');
  renderGeneratorFields();
}

function renderGeneratorFields() {
  const fields = pillarFields[currentPillar] || [];
  document.getElementById('generatorFields').innerHTML = fields.map(f => `
    <div class="form-group">
      <label>${f.label}</label>
      ${f.type==='textarea'?`<textarea id="${f.id}" placeholder="${f.ph}" rows="3"></textarea>`:`<input type="text" id="${f.id}" placeholder="${f.ph}">`}
    </div>`).join('');
}

function generatePost() {
  const btn = document.getElementById('generateBtn');
  btn.classList.add('loading'); btn.textContent = '⏳ Generating...';
  const fields = pillarFields[currentPillar] || [];
  const vals = {};
  fields.forEach(f => { const el = document.getElementById(f.id); if(el) vals[f.id] = el.value; });
  setTimeout(() => {
    generatedPost = pillarTemplates[currentPillar](vals);
    const hashtags = pillarHashtags[currentPillar] || [];
    document.getElementById('previewPost').innerHTML = renderSocialMockup(generatedPost, hashtags);
    document.getElementById('previewHashtags').innerHTML = '';
    document.getElementById('previewActions').style.display = 'flex';
    btn.classList.remove('loading'); btn.textContent = '✨ Generate Post';
  }, 800);
}

function regeneratePost() { generatePost(); }
function copyPost() {
  const hashtags = pillarHashtags[currentPillar] || [];
  navigator.clipboard.writeText(generatedPost + '\n\n' + hashtags.join(' ')).then(() => showToast('✅ Copied!'));
}

// ==================== SOCIAL MEDIA PREVIEW MOCKUP ====================
let previewPlatform = 'instagram';
function renderSocialMockup(text, hashtags) {
  const hashStr = (hashtags||[]).join(' ');
  const excerpt = text.split('\n')[0];
  // Generate a visual quote card concept
  const quoteLines = text.match(/"([^"]+)"/);
  const quoteText = quoteLines ? quoteLines[1] : excerpt;
  
  return `
    <div class="platform-tabs">
      <button class="${previewPlatform==='instagram'?'active':''}" onclick="previewPlatform='instagram';generatePost()">📸 Instagram</button>
      <button class="${previewPlatform==='facebook'?'active':''}" onclick="previewPlatform='facebook';generatePost()">📘 Facebook</button>
      <button class="${previewPlatform==='linkedin'?'active':''}" onclick="previewPlatform='linkedin';generatePost()">💼 LinkedIn</button>
    </div>
    <div class="social-mockup">
      <div class="social-mockup-header">
        <div class="social-mockup-avatar">M</div>
        <div><div class="social-mockup-name">Myers Home Buyers</div><div class="social-mockup-handle">${previewPlatform==='instagram'?'@myershomebuyers':previewPlatform==='linkedin'?'Myers Home Buyers · Company':'Myers Home Buyers'}</div></div>
      </div>
      <div class="social-mockup-image">
        <div>"${quoteText.substring(0,120)}${quoteText.length>120?'...':''}"<br><br>— Myers Home Buyers</div>
      </div>
      <div class="social-mockup-actions">${previewPlatform==='instagram'?'♡ 💬 ↗ 🔖':previewPlatform==='facebook'?'👍 Like · 💬 Comment · ↗ Share':'👍 · 💬 · ↗ · ✉'}</div>
      <div class="social-mockup-stats">${previewPlatform==='instagram'?'❤️ 847 likes':'👍 234 · 💬 18 comments'}</div>
      <div class="social-mockup-body">${text}\n\n${hashStr}</div>
    </div>`;
}

function addGeneratedToCalendar() {
  const hashtags = pillarHashtags[currentPillar] || [];
  const platforms = [...document.querySelectorAll('.gen-plat:checked')].map(cb=>cb.value);
  const pillarMap = {speaker:'Education',social:'Culture',book:'Mentor',flip:'Agent Win',innovation:'Spotlight',welcome:'Welcome',carrot:'Evolution'};
  const post = {
    id: uid(), date: todayISO(), time: '11:00 AM',
    pillar: pillarMap[currentPillar]||'Welcome',
    platforms: platforms, status: 'Draft',
    copy: generatedPost, hashtags: hashtags.join(' '),
    visualNotes: '', notes: '', images: [],
    createdAt: new Date().toISOString()
  };
  posts.push(post);
  window._lastSavedPost = post;
  save(); render();
  showToast('📅 Post added to calendar!');
  switchTab('calendar');
}

// ==================== WELCOME TEMPLATE ====================
function updateWelcome() {
  const name = document.getElementById('welcomeName').value || 'Agent Name';
  const role = document.getElementById('welcomeRole').value;
  const loc = document.getElementById('welcomeLocation').value || 'DFW';
  const fact = document.getElementById('welcomeFact').value;
  document.getElementById('wCardName').textContent = name;
  document.getElementById('wCardRole').textContent = `${role} · ${loc}`;
  document.getElementById('wCardMsg').textContent = fact ? `"${fact}"` : '"Ready to build wealth and change lives."';
}

function generateWelcomeCaption() {
  const name = document.getElementById('welcomeName').value || '[Agent Name]';
  const role = document.getElementById('welcomeRole').value;
  const fact = document.getElementById('welcomeFact').value;
  const caption = `👋 Welcome to the Myers family, ${name}!\n\n${fact?fact+'. ':''}Joining us as ${role==='Investor-Agent'?'an':'a'} ${role}, ${name} is ready to build wealth and change lives. 🏠💰\n\n#WelcomeToMyers #NewAgent #TeamMyers #DFWRealEstate #InvestorAgent #MyersHomebuyers`;
  document.getElementById('welcomeCaption').innerHTML = `
    <div style="background:var(--cream);border:1px solid var(--border);border-radius:12px;padding:16px">
      <div style="font-size:12px;font-weight:600;color:var(--gold);margin-bottom:8px">📋 READY-TO-POST CAPTION</div>
      <div style="white-space:pre-wrap;font-size:14px;line-height:1.7">${caption}</div>
      <button class="pillar-btn" style="margin-top:12px" onclick="navigator.clipboard.writeText(\`${caption.replace(/`/g,"'")}\`);this.textContent='✅ Copied!';setTimeout(()=>this.textContent='📋 Copy Caption',1500)">📋 Copy Caption</button>
    </div>`;
}

function addWelcomeToCalendar() {
  const name = document.getElementById('welcomeName').value || 'New Agent';
  const role = document.getElementById('welcomeRole').value;
  const fact = document.getElementById('welcomeFact').value;
  const caption = `👋 Welcome to the Myers family, ${name}!\n\n${fact?fact+'. ':''}Joining us as ${role}, ${name} is ready to build wealth and change lives. 🏠💰\n\n#WelcomeToMyers #NewAgent #TeamMyers #DFWRealEstate`;
  const post = {
    id: uid(), date: todayISO(), time: '11:30 AM', pillar: 'Welcome',
    platforms: ['Facebook','Instagram','LinkedIn'], status: 'Draft',
    copy: caption, hashtags: '#WelcomeToMyers #NewAgent #TeamMyers',
    visualNotes: 'Welcome card graphic', notes: '', images: [],
    createdAt: new Date().toISOString()
  };
  posts.push(post);
  window._lastSavedPost = post;
  save(); render();
  showToast('📅 Welcome post added to calendar!');
}

// ==================== TRENDS ====================
const trendingHashtags = [
  {tag:'#RealEstateInvesting',vol:'2.4M posts',change:'+34%',dir:'up'},
  {tag:'#HouseFlipping',vol:'890K posts',change:'+28%',dir:'up'},
  {tag:'#WealthBuilding2026',vol:'340K posts',change:'+52%',dir:'up'},
  {tag:'#PassiveIncome',vol:'5.1M posts',change:'+12%',dir:'up'},
  {tag:'#DFWRealEstate',vol:'156K posts',change:'+18%',dir:'up'},
  {tag:'#InvestorAgent',vol:'45K posts',change:'+95%',dir:'up'},
  {tag:'#FixAndFlip',vol:'420K posts',change:'+8%',dir:'up'},
  {tag:'#RealEstateAgent',vol:'3.2M posts',change:'-2%',dir:'down'},
];
const trendingKeywords = [
  {tag:'3D printed homes',vol:'Rising',change:'+180%',dir:'up'},
  {tag:'investor-agent model',vol:'Niche',change:'+95%',dir:'up'},
  {tag:'off-market deals DFW',vol:'Regional',change:'+44%',dir:'up'},
  {tag:'real estate commission split',vol:'High',change:'+67%',dir:'up'},
  {tag:'house flipping profit 2026',vol:'Seasonal',change:'+38%',dir:'up'},
  {tag:'passive income real estate',vol:'Evergreen',change:'+15%',dir:'up'},
];

function renderHubTrends() {
  document.getElementById('trendHashtags').innerHTML = trendingHashtags.map((t,i)=>`<li class="trend-item"><div class="trend-rank">${i+1}</div><div class="trend-info"><div class="trend-tag">${t.tag}</div><div class="trend-meta">${t.vol}</div></div><div class="trend-change ${t.dir}">${t.dir==='up'?'↑':'↓'} ${t.change}</div></li>`).join('');
  document.getElementById('trendKeywords').innerHTML = trendingKeywords.map((t,i)=>`<li class="trend-item"><div class="trend-rank">${i+1}</div><div class="trend-info"><div class="trend-tag">${t.tag}</div><div class="trend-meta">${t.vol}</div></div><div class="trend-change ${t.dir}">${t.dir==='up'?'↑':'↓'} ${t.change}</div></li>`).join('');
  const ideas = [
    {icon:'🏗️',title:'3D Printed Homes Feature',desc:'Topic is +180% — perfect for Spotlight'},
    {icon:'📊',title:'"The Math Always Wins" Series',desc:'Deal breakdowns with real numbers dominate'},
    {icon:'🤝',title:'Commission Split Comparison',desc:'"90% commission" gets massive engagement'},
    {icon:'📖',title:'Micro-Lessons from Josh',desc:'Book excerpts → carousel quote cards'},
    {icon:'🏠',title:'Before/After Reel',desc:'Quick-cut reveals are #1 format right now'},
    {icon:'💰',title:'Carrot Partnership Reveal',desc:'#RealEstateTech is trending — time it right'},
  ];
  document.getElementById('trendIdeas').innerHTML = ideas.map(i=>`<div class="card" style="padding:20px"><div style="font-size:28px;margin-bottom:8px">${i.icon}</div><div style="font-size:14px;font-weight:600;margin-bottom:6px">${i.title}</div><div style="font-size:12px;color:#6B7280;line-height:1.5">${i.desc}</div></div>`).join('');
}
function refreshTrends() { showToast('🔥 Trends refreshed'); renderHubTrends(); }

// ==================== AI TEAM REVIEW ====================
function sendToReview() {
  switchTab('team');
  const thread = document.getElementById('reviewThread');
  thread.innerHTML = '';
  const messages = [
    {avatar:'CS',role:'strategist',name:'Content Strategist',text:`Draft ready! Using the "${currentPillar}" pillar format:\n\n"${generatedPost.substring(0,120)}..."`},
    {avatar:'EC',role:'editor',name:'Editor / Challenger',text:`Hook needs more punch. Lead with a number or bold claim. Change "Link in bio" to "DM us 'INVEST'" — drives engagement AND DMs.`},
    {avatar:'CD',role:'creative',name:'Creative Director',text:`Recommend carousel format (5 slides) with dark brand template. Slide 1 = bold hook on gold gradient. Gets 3x more saves.`},
    {avatar:'TA',role:'trend',name:'Trend Analyst',text:`#RealEstateInvesting is up 34%. Add #WealthBuilding2026. Post between 11AM-1PM CST for max DFW engagement.`},
  ];
  messages.forEach((msg, i) => {
    setTimeout(() => {
      thread.innerHTML += `<div class="review-msg"><div class="review-avatar ${msg.role}">${msg.avatar}</div><div class="review-bubble"><div class="review-name">${msg.name}</div><div style="white-space:pre-wrap">${msg.text}</div></div></div>`;
      thread.scrollTop = thread.scrollHeight;
    }, (i+1)*600);
  });
}

// ==================== APPROVALS WORKFLOW ====================
let approvals = JSON.parse(localStorage.getItem('myers_approvals') || '[]');

function submitForApproval(libId) {
  const allItems = getAllLibraryItems();
  const item = allItems.find(i => i.id === libId);
  if (!item) return;
  if (approvals.find(a => a.libId === libId)) {
    showToast('Already submitted for approval');
    return;
  }
  approvals.push({
    id: Date.now().toString(),
    libId: libId,
    theme: item.theme,
    ch: item.ch,
    facebook: item.facebook,
    linkedin: item.linkedin,
    submittedAt: new Date().toISOString(),
    status: 'pending', // pending | approved | rejected
    reviewNote: ''
  });
  localStorage.setItem('myers_approvals', JSON.stringify(approvals));
  renderApprovals();
  renderLibrary();
  updateDashboard();
  showToast('Submitted for approval');
}

function renderApprovals() {
  const list = document.getElementById('approvalsList');
  if (!list) return;
  const badge = document.getElementById('approvalBadge');
  const pending = approvals.filter(a => a.status === 'pending');
  if (badge) badge.textContent = pending.length;
  const pa = document.getElementById('pendingApproval');
  if (pa) pa.textContent = pending.length;

  if (approvals.length === 0) {
    list.innerHTML = '<div class="card" style="text-align:center;padding:60px 20px;color:#6B7280"><div style="font-size:18px;font-weight:700;color:var(--gold);margin-bottom:8px">All Clear</div><p style="font-size:13px">No posts waiting for review.</p></div>';
    return;
  }

  const sorted = [...approvals].sort((a,b) => (a.status === 'pending' ? 0 : 1) - (b.status === 'pending' ? 0 : 1));
  const chLabels = {ch1:'Ch 1',ch2:'Ch 2',ch3:'Ch 3',ch4:'Ch 4',ch5:'Ch 5',user:'Generated'};

  list.innerHTML = sorted.map(a => {
    const chLabel = chLabels[a.ch] || a.ch;
    const preview = (a.facebook || '').split('\n').filter(l => l.trim()).slice(0,2).join(' ').substring(0,120);
    const isPending = a.status === 'pending';

    if (!isPending) {
      const statusColor = a.status === 'approved' ? '#10B981' : '#DC2626';
      const statusLabel = a.status === 'approved' ? 'Approved' : 'Rejected';
      return '<div style="display:flex;align-items:center;justify-content:space-between;padding:12px 20px;background:white;border:1px solid var(--border);border-radius:8px;opacity:0.5">' +
        '<div style="display:flex;align-items:center;gap:12px">' +
          '<span style="background:' + statusColor + ';color:#fff;padding:3px 10px;border-radius:20px;font-size:10px;font-weight:600">' + statusLabel + '</span>' +
          '<span style="font-weight:600;font-size:13px">' + a.theme + '</span>' +
          '<span style="font-size:11px;color:#6B7280">' + chLabel + '</span>' +
          (a.reviewNote ? '<span style="font-size:11px;color:#9CA3AF;font-style:italic">\u2014 ' + a.reviewNote + '</span>' : '') +
        '</div></div>';
    }

    return '<div class="card" style="padding:0;overflow:hidden;border-left:4px solid #F59E0B">' +
      '<div style="padding:20px 24px">' +
        '<div style="display:flex;justify-content:space-between;align-items:flex-start;margin-bottom:12px">' +
          '<div>' +
            '<div style="font-weight:700;font-size:17px;margin-bottom:4px">' + a.theme + '</div>' +
            '<div style="font-size:12px;color:#6B7280">' + chLabel + ' \u00b7 Submitted ' + new Date(a.submittedAt).toLocaleDateString('en-US',{month:'short',day:'numeric'}) + '</div>' +
          '</div>' +
          '<span style="background:#FEF3C7;color:#92400E;padding:4px 12px;border-radius:20px;font-size:11px;font-weight:600">Needs Review</span>' +
        '</div>' +
        '<div style="font-size:13px;line-height:1.5;color:var(--ink);margin-bottom:16px;padding:12px 16px;background:var(--cream);border-radius:8px;border-left:3px solid var(--gold)">' +
          preview + '...' +
          '<button onclick="toggleApprovalDetail(\'' + a.id + '\')" style="display:block;margin-top:8px;background:none;border:none;color:var(--gold);font-weight:600;font-size:12px;cursor:pointer;padding:0">Read full post</button>' +
          '<div id="approval-detail-' + a.id + '" style="display:none;margin-top:12px;padding-top:12px;border-top:1px solid var(--border)">' +
            '<div style="white-space:pre-wrap;font-size:12px;line-height:1.6;max-height:300px;overflow-y:auto">' + a.facebook + '</div>' +
          '</div>' +
        '</div>' +
        '<div style="display:flex;gap:10px">' +
          '<button onclick="approvePost(\'' + a.id + '\')" style="flex:1;padding:14px;background:#10B981;color:#fff;border:none;border-radius:8px;font-size:15px;font-weight:700;cursor:pointer;font-family:inherit;transition:opacity 0.2s">Approve</button>' +
          '<button onclick="rejectPost(\'' + a.id + '\')" style="flex:1;padding:14px;background:#fff;color:#DC2626;border:2px solid #DC2626;border-radius:8px;font-size:15px;font-weight:700;cursor:pointer;font-family:inherit;transition:opacity 0.2s">Reject</button>' +
        '</div>' +
      '</div>' +
    '</div>';
  }).join('');
}

function toggleApprovalDetail(id) {
  const el = document.getElementById('approval-detail-' + id);
  if (el) el.style.display = el.style.display === 'none' ? 'block' : 'none';
}

function approvePost(approvalId) {
  const a = approvals.find(x => x.id === approvalId);
  if (a) {
    a.status = 'approved';
    a.reviewNote = 'Approved by Josh';
    localStorage.setItem('myers_approvals', JSON.stringify(approvals));
    renderApprovals();
    showToast('Post approved');
  }
}

function rejectPost(approvalId) {
  const note = prompt('Quick note (optional):') || 'Needs changes';
  const a = approvals.find(x => x.id === approvalId);
  if (a) {
    a.status = 'rejected';
    a.reviewNote = note;
    localStorage.setItem('myers_approvals', JSON.stringify(approvals));
    renderApprovals();
    showToast('Post sent back for revisions');
  }
}

// Initialize approvals on load
document.addEventListener('DOMContentLoaded', () => {
  renderApprovals();
});


