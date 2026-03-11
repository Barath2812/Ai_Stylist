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

// @route   POST /api/profile/save
// @desc    Save complete style profile
// @access  Private
router.post('/save', authenticate, async (req, res) => {
    try {
        const { profile, photoUrl, products } = req.body;

        if (!profile) {
            return res.status(400).json({
                success: false,
                error: 'Profile data is required'
            });
        }

        const user = await User.findById(req.userId);

        if (!user) {
            return res.status(404).json({ success: false, error: 'User not found' });
        }

        // Save complete profile
        user.styleProfile = {
            ...profile,
            photoUrl: photoUrl || user.styleProfile?.photoUrl,
            curatedProducts: products || user.styleProfile?.curatedProducts || null,
            analyzedAt: new Date()
        };

        // Add to history
        user.analyses.push({
            date: new Date(),
            imagePath: photoUrl || user.styleProfile?.photoUrl,
            faceShape: profile.physical?.faceShape?.type || profile.physical?.faceShape,
            skinTone: profile.physical?.skinTone?.category || profile.physical?.skinTone,
            colors: profile.colorPalette?.best?.map(c => c.name) || [],
            occasion: profile.occasion || 'General',
            products: products || null
        });

        await user.save();

        res.status(200).json({
            success: true,
            message: 'Style profile saved successfully!',
            profile: user.styleProfile
        });

    } catch (error) {
        console.error('Save profile error:', error);
        res.status(500).json({
            success: false,
            error: 'Failed to save profile. Please try again.'
        });
    }
});

// @route   GET /api/profile
// @desc    Get user's style profile
// @access  Private
router.get('/', authenticate, async (req, res) => {
    try {
        const user = await User.findById(req.userId);

        if (!user) {
            return res.status(404).json({ success: false, error: 'User not found' });
        }

        res.status(200).json({
            success: true,
            profile: user.styleProfile || null,
            hasProfile: !!user.styleProfile?.physical
        });

    } catch (error) {
        console.error('Get profile error:', error);
        res.status(500).json({
            success: false,
            error: 'Failed to retrieve profile.'
        });
    }
});

// @route   PUT /api/profile/preferences
// @desc    Update user style preferences
// @access  Private
router.put('/preferences', authenticate, async (req, res) => {
    try {
        const { preferences } = req.body;

        const user = await User.findById(req.userId);

        if (!user) {
            return res.status(404).json({ success: false, error: 'User not found' });
        }

        // Merge preferences with existing profile
        if (!user.styleProfile) {
            user.styleProfile = {};
        }

        user.styleProfile.preferences = {
            ...user.styleProfile.preferences,
            ...preferences,
            updatedAt: new Date()
        };

        await user.save();

        res.status(200).json({
            success: true,
            message: 'Preferences updated successfully!',
            preferences: user.styleProfile.preferences
        });

    } catch (error) {
        console.error('Update preferences error:', error);
        res.status(500).json({
            success: false,
            error: 'Failed to update preferences.'
        });
    }
});

module.exports = router;
