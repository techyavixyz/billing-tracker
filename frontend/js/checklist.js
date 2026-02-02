function setDefaultDate() {
  const today = new Date().toISOString().split('T')[0];
  document.getElementById("taskDate").value = today;
}

async function loadAreaSuggestions() {
  try {
    const response = await fetch("/api/checklist/areas");
    const areas = await response.json();

    const areaSuggestions = document.getElementById("areaSuggestions");
    const filterAreaSuggestions = document.getElementById("filterAreaSuggestions");

    areaSuggestions.innerHTML = "";
    filterAreaSuggestions.innerHTML = "";

    areas.forEach(area => {
      const option1 = document.createElement("option");
      option1.value = area;
      areaSuggestions.appendChild(option1);

      const option2 = document.createElement("option");
      option2.value = area;
      filterAreaSuggestions.appendChild(option2);
    });
  } catch (error) {
    console.error("Error loading area suggestions:", error);
  }
}

setDefaultDate();
loadAreaSuggestions();

async function addTask() {
  const area = document.getElementById("area").value.trim();
  const date = document.getElementById("taskDate").value;
  const taskName = document.getElementById("taskName").value.trim();
  const description = document.getElementById("taskDescription").value.trim();

  if (!area || !date || !taskName) {
    alert("Please fill in all required fields");
    return;
  }

  try {
    const response = await fetch("/api/checklist/add", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        area,
        date,
        taskName,
        description
      })
    });

    if (response.ok) {
      alert("Task added successfully!");
      document.getElementById("area").value = "";
      document.getElementById("taskName").value = "";
      document.getElementById("taskDescription").value = "";
      setDefaultDate();
      loadTasks();
      loadAreaSuggestions();
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

  const filterArea = document.getElementById("filterArea").value.trim();
  const filterDate = document.getElementById("filterDate").value;
  const filterStartDate = document.getElementById("filterStartDate").value;
  const filterEndDate = document.getElementById("filterEndDate").value;

  if (filterArea) params.append("area", filterArea);
  if (filterDate) params.append("date", filterDate);
  if (filterStartDate) params.append("startDate", filterStartDate);
  if (filterEndDate) params.append("endDate", filterEndDate);

  try {
    const response = await fetch(`/api/checklist?${params.toString()}`);
    const tasks = await response.json();
    renderTasks(tasks);

    const filterCount = [filterArea, filterDate, filterStartDate, filterEndDate].filter(v => v).length;
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
        <td>${task.area}</td>
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
      loadAreaSuggestions();
    } else {
      const errorData = await response.json();
      alert("Failed to delete task: " + (errorData.error || "Unknown error"));
    }
  } catch (error) {
    alert("Error: " + error.message);
  }
}

function clearFilters() {
  document.getElementById("filterArea").value = "";
  document.getElementById("filterDate").value = "";
  document.getElementById("filterStartDate").value = "";
  document.getElementById("filterEndDate").value = "";
  document.getElementById("filterStatus").innerHTML = "";
  loadTasks();
}

function exportCSV() {
  const params = new URLSearchParams();

  const filterArea = document.getElementById("filterArea").value.trim();
  const filterDate = document.getElementById("filterDate").value;
  const filterStartDate = document.getElementById("filterStartDate").value;
  const filterEndDate = document.getElementById("filterEndDate").value;

  if (filterArea) params.append("area", filterArea);
  if (filterDate) params.append("date", filterDate);
  if (filterStartDate) params.append("startDate", filterStartDate);
  if (filterEndDate) params.append("endDate", filterEndDate);

  window.location.href = `/api/checklist/export-csv?${params.toString()}`;
}

loadTasks();
