let currentEditingTask = null;

async function initializeKanban() {
  await loadTasks();
}

async function loadTasks() {
  try {
    const response = await fetch('/api/todo');

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
  if (task.assigned_to) {
    assignedToHTML = `<div style="font-size: 12px; color: #94a3b8; margin-top: 8px;">Assigned to: ${task.assigned_to}</div>`;
  }

  const dueDateHTML = task.due_date
    ? `<div style="font-size: 12px; color: #94a3b8; margin-top: 4px;">Due: ${new Date(task.due_date).toLocaleDateString()}</div>`
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
    ${dueDateHTML}
  `;

  return card;
}

function openAddModal() {
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
  currentEditingTask = task;
  document.getElementById("modalTitle").innerText = "Edit Task";
  document.getElementById("taskTitle").value = task.title;
  document.getElementById("taskDescription").value = task.description || "";
  document.getElementById("taskStatus").value = task.status;
  document.getElementById("taskPriority").value = task.priority;
  document.getElementById("taskAssignedTo").value = task.assigned_to || "";
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
  const title = document.getElementById("taskTitle").value.trim();
  const description = document.getElementById("taskDescription").value.trim();
  const status = document.getElementById("taskStatus").value;
  const priority = document.getElementById("taskPriority").value;
  const assignedTo = document.getElementById("taskAssignedTo").value.trim();
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
    assigned_to: assignedTo,
    due_date: dueDate,
    tags
  };

  try {
    let response;

    if (currentEditingTask) {
      response = await fetch(`/api/todo/${currentEditingTask._id}`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(taskData)
      });
    } else {
      response = await fetch('/api/todo', {
        method: 'POST',
        headers: {
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

  if (!confirm("Are you sure you want to delete this task?")) {
    return;
  }

  try {
    const response = await fetch(`/api/todo/${currentEditingTask._id}`, {
      method: 'DELETE'
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
