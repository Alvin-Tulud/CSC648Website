
import express from "express";
import session from "express-session";
import dotenv from "dotenv";


import path from "path";
import { fileURLToPath } from "url";
import http from 'http'; // Import Node.js http module
import { Server } from 'socket.io'; // Import Socket.IO Server

// --- Route Imports ---
import aboutRoutes from "./routes/about.js";
import productRoutes from "./routes/search.js"; 
import sellRoutes from "./routes/sell.js";

import dashboardRoutes from "./routes/dashboard.js";
import authRoutes from "./routes/authentication.js";

// --- Middleware Imports ---
import isAuthenticated from './middleware/isAuthenticated.js'; 

import dbPool from './schema/database.js'; 
import configureSocketIO from './sockets/socketHandler.js'; 

// --- Basic Setup ---
dotenv.config();
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
const server = http.createServer(app); // Create HTTP server for Socket.IO
const io = new Server(server); // Initialize Socket.IO attached to the HTTP server

const port = process.env.PORT || 3000; 

// --- Session Middleware ---

const sessionMiddleware = session({
    secret: process.env.SECRET, 
    resave: false,
    saveUninitialized: false,
    cookie: {
        secure: process.env.NODE_ENV === 'production', 
        httpOnly: true, 
        maxAge: 1000 * 60 * 60 * 24 * 7 
    }
   
});
app.use(sessionMiddleware);

// --- Express Middleware ---

app.use(express.json()); // Parse JSON bodies
app.use(express.urlencoded({ extended: true })); // Parse URL-encoded bodies

app.set('view engine', 'ejs'); // Set view engine
app.set('views', path.join(__dirname, 'views')); // Set views directory

app.use(express.static(path.join(__dirname, "public"))); 


// --- Socket.IO Configuration ---

io.use((socket, next) => {
    sessionMiddleware(socket.request, {}, next);
});
// Configure Socket.IO event handlers
configureSocketIO(io, dbPool); // Pass io instance and db pool

// --- Route Definitions ---
app.use('/about', aboutRoutes); // Mount about routes
app.use('/auth', authRoutes); // Mount authentication routes
app.use('/sell', isAuthenticated, sellRoutes); // Protect sell routes
app.use('/dashboard', isAuthenticated, dashboardRoutes); // Protect dashboard routes

// Keep productRoutes last if it handles '/' to avoid overriding other routes
app.use('/', productRoutes); // Handles '/', '/listing/:id', '/images_product/:name'

// --- Basic Root Redirect ---
app.get('/root-redirect-test', (req, res) => { // Example separate route
    if (req.session.userId) {
        res.redirect('/dashboard');
    } else {
        res.redirect('/'); // Let productRoutes handle the public home page
    }
});

// --- Global Error Handler ---

app.use((err, req, res, next) => {
    console.error("Global Error Handler Caught:", err.stack);
  
    const statusCode = err.status || 500;
    res.status(statusCode).render('error', { // Create an error.ejs view
         message: process.env.NODE_ENV === 'production' ? 'An unexpected error occurred.' : err.message,
         status: statusCode,
         user: req.session.username // Pass user if available
    });
});


// --- Start Server ---

server.listen(port, () => {
    console.log(`Server running with Socket.IO on http://localhost:${port}`);
});
