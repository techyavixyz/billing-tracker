function setDefaultDate() {
  const today = new Date().toISOString().split('T')[0];
  document.getElementById("taskDate").value = today;
}

setDefaultDate();

async function addTask() {
  const service = document.getElementById("service").value;
  const date = document.getElementById("taskDate").value;
  const taskName = document.getElementById("taskName").value.trim();
  const description = document.getElementById("taskDescription").value.trim();

  if (!service || !date || !taskName) {
    alert("Please fill in all required fields");
    return;
  }

  try {
    const response = await fetch("/api/checklist/add", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        service,
        date,
        taskName,
        description
      })
    });

    if (response.ok) {
      alert("Task added successfully!");
      document.getElementById("taskName").value = "";
      document.getElementById("taskDescription").value = "";
      setDefaultDate();
      loadTasks();
    } else {
      const errorData = await response.json();
      alert("Failed to add task: " + (errorData.error || "Unknown error"));
    }
  } catch (error) {
    alert("Error: " + error.message);
  }
}

async function loadTasks() {
  const params = new URLSearchParams();

  const filterService = document.getElementById("filterService").value;
  const filterDate = document.getElementById("filterDate").value;
  const filterStartDate = document.getElementById("filterStartDate").value;
  const filterEndDate = document.getElementById("filterEndDate").value;

  if (filterService) params.append("service", filterService);
  if (filterDate) params.append("date", filterDate);
  if (filterStartDate) params.append("startDate", filterStartDate);
  if (filterEndDate) params.append("endDate", filterEndDate);

  try {
    const response = await fetch(`/api/checklist?${params.toString()}`);
    const tasks = await response.json();
    renderTasks(tasks);

    const filterCount = [filterService, filterDate, filterStartDate, filterEndDate].filter(v => v).length;
    if (filterCount > 0) {
      document.getElementById("filterStatus").innerHTML = `<span style="color: #10b981;">Showing ${tasks.length} task(s) with ${filterCount} filter(s) applied</span>`;
    } else {
      document.getElementById("filterStatus").innerHTML = `<span style="color: #60a5fa;">Showing all ${tasks.length} task(s)</span>`;
    }
  } catch (error) {
    console.error("Error loading tasks:", error);
    alert("Failed to load tasks");
  }
}

function renderTasks(tasks) {
  const tbody = document.querySelector("#checklistTable tbody");
  tbody.innerHTML = "";

  if (tasks.length === 0) {
    tbody.innerHTML = `
      <tr>
        <td colspan="8" style="text-align: center; padding: 32px; color: #64748b;">
          No tasks found
        </td>
      </tr>
    `;
    return;
  }

  tasks.forEach(task => {
    const taskDate = new Date(task.date).toLocaleDateString();
    const checkedAt = task.checkedAt ? new Date(task.checkedAt).toLocaleString() : "";
    const statusColor = task.isCompleted ? "#10b981" : "#f59e0b";
    const statusText = task.isCompleted ? "Completed" : "Pending";

    tbody.innerHTML += `
      <tr>
        <td>${taskDate}</td>
        <td style="text-transform: uppercase;">${task.service}</td>
        <td>${task.taskName}</td>
        <td>${task.description || ""}</td>
        <td><span style="color: ${statusColor}; font-weight: 600;">${statusText}</span></td>
        <td>${task.checkedBy || ""}</td>
        <td>${checkedAt}</td>
        <td style="white-space: nowrap;">
          ${task.isCompleted
            ? `<button class="secondary" onclick="toggleTask('${task._id}', false)" style="padding: 6px 12px; font-size: 12px; margin: 2px;">Uncheck</button>`
            : `<button onclick="toggleTask('${task._id}', true)" style="padding: 6px 12px; font-size: 12px; margin: 2px;">Check</button>`
          }
          <button class="secondary" onclick="deleteTask('${task._id}')" style="padding: 6px 12px; font-size: 12px; margin: 2px; background: linear-gradient(135deg, #ef4444, #dc2626);">Delete</button>
        </td>
      </tr>
    `;
  });
}

async function toggleTask(id, isCompleted) {
  let checkedBy = "";

  if (isCompleted) {
    checkedBy = prompt("Enter your name:");
    if (!checkedBy || !checkedBy.trim()) {
      alert("Name is required to check off a task");
      return;
    }
  }

  try {
    const response = await fetch(`/api/checklist/${id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        isCompleted,
        checkedBy: checkedBy.trim()
      })
    });

    if (response.ok) {
      loadTasks();
    } else {
      const errorData = await response.json();
      alert("Failed to update task: " + (errorData.error || "Unknown error"));
    }
  } catch (error) {
    alert("Error: " + error.message);
  }
}

async function deleteTask(id) {
  if (!confirm("Are you sure you want to delete this task?")) {
    return;
  }

  try {
    const response = await fetch(`/api/checklist/${id}`, {
      method: "DELETE"
    });

    if (response.ok) {
      alert("Task deleted successfully!");
      loadTasks();
    } else {
      const errorData = await response.json();
      alert("Failed to delete task: " + (errorData.error || "Unknown error"));
    }
  } catch (error) {
    alert("Error: " + error.message);
  }
}

function clearFilters() {
  document.getElementById("filterService").value = "";
  document.getElementById("filterDate").value = "";
  document.getElementById("filterStartDate").value = "";
  document.getElementById("filterEndDate").value = "";
  document.getElementById("filterStatus").innerHTML = "";
  loadTasks();
}

function exportCSV() {
  const params = new URLSearchParams();

  const filterService = document.getElementById("filterService").value;
  const filterDate = document.getElementById("filterDate").value;
  const filterStartDate = document.getElementById("filterStartDate").value;
  const filterEndDate = document.getElementById("filterEndDate").value;

  if (filterService) params.append("service", filterService);
  if (filterDate) params.append("date", filterDate);
  if (filterStartDate) params.append("startDate", filterStartDate);
  if (filterEndDate) params.append("endDate", filterEndDate);

  window.location.href = `/api/checklist/export-csv?${params.toString()}`;
}

loadTasks();
