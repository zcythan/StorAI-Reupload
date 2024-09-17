const express = require('express');
const app = express();
const port = 3000;
const cors = require('cors');
const { Pool } = require('pg');
const bcrypt = require('bcrypt');
const session = require('express-session');
const pgSession = require('connect-pg-simple')(session);
const passport = require('passport');
const LocalStrategy = require('passport-local').Strategy;
const cookieParser = require('cookie-parser');
const crypto = require('crypto');
const path = require('path');
const fs = require('fs');

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
  port: process.env.DB_PORT, // Default port for PostgreSQL
});

app.use(session({
  store: new pgSession({
    pool: pool, // Use the same pool instance for the session store
  }),
  secret: process.env.SESSION_SEC, // Secret key for signing the session ID cookie
  resave: false,
  saveUninitialized: false,
  cookie: { secure: envHTTPS, maxAge: 30 * 24 * 60 * 60 * 1000} // Cookie settings, `secure: true` in production with HTTPS
}));
app.use(cookieParser());
app.use(express.json());
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

passport.use(new LocalStrategy(
  async (username, password, done) => {
    try {
      const userResult = await pool.query('SELECT * FROM users WHERE username = $1 AND active = true', [username]);
      if (userResult.rows.length > 0) {
        const user = userResult.rows[0];
        const isMatch = await bcrypt.compare(password, user.password);
        if (isMatch) {
          return done(null, user);  // User authenticated
        }
      }
      return done(null, false);  // Authentication failed
    } catch (error) {
      return done(error);
    }
  }
));

//MIDDLE WARES
// Middleware to parse JSON bodies

app.use(cors({
  origin: process.env.FRONTEND_URL, // Frontend server URL
  credentials: true // Allow sending of cookies
}));

app.use((req, res, next) => {
  // Check for the existence of the session cookie
  if (req.cookies && req.cookies['connect.sid']) {
    // Proceed if the user is authenticated through Passport
    if (req.isAuthenticated()) {
      return next();
    }

    // check if there is a validated resetSession
    if (req.session.resetSession && req.session.resetSession.verified) {
      return next();
    }

    // If neither condition is met, clear the session cookie and return 401
    res.clearCookie('connect.sid', { path: '/' });
    return res.status(401).send('Session is invalid or expired. Cookie cleared.');
  }

  next();
});

async function ensureUserProgressSync(req, res, next) {
  if (!req.isAuthenticated()) {
    return res.status(401).send('User not authenticated.');
  }

  const userId = req.user.id;
  
  try {
    // Ensure user_module_progress is up-to-date
    const modules = await pool.query('SELECT moduleid FROM modules');
    for (let module of modules.rows) {
      const userModuleCheck = await pool.query('SELECT * FROM user_module_progress WHERE user_id = $1 AND module_id = $2', [userId, module.moduleid]);
      if (userModuleCheck.rowCount === 0) {
        await pool.query('INSERT INTO user_module_progress (user_id, module_id, completed) VALUES ($1, $2, false)', [userId, module.moduleid]);
      }
    }

    // Ensure user_content_progress is up-to-date
    const contents = await pool.query('SELECT id, module_id FROM contents');
    for (let content of contents.rows) {
      const userContentCheck = await pool.query('SELECT * FROM user_content_progress WHERE user_id = $1 AND content_id = $2', [userId, content.id]);
      if (userContentCheck.rowCount === 0) {
        await pool.query('INSERT INTO user_content_progress (user_id, content_id, started, module_id) VALUES ($1, $2, false, $3)', [userId, content.id, content.module_id]);
      }
    }

    next();
  } catch (error) {
    console.error('Error syncing user progress:', error);
    res.status(500).send('Error syncing user progress.');
  }
}

const serveModuleFile = (req, res, next) => {
  if (req.isAuthenticated()) {
    const fileName = req.params.fileName;
    const MOD_FILES_DIR = process.env.NODE_ENV === 'production'
      ? '/var/www/files/mod/'
      : path.join(__dirname, '..', 'files', 'mod');

    const filePath = path.join(MOD_FILES_DIR, fileName);

    res.sendFile(filePath, function (err) {
      if (err) {
        // Check if the headers have already been sent
        if (!res.headersSent) {
          if (err.code === 'ENOENT') {
            // File not found
            res.status(404).send('File not found.');
          } else {
            // Some other server error or request was aborted
            res.status(500).send('Server error.');
          }
        }
      }
    });
  } else {
    res.status(401).send('User is not authenticated.');
  }

};

