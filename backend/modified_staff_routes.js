const express = require("express");
const pool = require("../config/db");
const router = express.Router();
const path = require("path");
const multer = require("multer");
const fs = require("fs").promises;
const { initializeStaffUsersTable, createStaffUser, verifyCredentials, getStaffProfile } = require("./staff_auth");

const uploadDir = path.join(__dirname, "Uploads");
const storage = multer.diskStorage({
  destination: async (req, file, cb) => {
    try {
      await fs.mkdir(uploadDir, { recursive: true });
      cb(null, uploadDir);
    } catch (error) {
      cb(error);
    }
  },
  filename: (req, file, cb) => {
    const uniqueSuffix = Date.now() + "-" + Math.round(Math.random() * 1e9);
    cb(null, `${file.fieldname}-${uniqueSuffix}${path.extname(file.originalname)}`);
  }
});
const upload = multer({
  storage: storage,
  limits: { fileSize: 5 * 1024 * 1024 }
}).fields([
  { name: "image_staff", maxCount: 1 },
  { name: "custom_uploads", maxCount: 10 }
]);

// Initialize staff_counter table
const initializeStaffCounter = async () => {
  try {
    await pool.query(`
      CREATE TABLE IF NOT EXISTS staff_counter (
        id SERIAL PRIMARY KEY,
        count INTEGER NOT NULL DEFAULT 0
      );
    `);
    const result = await pool.query("SELECT count FROM staff_counter WHERE id = 1");
    if (result.rows.length === 0) {
      await pool.query("INSERT INTO staff_counter (id, count) VALUES (1, 0)");
    }
    console.log("Staff counter initialized");
  } catch (error) {
    console.error("Error initializing staff counter:", error);
  }
};

// Initialize both tables
initializeStaffCounter();
initializeStaffUsersTable();

// Get next global_staff_id
const getNextGlobalStaffId = async () => {
  try {
    const result = await pool.query("UPDATE staff_counter SET count = count + 1 WHERE id = 1 RETURNING count");
    console.log("Fetched next global_staff_id:", result.rows[0].count);
    return result.rows[0].count;
  } catch (error) {
    console.error("Error getting global_staff_id:", error);
    throw error;
  }
};

// Update staff_id values based on name order
const updateStaffIds = async (schemaName, className) => {
  try {
    const staff = await pool.query(
      `SELECT id FROM "${schemaName}"."${className}" ORDER BY LOWER(name) ASC`
    );
    for (let i = 0; i < staff.rows.length; i++) {
      await pool.query(
        `UPDATE "${schemaName}"."${className}" SET staff_id = $1 WHERE id = $2`,
        [i + 1, staff.rows[i].id]
      );
    }
    console.log(`Updated staff_ids for ${schemaName}.${className}`);
  } catch (error) {
    console.error("Error updating staff_ids:", error);
    throw error;
  }
};

// Get all classes for a staff type
router.get("/classes", async (req, res) => {
  try {
    const { staffType } = req.query;
    if (!staffType) {
      return res.status(400).json({ error: "Staff type is required" });
    }
    console.log(`Fetching classes for staff type: ${staffType}`);
    const schemaName = `staff_${staffType.replace(/\s+/g, "_").toLowerCase()}`;
    const result = await pool.query(
      `SELECT table_name FROM information_schema.tables WHERE table_schema = $1 AND table_name != "staff_counter"`,
      [schemaName]
    );
    const classes = result.rows.map(row => row.table_name);
    console.log("Fetched classes:", classes);
    res.json(classes);
  } catch (error) {
    console.error("Error fetching classes:", error);
    res.status(500).json({ error: "Failed to fetch classes", details: error.message });
  }
});

