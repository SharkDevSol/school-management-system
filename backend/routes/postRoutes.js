const express = require('express');
const pool = require('../config/db');
const router = express.Router();
const multer = require('multer');
const path = require('path');
const fs = require('fs').promises;
require('dotenv').config();

// Security middleware
const { authenticateToken, optionalAuth } = require('../middleware/auth');
const { sanitizeInputs } = require('../middleware/inputValidation');
const { multerFileFilter } = require('../middleware/fileValidation');
const { uploadLimiter } = require('../middleware/rateLimiter');

// Apply input sanitization
router.use(sanitizeInputs);

// Auto-initialize posts schema and tables
const initializePostsSchema = async () => {
  const client = await pool.connect();
  try {
    // Create schema if not exists
    await client.query('CREATE SCHEMA IF NOT EXISTS posts_schema');

    // Create enum for audience types
    await client.query(`
      DO $$ 
      BEGIN
        IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'audience_type') THEN
          CREATE TYPE posts_schema.audience_type AS ENUM ('students', 'guardians', 'supportive_staff', 'teachers', 'admin_staff', 'staff', 'all');
        ELSE
          -- Add 'staff' if missing
          BEGIN
            ALTER TYPE posts_schema.audience_type ADD VALUE IF NOT EXISTS 'staff';
          EXCEPTION WHEN duplicate_object THEN
            -- Ignore if already exists
          END;
        END IF; 
      END $$;
    `);

    // Create posts table with media as JSONB (single array)
    await client.query(`
      CREATE TABLE IF NOT EXISTS posts_schema.posts (
        id SERIAL PRIMARY KEY,
        title VARCHAR(255) NOT NULL,
        body TEXT NOT NULL,
        author_name VARCHAR(100) NOT NULL,
        author_type VARCHAR(50) NOT NULL,
        author_id INTEGER NOT NULL,
        media JSONB DEFAULT '[]',
        link VARCHAR(500),
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        likes INTEGER DEFAULT 0,
        comments INTEGER DEFAULT 0,
        shares INTEGER DEFAULT 0
      );
    `);

    // Fix media type if it was JSONB[]
    await client.query(`
      DO $$ 
      BEGIN
        IF EXISTS (SELECT 1 FROM information_schema.columns 
                   WHERE table_schema = 'posts_schema' AND table_name = 'posts' AND column_name = 'media' 
                   AND udt_name = 'jsonb[]') THEN
          ALTER TABLE posts_schema.posts ALTER COLUMN media TYPE JSONB USING media::JSONB;
        END IF;
      END $$;
    `);

    // Create post_audiences junction table
    await client.query(`
      CREATE TABLE IF NOT EXISTS posts_schema.post_audiences (
        id SERIAL PRIMARY KEY,
        post_id INTEGER REFERENCES posts_schema.posts(id) ON DELETE CASCADE,
        audience_type posts_schema.audience_type NOT NULL,
        specific_target_id INTEGER
      );
    `);

    // Indexes
    await client.query('CREATE INDEX IF NOT EXISTS idx_posts_author ON posts_schema.posts(author_type, author_id);');
    await client.query('CREATE INDEX IF NOT EXISTS idx_posts_created_at ON posts_schema.posts(created_at DESC);');
    await client.query('CREATE INDEX IF NOT EXISTS idx_post_audiences_post ON posts_schema.post_audiences(post_id);');
    await client.query('CREATE INDEX IF NOT EXISTS idx_post_audiences_audience ON posts_schema.post_audiences(audience_type);');

    // Trigger for updated_at
    await client.query(`
      CREATE OR REPLACE FUNCTION posts_schema.update_updated_at_column()
      RETURNS TRIGGER AS $$
      BEGIN
        NEW.updated_at = CURRENT_TIMESTAMP;
        RETURN NEW;
      END;
      $$ language 'plpgsql';
    `);
    await client.query(`
      DROP TRIGGER IF EXISTS update_posts_updated_at ON posts_schema.posts;
      CREATE TRIGGER update_posts_updated_at BEFORE UPDATE
      ON posts_schema.posts FOR EACH ROW EXECUTE FUNCTION posts_schema.update_updated_at_column();
    `);

    console.log('Posts schema and tables initialized successfully in postRoutes.js.');
  } catch (error) {
    console.error('Error initializing posts schema:', error);
  } finally {
    client.release();
  }
};

// Initialize on module load
initializePostsSchema().catch(console.error);

// Multer setup for multiple media files
const uploadDir = path.join(__dirname, '..', 'Uploads/posts');
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
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1e9);
    cb(null, `post-media-${uniqueSuffix}${path.extname(file.originalname)}`);
  }
});
const upload = multer({ 
  storage, 
  limits: { fileSize: 10 * 1024 * 1024 }, // 10MB per file
  fileFilter: multerFileFilter // Use centralized file validation
}).array('media', 10);

// Middleware to get user role
const getUserRole = (req) => {
  return req.query.role || 'staff';
};

