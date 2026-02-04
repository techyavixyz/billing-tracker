// Supabase client initialization
const SUPABASE_URL = window.ENV?.SUPABASE_URL || 'http://localhost:54321';
const SUPABASE_ANON_KEY = window.ENV?.SUPABASE_ANON_KEY || 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZS1kZW1vIiwicm9sZSI6ImFub24iLCJleHAiOjE5ODM4MTI5OTZ9.CRXP1A7WOeoJeXxjNni43kdQwgnWNReilDMblYTn_I0';

const supabase = window.supabase?.createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

// Auth state management
let currentUser = null;
let userProfile = null;
let userPermissions = {
  services: {},
  kanban: { can_read: false, can_write: false }
};

// Initialize auth
async function initAuth() {
  if (!supabase) {
    console.error('Supabase client not initialized');
    return;
  }

  const { data: { session } } = await supabase.auth.getSession();

  if (session) {
    currentUser = session.user;
    await loadUserProfile();
    await loadUserPermissions();
  }

  supabase.auth.onAuthStateChange((async (event, session) => {
    if (event === 'SIGNED_IN' && session) {
      currentUser = session.user;
      await loadUserProfile();
      await loadUserPermissions();
      updateUIForAuthState();
    } else if (event === 'SIGNED_OUT') {
      currentUser = null;
      userProfile = null;
      userPermissions = {
        services: {},
        kanban: { can_read: false, can_write: false }
      };
      updateUIForAuthState();
    }
  }));

  return { user: currentUser, profile: userProfile, permissions: userPermissions };
}

// Load user profile
async function loadUserProfile() {
  if (!currentUser) return;

  const { data, error } = await supabase
    .from('user_profiles')
    .select('*')
    .eq('id', currentUser.id)
    .maybeSingle();

  if (error) {
    console.error('Error loading user profile:', error);
    return;
  }

  userProfile = data;
}

// Load user permissions
async function loadUserPermissions() {
  if (!currentUser) return;

  const { data: servicePerms } = await supabase
    .from('service_permissions')
    .select('*')
    .eq('user_id', currentUser.id);

  const { data: kanbanPerms } = await supabase
    .from('kanban_permissions')
    .select('*')
    .eq('user_id', currentUser.id)
    .maybeSingle();

  if (servicePerms) {
    userPermissions.services = {};
    servicePerms.forEach(perm => {
      userPermissions.services[perm.service] = {
        can_read: perm.can_read,
        can_write: perm.can_write
      };
    });
  }

  if (kanbanPerms) {
    userPermissions.kanban = {
      can_read: kanbanPerms.can_read,
      can_write: kanbanPerms.can_write
    };
  }
}

// Check if user is admin
function isAdmin() {
  return userProfile?.role === 'admin';
}

// Check service permission
function hasServiceAccess(service, accessType = 'read') {
  if (isAdmin()) return true;

  const perm = userPermissions.services[service];
  if (!perm) return false;

  return accessType === 'read' ? perm.can_read : perm.can_write;
}

// Check kanban permission
function hasKanbanAccess(accessType = 'read') {
  if (isAdmin()) return true;

  return accessType === 'read'
    ? userPermissions.kanban.can_read
    : userPermissions.kanban.can_write;
}

// Sign in
async function signIn(email, password) {
  const { data, error } = await supabase.auth.signInWithPassword({
    email,
    password
  });

  if (error) {
    throw error;
  }

  return data;
}

// Sign up
async function signUp(email, password, fullName) {
  const { data, error } = await supabase.auth.signUp({
    email,
    password,
    options: {
      data: {
        full_name: fullName
      }
    }
  });

  if (error) {
    throw error;
  }

  return data;
}

// Sign out
async function signOut() {
  const { error } = await supabase.auth.signOut();

  if (error) {
    throw error;
  }

  window.location.href = '/login.html';
}

// Get current user
function getCurrentUser() {
  return currentUser;
}

// Get user profile
function getUserProfile() {
  return userProfile;
}

// Get user permissions
function getUserPermissions() {
  return userPermissions;
}

// Update UI based on auth state
function updateUIForAuthState() {
  const userInfoEl = document.getElementById('userInfo');

  if (userInfoEl) {
    if (currentUser && userProfile) {
      userInfoEl.innerHTML = `
        <span style="color: #cbd5e1; margin-right: 16px;">${userProfile.full_name || userProfile.email}</span>
        <span style="color: #94a3b8; margin-right: 16px; font-size: 12px;">${userProfile.role.toUpperCase()}</span>
        <button onclick="signOut()" style="padding: 6px 16px; font-size: 13px;">Logout</button>
      `;
    } else {
      userInfoEl.innerHTML = '<a href="/login.html" style="color: #3b82f6;">Login</a>';
    }
  }
}

// Require authentication
async function requireAuth() {
  const auth = await initAuth();

  if (!auth.user) {
    window.location.href = '/login.html';
    return null;
  }

  return auth;
}

// Check page access
function checkPageAccess() {
  const path = window.location.pathname;

  if (path.includes('service.html')) {
    const service = new URLSearchParams(window.location.search).get('service');
    if (service && !hasServiceAccess(service, 'read')) {
      alert('You do not have permission to access this service');
      window.location.href = '/index.html';
      return false;
    }
  }

  if (path.includes('kanban.html') && !hasKanbanAccess('read')) {
    alert('You do not have permission to access the kanban board');
    window.location.href = '/index.html';
    return false;
  }

  return true;
}
