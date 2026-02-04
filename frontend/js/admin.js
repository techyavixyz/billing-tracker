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
    const { data: users, error: usersError } = await supabase
      .from('user_profiles')
      .select('*')
      .order('created_at', { ascending: false });

    if (usersError) {
      console.error('Error loading users:', usersError);
      alert('Failed to load users');
      return;
    }

    const { data: servicePerms, error: servicePermsError } = await supabase
      .from('service_permissions')
      .select('*');

    const { data: kanbanPerms, error: kanbanPermsError } = await supabase
      .from('kanban_permissions')
      .select('*');

    allUsersData = users.map(user => {
      const userServicePerms = servicePerms?.filter(p => p.user_id === user.id) || [];
      const userKanbanPerms = kanbanPerms?.find(p => p.user_id === user.id);

      const services = {};
      userServicePerms.forEach(perm => {
        services[perm.service] = {
          can_read: perm.can_read,
          can_write: perm.can_write
        };
      });

      return {
        ...user,
        services,
        kanban: userKanbanPerms || { can_read: false, can_write: false }
      };
    });

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
      const perm = user.services[service];
      if (!perm) return '<span style="color: #64748b;">-</span>';
      if (perm.can_read && perm.can_write) return '<span style="color: #10b981;">RW</span>';
      if (perm.can_read) return '<span style="color: #3b82f6;">R</span>';
      if (perm.can_write) return '<span style="color: #f59e0b;">W</span>';
      return '<span style="color: #64748b;">-</span>';
    };

    const getKanbanIcon = () => {
      if (user.kanban.can_read && user.kanban.can_write) return '<span style="color: #10b981;">RW</span>';
      if (user.kanban.can_read) return '<span style="color: #3b82f6;">R</span>';
      if (user.kanban.can_write) return '<span style="color: #f59e0b;">W</span>';
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
          <button onclick="openPermissionModal('${user.id}')" style="padding: 6px 12px; font-size: 12px;">
            Edit
          </button>
        </td>
      </tr>
    `;
  });
}

function openPermissionModal(userId) {
  currentEditingUserId = userId;
  const user = allUsersData.find(u => u.id === userId);

  if (!user) {
    alert('User not found');
    return;
  }

  document.getElementById('permissionModalTitle').innerText = `Edit Permissions: ${user.full_name || user.email}`;
  document.getElementById('userRole').value = user.role;

  ['gcp', 'aws', 'hetzner', 'jira', 'bitbucket'].forEach(service => {
    const perm = user.services[service] || { can_read: false, can_write: false };
    document.getElementById(`${service}_read`).checked = perm.can_read;
    document.getElementById(`${service}_write`).checked = perm.can_write;
  });

  document.getElementById('kanban_read').checked = user.kanban.can_read;
  document.getElementById('kanban_write').checked = user.kanban.can_write;

  document.getElementById('permissionModal').style.display = 'block';
}

function closePermissionModal() {
  document.getElementById('permissionModal').style.display = 'none';
  currentEditingUserId = null;
}

async function savePermissions() {
  if (!currentEditingUserId) return;

  const role = document.getElementById('userRole').value;

  const servicePermissions = {
    gcp: {
      can_read: document.getElementById('gcp_read').checked,
      can_write: document.getElementById('gcp_write').checked
    },
    aws: {
      can_read: document.getElementById('aws_read').checked,
      can_write: document.getElementById('aws_write').checked
    },
    hetzner: {
      can_read: document.getElementById('hetzner_read').checked,
      can_write: document.getElementById('hetzner_write').checked
    },
    jira: {
      can_read: document.getElementById('jira_read').checked,
      can_write: document.getElementById('jira_write').checked
    },
    bitbucket: {
      can_read: document.getElementById('bitbucket_read').checked,
      can_write: document.getElementById('bitbucket_write').checked
    }
  };

  const kanbanPermissions = {
    can_read: document.getElementById('kanban_read').checked,
    can_write: document.getElementById('kanban_write').checked
  };

  try {
    const { error: roleError } = await supabase
      .from('user_profiles')
      .update({ role })
      .eq('id', currentEditingUserId);

    if (roleError) {
      console.error('Error updating role:', roleError);
      alert('Failed to update role');
      return;
    }

    for (const [service, perms] of Object.entries(servicePermissions)) {
      const { error: upsertError } = await supabase
        .from('service_permissions')
        .upsert({
          user_id: currentEditingUserId,
          service: service,
          can_read: perms.can_read,
          can_write: perms.can_write
        }, {
          onConflict: 'user_id,service'
        });

      if (upsertError) {
        console.error(`Error updating ${service} permissions:`, upsertError);
        alert(`Failed to update ${service} permissions`);
        return;
      }
    }

    const { error: kanbanError } = await supabase
      .from('kanban_permissions')
      .upsert({
        user_id: currentEditingUserId,
        can_read: kanbanPermissions.can_read,
        can_write: kanbanPermissions.can_write
      }, {
        onConflict: 'user_id'
      });

    if (kanbanError) {
      console.error('Error updating kanban permissions:', kanbanError);
      alert('Failed to update kanban permissions');
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