app.use('/mod/:fileName', serveModuleFile);
//ENDPOINTS

app.get('/api/check-session', (req, res) => {
  if (req.isAuthenticated()) {
    res.json({
      loggedIn: true,
      username: req.user.username
    });
  } else {
    res.json({
      loggedIn: false
    });
  }
});

// Login endpoint

app.post('/api/login', (req, res, next) => {
  passport.authenticate('local', (err, user, info) => {
    if (err) {
      console.error(err);
      return res.status(500).json({ message: 'Internal server error' });
    }
    if (!user) {
      // No user found, or the login details were incorrect
      return res.status(401).json({ message: 'Invalid credentials' });
    }
    req.logIn(user, (err) => {
      if (err) {
        console.error(err);
        return res.status(500).json({ message: 'Error logging in' });
      }
      // Successful login
      const { username } = req.body;
      console.log(username + " has logged in");
      return res.json({ message: 'Logged in successfully' });
    });
  })(req, res, next);
});


// Logout endpoint
app.post('/api/logout', (req, res, next) => {
  req.logout(function(err) {
    if (err) { return next(err); }
    req.session.destroy(function(err) {
      if (err) {
        console.error('Session destruction error:', err);
        return res.status(500).send('Error ending session.');
      }
      res.clearCookie('connect.sid'); 
      res.json({ message: 'Logged out successfully' });
    });
  });
});


app.get('/api/check-creds', (req, res) => {
  if (req.isAuthenticated()) {
    const userId = req.user.id;
    pool.query('SELECT is_admin FROM users WHERE id = $1', [userId], (error, results) => {
      if (error) {
        console.error('Error checking admin status:', error);
        return res.status(500).send('Error checking credentials.');
      }
      const isAdmin = results.rows[0]?.is_admin;
      res.json({ isAdmin });
    });
  } else {
    res.status(401).send('User not authenticated.');
  }
});


app.post('/api/forgot-password', async (req, res) => {
  console.log("Request received");
  const { email } = req.body;
  try {
    const userResult = await pool.query('SELECT id FROM users WHERE email = $1', [email]);
    if (userResult.rows.length === 0) {
      console.log("No user found for email:", email);
      return res.status(200).send('If the email is associated with an account, a reset code will be sent.');
    }

    const userId = userResult.rows[0].id;
    const resetCode = crypto.randomInt(100000, 1000000).toString();
    const expires = new Date(Date.now() + 3600 * 1000);
    console.log(`Generated reset code: ${resetCode} for user: ${userId}`);

    await pool.query('INSERT INTO password_reset (user_id, code, expires) VALUES ($1, $2, $3)', [userId, resetCode, expires]);

    const emailResponse = await fetch('http://localhost:3003/email/send-reset-code', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ userId })
    });

    if (!emailResponse.ok) {
      throw new Error(`Email server responded with status: ${emailResponse.status}`);
    }

    console.log('Reset code sent successfully.');
    res.status(200).send('If the email is associated with an account, a reset code will be sent.');
  } catch (error) {
    console.error('Error during operation:', error);
    res.status(500).send('Error processing forgot password request.');
  }
});

app.post('/api/verify-code', async (req, res) => {
  const { email, resetCode } = req.body;

  try {
    const query = `
      SELECT pr.user_id 
      FROM password_reset pr
      JOIN users u ON pr.user_id = u.id
      WHERE u.email = $1 AND pr.code = $2 AND pr.expires > NOW() AND pr.used = false
    `;
    const result = await pool.query(query, [email, resetCode]);

    if (result.rows.length === 0) {
      return res.status(400).send('Invalid or expired reset code.');
    }

    const updateQuery = `
      UPDATE password_reset
      SET used = true
      WHERE user_id = $1 AND code = $2
    `;
    await pool.query(updateQuery, [result.rows[0].user_id, resetCode]);

    // Assign values to session object
    req.session.resetSession = { userId: result.rows[0].user_id, email: email, verified: true };

    // Respond to the client. Session is automatically saved.
    res.send('Reset code verified. Proceed with password reset.');
    console.log("Code verified");
  } catch (error) {
    console.error('Error verifying reset code:', error);
    res.status(500).send('Error processing your request.');
  }
});

