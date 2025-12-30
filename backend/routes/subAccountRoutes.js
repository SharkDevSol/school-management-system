const express = require('express');
const router = express.Router();
const bcrypt = require('bcrypt');
const pool = require('../config/db');
require('dotenv').config();

// Security middleware
const { authenticateToken, authorizeRoles } = require('../middleware/auth');
const { validate, sanitizeInputs } = require('../middleware/inputValidation');

// Initialize admin_sub_accounts table
const initializeSubAccountsTable = async () => {
  try {
    await pool.query(`
      CREATE TABLE IF NOT EXISTS admin_sub_accounts (
        id SERIAL PRIMARY KEY,
        name VARCHAR(255) NOT NULL,
        email VARCHAR(255) UNIQUE NOT NULL,
        username VARCHAR(100) UNIQUE NOT NULL,
        password_hash VARCHAR(255) NOT NULL,
        is_active BOOLEAN DEFAULT true,
        permissions JSON NOT NULL DEFAULT '[]',
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        last_login TIMESTAMP
      );
    `);
    
    // Create indexes for faster lookups
    await pool.query(`
      CREATE INDEX IF NOT EXISTS idx_sub_accounts_username ON admin_sub_accounts(username);
    `);
    await pool.query(`
      CREATE INDEX IF NOT EXISTS idx_sub_accounts_email ON admin_sub_accounts(email);
    `);
    await pool.query(`
      CREATE INDEX IF NOT EXISTS idx_sub_accounts_is_active ON admin_sub_accounts(is_active);
    `);
    
    console.log('Admin sub-accounts table initialized');
  } catch (error) {
    console.error('Error initializing admin_sub_accounts table:', error);
  }
};

// Initialize table on module load
initializeSubAccountsTable();

// Apply input sanitization to all routes
router.use(sanitizeInputs);

// All sub-account routes require admin authentication
router.use(authenticateToken);
router.use(authorizeRoles('admin'));

// GET all sub-accounts
router.get('/', async (req, res) => {
  try {
    const result = await pool.query(`
      SELECT id, name, email, username, is_active, permissions, created_at, updated_at, last_login
      FROM admin_sub_accounts
      ORDER BY created_at DESC
    `);
    
    const accounts = result.rows.map(account => ({
      ...account,
      permissionCount: Array.isArray(account.permissions) ? account.permissions.length : 0
    }));
    
    res.json({ success: true, data: accounts });
  } catch (error) {
    console.error('Error fetching sub-accounts:', error);
    res.status(500).json({ error: 'Failed to fetch sub-accounts' });
  }
});

// GET single sub-account by ID
router.get('/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const result = await pool.query(
      'SELECT id, name, email, username, is_active, permissions, created_at, updated_at FROM admin_sub_accounts WHERE id = $1',
      [id]
    );
    
    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Sub-account not found' });
    }
    
    res.json({ success: true, data: result.rows[0] });
  } catch (error) {
    console.error('Error fetching sub-account:', error);
    res.status(500).json({ error: 'Failed to fetch sub-account' });
  }
});

// POST create new sub-account
router.post('/', async (req, res) => {
  try {
    const { name, email, username, password, permissions = [] } = req.body;
    
    // Validate required fields
    if (!name || !email || !username || !password) {
      return res.status(400).json({ 
        error: 'Missing required fields',
        details: {
          name: !name ? 'Name is required' : null,
          email: !email ? 'Email is required' : null,
          username: !username ? 'Username is required' : null,
          password: !password ? 'Password is required' : null
        }
      });
    }
    
    // Validate email format
    const emailRegex = /^\S+@\S+\.\S+$/;
    if (!emailRegex.test(email)) {
      return res.status(400).json({ error: 'Invalid email format' });
    }
    
    // Check for duplicate username
    const usernameCheck = await pool.query(
      'SELECT id FROM admin_sub_accounts WHERE username = $1',
      [username]
    );
    if (usernameCheck.rows.length > 0) {
      return res.status(409).json({ error: 'Username already exists', code: 'DUPLICATE_USERNAME' });
    }
    
    // Check for duplicate email
    const emailCheck = await pool.query(
      'SELECT id FROM admin_sub_accounts WHERE email = $1',
      [email]
    );
    if (emailCheck.rows.length > 0) {
      return res.status(409).json({ error: 'Email already exists', code: 'DUPLICATE_EMAIL' });
    }
    
    // Hash password
    const saltRounds = 10;
    const passwordHash = await bcrypt.hash(password, saltRounds);
    
    // Insert new sub-account
    const result = await pool.query(`
      INSERT INTO admin_sub_accounts (name, email, username, password_hash, permissions)
      VALUES ($1, $2, $3, $4, $5)
      RETURNING id, name, email, username, is_active, permissions, created_at
    `, [name, email, username, passwordHash, JSON.stringify(permissions)]);
    
    res.status(201).json({ 
      success: true, 
      message: 'Sub-account created successfully',
      data: result.rows[0]
    });
  } catch (error) {
    console.error('Error creating sub-account:', error);
    res.status(500).json({ error: 'Failed to create sub-account' });
  }
});

