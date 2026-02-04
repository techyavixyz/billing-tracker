let currentEditingTask = null;
let allUsers = [];
let currentUserId = null;

async function initializeKanban() {
  const auth = await requireAuth();

  if (!auth || !auth.user) {
    return;
  }

  if (!hasKanbanAccess('read')) {
    alert('You do not have permission to access the kanban board');
    window.location.href = '/index.html';
    return;
  }

  currentUserId = auth.user.id;

  document.getElementById('navGcp').style.display = hasServiceAccess('gcp', 'read') ? 'block' : 'none';
  document.getElementById('navAws').style.display = hasServiceAccess('aws', 'read') ? 'block' : 'none';
  document.getElementById('navHetzner').style.display = hasServiceAccess('hetzner', 'read') ? 'block' : 'none';
  document.getElementById('navJira').style.display = hasServiceAccess('jira', 'read') ? 'block' : 'none';
  document.getElementById('navBitbucket').style.display = hasServiceAccess('bitbucket', 'read') ? 'block' : 'none';

  updateUIForAuthState();

  await loadUsers();
  await loadTasks();
}

async function loadUsers() {
  try {
    const response = await fetch('/api/auth/users', {
      headers: {
        'Authorization': `Bearer ${getAuthToken()}`
      }
    });

    if (response.ok) {
      allUsers = await response.json();
    } else {
      console.error('Error loading users');
      allUsers = [];
    }

    const select = document.getElementById('taskAssignedTo');
    select.innerHTML = '<option value="">Not Assigned</option>';

    allUsers.forEach(user => {
      const option = document.createElement('option');
      option.value = user._id;
      option.textContent = user.full_name || user.email;
      select.appendChild(option);
    });
  } catch (error) {
    console.error('Error loading users:', error);
    allUsers = [];
  }
}

async function loadTasks() {
  try {
    const response = await fetch('/api/todo', {
      headers: {
        'Authorization': `Bearer ${getAuthToken()}`
      }
    });

    if (!response.ok) {
      console.error('Error loading tasks');
      alert('Failed to load tasks');
      return;
    }

    const tasks = await response.json();

    const todoColumn = document.getElementById("todoColumn");
    const inProgressColumn = document.getElementById("inProgressColumn");
    const doneColumn = document.getElementById("doneColumn");

    todoColumn.innerHTML = "";
    inProgressColumn.innerHTML = "";
    doneColumn.innerHTML = "";

    tasks.forEach(task => {
      const card = createTaskCard(task);

      if (task.status === "todo") {
        todoColumn.appendChild(card);
      } else if (task.status === "in-progress") {
        inProgressColumn.appendChild(card);
      } else if (task.status === "done") {
        doneColumn.appendChild(card);
      }
    });

    if (tasks.filter(t => t.status === "todo").length === 0) {
      todoColumn.innerHTML = '<div style="text-align: center; color: #64748b; padding: 20px;">No tasks</div>';
    }

    if (tasks.filter(t => t.status === "in-progress").length === 0) {
      inProgressColumn.innerHTML = '<div style="text-align: center; color: #64748b; padding: 20px;">No tasks</div>';
    }

    if (tasks.filter(t => t.status === "done").length === 0) {
      doneColumn.innerHTML = '<div style="text-align: center; color: #64748b; padding: 20px;">No tasks</div>';
    }
  } catch (error) {
    console.error("Error loading tasks:", error);
    alert("Failed to load tasks");
  }
}

function createTaskCard(task) {
  const card = document.createElement("div");
  card.className = "kanban-card";
  card.onclick = () => openEditModal(task);

  const priorityClass = `priority-${task.priority}`;
  const priorityText = task.priority.charAt(0).toUpperCase() + task.priority.slice(1);

  const tagsHTML = task.tags && task.tags.length > 0
    ? task.tags.map(tag => `<span class="kanban-tag">${tag}</span>`).join("")
    : "";

  let assignedToHTML = "";
  if (task.assigned_to_user) {
    const assignedName = getUserName(task.assigned_to_user);
    assignedToHTML = `<div style="font-size: 12px; color: #94a3b8; margin-top: 8px;">Assigned to: ${assignedName}</div>`;
  }

  let assignedByHTML = "";
  if (task.assigned_by && task.assigned_at) {
    const assignedByName = getUserName(task.assigned_by);
    const assignedTime = new Date(task.assigned_at).toLocaleString();
    assignedByHTML = `<div style="font-size: 11px; color: #64748b; margin-top: 4px;">Assigned by ${assignedByName} on ${assignedTime}</div>`;
  }

  const dueDateHTML = task.due_date
    ? `<div style="font-size: 12px; color: #94a3b8; margin-top: 4px;">Due: ${new Date(task.due_date).toLocaleDateString()}</div>`
    : "";

  const createdByHTML = task.created_by && task.created_by._id !== currentUserId
    ? `<div style="font-size: 11px; color: #64748b; margin-top: 4px;">Created by ${getUserName(task.created_by)}</div>`
    : "";

  card.innerHTML = `
    <div class="kanban-card-title">${task.title}</div>
    <div class="kanban-card-description">${task.description || ""}</div>
    <div class="kanban-card-footer">
      <div class="kanban-card-meta">
        <span class="priority-badge ${priorityClass}">${priorityText}</span>
        ${tagsHTML}
      </div>
    </div>
    ${assignedToHTML}
    ${assignedByHTML}
    ${dueDateHTML}
    ${createdByHTML}
  `;

  return card;
}

