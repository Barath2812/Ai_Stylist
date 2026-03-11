const express = require('express');
const router = express.Router();
const axios = require('axios');
const fs = require('fs');
const FormData = require('form-data');
const multer = require('multer');
const path = require('path');
const Replicate = require('replicate');
require('dotenv').config();

// Configure Multer Storage for Try-On
const ALLOWED_MIMES = ['image/jpeg', 'image/png', 'image/webp'];
const MAX_FILE_SIZE = 10 * 1024 * 1024; // 10MB

const storage = multer.diskStorage({
    destination: (req, file, cb) => {
        cb(null, 'uploads/');
    },
    filename: (req, file, cb) => {
        // Sanitize filename to prevent path traversal
        const safeName = file.originalname.replace(/[^a-zA-Z0-9.\-_]/g, '_');
        cb(null, 'tryon-' + Date.now() + path.extname(safeName));
    }
});

const fileFilter = (req, file, cb) => {
    if (ALLOWED_MIMES.includes(file.mimetype)) {
        cb(null, true);
    } else {
        cb(new Error('Invalid file type. Only JPEG, PNG, and WebP images are allowed.'), false);
    }
};

const upload = multer({
    storage,
    fileFilter,
    limits: { fileSize: MAX_FILE_SIZE }
});

// ============================================
// UPLOAD IMAGE FOR TRY-ON
// ============================================
router.post('/virtual-tryon/upload', (req, res) => {
    upload.single('image')(req, res, (err) => {
        if (err) {
            if (err.code === 'LIMIT_FILE_SIZE') {
                return res.status(413).json({ success: false, error: 'Image too large. Maximum size is 10MB.' });
            }
            return res.status(400).json({ success: false, error: err.message || 'Upload failed' });
        }
        if (!req.file) {
            return res.status(400).json({ success: false, error: 'No image uploaded' });
        }
        res.json({
            success: true,
            imagePath: path.resolve(req.file.path)
        });
    });
});


// ============================================
// VIRTUAL TRY-ON USING REPLICATE
// ============================================
router.post('/virtual-tryon', async (req, res) => {
    try {
        console.log('\n🎨 Virtual Try-On Request Started (Replicate)...');

        const { userImagePath, productImageUrl } = req.body;

        if (!userImagePath || !productImageUrl) {
            return res.status(400).json({
                success: false,
                error: 'Missing userImagePath or productImageUrl'
            });
        }

        // Validate Replicate API token
        if (!process.env.REPLICATE_API_TOKEN) {
            return res.status(500).json({
                success: false,
                error: 'Replicate API token not configured. Set REPLICATE_API_TOKEN in your .env file.'
            });
        }

        const replicate = new Replicate({
            auth: process.env.REPLICATE_API_TOKEN,
        });

        console.log('📥 User Image Path:', userImagePath);
        console.log('📥 Product Image URL:', productImageUrl);

        // Validate user image exists
        if (!fs.existsSync(userImagePath)) {
            return res.status(404).json({
                success: false,
                error: 'User image not found. Please re-upload your photo.'
            });
        }

        // Read user's image as buffer
        console.log('📤 Reading user image...');
        const humanImage = fs.readFileSync(userImagePath);

        // Download product image as buffer with error handling
        console.log('⬇️ Downloading product image...');
        let garmentImage;
        try {
            const productResponse = await axios.get(productImageUrl, {
                responseType: 'arraybuffer',
                timeout: 15000
            });
            garmentImage = Buffer.from(productResponse.data);
        } catch (dlErr) {
            console.error('Failed to download product image:', dlErr.message);
            return res.status(422).json({
                success: false,
                error: 'Could not download the garment image. Please check the URL is accessible and points to a valid image.'
            });
        }

        console.log('✅ Both images ready');
        console.log('🤖 Calling Replicate API...');

        const input = {
            human_img: humanImage,
            garm_img: garmentImage,
            garment_des: "clothing",
            category: "upper_body",
        };

        const output = await replicate.run(
            "cuuupid/idm-vton:0513734a452173b8173e907e3a59d19a36266e55b48528559432bd21c7d7e985",
            { input }
        );

        console.log('✅ Replicate API responded!');

        const imageUrl = output;
        if (!imageUrl) {
            throw new Error('No output URL from Replicate API');
        }

        // Download result image and convert to base64
        console.log('📥 Downloading result image from Replicate...');
        const resultResponse = await axios.get(imageUrl, {
            responseType: 'arraybuffer',
            timeout: 30000
        });

        const resultBase64 = Buffer.from(resultResponse.data).toString('base64');

        console.log('✅ Virtual try-on successful!\n');

        res.json({
            success: true,
            resultImageBase64: resultBase64
        });

    } catch (error) {
        console.error('❌ Virtual try-on error:', error.message);

        // Classify the error
        let statusCode = 500;
        let errorMsg = error.message || 'Virtual try-on failed';

        if (error.message?.includes('Invalid token') || error.message?.includes('Unauthenticated')) {
            statusCode = 401;
            errorMsg = 'Invalid Replicate API token. Please check your .env configuration.';
        } else if (error.code === 'ECONNABORTED' || error.message?.includes('timeout')) {
            statusCode = 408;
            errorMsg = 'The AI model took too long to respond. Please try again.';
        } else if (error.response?.status === 429) {
            statusCode = 429;
            errorMsg = 'Too many requests. Please wait a moment before trying again.';
        }

        res.status(statusCode).json({
            success: false,
            error: errorMsg
        });
    }
});

// ============================================
// HEALTH CHECK
// ============================================
router.get('/tryon-health', async (req, res) => {
    res.json({
        backend: 'healthy',
        method: 'Hugging Face Spaces (Free)',
        model: 'IDM-VTON'
    });
});

module.exports = router;