function validatePassword(password) {
  const regex = /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[@$!%*?&#])[A-Za-z\d@$!%*?&#]{8,}$/;
  return regex.test(password);
}

app.post('/api/reset-pwd', async (req, res) => {
  const { newPassword } = req.body;
  let userId;
  if (!validatePassword(newPassword)) {
    return res.status(400).json({
      message: 'Password must be at least 8 characters long, include at least one uppercase letter, one symbol, and one number.'
    });
  }
  // Check for a valid reset session or a normal authenticated session
  if (req.session.resetSession && req.session.resetSession.verified) {
      userId = req.session.resetSession.userId;
  } else if (req.isAuthenticated()) {
      userId = req.user.id;
  } else {
      return res.status(401).send('Not authorized.');
  }

  try {
    const hashedPassword = await bcrypt.hash(newPassword, 10);
    await pool.query(
      'UPDATE users SET password = $1 WHERE id = $2',
      [hashedPassword, userId]
    );

    if (req.session.resetSession) {
      req.session.destroy(async(err) => {
      if (err) {
        console.error('Error clearing reset session:', err);
        return res.status(500).send('Failed to clear reset session.');
      }
      });
      res.clearCookie('connect.sid', { path: '/' });
    }
    
    res.status(200).send('Password updated successfully.');
  } catch (error) {
    console.error('Error updating password:', error);
    res.status(500).send('Error updating password.');
  }
});

app.post('/api/forgot-user', async (req, res) => {
  console.log("Request received for forgot username");
  const { email } = req.body;

  try {
    // Fetch the user's username based on the email address
    const userResult = await pool.query('SELECT username FROM users WHERE email = $1', [email]);
    if (userResult.rows.length === 0) {
      console.log("No user found for email:", email);
      // Send a generic response to avoid revealing whether an email is registered
      return res.status(200).send('If the email is associated with an account, the username will be sent.');
    }

    const username = userResult.rows[0].username;
    console.log(`Found username: ${username} for email: ${email}`);

    // Send the username to the internal email server's /send-user endpoint
    const emailResponse = await fetch('http://localhost:3003/email/send-user', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email, username })
    });

    if (!emailResponse.ok) {
      throw new Error(`Email server responded with status: ${emailResponse.status}`);
    }

    console.log('Username sent successfully via email.');
    // Send a generic response for security reasons
    res.status(200).send('If the email is associated with an account, the username will be sent.');
  } catch (error) {
    console.error('Error during forgot username operation:', error);
    res.status(500).send('Error processing forgot username request.');
  }
});


app.post('/api/register', async (req, res) => {
  const { email, password, username, secretCode } = req.body;
  let client;

  if (!validatePassword(password)) {
    return res.status(400).json({
      message: 'Password must be at least 8 characters long, include at least one uppercase letter, one symbol, and one number.'
    });
  }

  try {
    client = await pool.connect();
    await client.query('BEGIN');

      const codeResult = await client.query('SELECT id FROM reg_codes WHERE code = $1', [secretCode]);
      if (codeResult.rowCount === 0) {
        await client.query('ROLLBACK');
        return res.status(401).json({ message: 'Invalid code.' });
      }
    

    const hashedPassword = await bcrypt.hash(password, 10);

    const userResult = await client.query(
      'INSERT INTO users (email, password, username) VALUES ($1, $2, $3) RETURNING id',
      [email, hashedPassword, username]
    );

      await client.query('DELETE FROM reg_codes WHERE id = $1', [codeResult.rows[0].id]);
    

    await client.query('COMMIT');
    res.status(201).json(userResult.rows[0]);
  } catch (error) {
    if (client) await client.query('ROLLBACK');
    console.error('Error registering new user:', error);

    // Check if the error is a unique violation
    if (error.code === '23505') {
      if (error.constraint === 'users_email_key') {
        return res.status(400).json({ message: 'Email already exists.' });
      } else if (error.constraint === 'users_username_key') {
        return res.status(400).json({ message: 'Username already exists.' });
      }
    }

    res.status(500).json({ message: 'Error registering new user.' });
  } finally {
    if (client) client.release();
  }
});