function getUserName(userOrId) {
  if (typeof userOrId === 'object' && userOrId !== null) {
    return userOrId.full_name || userOrId.email || 'Unknown User';
  }

  const user = allUsers.find(u => u._id === userOrId);
  return user ? (user.full_name || user.email) : "Unknown User";
}

function openAddModal() {
  if (!hasKanbanAccess('write')) {
    alert('You do not have permission to create tasks');
    return;
  }

  currentEditingTask = null;
  document.getElementById("modalTitle").innerText = "Add New Task";
  document.getElementById("taskTitle").value = "";
  document.getElementById("taskDescription").value = "";
  document.getElementById("taskStatus").value = "todo";
  document.getElementById("taskPriority").value = "medium";
  document.getElementById("taskAssignedTo").value = "";
  document.getElementById("taskDueDate").value = "";
  document.getElementById("taskTags").value = "";
  document.getElementById("deleteTaskBtn").style.display = "none";
  document.getElementById("taskModal").style.display = "block";
}

function openEditModal(task) {
  if (!hasKanbanAccess('write') && task.created_by._id !== currentUserId && (!task.assigned_by || task.assigned_by._id !== currentUserId)) {
    alert('You do not have permission to edit this task');
    return;
  }

  currentEditingTask = task;
  document.getElementById("modalTitle").innerText = "Edit Task";
  document.getElementById("taskTitle").value = task.title;
  document.getElementById("taskDescription").value = task.description || "";
  document.getElementById("taskStatus").value = task.status;
  document.getElementById("taskPriority").value = task.priority;
  document.getElementById("taskAssignedTo").value = task.assigned_to_user ? (task.assigned_to_user._id || task.assigned_to_user) : "";
  document.getElementById("taskDueDate").value = task.due_date ? new Date(task.due_date).toISOString().split('T')[0] : "";
  document.getElementById("taskTags").value = task.tags ? task.tags.join(", ") : "";
  document.getElementById("deleteTaskBtn").style.display = "inline-block";
  document.getElementById("taskModal").style.display = "block";
}

function closeModal() {
  document.getElementById("taskModal").style.display = "none";
  currentEditingTask = null;
}

async function saveTask() {
  if (!hasKanbanAccess('write')) {
    alert('You do not have permission to save tasks');
    return;
  }

  const title = document.getElementById("taskTitle").value.trim();
  const description = document.getElementById("taskDescription").value.trim();
  const status = document.getElementById("taskStatus").value;
  const priority = document.getElementById("taskPriority").value;
  const assignedToUser = document.getElementById("taskAssignedTo").value || null;
  const dueDate = document.getElementById("taskDueDate").value || null;
  const tagsInput = document.getElementById("taskTags").value.trim();
  const tags = tagsInput ? tagsInput.split(",").map(tag => tag.trim()).filter(tag => tag) : [];

  if (!title) {
    alert("Please enter a task title");
    return;
  }

  const taskData = {
    title,
    description,
    status,
    priority,
    assigned_to_user: assignedToUser,
    due_date: dueDate,
    tags
  };

  try {
    let response;

    if (currentEditingTask) {
      response = await fetch(`/api/todo/${currentEditingTask._id}`, {
        method: 'PATCH',
        headers: {
          'Authorization': `Bearer ${getAuthToken()}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(taskData)
      });
    } else {
      response = await fetch('/api/todo', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${getAuthToken()}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(taskData)
      });
    }

    if (!response.ok) {
      const error = await response.json();
      alert("Failed to save task: " + error.error);
      return;
    }

    closeModal();
    await loadTasks();
  } catch (error) {
    console.error("Error saving task:", error);
    alert("Error: " + error.message);
  }
}

async function deleteTask() {
  if (!currentEditingTask) return;

  if (!hasKanbanAccess('write') && currentEditingTask.created_by._id !== currentUserId) {
    alert('You do not have permission to delete this task');
    return;
  }

  if (!confirm("Are you sure you want to delete this task?")) {
    return;
  }

  try {
    const response = await fetch(`/api/todo/${currentEditingTask._id}`, {
      method: 'DELETE',
      headers: {
        'Authorization': `Bearer ${getAuthToken()}`
      }
    });

    if (!response.ok) {
      const error = await response.json();
      alert("Failed to delete task: " + error.error);
      return;
    }

    closeModal();
    await loadTasks();
  } catch (error) {
    console.error("Error deleting task:", error);
    alert("Error: " + error.message);
  }
}

window.onclick = function(event) {
  const modal = document.getElementById("taskModal");
  if (event.target === modal) {
    closeModal();
  }
};

initializeKanban();
