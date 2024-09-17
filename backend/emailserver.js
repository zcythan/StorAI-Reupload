
const express = require('express');
const app = express();
const port = 3003;
const cors = require('cors');
const nodemailer = require('nodemailer');
const { Pool } = require('pg');
const passport = require('passport');
const session = require('express-session');
const pgSession = require('connect-pg-simple')(session);

if (!process.env.PROD) {
  require('dotenv').config();
}
const envHTTPS = process.env.HTTPS.toLowerCase() === 'true';


const pool = new Pool({
  user: process.env.DB_USER,
  host: process.env.DB_HOST,
  database: 'user_data',
  password: process.env.DB_PASS,
  port: process.env.DB_PORT, 
});

const envSEC = process.env.MAIL_SECURE.toLowerCase() === 'true';

app.use(session({
  store: new pgSession({
    pool: pool, 
  }),
  secret: process.env.SESSION_SEC, 
  resave: false,
  saveUninitialized: false,
  cookie: { secure: envHTTPS, maxAge: 30 * 24 * 60 * 60 * 1000 } 
}));
app.use(passport.initialize());
app.use(passport.session());

passport.serializeUser((user, done) => {
  done(null, user.id, user.username); 
});

passport.deserializeUser((id, done) => {
  pool.query('SELECT * FROM users WHERE id = $1', [id], (err, result) => {
    if (err) {
      return done(err);
    }
    done(null, result.rows[0]);
  });
});

app.use(express.json());


app.use(cors({
  origin: process.env.FRONTEND_URL,
  credentials: true 
}));

let transporter = nodemailer.createTransport({
  host: process.env.MAIL_HOST, // SMTP host
  port: process.env.MAIL_PORT, // SMTP port
  secure: envSEC, 
  auth: {
      user: process.env.MAIL_USERNAME, 
      pass: process.env.MAIL_PASSWORD, 
  },
});

app.post('/email/send-reset-code', async (req, res) => {
  const { userId } = req.body;
  try {
    // Select the latest non-expired reset code for the user
    const result = await pool.query(
      'SELECT code FROM password_reset WHERE user_id = $1 AND used = FALSE AND expires > NOW() ORDER BY expires DESC LIMIT 1',
      [userId]
    );
    
    if (result.rows.length === 0) {
      throw new Error('No valid reset code found.');
    }

    const resetCode = result.rows[0].code;

    // Fetch the user's email address from the users table
    const userResult = await pool.query('SELECT email FROM users WHERE id = $1', [userId]);
    if (userResult.rows.length === 0) {
      throw new Error('User not found.');
    }
    
    const userEmail = userResult.rows[0].email;
    
    // Send the email with the reset code
    let mailOptions = {
      from: process.env.MAIL_USERNAME,
      to: userEmail,
      subject: "Password Reset Code",
      text: `Your password reset code is: ${resetCode}`,
    };

    transporter.sendMail(mailOptions, (error, info) => {
      if (error) {
        throw error;
      }
      res.status(200).send('Reset code sent successfully.');
    });

  } catch (error) {
    console.error('Error sending reset code email:', error);
    res.status(500).send('Error sending reset code email.');
  }
});

app.post('/email/send-user', async (req, res) => {
  const { email, username } = req.body;
  
  try {
    if (!email || !username) {
      throw new Error('Email or username not provided.');
    }

    // Prepare the email message
    let mailOptions = {
      from: process.env.MAIL_USERNAME, 
      to: email, 
      subject: "Your Username Reminder",
      text: `Hello, your username is: ${username}.`,
      html: `<p>Hello, your username is: <strong>${username}</strong>.</p>`
    };

    // Send the email
    transporter.sendMail(mailOptions, (error, info) => {
      if (error) {
        console.error('Error sending username email:', error);
        return res.status(500).send('Error sending username email.');
      }
      console.log('Username email sent successfully.');
      res.status(200).send('Username email sent successfully.');
    });
  } catch (error) {
    console.error('Error in /email/send-user endpoint:', error);
    res.status(500).send('Error processing request.');
  }
});

app.post('/email/send-feedback', (req, res) => {
  if(!req.isAuthenticated()){
    return res.status(401).send('Unauthorized');
  }
  
  const { name, email, message } = req.body;
  let mailOptions = {
      from: process.env.MAIL_USERNAME, 
      to: "mike@callahanrose.com", 
      subject: `FEEDBACK FORM -  ${name}`,
      text: `Feedback received from ${name} (${email}):\n\n${message}`,
  };

  transporter.sendMail(mailOptions, (error, info) => {
      if (error) {
          console.error('Error sending email:', error);
          return res.status(500).send('Error sending feedback');
      }
      res.status(200).send('Feedback sent successfully');
  });
});

app.listen(port, 'localhost', () => {
  console.log(`Server listening at http://localhost:${port}`);
});