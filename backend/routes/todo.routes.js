const express = require("express");
const Todo = require("../models/Todo");
const { authenticateToken } = require("./auth.routes");

const router = express.Router();

// Middleware to check kanban permissions
const checkKanbanPermission = (accessType) => {
  return (req, res, next) => {
    if (req.user.role === 'admin') {
      return next();
    }

    const hasPermission = accessType === 'read'
      ? req.user.kanban_permissions.can_read
      : req.user.kanban_permissions.can_write;

    if (!hasPermission) {
      return res.status(403).json({ error: `You do not have ${accessType} permission for kanban` });
    }

    next();
  };
};

// Create todo
router.post("/", authenticateToken, checkKanbanPermission('write'), async (req, res) => {
  try {
    const { title, description, status, priority, assigned_to_user, due_date, tags } = req.body;

    if (!title) {
      return res.status(400).json({ error: "Title is required" });
    }

    const todoData = {
      title,
      description: description || "",
      status: status || "todo",
      priority: priority || "medium",
      created_by: req.user._id,
      due_date: due_date ? new Date(due_date) : null,
      tags: tags || []
    };

    if (assigned_to_user) {
      todoData.assigned_to_user = assigned_to_user;
      todoData.assigned_by = req.user._id;
      todoData.assigned_at = new Date();
    }

    const todo = await Todo.create(todoData);

    const populatedTodo = await Todo.findById(todo._id)
      .populate('created_by', 'email full_name')
      .populate('assigned_to_user', 'email full_name')
      .populate('assigned_by', 'email full_name');

    res.json(populatedTodo);
  } catch (error) {
    console.error("Error creating todo:", error);
    res.status(500).json({ error: "Failed to create todo: " + error.message });
  }
});

// Get todos
router.get("/", authenticateToken, checkKanbanPermission('read'), async (req, res) => {
  try {
    const { status, priority } = req.query;
    const query = {};

    if (req.user.role !== 'admin') {
      query.$or = [
        { created_by: req.user._id },
        { assigned_to_user: req.user._id },
        { assigned_by: req.user._id }
      ];
    }

    if (status) query.status = status;
    if (priority) query.priority = priority;

    const todos = await Todo.find(query)
      .sort({ createdAt: -1 })
      .populate('created_by', 'email full_name')
      .populate('assigned_to_user', 'email full_name')
      .populate('assigned_by', 'email full_name');

    res.json(todos);
  } catch (error) {
    console.error("Error fetching todos:", error);
    res.status(500).json({ error: "Failed to fetch todos: " + error.message });
  }
});

// Get single todo
router.get("/:id", authenticateToken, checkKanbanPermission('read'), async (req, res) => {
  try {
    const { id } = req.params;
    const todo = await Todo.findById(id)
      .populate('created_by', 'email full_name')
      .populate('assigned_to_user', 'email full_name')
      .populate('assigned_by', 'email full_name');

    if (!todo) {
      return res.status(404).json({ error: "Todo not found" });
    }

    if (req.user.role !== 'admin') {
      const isInvolved =
        todo.created_by._id.equals(req.user._id) ||
        (todo.assigned_to_user && todo.assigned_to_user._id.equals(req.user._id)) ||
        (todo.assigned_by && todo.assigned_by._id.equals(req.user._id));

      if (!isInvolved) {
        return res.status(403).json({ error: "You do not have access to this todo" });
      }
    }

    res.json(todo);
  } catch (error) {
    console.error("Error fetching todo:", error);
    res.status(500).json({ error: "Failed to fetch todo: " + error.message });
  }
});

// Update todo
router.patch("/:id", authenticateToken, checkKanbanPermission('write'), async (req, res) => {
  try {
    const { id } = req.params;
    const updates = req.body;

    const todo = await Todo.findById(id);

    if (!todo) {
      return res.status(404).json({ error: "Todo not found" });
    }

    if (req.user.role !== 'admin') {
      const canEdit =
        todo.created_by.equals(req.user._id) ||
        (todo.assigned_by && todo.assigned_by.equals(req.user._id));

      if (!canEdit) {
        return res.status(403).json({ error: "You do not have permission to edit this todo" });
      }
    }

    if (updates.assigned_to_user !== undefined) {
      const currentAssignee = todo.assigned_to_user ? todo.assigned_to_user.toString() : null;
      const newAssignee = updates.assigned_to_user || null;

      if (currentAssignee !== newAssignee) {
        updates.assigned_by = req.user._id;
        updates.assigned_at = new Date();
      }
    }

    const updatedTodo = await Todo.findByIdAndUpdate(id, updates, { new: true })
      .populate('created_by', 'email full_name')
      .populate('assigned_to_user', 'email full_name')
      .populate('assigned_by', 'email full_name');

    res.json(updatedTodo);
  } catch (error) {
    console.error("Error updating todo:", error);
    res.status(500).json({ error: "Failed to update todo: " + error.message });
  }
});

// Delete todo
router.delete("/:id", authenticateToken, checkKanbanPermission('write'), async (req, res) => {
  try {
    const { id } = req.params;
    const todo = await Todo.findById(id);

    if (!todo) {
      return res.status(404).json({ error: "Todo not found" });
    }

    if (req.user.role !== 'admin' && !todo.created_by.equals(req.user._id)) {
      return res.status(403).json({ error: "You do not have permission to delete this todo" });
    }

    await Todo.findByIdAndDelete(id);

    res.json({ message: "Todo deleted successfully" });
  } catch (error) {
    console.error("Error deleting todo:", error);
    res.status(500).json({ error: "Failed to delete todo: " + error.message });
  }
});

module.exports = router;
