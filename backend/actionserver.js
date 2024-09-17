const express = require('express');
const cors = require('cors');
const { Pool } = require('pg');
const session = require('express-session');
const pgSession = require('connect-pg-simple')(session);
const passport = require('passport');
const fs = require('fs');
const path = require('path');
const multer = require('multer');
const crypto = require('crypto');
const util = require('util');
require('dotenv').config();

const app = express();
const port = 3004; 

if (!process.env.PROD) {
    require('dotenv').config();
  }
  else{
    app.set('trust proxy', 1); 
  }
  const envHTTPS = process.env.HTTPS.toLowerCase() === 'true';
  

  const pool = new Pool({
    user: process.env.DB_USER,
    host: process.env.DB_HOST,
    database: 'user_data',
    password: process.env.DB_PASS,
    port: process.env.DB_PORT,
  });

  app.use(express.json());

  app.use(cors({
    origin: process.env.FRONTEND_URL, // Frontend server URL
    credentials: true // Allow sending of cookies
  }));


  app.use(session({
    store: new pgSession({
      pool: pool, // Use the same pool instance for the session store
    }),
    secret: process.env.SESSION_SEC, // Secret key for signing the session ID cookie 
    resave: false,
    saveUninitialized: false,
    cookie: { secure: envHTTPS, maxAge: 30 * 24 * 60 * 60 * 1000} // Cookie settings, `secure: true` in production with HTTPS
  }));

app.use(passport.initialize());
app.use(passport.session());

passport.serializeUser((user, done) => {
  done(null, user.id, user.username); 
});

passport.deserializeUser((id, done) => {
  // Retrieve the user from the database using the id stored in the session
  pool.query('SELECT * FROM users WHERE id = $1', [id], (err, result) => {
    if (err) {
      return done(err);
    }
    done(null, result.rows[0]);
  });
});

function requireAdmin(req, res, next) {
  // Check for the existence of the session cookie
  if (req.cookies && req.cookies['connect.sid']) {
      // Proceed if the user is authenticated through Passport
      if (req.isAuthenticated()) {
          // Check if the authenticated user is an admin
          if (req.user.is_admin) {
              return next();
          } else {
              // User is authenticated but not an admin
              console.log('Access Denied: User is not an admin.');
              return res.status(403).send('Access Denied: You do not have permission to perform this action.');
          }
      }
      // If not authenticated, clear the session cookie and return 401
      res.clearCookie('connect.sid', { path: '/' });
      return res.status(401).send('Session is invalid or expired.');
  }
  next();
}

app.use(requireAdmin); //Admin creds and authentication required for all below endpoints

const generateUniqueCode = () => {
  return crypto.randomBytes(8).toString('hex');
};

const storage = multer.diskStorage({
  destination: function (req, file, cb) {
    const destinationPath = process.env.NODE_ENV === 'production'
      ? '/var/www/files/mod/' // Production path
      : path.join(__dirname, '..', 'files', 'mod'); // Development path
    cb(null, destinationPath);
  },
  filename: function (req, file, cb) {
    const originalName = path.parse(file.originalname).name;
    const originalExt = path.parse(file.originalname).ext;
    const finalFilename = originalName + "-" + Date.now() + originalExt;
    cb(null, finalFilename);
  }
});
const upload = multer({ storage: storage });

// Delete a specific user
app.delete('/act/user/:id', async (req, res) => {
  const { id } = req.params;
  try {
    const result = await pool.query(
      'DELETE FROM users WHERE id = $1 RETURNING *',
      [id]
    );
    
    if (result.rows.length === 0) {
      res.status(404).send('User with the given ID not found.');
    } else {
      res.status(200).send('User deleted successfully.');
    }
  } catch (error) {
    console.error(error);
    res.status(500).send('Error deleting user.');
  }
});


// Get all users
app.get('/act/users', async (req, res) => {
  try {
    const result = await pool.query('SELECT id, email, username FROM users');
    res.status(200).json(result.rows);
  } catch (error) {
    console.error(error);
    res.status(500).send('Error retrieving users.');
  }
});