// Get columns for a specific form
router.get("/columns/:staffType/:className", async (req, res) => {
  try {
    const { staffType, className } = req.params;
    console.log(`Fetching columns for ${staffType}: ${className}`);
    const schemaName = `staff_${staffType.replace(/\s+/g, "_").toLowerCase()}`;
    const result = await pool.query(
      `SELECT column_name, data_type, is_nullable 
       FROM information_schema.columns 
       WHERE table_schema = $1 AND table_name = $2`,
      [schemaName, className]
    );
    const columns = result.rows.map(row => ({
      column_name: row.column_name,
      data_type: row.data_type === "character varying" ? row.column_name === "image_staff" ? "upload" : "text" : row.data_type,
      is_nullable: row.is_nullable
    }));

    const genderColumn = columns.find(col => col.column_name === "gender");
    if (genderColumn) {
      genderColumn.options = ["Male", "Female"];
    }
    const roleColumn = columns.find(col => col.column_name === "role");
    if (roleColumn) {
      roleColumn.options = [
        "Teacher", "Director", "Coordinator", "Supervisor", "Deputy director",
        "Purchaser", "Cashier", "Accountant", "Guard", "Cleaner", "Department Head",
        "Counselor", "Instructor", "Librarian", "Nurse", "Technician", "Assistant",
        "Manager", "Trainer", "Advisor", "Inspector"
      ];
    }
    const enrollmentTypeColumn = columns.find(col => col.column_name === "staff_enrollment_type");
    if (enrollmentTypeColumn) {
      enrollmentTypeColumn.options = ["Permanent", "Contract"];
    }
    const workTimeColumn = columns.find(col => col.column_name === "staff_work_time");
    if (workTimeColumn) {
      workTimeColumn.options = ["Full time", "Part time"];
    }

    console.log(`Fetched ${columns.length} columns for ${schemaName}.${className}`);
    res.json(columns);
  } catch (error) {
    console.error("Error fetching columns:", error);
    res.status(500).json({ error: "Failed to fetch columns", details: error.message });
  }
});

// Create form
router.post("/create-form", async (req, res) => {
  const { staffType, className, customFields } = req.body;

  if (!staffType || !className || !["Supportive Staff", "Administrative Staff", "Teachers"].includes(staffType)) {
    console.error("Validation failed: Invalid staff type or class name", { staffType, className });
    return res.status(400).json({ error: "Invalid staff type or class name" });
  }

  const client = await pool.connect();
  try {
    await client.query("BEGIN");
    console.log(`Starting transaction for creating form for ${staffType}: ${className}`);

    const schemaName = `staff_${staffType.replace(/\s+/g, "_").toLowerCase()}`;
    await client.query(`CREATE SCHEMA IF NOT EXISTS ${schemaName}`);
    console.log(`Schema ${schemaName} created or already exists`);

    // Check if a table already exists in the schema
    const existingTables = await pool.query(
      `SELECT table_name FROM information_schema.tables WHERE table_schema = $1 AND table_name != "staff_counter"`,
      [schemaName]
    );
    if (existingTables.rows.length > 0) {
      throw new Error("A form already exists for this staff type");
    }

    if (!/^[a-zA-Z0-9_]+$/.test(className)) {
      console.error("Invalid class name:", className);
      throw new Error("Form name must contain only alphanumeric characters and underscores");
    }

    console.log(`Creating table: ${schemaName}.${className}`);
    const columns = [
      "id SERIAL PRIMARY KEY",
      "global_staff_id INTEGER NOT NULL",
      "staff_id INTEGER NOT NULL",
      "image_staff VARCHAR(255)",
      "name VARCHAR(100) NOT NULL",
      "gender VARCHAR(50) NOT NULL",
      "role VARCHAR(100) NOT NULL",
      "staff_enrollment_type VARCHAR(50) NOT NULL",
      "staff_work_time VARCHAR(50) NOT NULL"
    ];

    for (const field of customFields) {
      let columnDef;
      switch (field.type) {
        case "text":
        case "textarea":
        case "select":
          columnDef = `${field.name} VARCHAR(255)${field.required ? " NOT NULL" : ""}`;
          break;
        case "number":
          columnDef = `${field.name} INTEGER${field.required ? " NOT NULL" : ""}`;
          break;
        case "date":
          columnDef = `${field.name} DATE${field.required ? " NOT NULL" : ""}`;
          break;
        case "checkbox":
          columnDef = `${field.name} BOOLEAN${field.required ? " NOT NULL" : " DEFAULT FALSE"}`;
          break;
        case "upload":
          columnDef = `${field.name} VARCHAR(255)${field.required ? " NOT NULL" : ""}`;
          break;
        default:
          throw new Error(`Unsupported field type: ${field.type}`);
      }
      columns.push(columnDef);
    }

    const createTableQuery = `CREATE TABLE "${schemaName}"."${className}" (${columns.join(", ")})`;
    await client.query(createTableQuery);
    console.log(`Created table: ${schemaName}.${className}`);

    await client.query("COMMIT");
    console.log(`Form created successfully for ${staffType}: ${className}`);
    res.status(200).json({ message: "Form created successfully" });
  } catch (error) {
    await client.query("ROLLBACK");
    console.error("Error creating form:", error);
    res.status(500).json({ error: "Failed to create form", details: error.message });
  } finally {
    client.release();
  }
});

