function checkAuth() {
  const token = localStorage.getItem('authToken');
  const currentPath = window.location.pathname;

  if (!token && currentPath !== '/login.html' && currentPath !== '/signup.html' && currentPath !== '/') {
    window.location.href = '/login.html';
    return false;
  }

  return true;
}

function logout() {
  localStorage.removeItem('authToken');
  localStorage.removeItem('user');
  window.location.href = '/login.html';
}

function getAuthHeaders() {
  const token = localStorage.getItem('authToken');
  return {
    'Authorization': `Bearer ${token}`,
    'Content-Type': 'application/json'
  };
}

checkAuth();
