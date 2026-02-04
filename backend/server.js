const express = require("express");
const cors = require("cors");
const path = require("path");
const connectDB = require("./config/db");

const app = express();
connectDB();

app.use(cors());
app.use(express.json());

//  Serve frontend
app.use(express.static(path.join(__dirname, "../frontend")));

app.use("/api/billing", require("./routes/billing.routes"));
app.use("/api/instance", require("./routes/instance.routes"));
app.use("/api/checklist", require("./routes/checklist.routes"));
app.use("/api/todo", require("./routes/todo.routes"));

//  Root path serves login page
app.get("/", (req, res) => {
  res.sendFile(path.join(__dirname, "../frontend/login.html"));
});

//  Fallback to login.html for unknown routes
app.get("*", (req, res) => {
  res.sendFile(path.join(__dirname, "../frontend/login.html"));
});

app.listen(4000, () =>
  console.log("Billing Tracker running on http://localhost:4000")
);