app.get('/api/aimetrics', async (req, res) => {
  if (!req.isAuthenticated() || !req.user || !req.user.id) {
    return res.status(401).send('User not authenticated.');
  }

  const userId = req.user.id;

  try {
    const chatDataResult = await pool.query(
      'SELECT num_chats FROM users WHERE id = $1',
      [userId]
    );

    if (chatDataResult.rowCount > 0) {
      // Directly send the num_chats integer value
      res.json({ numChats: chatDataResult.rows[0].num_chats });
    } else {
      res.status(404).send('No chat data found.');
    }
  } catch (error) {
    console.error('Failed to retrieve AI chat data:', error);
    res.status(500).send('Error retrieving AI chat data.');
  }
});



//get profile of signed in user
app.get('/api/profile', (req, res) => {
  if (req.isAuthenticated()) {
    const userId = req.user.id; 
    pool.query('SELECT username, email FROM users WHERE id = $1', [userId], (error, results) => {
      if (error) {
        res.status(500).send('Error retrieving user data.');
        console.log("Cannot get the data");
      } else {
        res.status(200).json(results.rows[0]);
      }
    });
  } else {
    res.status(401).send('User not authenticated.');
    console.log("User not Authed");
  }
});

app.post('/api/update-email', async (req, res) => {
  const { newEmail } = req.body;
  let userId;

  if (req.isAuthenticated()) {
    userId = req.user.id;
  } else {
    return res.status(401).json({ message: 'Not authorized.' });
  }

  try {
    await pool.query(
      'UPDATE users SET email = $1 WHERE id = $2',
      [newEmail, userId]
    );
    res.status(200).json({ message: 'Email updated successfully.' });
  } catch (error) {
    console.error('Error updating email:', error);
    if (error.code === '23505') {  
      res.status(400).json({ message: 'Email already exists.' });
    } else {
      res.status(500).json({ message: 'Error updating email.' });
    }
  }
});



// Get all modules
app.get('/api/gModules', async (req, res) => {
  if (req.isAuthenticated()) {
    try {
      const result = await pool.query('SELECT * FROM modules');
      //console.log('GET MODULES: Modules retrieved successfully.');
      res.status(200).json(result.rows);
    } catch (error) {
      console.error(error);
      res.status(500).send('Error retrieving modules.');
    }
  } else {
    console.log('GET MODULES: User not authenticated.');
    res.status(401).send('User not authenticated.');
  }
});

// Get a specific module based on id
app.get('/api/module/id/:id', async (req, res) => {
  if (req.isAuthenticated()) {
    const { id } = req.params;
    try {
      const result = await pool.query('SELECT * FROM modules WHERE moduleid = $1', [id]);
      if (result.rows.length === 0) {
        //console.log('GET MODULE: Module with the given ID not found.');
        res.status(404).send('Module with the given ID not found.');
      } else {
        //console.log('GET MODULE: Module retrieved successfully.');
        res.status(200).json(result.rows[0]);
      }
    } catch (error) {
      //console.error(error);
      res.status(500).send('Error retrieving module.');
    }
  } else {
    //console.log('GET MODULE: User not authenticated.');
    res.status(401).send('User not authenticated.');
  }
});

// Get all content  
app.get('/api/content', ensureUserProgressSync, async (req, res) => {
  if (req.isAuthenticated()) {
    try {
      const result = await pool.query('SELECT * FROM contents ORDER BY content_order ASC');
      //console.log('GET CONTENT: Content retrieved and sorted by order successfully.');
      res.status(200).json(result.rows);
    } catch (error) {
      //console.error(error);
      res.status(500).send('Error retrieving and sorting content.');
    }
  } else {
    //console.log('GET CONTENT: User not authenticated.');
    res.status(401).send('User not authenticated.');
  }
});