// Delete form
router.delete("/delete-form", async (req, res) => {
  const { staffType, className } = req.body;
  if (!staffType || !className) {
    return res.status(400).json({ error: "Staff type and form name are required" });
  }

  const client = await pool.connect();
  try {
    await client.query("BEGIN");
    console.log(`Starting transaction to delete form ${className} for ${staffType}`);

    const schemaName = `staff_${staffType.replace(/\s+/g, "_").toLowerCase()}`;
    await client.query(`DROP TABLE IF EXISTS "${schemaName}"."${className}" CASCADE`);
    console.log(`Dropped table: ${schemaName}.${className}`);

    await client.query("COMMIT");
    console.log(`Form ${className} deleted successfully`);
    res.status(200).json({ message: "Form deleted successfully" });
  } catch (error) {
    await client.query("ROLLBACK");
    console.error("Error deleting form:", error);
    res.status(500).json({ error: "Failed to delete form", details: error.message });
  } finally {
    client.release();
  }
});

// Add staff - MODIFIED to include automatic user account creation
router.post("/add-staff", upload, async (req, res) => {
  try {
    const { staffType, class: className, uploadFields, ...formData } = req.body;
    const files = req.files || {};
    const imageStaff = files.image_staff ? files.image_staff[0].filename : null;
    const customUploads = files.custom_uploads || [];
    const parsedUploadFields = uploadFields ? JSON.parse(uploadFields) : [];

    if (!staffType || !className) {
      console.error("Validation failed: Staff type and class name are required");
      return res.status(400).json({ error: "Staff type and class name are required" });
    }

    console.log(`Adding staff to ${staffType}: ${className}`);
    const schemaName = `staff_${staffType.replace(/\s+/g, "_").toLowerCase()}`;
    const maxStaffIdResult = await pool.query(`SELECT COALESCE(MAX(staff_id), 0) as max_staff_id FROM "${schemaName}"."${className}"`);
    const tempStaffId = maxStaffIdResult.rows[0].max_staff_id + 1;

    const globalStaffId = await getNextGlobalStaffId();

    const columns = ["global_staff_id", "staff_id", "image_staff", "name", "gender", "role", "staff_enrollment_type", "staff_work_time"];
    const values = [globalStaffId, tempStaffId, imageStaff, formData.name, formData.gender, formData.role, formData.staff_enrollment_type, formData.staff_work_time];

    const customFieldsKeys = Object.keys(formData).filter(key => !["name", "gender", "role", "staff_enrollment_type", "staff_work_time"].includes(key));
    const fileFields = parsedUploadFields;

    for (const key of customFieldsKeys) {
      columns.push(key);
      if (fileFields.includes(key)) {
        const file = customUploads.find(f => f.originalname.includes(`${key}-upload`));
        values.push(file ? file.filename : null);
      } else {
        values.push(formData[key] === "true" ? true : formData[key] === "false" ? false : formData[key]);
      }
    }

    const client = await pool.connect();
    try {
      await client.query("BEGIN");
      const placeholders = columns.map((_, i) => `$${i + 1}`).join(", ");
      const query = `INSERT INTO "${schemaName}"."${className}" (${columns.join(", ")}) VALUES (${placeholders})`;
      await client.query(query, values);

      await updateStaffIds(schemaName, className);

      // Create user account for the new staff member
      const userCredentials = await createStaffUser(globalStaffId, formData.name, staffType, className);

      await client.query("COMMIT");
      console.log(`Staff added successfully to ${schemaName}.${className}`);
      
      // Return success message with user credentials
      res.status(200).json({ 
        message: "Staff added successfully",
        userCredentials: userCredentials ? {
          username: userCredentials.username,
          password: userCredentials.password,
          message: "User account created automatically"
        } : null
      });
    } catch (error) {
      await client.query("ROLLBACK");
      throw error;
    } finally {
      client.release();
    }
  } catch (error) {
    console.error("Error adding staff:", error);
    res.status(500).json({ error: "Failed to add staff", details: error.message });
  }
});