app.delete('/act/content', async (req, res) => {
  const { module_id, content_order } = req.body;
  try {
    // Retrieve the src path, download_src, and content id before deletion
    const queryResult = await pool.query(
      'SELECT id, src, download_src FROM contents WHERE module_id = $1 AND content_order = $2', 
      [module_id, content_order]
    );

    if (queryResult.rows.length > 0) {
      const { id: contentId, src: srcPath, download_src: downloadSrcPath } = queryResult.rows[0];
      
      // Delete referencing user progress records
      await pool.query(
        'DELETE FROM user_content_progress WHERE content_id = $1',
        [contentId]
      );

      const deleteFile = (filePath) => {
        return new Promise((resolve, reject) => {
          fs.unlink(filePath, (err) => {
            if (err) {
              console.error(`Error deleting file at ${filePath}:`, err);
              reject(err);
            } else {
              resolve();
            }
          });
        });
      };

      const srcFilePath = process.env.NODE_ENV === 'production'
      ? path.resolve('/var/www/files/mod', srcPath)
      : path.resolve(__dirname, '..', 'files', 'mod', srcPath.replace('/mod/', ''));

      let downloadFilePath;
      if (downloadSrcPath) {
        downloadFilePath = process.env.NODE_ENV === 'production'
          ? path.resolve('/var/www/files/mod', downloadSrcPath)
          : path.resolve(__dirname, '..', 'files', 'mod', downloadSrcPath.replace('/mod/', ''));
      }

      // Delete the content from the database
      await pool.query(
        'DELETE FROM contents WHERE id = $1',
        [contentId]
      );

      // Adjust content_order for remaining entries
      await pool.query(
        'UPDATE contents SET content_order = content_order - 1 WHERE module_id = $1 AND content_order > $2', 
        [module_id, content_order]
      );

      // Delete the src file from the server
      await deleteFile(srcFilePath);

      // Delete the download_src file from the server, if it exists
      if (downloadFilePath) {
        await deleteFile(downloadFilePath);
      }

      // Set current_id to 0 for all users' entries for the respective module
      await pool.query(
        'UPDATE user_module_progress SET current_id = 0 WHERE module_id = $1',
        [module_id]
      );

      res.status(200).send('Content and associated files deleted successfully, order adjusted, and current_id reset.');
    } else {
      res.status(404).send('Content not found.');
    }
  } catch (error) {
    console.error('Error deleting content and resetting current_id:', error);
    res.status(500).send('Error deleting content and resetting current_id.');
  }
});



const uploadConfig = upload.fields([{ name: 'file', maxCount: 1 }, { name: 'download_file', maxCount: 1 }]);

app.post('/act/content', uploadConfig, async (req, res) => {
  if (!req.files['file'] || req.files['file'].length === 0) {
    return res.status(400).send('No main content file uploaded.');
  }

  const { module_id, type, content_order, label, ai_viewer, ai_type } = req.body;
  console.log(ai_type);
  const mainFile = req.files['file'][0];
  const downloadFile = req.files['download_file'] ? req.files['download_file'][0] : null;

  try {
    const moduleCheckResult = await pool.query('SELECT 1 FROM modules WHERE moduleid = $1', [module_id]);
    if (moduleCheckResult.rowCount === 0) {
      fs.unlinkSync(mainFile.path);
      if (downloadFile) fs.unlinkSync(downloadFile.path);
      return res.status(404).send('Module ID does not exist.');
    }

    await pool.query('UPDATE contents SET content_order = content_order + 1 WHERE module_id = $1 AND content_order >= $2', [module_id, content_order]);

    const src = `/mod/${mainFile.filename}`;
    const downloadSrc = downloadFile ? `/mod/${downloadFile.filename}` : null;

    const finalPath = process.env.NODE_ENV === 'production' ? '/var/www/files/mod/' : path.join(__dirname, '..', 'files', 'mod');
    fs.renameSync(mainFile.path, path.join(finalPath, mainFile.filename));
    if (downloadFile) {
      fs.renameSync(downloadFile.path, path.join(finalPath, downloadFile.filename));
    }

    await pool.query(
      'INSERT INTO contents (module_id, type, src, content_order, label, ai_viewer, download_src, ai_type) VALUES ($1, $2, $3, $4, $5, $6, $7, $8)',
      [module_id, type, src, content_order, label, ai_viewer, downloadSrc, ai_type] 
    );

    await pool.query(
      'UPDATE user_module_progress SET current_id = $1',
      [0]
  );

    res.status(201).send('Content added successfully.');
  } catch (error) {
    console.error('Error adding content:', error);
    if (mainFile) fs.unlinkSync(path.join(finalPath, mainFile.filename));
    if (downloadFile) fs.unlinkSync(path.join(finalPath, downloadFile.filename));
    res.status(500).send('Error adding content.');
  }
});