// PUT update sub-account
router.put('/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const { name, email, username, password, permissions, is_active } = req.body;
    
    // Check if sub-account exists
    const existingAccount = await pool.query(
      'SELECT id, username, email FROM admin_sub_accounts WHERE id = $1',
      [id]
    );
    if (existingAccount.rows.length === 0) {
      return res.status(404).json({ error: 'Sub-account not found' });
    }
    
    const current = existingAccount.rows[0];
    
    // Check for duplicate username (if changed)
    if (username && username !== current.username) {
      const usernameCheck = await pool.query(
        'SELECT id FROM admin_sub_accounts WHERE username = $1 AND id != $2',
        [username, id]
      );
      if (usernameCheck.rows.length > 0) {
        return res.status(409).json({ error: 'Username already exists', code: 'DUPLICATE_USERNAME' });
      }
    }
    
    // Check for duplicate email (if changed)
    if (email && email !== current.email) {
      const emailCheck = await pool.query(
        'SELECT id FROM admin_sub_accounts WHERE email = $1 AND id != $2',
        [email, id]
      );
      if (emailCheck.rows.length > 0) {
        return res.status(409).json({ error: 'Email already exists', code: 'DUPLICATE_EMAIL' });
      }
    }
    
    // Build update query dynamically
    const updates = [];
    const values = [];
    let paramCount = 1;
    
    if (name !== undefined) {
      updates.push(`name = $${paramCount++}`);
      values.push(name);
    }
    if (email !== undefined) {
      updates.push(`email = $${paramCount++}`);
      values.push(email);
    }
    if (username !== undefined) {
      updates.push(`username = $${paramCount++}`);
      values.push(username);
    }
    if (password) {
      const passwordHash = await bcrypt.hash(password, 10);
      updates.push(`password_hash = $${paramCount++}`);
      values.push(passwordHash);
    }
    if (permissions !== undefined) {
      updates.push(`permissions = $${paramCount++}`);
      values.push(JSON.stringify(permissions));
    }
    if (is_active !== undefined) {
      updates.push(`is_active = $${paramCount++}`);
      values.push(is_active);
    }
    
    updates.push(`updated_at = CURRENT_TIMESTAMP`);
    values.push(id);
    
    const result = await pool.query(`
      UPDATE admin_sub_accounts 
      SET ${updates.join(', ')}
      WHERE id = $${paramCount}
      RETURNING id, name, email, username, is_active, permissions, updated_at
    `, values);
    
    res.json({ 
      success: true, 
      message: 'Sub-account updated successfully',
      data: result.rows[0]
    });
  } catch (error) {
    console.error('Error updating sub-account:', error);
    res.status(500).json({ error: 'Failed to update sub-account' });
  }
});

// DELETE sub-account
router.delete('/:id', async (req, res) => {
  try {
    const { id } = req.params;
    
    const result = await pool.query(
      'DELETE FROM admin_sub_accounts WHERE id = $1 RETURNING id, name',
      [id]
    );
    
    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Sub-account not found' });
    }
    
    res.json({ 
      success: true, 
      message: 'Sub-account deleted successfully',
      data: result.rows[0]
    });
  } catch (error) {
    console.error('Error deleting sub-account:', error);
    res.status(500).json({ error: 'Failed to delete sub-account' });
  }
});

// PATCH toggle sub-account status
router.patch('/:id/status', async (req, res) => {
  try {
    const { id } = req.params;
    
    // Get current status and toggle it
    const result = await pool.query(`
      UPDATE admin_sub_accounts 
      SET is_active = NOT is_active, updated_at = CURRENT_TIMESTAMP
      WHERE id = $1
      RETURNING id, name, is_active
    `, [id]);
    
    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Sub-account not found' });
    }
    
    res.json({ 
      success: true, 
      message: `Sub-account ${result.rows[0].is_active ? 'activated' : 'deactivated'} successfully`,
      data: result.rows[0]
    });
  } catch (error) {
    console.error('Error toggling sub-account status:', error);
    res.status(500).json({ error: 'Failed to toggle sub-account status' });
  }
});

module.exports = router;
