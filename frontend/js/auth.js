// Auth state management
let currentUser = null;
let userProfile = null;
let userPermissions = {
  services: {},
  kanban: { can_read: false, can_write: false }
};
let authToken = null;

// Initialize auth
async function initAuth() {
  authToken = localStorage.getItem('authToken');

  if (authToken) {
    try {
      const response = await fetch('/api/auth/me', {
        headers: {
          'Authorization': `Bearer ${authToken}`
        }
      });

      if (response.ok) {
        const data = await response.json();
        userProfile = data.profile;
        userPermissions = data.permissions;
        currentUser = { id: data.profile.id, email: data.profile.email };
      } else {
        localStorage.removeItem('authToken');
        authToken = null;
      }
    } catch (error) {
      console.error('Auth initialization error:', error);
      localStorage.removeItem('authToken');
      authToken = null;
    }
  }

  return { user: currentUser, profile: userProfile, permissions: userPermissions };
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
  const response = await fetch('/api/auth/signin', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({ email, password })
  });

  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.error || 'Failed to sign in');
  }

  const data = await response.json();
  authToken = data.token;
  localStorage.setItem('authToken', authToken);

  await initAuth();

  return data;
}

// Sign up
async function signUp(email, password, fullName) {
  const response = await fetch('/api/auth/signup', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({
      email,
      password,
      full_name: fullName
    })
  });

  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.error || 'Failed to create account');
  }

  const data = await response.json();
  authToken = data.token;
  localStorage.setItem('authToken', authToken);

  await initAuth();

  return data;
}

// Sign out
async function signOut() {
  localStorage.removeItem('authToken');
  authToken = null;
  currentUser = null;
  userProfile = null;
  userPermissions = {
    services: {},
    kanban: { can_read: false, can_write: false }
  };

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

// Get auth token
function getAuthToken() {
  return authToken;
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