app.get('/act/searchUser', async (req, res) => {
  const { query } = req.query;

  const searchUserQuery = `
  WITH distinct_content AS (
    SELECT DISTINCT ON (ucp.content_id) ucp.user_id, ucp.content_id, ucp.started, ucp.module_id
    FROM user_content_progress ucp
    WHERE ucp.user_id = (SELECT id FROM users WHERE username = $1 OR email = $1 OR CAST(id AS TEXT) = $1)
  ), distinct_module AS (
    SELECT DISTINCT ON (ump.module_id) ump.user_id, ump.module_id, ump.completed
    FROM user_module_progress ump
    WHERE ump.user_id = (SELECT id FROM users WHERE username = $1 OR email = $1 OR CAST(id AS TEXT) = $1)
  )
  SELECT u.id, u.username, u.email, u.created_at, u.is_admin, u.active,
    json_agg(json_build_object('content_id', dc.content_id, 'started', dc.started, 'module_id', dc.module_id)) AS content_progress,
    json_agg(json_build_object('module_id', dm.module_id, 'completed', dm.completed)) AS module_progress
  FROM users u
  LEFT JOIN distinct_content dc ON u.id = dc.user_id
  LEFT JOIN distinct_module dm ON u.id = dm.user_id
  WHERE u.username = $1 OR u.email = $1 OR CAST(u.id AS TEXT) = $1
  GROUP BY u.id
`;

try {
  // Execute the initial query to fetch user details along with content and module progress
  const userResult = await pool.query(searchUserQuery, [query]);
  if (userResult.rows.length === 0) {
    return res.status(404).json({ message: 'User not found.' });
  }

  let userData = userResult.rows[0];

  // Fetch labels for each content_id in content_progress and merge them
  const contentProgressWithLabels = await Promise.all(userData.content_progress.map(async (content) => {
    const labelResult = await pool.query('SELECT label FROM contents WHERE id = $1', [content.content_id]);
    return {
      ...content,
      label: labelResult.rows[0] ? labelResult.rows[0].label : 'Label not found'
    };
  }));

  const uniqueContentProgress = Array.from(new Map(contentProgressWithLabels.map(item => [item['content_id'], item])).values());

  const uniqueModuleProgress = Array.from(new Map(userData.module_progress.map(item => [item['module_id'], item])).values());

  // Update userData with content progress including labels and unique module progress
  userData = {
    ...userData,
    content_progress: uniqueContentProgress,
    module_progress: uniqueModuleProgress
  };

  res.json(userData);
} catch (error) {
  console.error('Error searching for user:', error);
  res.status(500).json({ message: 'Error searching for user.' });
}
});

app.post('/act/toggleAdmin/:id', async (req, res) => {
  const { id } = req.params;

  const toggleAdminQuery = `
    UPDATE users
    SET is_admin = NOT is_admin
    WHERE id = $1
  `;

  try {
    const result = await pool.query(toggleAdminQuery, [id]);
    // Check if any row was actually updated
    if (result.rowCount === 0) {
      return res.status(404).send('User not found.');
    }
    // return the updated user data or a success message
    res.status(200).json({ message: 'User admin status updated successfully.' });
  } catch (error) {
    console.error('Error toggling admin status:', error);
    res.status(500).send('Error updating user admin status.');
  }
});


app.post('/act/toggleActive/:id', async (req, res) => {
  const { id } = req.params;
  let client;

  try {
    client = await pool.connect();
    await client.query('BEGIN'); // Start transaction

    const currentUserResult = await client.query('SELECT active FROM users WHERE id = $1', [id]);
    if (currentUserResult.rows.length === 0) {
      await client.query('ROLLBACK');
      return res.status(404).send('User not found.');
    }

    const currentUserActiveStatus = currentUserResult.rows[0].active;

    // Toggle the active status
    const toggleActiveQuery = `
      UPDATE users
      SET active = NOT active
      WHERE id = $1
    `;
    await client.query(toggleActiveQuery, [id]);

    // If the user was active and is now being deactivated, delete their sessions
    if (currentUserActiveStatus) {
      // Adjust the query to match the session data structure
      const deleteSessionsQuery = `
        DELETE FROM session
        WHERE sess -> 'passport' -> 'user' ->> 'id' = $1
      `;
      await client.query(deleteSessionsQuery, [id.toString()]);
    }

    await client.query('COMMIT'); 
    res.status(200).json({ message: 'User active status updated and sessions cleared successfully.' });
  } catch (error) {
    if (client) await client.query('ROLLBACK'); 
    console.error('Error toggling active status and clearing sessions:', error);
    res.status(500).send('Error updating user active status and clearing sessions.');
  } finally {
    if (client) client.release(); 
  }
});


app.post('/act/generate-codes', async (req, res) => {
  const { numberOfCodes } = req.body;

  if (!Number.isInteger(numberOfCodes) || numberOfCodes <= 0) {
    return res.status(400).send('Invalid number of codes requested.');
  }

  let codes = [];
  let codesInserted = 0;

  try {
    for (let i = 0; i < numberOfCodes; i++) {
      const code = generateUniqueCode();
      await pool.query('INSERT INTO reg_codes (code) VALUES ($1)', [code]);
      codes.push(code);
      codesInserted++;
    }

    // Write codes to a text file
    const writeFile = util.promisify(fs.writeFile);
    const timestamp = Date.now();
    const filePath = path.join(__dirname, 'codes-' + timestamp + '.txt');
    await writeFile(filePath, codes.join('\n'));

    // Send file to client
    res.download(filePath, 'registration-codes.txt', (err) => {
      if (err) {
        console.error('Error sending the codes file:', err);
      } else {
        // Delete the file after sending it to the client
        fs.unlink(filePath, (err) => {
          if (err) console.error('Error deleting the codes file:', err);
        });
      }
    });
  } catch (error) {
    console.error('Error generating or sending codes:', error);
    res.status(500).send(`Error generating codes, only ${codesInserted} out of ${numberOfCodes} were created.`);
  }
});


app.listen(port, 'localhost', () => {
  console.log(`Server listening at http://localhost:${port}`);
});

