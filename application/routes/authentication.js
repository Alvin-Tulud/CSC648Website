import db from "../schema/database.js"; 
import express from "express";
import bcrypt from "bcrypt";
import isAuthenticated from '../middleware/isAuthenticated.js'; 

const router = express.Router();


router.post('/register', async (req, res) => {
    const { email, username, password, confirmPassword } = req.body;

    // Basic Validations
    const emailTrimmed = email?.trim(); // Use optional chaining and trim
    if (!emailTrimmed || !username || !password) {
         req.session.signUpError = 'Missing required fields.';
         return res.redirect('/');
    }
    if (!emailTrimmed.endsWith('@sfsu.edu')) {
        req.session.signUpError = 'Email must end with @sfsu.edu';
        return res.redirect('/');
    }
    if (password.length < 6) {
        req.session.signUpError = 'Password must be at least 6 characters.';
        return res.redirect('/');
    }
    if (password !== confirmPassword) {
        req.session.signUpError = 'Passwords do not match.';
        return res.redirect('/');
    }

    try {
        // Check if email or username already exists using OR
        const [existed] = await db.query(
            'SELECT userId FROM User WHERE email = ? OR username = ?',
            [emailTrimmed, username.trim()] 
        );

        if (existed.length > 0) {
            req.session.signUpError = 'Email or Username already exists.';
            return res.redirect('/');
        }

        // Hash password
        const hashedPassword = await bcrypt.hash(password, 10); 

        // Insert new user - Use correct column names
        const [insertResult] = await db.execute(
            'INSERT INTO User (email, username, pkword) VALUES (?, ?, ?)',
            [emailTrimmed, username.trim(), hashedPassword]
        );

        // --- Login after successful registration ---
        req.session.signUpError = null; 
        req.session.loginError = null; 

        
        req.session.userId = insertResult.insertId;
        req.session.username = username.trim(); 

        console.log(`User registered and logged in: ID ${req.session.userId}, Username: ${req.session.username}`);
        res.redirect('/dashboard'); // Redirect to dashboard after registration/login

    } catch (err) {
        console.error("Registration Error:", err);
        req.session.signUpError = 'Server error during registration. Please try again.';
        res.redirect('/');
    }
});

// POST /auth/login
router.post("/login", async (req, res) => {
    const { email, password,returnTo } = req.body;

     if (!email || !password) {
         req.session.loginError = 'Please provide both email and password.';
         return res.redirect(returnTo || '/');
    }

    try {
        const emailTrimmed = email.trim();
        // Select necessary fields using correct table/column names
        const [result] = await db.query(
            'SELECT userId, username, pkword FROM User WHERE email = ?',
            [emailTrimmed]
        );

        if (result.length === 0) {
            req.session.loginError = "User not found with that email.";
            return res.redirect(returnTo || '/');
        }

        const user = result[0];
        // Compare password with the stored hash (pkword)
        const match = await bcrypt.compare(password, user.pkword);

        if (match) {
            // Regenerate session to prevent fixation attacks
            req.session.regenerate(err => {
                if (err) {
                    console.error('Session regeneration error:', err);
                    req.session.loginError = "Login failed due to server error.";
                    return res.redirect(returnTo || '/');
                }
                 // Store user ID and username in the new session
                req.session.userId = user.userId;
                req.session.username = user.username;
                req.session.loginError = null; // Clear login error on success
                req.session.signUpError = null; // Clear sign-up error on success
                console.log(`User logged in: ID ${req.session.userId}, Username: ${req.session.username}`);
                let safeRedirectUrl = '/dashboard'; 
                if (returnTo && returnTo.startsWith('/') && !returnTo.startsWith('//') && !returnTo.includes('..')) {
                    safeRedirectUrl = returnTo;
                }
                console.log("Redirecting to:", safeRedirectUrl);
                res.redirect(safeRedirectUrl);
            });

        } else {
            req.session.loginError = "Incorrect Password!";
            return res.redirect(returnTo || '/');
        }
    } catch (err) {
        console.error("Login Error:", err);
        req.session.loginError = "Server error during login. Please try again.";
        return res.redirect(returnTo || '/');
    }
});


router.post("/logout", isAuthenticated, (req, res, next) => { 
    const username = req.session.username; // Get username before
    req.session.destroy(err => {
        if (err) {
            console.error('Logout error:', err);
            // Handle error
            return next(err); 
        }
       
        res.clearCookie('connect.sid'); // Adjust cookie name if different
        console.log(`User ${username} logged out.`);
        res.redirect('/'); // Redirect to home page after logout
    });
});

export default router;
