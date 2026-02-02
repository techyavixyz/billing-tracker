const express = require("express");
const Todo = require("../models/Todo");
const router = express.Router();

router.post("/", async (req, res) => {
  try {
    const { title, description, status, priority, assignedTo, dueDate, tags } = req.body;

    if (!title) {
      return res.status(400).json({ error: "Title is required" });
    }

    const todo = await Todo.create({
      title,
      description: description || "",
      status: status || "todo",
      priority: priority || "medium",
      assignedTo: assignedTo || "",
      dueDate: dueDate ? new Date(dueDate) : null,
      tags: tags || []
    });

    res.json(todo);
  } catch (error) {
    console.error("Error creating todo:", error);
    res.status(500).json({ error: "Failed to create todo: " + error.message });
  }
});

router.get("/", async (req, res) => {
  try {
    const { status, priority, assignedTo } = req.query;
    const query = {};

    if (status) query.status = status;
    if (priority) query.priority = priority;
    if (assignedTo) query.assignedTo = assignedTo;

    const todos = await Todo.find(query).sort({ createdAt: -1 });
    res.json(todos);
  } catch (error) {
    console.error("Error fetching todos:", error);
    res.status(500).json({ error: "Failed to fetch todos: " + error.message });
  }
});

router.get("/:id", async (req, res) => {
  try {
    const { id } = req.params;
    const todo = await Todo.findById(id);

    if (!todo) {
      return res.status(404).json({ error: "Todo not found" });
    }

    res.json(todo);
  } catch (error) {
    console.error("Error fetching todo:", error);
    res.status(500).json({ error: "Failed to fetch todo: " + error.message });
  }
});

router.patch("/:id", async (req, res) => {
  try {
    const { id } = req.params;
    const updates = req.body;

    const todo = await Todo.findByIdAndUpdate(id, updates, { new: true });

    if (!todo) {
      return res.status(404).json({ error: "Todo not found" });
    }

    res.json(todo);
  } catch (error) {
    console.error("Error updating todo:", error);
    res.status(500).json({ error: "Failed to update todo: " + error.message });
  }
});

router.delete("/:id", async (req, res) => {
  try {
    const { id } = req.params;
    const todo = await Todo.findByIdAndDelete(id);

    if (!todo) {
      return res.status(404).json({ error: "Todo not found" });
    }

    res.json({ message: "Todo deleted successfully" });
  } catch (error) {
    console.error("Error deleting todo:", error);
    res.status(500).json({ error: "Failed to delete todo: " + error.message });
  }
});

module.exports = router;