// Staff login endpoint
router.post("/login", async (req, res) => {
  try {
    const { username, password } = req.body;
    
    if (!username || !password) {
      return res.status(400).json({ error: "Username and password are required" });
    }

    const user = await verifyCredentials(username, password);
    
    if (!user) {
      return res.status(401).json({ error: "Invalid credentials" });
    }

    // Get staff profile data
    const profile = await getStaffProfile(user.globalStaffId, user.staffType, user.className);
    
    if (!profile) {
      return res.status(404).json({ error: "Staff profile not found" });
    }

    res.json({
      message: "Login successful",
      user: {
        username: user.username,
        staffType: user.staffType,
        className: user.className
      },
      profile: profile
    });
  } catch (error) {
    console.error("Error during login:", error);
    res.status(500).json({ error: "Login failed", details: error.message });
  }
});

// Get staff profile endpoint
router.get("/profile/:username", async (req, res) => {
  try {
    const { username } = req.params;
    
    // Get user info
    const userResult = await pool.query(
      "SELECT global_staff_id, staff_type, class_name FROM staff_users WHERE username = $1",
      [username]
    );
    
    if (userResult.rows.length === 0) {
      return res.status(404).json({ error: "User not found" });
    }
    
    const user = userResult.rows[0];
    const profile = await getStaffProfile(user.global_staff_id, user.staff_type, user.class_name);
    
    if (!profile) {
      return res.status(404).json({ error: "Staff profile not found" });
    }

    res.json({
      user: {
        username: username,
        staffType: user.staff_type,
        className: user.class_name
      },
      profile: profile
    });
  } catch (error) {
    console.error("Error fetching profile:", error);
    res.status(500).json({ error: "Failed to fetch profile", details: error.message });
  }
});

// Get staff data for a class
router.get("/data/:staffType/:className", async (req, res) => {
  try {
    const { staffType, className } = req.params;
    console.log(`Fetching staff data for ${staffType}: ${className}`);
    const schemaName = `staff_${staffType.replace(/\s+/g, "_").toLowerCase()}`;
    const dataResult = await pool.query(`SELECT * FROM "${schemaName}"."${className}" ORDER BY LOWER(name) ASC`);
    console.log(`Fetched ${dataResult.rows.length} staff for ${schemaName}.${className}`);
    res.json({ data: dataResult.rows });
  } catch (error) {
    console.error("Error fetching staff data:", error);
    res.status(500).json({ error: "Failed to fetch staff data", details: error.message });
  }
});

