const express = require('express');
const router = express.Router();
const jwt = require('jsonwebtoken');
const User = require('../models/User');

const JWT_SECRET = process.env.JWT_SECRET || 'your-secret-key-change-in-production';

// Middleware to verify JWT token
const authenticate = (req, res, next) => {
    try {
        const token = req.headers.authorization?.split(' ')[1];

        if (!token) {
            return res.status(401).json({ success: false, error: 'No token provided' });
        }

        const decoded = jwt.verify(token, JWT_SECRET);
        req.userId = decoded.userId;
        next();
    } catch (error) {
        return res.status(401).json({ success: false, error: 'Invalid token' });
    }
};

// @route   GET /api/dashboard/stats
// @desc    Get user dashboard statistics
// @access  Private
router.get('/dashboard/stats', authenticate, async (req, res) => {
    try {
        const user = await User.findById(req.userId);

        if (!user) {
            return res.status(404).json({ success: false, error: 'User not found' });
        }

        // Calculate statistics
const stats = {
    totalAnalyses: user.analyses?.length || 0,
    totalOutfits: user.outfits?.length || 0,
    challengesJoined: user.challenges?.length || 0,
    savedColors: user.savedColors?.length || 0,
    styleScore: user.profile?.styleScore || 0,
    faceShape: user.profile?.physical?.faceShape?.type || 'Not analyzed yet'
};

// Get recent analyses (last 5) - mapped for frontend
const recentAnalyses = user.analyses
    ? user.analyses.slice(-5).reverse().map(analysis => ({
        date: analysis.date,
        occasion: analysis.occasion,
        faceShape: analysis.faceShape,
        skinTone: analysis.skinTone,
        colors: analysis.colors || []
      }))
    : [];


        res.status(200).json({
            success: true,
            stats,
            recentAnalyses
        });

    } catch (error) {
        console.error('Dashboard stats error:', error);
        res.status(500).json({
            success: false,
            error: 'Server error. Please try again.'
        });
    }
});

// @route   GET /api/dashboard/profile
// @desc    Get user profile
// @access  Private
router.get('/dashboard/profile', authenticate, async (req, res) => {
    try {
        const user = await User.findById(req.userId).select('-password');

        if (!user) {
            return res.status(404).json({ success: false, error: 'User not found' });
        }

        res.status(200).json({
            success: true,
            user: {
                id: user._id,
                name: user.name,
                email: user.email,
                profile: user.profile || {},
                stats: {
                    totalAnalyses: user.analyses?.length || 0,
                    totalOutfits: user.outfits?.length || 0,
                    savedProducts: user.savedProducts?.length || 0
                },
                createdAt: user.createdAt
            }
        });

    } catch (error) {
        console.error('Profile fetch error:', error);
        res.status(500).json({
            success: false,
            error: 'Server error. Please try again.'
        });
    }
});

module.exports = router;