// Get each user_module_progress entry for a specific user
app.get('/api/user-module-progress', ensureUserProgressSync, async (req, res) => {
  if (req.isAuthenticated()) {
    const userId = req.user.id; 
    try {
      const result = await pool.query('SELECT * FROM user_module_progress WHERE user_id = $1', [userId]);
      //console.log('GET USER MODULE PROGRESS: User module progress retrieved successfully.');
      res.status(200).json(result.rows);
    } catch (error) {
      //console.error(error);
      res.status(500).send('Error retrieving user module progress.');
    }
  } else {
    //console.log('GET USER MODULE PROGRESS: User not authenticated.');
    res.status(401).send('User not authenticated.');
  }
});

// Post a new user_module_progress entry for a specific user
app.post('/api/user-module-progress', ensureUserProgressSync, async (req, res) => {
  if (req.isAuthenticated()) {
    const userId = req.user.id; 
    const { module_id, completed } = req.body;
    //console.log(module_id, completed);
    try {
      const result = await pool.query(
        'INSERT INTO user_module_progress (user_id, module_id, completed) VALUES ($1, $2, $3) RETURNING *',
        [userId, module_id, completed]
      );
      //console.log('POST USER MODULE PROGRESS: User module progress added successfully.');
      res.status(201).json(result.rows[0]);
    } catch (error) {
      //console.error(error);
      res.status(500).send('Error adding user module progress.');
    }
  } else {
    //console.log('POST USER MODULE PROGRESS: User not authenticated.');
    res.status(401).send('User not authenticated.');
  }
});

// Update a user_module_progress entry for a specific user
app.put('/api/user-module-progress', ensureUserProgressSync,async (req, res) => {
  if (req.isAuthenticated()) {
    const userId = req.user.id; 
    const { module_id, completed } = req.body;
    try {
      const result = await pool.query(
        'UPDATE user_module_progress SET completed = $1 WHERE user_id = $2 AND module_id = $3 RETURNING *',
        [completed, userId, module_id]
      );
      if (result.rows.length === 0) {
        //console.log('PUT USER MODULE PROGRESS: User module progress not found.');
        res.status(404).send('User module progress not found.');
      } else {
        //console.log('PUT USER MODULE PROGRESS: User module progress updated successfully.');
        res.status(200).json(result.rows[0]);
      }
    } catch (error) {
      //console.error(error);
      res.status(500).send('Error updating user module progress.');
    }
  } else {
    //console.log('PUT USER MODULE PROGRESS: User not authenticated.');
    res.status(401).send('User not authenticated.');
  }
});

// Get each user_content_progress entry for a specific user
app.get('/api/user-content-progress', ensureUserProgressSync,async (req, res) => {
  if (req.isAuthenticated()) {
    const userId = req.user.id; 
    try {
      const result = await pool.query('SELECT * FROM user_content_progress WHERE user_id = $1', [userId]);
      //console.log('GET USER CONTENT PROGRESS: User content progress retrieved successfully.');
      res.status(200).json(result.rows);
    } catch (error) {
      //console.error(error);
      res.status(500).send('Error retrieving user content progress.');
    }
  } else {
    //console.log('GET USER CONTENT PROGRESS: User not authenticated.');
    res.status(401).send('User not authenticated.');
  }
});

// Post a new user_content_progress entry for a specific user
app.post('/api/user-content-progress', ensureUserProgressSync,async (req, res) => {
  if (req.isAuthenticated()) {
    const userId = req.user.id; 
    const { content_id, started, module_id } = req.body;
    try {
      const result = await pool.query(
        'INSERT INTO user_content_progress (user_id, content_id, started, module_id) VALUES ($1, $2, $3, $4) RETURNING *',
        [userId, content_id, started, module_id]
      );
      //console.log('POST USER CONTENT PROGRESS: User content progress added successfully.');
      res.status(201).json(result.rows[0]);
    } catch (error) {
      //console.error(error);
      res.status(500).send('Error adding user content progress.');
    }
  } else {
    //console.log('POST USER CONTENT PROGRESS: User not authenticated.');
    res.status(401).send('User not authenticated.');
  }
});

