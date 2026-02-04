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
  const { data, error } = await supabase
    .from('user_profiles')
    .select('id, email, full_name')
    .order('full_name');

  if (error) {
    console.error('Error loading users:', error);
    return;
  }

  allUsers = data || [];

  const select = document.getElementById('taskAssignedTo');
  select.innerHTML = '<option value="">Not Assigned</option>';

  allUsers.forEach(user => {
    const option = document.createElement('option');
    option.value = user.id;
    option.textContent = user.full_name || user.email;
    select.appendChild(option);
  });
}

async function loadTasks() {
  try {
    const { data, error } = await supabase
      .from('todos')
      .select('*')
      .order('created_at', { ascending: false });

    if (error) {
      console.error('Error loading tasks:', error);
      alert('Failed to load tasks');
      return;
    }

    const tasks = data || [];

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
    const assignedUser = allUsers.find(u => u.id === task.assigned_to_user);
    const assignedName = assignedUser ? (assignedUser.full_name || assignedUser.email) : "Unknown User";
    assignedToHTML = `<div style="font-size: 12px; color: #94a3b8; margin-top: 8px;">Assigned to: ${assignedName}</div>`;
  }

  let assignedByHTML = "";
  if (task.assigned_by && task.assigned_at) {
    const assignedByUser = allUsers.find(u => u.id === task.assigned_by);
    const assignedByName = assignedByUser ? (assignedByUser.full_name || assignedByUser.email) : "Unknown User";
    const assignedTime = new Date(task.assigned_at).toLocaleString();
    assignedByHTML = `<div style="font-size: 11px; color: #64748b; margin-top: 4px;">Assigned by ${assignedByName} on ${assignedTime}</div>`;
  }

  const dueDateHTML = task.due_date
    ? `<div style="font-size: 12px; color: #94a3b8; margin-top: 4px;">Due: ${new Date(task.due_date).toLocaleDateString()}</div>`
    : "";

  const createdByHTML = task.created_by && task.created_by !== currentUserId
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

function getUserName(userId) {
  const user = allUsers.find(u => u.id === userId);
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
  if (!hasKanbanAccess('write') && task.created_by !== currentUserId && task.assigned_by !== currentUserId) {
    alert('You do not have permission to edit this task');
    return;
  }

  currentEditingTask = task;
  document.getElementById("modalTitle").innerText = "Edit Task";
  document.getElementById("taskTitle").value = task.title;
  document.getElementById("taskDescription").value = task.description || "";
  document.getElementById("taskStatus").value = task.status;
  document.getElementById("taskPriority").value = task.priority;
  document.getElementById("taskAssignedTo").value = task.assigned_to_user || "";
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
    due_date: dueDate,
    tags
  };

  try {
    if (currentEditingTask) {
      const updates = { ...taskData };

      if (assignedToUser !== (currentEditingTask.assigned_to_user || '')) {
        updates.assigned_to_user = assignedToUser;
        updates.assigned_by = currentUserId;
        updates.assigned_at = new Date().toISOString();
      }

      const { error } = await supabase
        .from('todos')
        .update(updates)
        .eq('id', currentEditingTask.id);

      if (error) {
        console.error('Error updating task:', error);
        alert("Failed to update task: " + error.message);
        return;
      }
    } else {
      taskData.created_by = currentUserId;

      if (assignedToUser) {
        taskData.assigned_to_user = assignedToUser;
        taskData.assigned_by = currentUserId;
        taskData.assigned_at = new Date().toISOString();
      }

      const { error } = await supabase
        .from('todos')
        .insert([taskData]);

      if (error) {
        console.error('Error creating task:', error);
        alert("Failed to create task: " + error.message);
        return;
      }
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

  if (!hasKanbanAccess('write') && currentEditingTask.created_by !== currentUserId) {
    alert('You do not have permission to delete this task');
    return;
  }

  if (!confirm("Are you sure you want to delete this task?")) {
    return;
  }

  try {
    const { error } = await supabase
      .from('todos')
      .delete()
      .eq('id', currentEditingTask.id);

    if (error) {
      console.error('Error deleting task:', error);
      alert("Failed to delete task: " + error.message);
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
