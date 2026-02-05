const express = require("express");
const Todo = require("../models/Todo");

const router = express.Router();

// Create todo
router.post("/", async (req, res) => {
  try {
    const { title, description, status, priority, assigned_to, due_date, tags } = req.body;

    if (!title) {
      return res.status(400).json({ error: "Title is required" });
    }

    const todoData = {
      title,
      description: description || "",
      status: status || "todo",
      priority: priority || "medium",
      assigned_to: assigned_to || "",
      due_date: due_date ? new Date(due_date) : null,
      tags: tags || []
    };

    const todo = await Todo.create(todoData);

    res.json(todo);
  } catch (error) {
    console.error("Error creating todo:", error);
    res.status(500).json({ error: "Failed to create todo: " + error.message });
  }
});

// Get todos
router.get("/", async (req, res) => {
  try {
    const { status, priority } = req.query;
    const query = {};

    if (status) query.status = status;
    if (priority) query.priority = priority;

    const todos = await Todo.find(query).sort({ createdAt: -1 });

    res.json(todos);
  } catch (error) {
    console.error("Error fetching todos:", error);
    res.status(500).json({ error: "Failed to fetch todos: " + error.message });
  }
});

// Get single todo
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

// Update todo
router.patch("/:id", async (req, res) => {
  try {
    const { id } = req.params;
    const updates = req.body;

    const todo = await Todo.findById(id);

    if (!todo) {
      return res.status(404).json({ error: "Todo not found" });
    }

    const updatedTodo = await Todo.findByIdAndUpdate(id, updates, { new: true });

    res.json(updatedTodo);
  } catch (error) {
    console.error("Error updating todo:", error);
    res.status(500).json({ error: "Failed to update todo: " + error.message });
  }
});

// Delete todo
router.delete("/:id", async (req, res) => {
  try {
    const { id } = req.params;
    const todo = await Todo.findById(id);

    if (!todo) {
      return res.status(404).json({ error: "Todo not found" });
    }

    await Todo.findByIdAndDelete(id);

    res.json({ message: "Todo deleted successfully" });
  } catch (error) {
    console.error("Error deleting todo:", error);
    res.status(500).json({ error: "Failed to delete todo: " + error.message });
  }
});

module.exports = router;
