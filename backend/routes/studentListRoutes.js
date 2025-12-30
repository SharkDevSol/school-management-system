const express = require("express");
const router = express.Router();
const pool = require("../config/db");
const multer = require("multer");
const path = require("path");
const fs = require("fs");

// Configure multer for file uploads
const upload = multer({
  dest: "Uploads/",
  fileFilter: (req, file, cb) => {
    const allowedTypes = ["image/jpeg", "image/png", "video/mp4", "application/pdf"];
    if (allowedTypes.includes(file.mimetype)) {
      cb(null, true);
    } else {
      cb(new Error("Invalid file type. Only JPEG, PNG, MP4, and PDF are allowed."));
    }
  },
  limits: { fileSize: 5 * 1024 * 1024 } // 5MB limit
});

// Ensure Uploads directory exists
const uploadDir = path.join(__dirname, "../Uploads");
if (!fs.existsSync(uploadDir)) {
  fs.mkdirSync(uploadDir, { recursive: true });
}

// Helper function to check if a table exists and get its columns
const getTableColumns = async (tableName) => {
  try {
    const result = await pool.query(
      `SELECT column_name FROM information_schema.columns WHERE table_schema = 'classes_schema' AND table_name = $1`,
      [tableName]
    );
    return result.rows.map(row => row.column_name);
  } catch (error) {
    console.error(`Error fetching columns for table ${tableName}:`, error);
    return [];
  }
};

// Get all class names, excluding school_student_count
router.get("/classes", async (req, res) => {
  try {
    const result = await pool.query(`
      SELECT table_name
      FROM information_schema.tables
      WHERE table_schema = 'classes_schema'
    `);
    const classes = result.rows.map(row => row.table_name);
    res.json(classes);
  } catch (error) {
    console.error("Error fetching classes:", error);
    res.status(500).json({ error: "Failed to fetch classes", details: error.message });
  }
});

// Get students for a specific class - returns ALL columns including password fields
router.get("/students/:className", async (req, res) => {
  const { className } = req.params;
  try {
    // Validate className to prevent SQL injection and ensure it's a valid table name
    const validTableName = /^[a-zA-Z0-9_]+$/.test(className);
    if (!validTableName) {
      return res.status(400).json({ error: "Invalid class name provided." });
    }

    // Return ALL columns to include password, custom fields, and documents
    const query = `SELECT * FROM classes_schema."${className}" ORDER BY LOWER(student_name) ASC`;
    const result = await pool.query(query);
    res.json(result.rows);
  } catch (error) {
    console.error(`Error fetching students for class ${className}:`, error);
    res.status(500).json({ error: `Failed to fetch students for class ${className}`, details: error.message });
  }
});

// Get single student data by school_id and class_id
router.get("/student/:className/:schoolId/:classId", async (req, res) => {
  const { className, schoolId, classId } = req.params;
  try {
    const validTableName = /^[a-zA-Z0-9_]+$/.test(className);
    if (!validTableName) {
      return res.status(400).json({ error: "Invalid class name provided." });
    }

    const result = await pool.query(
      `SELECT * FROM classes_schema."${className}" WHERE school_id = $1 AND class_id = $2`,
      [schoolId, classId]
    );
    if (result.rows.length === 0) {
      return res.status(404).json({ error: "Student not found" });
    }
    res.json(result.rows[0]);
  } catch (error) {
    console.error(`Error fetching student from class ${className}:`, error);
    res.status(500).json({ error: "Failed to fetch student", details: error.message });
  }
});

// Update student data with file upload support
router.put("/student/:className/:schoolId/:classId", upload.single("image_student"), async (req, res) => {
  const { className, schoolId, classId } = req.params;
  const updates = JSON.parse(req.body.updates || "{}");
  const file = req.file;

  try {
    const validTableName = /^[a-zA-Z0-9_]+$/.test(className);
    if (!validTableName) {
      return res.status(400).json({ error: "Invalid class name provided." });
    }

    // Prepare update fields
    const fields = { ...updates };
    if (file) {
      fields.image_student = file.filename;
    }

    // Remove school_id and class_id from updates to avoid modifying primary keys
    delete fields.school_id;
    delete fields.class_id;

    if (Object.keys(fields).length === 0) {
      return res.status(400).json({ error: "No fields provided to update" });
    }

    // Build query
    const columns = Object.keys(fields)
      .map((key, index) => `"${key}" = $${index + 1}`)
      .join(", ");
    const values = Object.entries(fields).map(([key, value]) => {
      if (value === "null" || value === null) return null;
      if (key === "age") return parseInt(value, 10);
      if (key.includes("date")) return value; // Handle date fields
      return value.toString();
    });

    const result = await pool.query(
      `UPDATE classes_schema."${className}" SET ${columns} WHERE school_id = $${Object.keys(fields).length + 1} AND class_id = $${Object.keys(fields).length + 2} RETURNING *`,
      [...values, schoolId, classId]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ error: "Student not found" });
    }

    // Delete old file if a new one was uploaded
    if (file && updates.image_student && updates.image_student !== file.filename) {
      const oldFilePath = path.join(uploadDir, updates.image_student);
      if (fs.existsSync(oldFilePath)) {
        fs.unlinkSync(oldFilePath);
      }
    }

    res.json(result.rows[0]);
  } catch (error) {
    console.error(`Error updating student in class ${className}:`, error);
    res.status(500).json({ error: "Failed to update student", details: error.message });
  }
});

// Delete student
router.delete("/student/:className/:schoolId/:classId", async (req, res) => {
  const { className, schoolId, classId } = req.params;
  try {
    const validTableName = /^[a-zA-Z0-9_]+$/.test(className);
    if (!validTableName) {
      return res.status(400).json({ error: "Invalid class name provided." });
    }

    const result = await pool.query(
      `DELETE FROM classes_schema."${className}" WHERE school_id = $1 AND class_id = $2 RETURNING *`,
      [schoolId, classId]
    );
    if (result.rows.length === 0) {
      return res.status(404).json({ error: "Student not found" });
    }
    // Delete associated image file if it exists
    if (result.rows[0].image_student) {
      const filePath = path.join(__dirname, "../Uploads", result.rows[0].image_student);
      if (fs.existsSync(filePath)) {
        fs.unlinkSync(filePath);
      }
    }
    res.json({ message: "Student deleted successfully" });
  } catch (error) {
    console.error(`Error deleting student from class ${className}:`, error);
    res.status(500).json({ error: "Failed to delete student", details: error.message });
  }
});

module.exports = router;