// Upload Excel data for a specific form - MODIFIED to include automatic user account creation
router.post("/upload-excel", async (req, res) => {
  try {
    const { staffType, className, data } = req.body;

    if (!staffType || !className || !data || !Array.isArray(data) || data.length === 0) {
      console.error("Validation failed: Invalid input");
      return res.status(400).json({ error: "Invalid input" });
    }

    const schemaName = `staff_${staffType.replace(/\s+/g, "_").toLowerCase()}`;

    // Get table columns
    const columnsResult = await pool.query(
      `SELECT column_name, data_type, is_nullable FROM information_schema.columns WHERE table_schema = $1 AND table_name = $2`,
      [schemaName, className]
    );
    const tableColumns = columnsResult.rows;

    // Validate columns
    const requiredColumns = tableColumns
      .filter(col => col.is_nullable === "NO" && !["id", "global_staff_id", "staff_id"].includes(col.column_name))
      .map(col => col.column_name);
    const allColumns = tableColumns
      .filter(col => !["id", "global_staff_id", "staff_id"].includes(col.column_name))
      .map(col => col.column_name);

    const invalidColumns = [];
    const missingRequiredColumns = [];

    for (const row of data) {
      const providedColumns = Object.keys(row).filter(col => !["id", "global_staff_id", "staff_id"].includes(col));
      invalidColumns.push(...providedColumns.filter(col => !allColumns.includes(col)));
      for (const col of requiredColumns) {
        if (row[col] === null || row[col] === undefined || row[col] === "") {
          missingRequiredColumns.push(col);
        }
      }
    }

    if (invalidColumns.length > 0) {
      console.error("Invalid columns in data:", [...new Set(invalidColumns)]);
      return res.status(400).json({ error: `Invalid columns: ${[...new Set(invalidColumns)].join(", ")}` });
    }

    if (missingRequiredColumns.length > 0) {
      console.error("Missing required fields:", [...new Set(missingRequiredColumns)]);
      return res.status(400).json({ error: `Missing required fields: ${[...new Set(missingRequiredColumns)].join(", ")}` });
    }

    const client = await pool.connect();
    const createdUsers = [];
    
    try {
      await client.query("BEGIN");
      console.log("Starting transaction for uploading Excel data");

      // Get max staff_id for temporary assignment
      const maxStaffIdResult = await client.query(`SELECT COALESCE(MAX(staff_id), 0) as max_staff_id FROM "${schemaName}"."${className}"`);
      let tempStaffId = maxStaffIdResult.rows[0].max_staff_id;

      // Insert rows
      for (const row of data) {
        const columns = Object.keys(row).filter(col => !["id", "global_staff_id", "staff_id"].includes(col));
        if (columns.length === 0) continue;

        const globalStaffId = await getNextGlobalStaffId();
        tempStaffId += 1;

        const insertColumns = [...columns, "global_staff_id", "staff_id"];
        const placeholders = insertColumns.map((_, i) => `$${i + 1}`).join(", ");
        const values = insertColumns.map(col => {
          if (col === "global_staff_id") return globalStaffId;
          if (col === "staff_id") return tempStaffId;
          if (tableColumns.find(tc => tc.column_name === col && tc.data_type === "boolean")) {
            return row[col] === "true" || row[col] === true;
          }
          return row[col];
        });

        const query = `INSERT INTO "${schemaName}"."${className}" (${insertColumns.join(", ")}) VALUES (${placeholders})`;
        await client.query(query, values);

        // Create user account for each staff member
        if (row.name) {
          try {
            const userCredentials = await createStaffUser(globalStaffId, row.name, staffType, className);
            if (userCredentials) {
              createdUsers.push({
                name: row.name,
                username: userCredentials.username,
                password: userCredentials.password
              });
            }
          } catch (userError) {
            console.error(`Error creating user for ${row.name}:`, userError);
          }
        }
      }

      await updateStaffIds(schemaName, className);

      await client.query("COMMIT");
      console.log(`Excel data uploaded successfully to ${schemaName}.${className}`);
      res.status(200).json({ 
        message: "Excel data uploaded successfully",
        createdUsers: createdUsers
      });
    } catch (error) {
      await client.query("ROLLBACK");
      throw error;
    } finally {
      client.release();
    }
  } catch (error) {
    console.error("Error uploading Excel data:", error);
    res.status(500).json({ error: "Failed to upload Excel data", details: error.message });
  }
});

module.exports = router;
