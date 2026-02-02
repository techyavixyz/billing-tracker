const express = require("express");
const DailyChecklist = require("../models/DailyChecklist");
const router = express.Router();

router.get("/areas", async (req, res) => {
  try {
    const areas = await DailyChecklist.distinct("area");
    res.json(areas.sort());
  } catch (error) {
    console.error("Error fetching areas:", error);
    res.status(500).json({ error: "Failed to fetch areas: " + error.message });
  }
});

router.post("/add", async (req, res) => {
  try {
    const { area, date, taskName, description } = req.body;

    if (!area || !date || !taskName) {
      return res.status(400).json({ error: "Missing required fields" });
    }

    const taskDate = new Date(date);
    if (isNaN(taskDate.getTime())) {
      return res.status(400).json({ error: "Invalid date format" });
    }

    const task = await DailyChecklist.create({
      area: area.trim(),
      date: taskDate,
      taskName,
      description: description || ""
    });

    res.json(task);
  } catch (error) {
    console.error("Error adding checklist task:", error);
    res.status(500).json({ error: "Failed to add checklist task: " + error.message });
  }
});

router.get("/", async (req, res) => {
  try {
    const { area, date, startDate, endDate } = req.query;
    const query = {};

    if (area) query.area = area.trim();

    if (date) {
      const d = new Date(date);
      const nextDay = new Date(d);
      nextDay.setDate(d.getDate() + 1);
      query.date = { $gte: d, $lt: nextDay };
    } else if (startDate || endDate) {
      query.date = {};
      if (startDate) query.date.$gte = new Date(startDate);
      if (endDate) {
        const end = new Date(endDate);
        end.setDate(end.getDate() + 1);
        query.date.$lt = end;
      }
    }

    const tasks = await DailyChecklist.find(query).sort({ date: -1, createdAt: -1 });
    res.json(tasks);
  } catch (error) {
    console.error("Error fetching checklist tasks:", error);
    res.status(500).json({ error: "Failed to fetch checklist tasks: " + error.message });
  }
});

router.patch("/:id", async (req, res) => {
  try {
    const { id } = req.params;
    const { isCompleted, checkedBy } = req.body;

    const update = { isCompleted };
    if (isCompleted) {
      update.checkedBy = checkedBy || "Unknown";
      update.checkedAt = new Date();
    } else {
      update.checkedBy = null;
      update.checkedAt = null;
    }

    const task = await DailyChecklist.findByIdAndUpdate(id, update, { new: true });

    if (!task) {
      return res.status(404).json({ error: "Task not found" });
    }

    res.json(task);
  } catch (error) {
    console.error("Error updating checklist task:", error);
    res.status(500).json({ error: "Failed to update checklist task: " + error.message });
  }
});

router.delete("/:id", async (req, res) => {
  try {
    const { id } = req.params;
    const task = await DailyChecklist.findByIdAndDelete(id);

    if (!task) {
      return res.status(404).json({ error: "Task not found" });
    }

    res.json({ message: "Task deleted successfully" });
  } catch (error) {
    console.error("Error deleting checklist task:", error);
    res.status(500).json({ error: "Failed to delete checklist task: " + error.message });
  }
});

router.get("/export-csv", async (req, res) => {
  try {
    const { area, date, startDate, endDate } = req.query;
    const query = {};

    if (area) query.area = area.trim();

    if (date) {
      const d = new Date(date);
      const nextDay = new Date(d);
      nextDay.setDate(d.getDate() + 1);
      query.date = { $gte: d, $lt: nextDay };
    } else if (startDate || endDate) {
      query.date = {};
      if (startDate) query.date.$gte = new Date(startDate);
      if (endDate) {
        const end = new Date(endDate);
        end.setDate(end.getDate() + 1);
        query.date.$lt = end;
      }
    }

    const tasks = await DailyChecklist.find(query).sort({ date: -1, createdAt: -1 });

    const csvRows = [];
    csvRows.push("Date,Area,Task Name,Description,Completed,Checked By,Checked At");

    tasks.forEach(task => {
      const taskDate = new Date(task.date).toLocaleDateString();
      const checkedAt = task.checkedAt ? new Date(task.checkedAt).toLocaleString() : "";
      const checkedBy = task.checkedBy || "";
      const description = (task.description || "").replace(/"/g, '""');

      csvRows.push([
        `"${taskDate}"`,
        `"${task.area}"`,
        `"${task.taskName}"`,
        `"${description}"`,
        task.isCompleted ? "Yes" : "No",
        `"${checkedBy}"`,
        `"${checkedAt}"`
      ].join(","));
    });

    const csv = csvRows.join("\n");
    const filename = `checklist-${area || 'all'}-${Date.now()}.csv`;

    res.setHeader("Content-Type", "text/csv");
    res.setHeader("Content-Disposition", `attachment; filename="${filename}"`);
    res.send(csv);
  } catch (error) {
    console.error("Error exporting checklist:", error);
    res.status(500).json({ error: "Failed to export checklist: " + error.message });
  }
});

module.exports = router;