// Helper to get audience array for role
const getAudienceArrayForRole = (role) => {
  switch (role) {
    case 'student': return ['students', 'all'];
    case 'guardian': return ['guardians', 'all'];
    case 'staff': return ['supportive_staff', 'teachers', 'admin_staff', 'staff', 'all'];
    default: return ['all'];
  }
};

// POST /api/posts - Create post (protected route with upload rate limiting)
router.post('/', authenticateToken, uploadLimiter, upload, async (req, res) => {
  const { title, body, link, author_type, author_id, audiences } = req.body;
  const author_name = req.body.author_name || 'Anonymous User';
  if (!title || !body || !author_type || !author_id) {
    return res.status(400).json({ error: 'Missing required fields: title, body, author_type, author_id' });
  }

  const validAudiences = ['students', 'guardians', 'supportive_staff', 'teachers', 'admin_staff', 'staff', 'all'];
  const client = await pool.connect();
  try {
    await client.query('BEGIN');

    // Process media files
    const media = [];
    if (req.files && req.files.length > 0) {
      req.files.forEach(file => {
        media.push({
          filename: file.filename,
          originalname: file.originalname,
          mimetype: file.mimetype
        });
      });
    }

    const postResult = await client.query(
      `INSERT INTO posts_schema.posts (title, body, link, author_type, author_id, author_name, media) 
       VALUES ($1, $2, $3, $4, $5, $6, $7) RETURNING id`,
      [title, body, link || null, author_type, parseInt(author_id), author_name, JSON.stringify(media)]
    );
    const postId = postResult.rows[0].id;

    // Insert audiences only if provided and valid
    if (audiences && audiences.trim() !== '[]') {
      const audienceArray = JSON.parse(audiences);
      if (audienceArray.length > 0) {
        for (const audience of audienceArray) {
          if (!audience.type || !validAudiences.includes(audience.type)) {
            throw new Error(`Invalid audience type: ${audience.type || 'undefined'}`);
          }
          await client.query(
            'INSERT INTO posts_schema.post_audiences (post_id, audience_type, specific_target_id) VALUES ($1, $2, $3)',
            [postId, audience.type, audience.specific_id || null]
          );
        }
      }
    }

    await client.query('COMMIT');
    res.status(201).json({ message: 'Post created successfully', post_id: postId });
  } catch (error) {
    await client.query('ROLLBACK');
    console.error('Error creating post:', error);
    res.status(500).json({ error: 'Failed to create post', details: error.message });
  } finally {
    client.release();
  }
});

router.put('/:id/like', async (req, res) => {
  const { id } = req.params;
  const client = await pool.connect();
  try {
    await client.query('BEGIN');
    await client.query('UPDATE posts_schema.posts SET likes = likes + 1 WHERE id = $1', [id]);
    await client.query('COMMIT');
    res.json({ message: 'Post liked successfully' });
  } catch (error) {
    await client.query('ROLLBACK');
    console.error('Error liking post:', error);
    res.status(500).json({ error: 'Failed to like post', details: error.message });
  } finally {
    client.release();
  }
});

// GET /api/posts/feed - Central feed
router.get('/feed', async (req, res) => {
  const userRole = getUserRole(req);
  const audienceArray = getAudienceArrayForRole(userRole);
  try {
    const audienceList = audienceArray.map(a => `'${a}'`).join(', ');
    const query = `
      SELECT p.*, array_agg(pa.audience_type ORDER BY pa.audience_type) as audiences
      FROM posts_schema.posts p
      LEFT JOIN posts_schema.post_audiences pa ON p.id = pa.post_id
      WHERE EXISTS (
        SELECT 1 FROM posts_schema.post_audiences pa2 
        WHERE pa2.post_id = p.id 
        AND pa2.audience_type IN (${audienceList})
      )
      GROUP BY p.id
      ORDER BY p.created_at DESC
      LIMIT 50
    `;
    const result = await pool.query(query);
    res.json(result.rows);
  } catch (error) {
    console.error('Error fetching feed:', error);
    res.status(500).json({ error: 'Failed to fetch posts', details: error.message });
  }
});

// GET /api/posts/profile/:type/:id - Posts for profile
router.get('/profile/:type/:id', async (req, res) => {
  const { type, id } = req.params;
  const audienceTypes = getAudienceArrayForRole(type === 'staff' ? 'staff' : type);
  const audienceList = audienceTypes.map(a => `'${a}'`).join(', ');
  try {
    const query = `
      SELECT p.*, array_agg(pa.audience_type ORDER BY pa.audience_type) as audiences
      FROM posts_schema.posts p
      LEFT JOIN posts_schema.post_audiences pa ON p.id = pa.post_id
      WHERE (
        (p.author_type = $1 AND p.author_id = $2) OR
        pa.audience_type IN (${audienceList})
      )
      GROUP BY p.id
      ORDER BY p.created_at DESC
    `;
    const result = await pool.query(query, [type, parseInt(id)]);
    res.json(result.rows);
  } catch (error) {
    console.error('Error fetching profile posts:', error);
    res.status(500).json({ error: 'Failed to fetch profile posts', details: error.message });
  }
});

module.exports = router;