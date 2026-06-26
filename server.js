require('dotenv').config();
const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const path = require('path');

// Models
const User = require('./models/User');
const Build = require('./models/Build');

const app = express();
const PORT = process.env.PORT || 5000;
const JWT_SECRET = process.env.JWT_SECRET || 'super_secret_jwt_key_that_is_very_long';

// Middleware
app.use(cors());
app.use(express.json());
app.use(express.static(__dirname)); // Serve static HTML files from root

// Database Connection
if (!process.env.MONGO_URI) {
    console.error('❌ FATAL ERROR: MONGO_URI is not defined in .env file.');
    console.log('Please copy .env.example to .env and add your MongoDB Atlas connection string.');
    process.exit(1);
}

mongoose.connect(process.env.MONGO_URI, {
    useNewUrlParser: true,
    useUnifiedTopology: true,
})
.then(() => console.log('🟢 Successfully connected to MongoDB Atlas'))
.catch((err) => {
    console.error('❌ MongoDB connection error:', err.message);
    process.exit(1);
});

// --- AUTH MIDDLEWARE ---
const authenticateToken = (req, res, next) => {
    const authHeader = req.headers['authorization'];
    const token = authHeader && authHeader.split(' ')[1];
    
    if (!token) return res.status(401).json({ error: 'Access denied. No token provided.' });

    jwt.verify(token, JWT_SECRET, (err, user) => {
        if (err) return res.status(403).json({ error: 'Invalid or expired token.' });
        req.user = user;
        next();
    });
};

// --- API ROUTES ---

// 1. Register User
app.post('/api/auth/register', async (req, res) => {
    try {
        const { username, email, password } = req.body;

        // Check if user exists
        const existingUser = await User.findOne({ $or: [{ email }, { username }] });
        if (existingUser) {
            return res.status(400).json({ error: 'Username or email already exists.' });
        }

        // Hash password
        const salt = await bcrypt.genSalt(10);
        const hashedPassword = await bcrypt.hash(password, salt);

        // Create user
        const newUser = new User({
            username,
            email,
            password: hashedPassword
        });

        await newUser.save();

        // Generate JWT
        const token = jwt.sign({ id: newUser._id, username: newUser.username }, JWT_SECRET, { expiresIn: '7d' });
        
        res.status(201).json({ 
            message: 'User registered successfully!', 
            token,
            user: { username: newUser.username, email: newUser.email }
        });
    } catch (err) {
        console.error('Registration Error:', err);
        // Handle Mongoose validation errors
        if (err.name === 'ValidationError') {
            const messages = Object.values(err.errors).map(val => val.message);
            return res.status(400).json({ error: messages.join(', ') });
        }
        res.status(500).json({ error: 'Internal server error during registration.' });
    }
});

// 2. Login User
app.post('/api/auth/login', async (req, res) => {
    try {
        const { email, password } = req.body;

        const user = await User.findOne({ email });
        if (!user) {
            return res.status(400).json({ error: 'Invalid email or password.' });
        }

        const isMatch = await bcrypt.compare(password, user.password);
        if (!isMatch) {
            return res.status(400).json({ error: 'Invalid email or password.' });
        }

        const token = jwt.sign({ id: user._id, username: user.username }, JWT_SECRET, { expiresIn: '7d' });
        
        res.json({ 
            message: 'Login successful!', 
            token,
            user: { username: user.username, email: user.email }
        });
    } catch (err) {
        console.error('Login Error:', err);
        res.status(500).json({ error: 'Internal server error during login.' });
    }
});

// 3. Save PC Build
app.post('/api/user/builds', authenticateToken, async (req, res) => {
    try {
        const { buildName, buildData, totalPrice } = req.body;

        if (!buildData) {
            return res.status(400).json({ error: 'Build data is required.' });
        }

        const newBuild = new Build({
            userId: req.user.id,
            buildName: buildName || 'My Custom Build',
            buildData,
            totalPrice: totalPrice || 0
        });

        await newBuild.save();
        res.status(201).json({ message: 'Build saved successfully!', build: newBuild });
    } catch (err) {
        console.error('Save Build Error:', err);
        res.status(500).json({ error: 'Internal server error while saving build.' });
    }
});

// 4. Get User's Saved Builds
app.get('/api/user/builds', authenticateToken, async (req, res) => {
    try {
        const builds = await Build.find({ userId: req.user.id }).sort({ createdAt: -1 });
        res.json({ builds });
    } catch (err) {
        console.error('Fetch Builds Error:', err);
        res.status(500).json({ error: 'Internal server error while fetching builds.' });
    }
});

// 5. Get Current User Profile (Optional utility)
app.get('/api/auth/me', authenticateToken, async (req, res) => {
    try {
        const user = await User.findById(req.user.id).select('-password');
        if (!user) return res.status(404).json({ error: 'User not found.' });
        res.json({ user });
    } catch (err) {
        res.status(500).json({ error: 'Server error' });
    }
});

// SPA Fallback
app.get('*', (req, res) => {
    res.sendFile(path.join(__dirname, 'index.html'));
});

// Start Server
app.listen(PORT, () => {
    console.log(`ForgePC MongoDB Backend running on http://localhost:${PORT}`);
});