// Update a user_content_progress entry for a specific user
app.put('/api/user-content-progress', ensureUserProgressSync, async (req, res) => {
  if (req.isAuthenticated()) {
    const userId = req.user.id; 
    const { content_id, started } = req.body;
    try {
      const resultContentProgress = await pool.query(
        'UPDATE user_content_progress SET started = $1 WHERE user_id = $2 AND content_id = $3 RETURNING module_id',
        [started, userId, content_id]
      );

      if (resultContentProgress.rows.length === 0) {
        res.status(404).send('User content progress not found.');
        return;
      }

      const moduleId = resultContentProgress.rows[0].module_id;

      // Update user_module_progress to set viewed to true
      const resultModuleProgress = await pool.query(
        'UPDATE user_module_progress SET viewed = true WHERE user_id = $1 AND module_id = $2 RETURNING *',
        [userId, moduleId]
      );

      if (resultModuleProgress.rows.length === 0) {
         res.status(404).send('User module progress not found.');
         return;
      }

      res.status(200).json(resultContentProgress.rows[0]);
    } catch (error) {
      console.error(error);
      res.status(500).send('Error updating user content progress.');
    }
  } else {
    res.status(401).send('User not authenticated.');
  }
});



app.get('/api/download/:contentId', async (req, res) => {

  if (!req.isAuthenticated()) {
    return res.status(401).send('User not authenticated.');
  }

  const { contentId } = req.params;

  try {
    // Retrieve the download_src for the given content ID
    const queryResult = await pool.query('SELECT download_src FROM contents WHERE id = $1', [contentId]);
    if (queryResult.rows.length === 0) {
      return res.status(404).send('Content not found.');
    }

    const { download_src: downloadSrc } = queryResult.rows[0];

    // Define the full path to the file
    const filePath = process.env.NODE_ENV === 'production'
      ? path.join('/var/www/files', downloadSrc)
      : path.join(__dirname, '..', 'files', downloadSrc);

    // Check if the file exists
    fs.access(filePath, fs.constants.F_OK, (err) => {
      if (err) {
        console.error(`File not found: ${filePath}`);
        return res.status(404).send('File not found.');
      }

      // Set the header to force download
      res.download(filePath, (downloadErr) => {
        if (downloadErr) {
          console.error(`Error downloading file: ${downloadErr}`);
          return res.status(500).send('Error downloading file.');
        }
      });
    });
  } catch (error) {
    console.error('Error retrieving content:', error);
    res.status(500).send('Error retrieving content.');
  }
});

app.put('/api/current-id', ensureUserProgressSync, async (req, res) => {
  if (req.isAuthenticated()) {
      const userId = req.user.id;
      const { module_id, current_id } = req.body; 
      try {
          const resultModuleProgress = await pool.query(
              'UPDATE user_module_progress SET current_id = $1 WHERE user_id = $2 AND module_id = $3 RETURNING *',
              [current_id, userId, module_id]
          );

          if (resultModuleProgress.rows.length === 0) {
              res.status(404).send('User module progress not found.');
              return;
          }

          res.status(200).json({current_id: resultModuleProgress.rows[0].current_id});
      } catch (error) {
          console.error('Error updating user module progress:', error);
          res.status(500).send('Error updating user module progress.');
      }
  } else {
      res.status(401).send('User not authenticated.');
  }
});

app.get('/api/current-id', ensureUserProgressSync, async (req, res) => {
  if (req.isAuthenticated()) {
      const userId = req.user.id; 
      const { module_id } = req.query; 

      try {
          const result = await pool.query(
              'SELECT current_id FROM user_module_progress WHERE user_id = $1 AND module_id = $2',
              [userId, module_id]
          );

          if (result.rows.length > 0) {
              const currentId = result.rows[0].current_id;
              res.json({ current_id: currentId });
          } else {
              res.status(404).json({ message: 'Module progress not found for the given user and module.' });
          }
      } catch (error) {
          console.error('Error retrieving current content ID:', error);
          res.status(500).json({ message: 'Error retrieving current content ID.' });
      }
  } else {
      res.status(401).json({ message: 'User not authenticated.' });
  }
});


app.listen(port, 'localhost', () => {
  console.log(`Server listening at http://localhost:${port}`);
});