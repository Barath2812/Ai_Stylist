const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');
const path = require('path');
const fs = require('fs');

const app = express();
const PORT = 5000;

// Middleware
const corsOptions = {
    origin: process.env.NODE_ENV === 'production' 
        ? process.env.FRONTEND_URL || '*'
        : ['http://localhost:5173', 'http://localhost:3000', 'http://127.0.0.1:5173'],
    credentials: true,
    methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization', 'Accept']
};
app.use(cors(corsOptions));
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));
app.use('/uploads', express.static(path.join(__dirname, 'uploads')));

// Database Connection
mongoose.connect('mongodb+srv://barathrajdev:f1r2e3e4@cluster0.tsojopp.mongodb.net/ai-stylist', {
    useNewUrlParser: true,
    useUnifiedTopology: true
}).then(() => console.log('MongoDB Connected to ai-stylist'))
    .catch(err => {
        console.error('❌ MongoDB connection failed:', err.message);
        process.exit(1);
    });

// Handle MongoDB connection errors after initial connect
mongoose.connection.on('error', (err) => {
    console.error('MongoDB connection error:', err.message);
});

mongoose.connection.on('disconnected', () => {
    console.warn('⚠️ MongoDB disconnected. Attempting reconnection...');
});

// Routes
const analyzeRoute = require('./routes/analyze');
app.use('/api', analyzeRoute);

const virtualTryonRoute = require('./routes/virtualTryon');
const authRoute = require('./routes/auth');
const dashboardRoute = require('./routes/dashboard');
const outfitRoute = require('./routes/outfits');
const profileRoute = require('./routes/profile');
const chatRoute = require('./routes/chat');
const productsRoute = require('./routes/products');

app.use('/api', virtualTryonRoute);
app.use('/api', authRoute);
app.use('/api', dashboardRoute);
app.use('/api', outfitRoute);
app.use('/api/profile', profileRoute);
app.use('/api/chat', chatRoute);
app.use('/api/products', productsRoute);

// Basic Route
app.get('/', (req, res) => {
    res.send('AI Stylist Backend Running');
});

// Ensure uploads directory exists
const uploadDir = 'uploads';
if (!fs.existsSync(uploadDir)) {
    fs.mkdirSync(uploadDir);
}

// 404 Handler - must be after all routes
app.use((req, res) => {
    res.status(404).json({
        success: false,
        error: `Route not found: ${req.method} ${req.originalUrl}`
    });
});

// Global Error Handler - must be last middleware
app.use((err, req, res, next) => {
    console.error('❌ Unhandled Error:', err.stack || err.message);

    // Multer file size errors
    if (err.code === 'LIMIT_FILE_SIZE') {
        return res.status(413).json({
            success: false,
            error: 'File too large. Maximum size is 10MB.'
        });
    }

    // JSON parse errors
    if (err.type === 'entity.parse.failed') {
        return res.status(400).json({
            success: false,
            error: 'Invalid JSON in request body.'
        });
    }

    // Payload too large
    if (err.type === 'entity.too.large') {
        return res.status(413).json({
            success: false,
            error: 'Request body too large. Maximum is 10MB.'
        });
    }

    // MongoDB validation errors
    if (err.name === 'ValidationError') {
        return res.status(400).json({
            success: false,
            error: 'Validation error: ' + Object.values(err.errors).map(e => e.message).join(', ')
        });
    }

    // MongoDB duplicate key errors
    if (err.code === 11000) {
        return res.status(409).json({
            success: false,
            error: 'Duplicate entry. This record already exists.'
        });
    }

    // Default server error
    res.status(500).json({
        success: false,
        error: process.env.NODE_ENV === 'production'
            ? 'Internal server error'
            : err.message || 'Internal server error'
    });
});

// Handle uncaught exceptions
process.on('uncaughtException', (err) => {
    console.error('💥 Uncaught Exception:', err);
    process.exit(1);
});

process.on('unhandledRejection', (reason, promise) => {
    console.error('💥 Unhandled Rejection at:', promise, 'reason:', reason);
});

app.listen(PORT, () => {
    console.log(`Server running on http://localhost:${PORT}`);
});
