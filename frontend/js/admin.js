let currentEditingUserId = null;
let allUsersData = [];

async function initializeAdmin() {
  const auth = await requireAuth();

  if (!auth || !auth.user) {
    return;
  }

  if (!isAdmin()) {
    alert('You do not have permission to access the admin panel');
    window.location.href = '/index.html';
    return;
  }

  updateUIForAuthState();
  await loadAllUsers();
}

async function loadAllUsers() {
  try {
    const response = await fetch('/api/auth/users', {
      headers: {
        'Authorization': `Bearer ${getAuthToken()}`
      }
    });

    if (!response.ok) {
      console.error('Error loading users');
      alert('Failed to load users');
      return;
    }

    allUsersData = await response.json();

    renderUsersTable();
  } catch (error) {
    console.error('Error loading users:', error);
    alert('Failed to load users');
  }
}

function renderUsersTable() {
  const tbody = document.querySelector('#usersTable tbody');
  tbody.innerHTML = '';

  if (allUsersData.length === 0) {
    tbody.innerHTML = `
      <tr>
        <td colspan="10" style="text-align: center; padding: 32px; color: #64748b;">
          No users found
        </td>
      </tr>
    `;
    return;
  }

  allUsersData.forEach(user => {
    const roleColor = user.role === 'admin' ? '#ef4444' : user.role === 'manager' ? '#f59e0b' : '#3b82f6';

    const getPermIcon = (service) => {
      const perm = user.service_permissions.find(p => p.service === service);
      if (!perm) return '<span style="color: #64748b;">-</span>';
      if (perm.can_read && perm.can_write) return '<span style="color: #10b981;">RW</span>';
      if (perm.can_read) return '<span style="color: #3b82f6;">R</span>';
      if (perm.can_write) return '<span style="color: #f59e0b;">W</span>';
      return '<span style="color: #64748b;">-</span>';
    };

    const getKanbanIcon = () => {
      const perm = user.kanban_permissions;
      if (perm.can_read && perm.can_write) return '<span style="color: #10b981;">RW</span>';
      if (perm.can_read) return '<span style="color: #3b82f6;">R</span>';
      if (perm.can_write) return '<span style="color: #f59e0b;">W</span>';
      return '<span style="color: #64748b;">-</span>';
    };

    tbody.innerHTML += `
      <tr>
        <td>${user.full_name || 'N/A'}</td>
        <td>${user.email}</td>
        <td><span style="color: ${roleColor}; font-weight: 600;">${user.role.toUpperCase()}</span></td>
        <td style="text-align: center;">${getPermIcon('gcp')}</td>
        <td style="text-align: center;">${getPermIcon('aws')}</td>
        <td style="text-align: center;">${getPermIcon('hetzner')}</td>
        <td style="text-align: center;">${getPermIcon('jira')}</td>
        <td style="text-align: center;">${getPermIcon('bitbucket')}</td>
        <td style="text-align: center;">${getKanbanIcon()}</td>
        <td>
          <button onclick="openPermissionModal('${user._id}')" style="padding: 6px 12px; font-size: 12px;">
            Edit
          </button>
        </td>
      </tr>
    `;
  });
}

function openPermissionModal(userId) {
  currentEditingUserId = userId;
  const user = allUsersData.find(u => u._id === userId);

  if (!user) {
    alert('User not found');
    return;
  }

  document.getElementById('permissionModalTitle').innerText = `Edit Permissions: ${user.full_name || user.email}`;
  document.getElementById('userRole').value = user.role;

  ['gcp', 'aws', 'hetzner', 'jira', 'bitbucket'].forEach(service => {
    const perm = user.service_permissions.find(p => p.service === service);
    document.getElementById(`${service}_read`).checked = perm ? perm.can_read : false;
    document.getElementById(`${service}_write`).checked = perm ? perm.can_write : false;
  });

  document.getElementById('kanban_read').checked = user.kanban_permissions.can_read;
  document.getElementById('kanban_write').checked = user.kanban_permissions.can_write;

  document.getElementById('permissionModal').style.display = 'block';
}

function closePermissionModal() {
  document.getElementById('permissionModal').style.display = 'none';
  currentEditingUserId = null;
}

async function savePermissions() {
  if (!currentEditingUserId) return;

  const role = document.getElementById('userRole').value;

  const service_permissions = ['gcp', 'aws', 'hetzner', 'jira', 'bitbucket'].map(service => ({
    service,
    can_read: document.getElementById(`${service}_read`).checked,
    can_write: document.getElementById(`${service}_write`).checked
  }));

  const kanban_permissions = {
    can_read: document.getElementById('kanban_read').checked,
    can_write: document.getElementById('kanban_write').checked
  };

  try {
    const response = await fetch(`/api/auth/users/${currentEditingUserId}/permissions`, {
      method: 'PATCH',
      headers: {
        'Authorization': `Bearer ${getAuthToken()}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        role,
        service_permissions,
        kanban_permissions
      })
    });

    if (!response.ok) {
      const error = await response.json();
      alert('Failed to update permissions: ' + error.error);
      return;
    }

    closePermissionModal();
    await loadAllUsers();
    alert('Permissions updated successfully!');
  } catch (error) {
    console.error('Error saving permissions:', error);
    alert('Failed to save permissions');
  }
}

window.onclick = function(event) {
  const modal = document.getElementById('permissionModal');
  if (event.target === modal) {
    closePermissionModal();
  }
};

initializeAdmin();
