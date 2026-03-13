const express = require('express');
const router = express.Router();
const multer = require('multer');
const { spawn } = require('child_process');
const path = require('path');
const Result = require('../models/Result');
const fs = require('fs');
const { GoogleGenerativeAI } = require("@google/generative-ai");
const axios = require('axios');
require('dotenv').config();

// Initialize Gemini
const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);

// Configure Multer Storage with 15MB limit
const storage = multer.diskStorage({
    destination: (req, file, cb) => {
        cb(null, 'uploads/');
    },
    filename: (req, file, cb) => {
        cb(null, Date.now() + '-' + file.originalname);
    }
});

const upload = multer({ 
    storage: storage,
    limits: {
        fileSize: 15 * 1024 * 1024 // 15MB max
    }
});

function fileToGenerativePart(path, mimeType) {
    return {
        inlineData: {
            data: fs.readFileSync(path).toString("base64"),
            mimeType
        },
    };
}

const { searchProducts } = require('./puppeteerScraper');

// Timeout wrapper for promises
const promiseTimeout = (promise, ms) => Promise.race([
    promise,
    new Promise((_, reject) => setTimeout(() => reject(new Error(`Timeout after ${ms}ms`)), ms))
]);

// MAIN ANALYZE ROUTE
router.post('/analyze', upload.single('image'), async (req, res) => {
    if (!req.file) {
        return res.status(400).json({ error: 'No image uploaded' });
    }

    // Size check (redundant but explicit)
    if (req.file.size > 15 * 1024 * 1024) {
        fs.unlinkSync(req.file.path);
        return res.status(413).json({ error: 'File too large. Max 15MB. Please use smaller image.' });
    }

    const { occasion = 'Casual' } = req.body;
    const imagePath = req.file.path;
    const absoluteImagePath = path.resolve(imagePath);

    const scriptPath = path.join(__dirname, '../python/face_analysis.py');

    console.log(`Analyzing image (${(req.file.size/1024/1024).toFixed(1)}MB): ${absoluteImagePath}`);

    try {
        // Python spawn with 90s timeout wrapper
        const runPythonWithTimeout = () => new Promise((resolve, reject) => {
            const pythonProcess = spawn('python', [
                scriptPath, 
                absoluteImagePath, 
                occasion
            ], {
                cwd: path.join(__dirname, '..'),
                stdio: ['ignore', 'pipe', 'pipe']
            });

            let dataString = '';
            let errorString = '';

            pythonProcess.stdout.on('data', (data) => { dataString += data.toString(); });
            pythonProcess.stderr.on('data', (data) => { errorString += data.toString(); });

            const timeout = setTimeout(() => {
                pythonProcess.kill();
                reject(new Error('Python analysis timed out after 90s. Try smaller image or better lighting.'));
            }, 90000);

            pythonProcess.on('close', (code) => {
                clearTimeout(timeout);
                if (code !== 0) {
                    reject(new Error(`Python failed (code ${code}): ${errorString}`));
                    return;
                }

                // Parse JSON
                const startIdx = dataString.indexOf('{');
                const endIdx = dataString.lastIndexOf('}') + 1;
                if (startIdx === -1 || endIdx <= startIdx) {
                    reject(new Error('Invalid Python output'));
                    return;
                }

                try {
                    const analysisResult = JSON.parse(dataString.slice(startIdx, endIdx));
                    console.log("✅ Face Analysis Complete");
                    resolve(analysisResult);
                } catch (parseErr) {
                    reject(new Error('Python JSON parse failed'));
                }
            });
        });

        const analysisResult = await promiseTimeout(runPythonWithTimeout(), 90000);

        if (analysisResult.error) {
            return res.status(400).json({ error: analysisResult.error });
        }

        if (!analysisResult.faceDetected) {
            return res.status(400).json({ error: 'Face not detected clearly. Try better lighting/angle.' });
        }

        // Gemini style analysis with 45s timeout
        let styleProfile;
        if (process.env.GEMINI_API_KEY) {
            console.log("🤖 Calling Gemini...");
            const model = genAI.getGenerativeModel({ model: "gemini-2.5-flash" });
            const imagePart = fileToGenerativePart(imagePath, req.file.mimetype || 'image/jpeg');

            const prompt = `
You are an expert fashion stylist. Analyze photo with these measurements:

Face Shape: ${analysisResult.faceShapeData?.type || analysisResult.faceShape} (${Math.round((analysisResult.faceShapeData?.confidence || 0.8)*100)}%)
Skin Tone: ${analysisResult.skinToneData?.category || 'Medium'} (${analysisResult.skinToneData?.undertone || 'Neutral'})
Symmetry: ${Math.round((analysisResult.facialSymmetry || 0.85)*100)}%
Occasion: ${occasion}

Provide ONLY JSON:
{
  "bodyType": {"category": "Mesomorph", "build": "Athletic", "shoulders": "Broad", "recommendation": "Tailored fits"},
  "physical": {"hair": {"color": "Brown", "texture": "Wavy", "style": "Medium"}, "eyes": {"color": "Brown"}, "beardStyle": "Stubble"},
  "stylePersonality": {"primary": {"type": "Casual", "percentage": 50}, "secondary": {"type": "Smart Casual", "percentage": 30}},
  "colorPalette": {
    "best": [{"name": "Navy", "hex": "#001F3F", "reason": "Perfect match"}],
    "accent": [{"name": "Gold", "hex": "#FFD700"}],
    "avoid": [{"name": "Neon", "hex": "#FF00FF"}],
    "neutrals": ["Navy", "Gray"]
  },
  "recommendations": {"necklines": ["V-neck"], "fits": ["Slim"]}
}`;

            const result = await promiseTimeout(model.generateContent([prompt, imagePart]), 45000);
            const response = await promiseTimeout(result.response, 45000);
            let responseText = response.text().trim().replace(/```json\n?/g, '').replace(/```/g, '').trim();
            styleProfile = JSON.parse(responseText);
            console.log("✅ Gemini Complete");
        } else {
            throw new Error('GEMINI_API_KEY missing');
        }

        const completeProfile = {
            physical: {
                faceShape: analysisResult.faceShapeData || analysisResult.faceShape,
                skinTone: analysisResult.skinToneData || analysisResult.skinTone,
                facialSymmetry: analysisResult.facialSymmetry || 0.85,
                ...styleProfile.physical
            },
            bodyType: styleProfile.bodyType,
            stylePersonality: styleProfile.stylePersonality,
            colorPalette: styleProfile.colorPalette,
            recommendations: styleProfile.recommendations,
            occasion,
            analyzedAt: new Date()
        };

        // Save result and user profile (existing logic)
        const newResult = new Result({
            imagePath: req.file.path,
            occasion,
            faceShape: analysisResult.faceShape,
            skinTone: analysisResult.skinTone,
            outfit: styleProfile.stylePersonality?.primary?.type || 'Casual',
            hairstyle: styleProfile.physical?.hair?.style || 'Short',
            beardStyle: styleProfile.physical?.beardStyle || 'Clean Shaven'
        });
        await newResult.save();

        // User save logic (existing)
        try {
            const userId = req.userId || 'temp-user';
            const User = require('../models/User');
            let user = await User.findOne({ email: userId });
            if (!user) {
                user = new User({
                    name: 'Guest',
                    email: userId,
                    profile: completeProfile,
                    analyses: [{
                        date: new Date(),
                        imagePath: req.file.path,
                        occasion,
                        faceShape: completeProfile.physical.faceShape.type || completeProfile.physical.faceShape,
                        skinTone: completeProfile.physical.skinTone.category || completeProfile.physical.skinTone,
                        colors: completeProfile.colorPalette.best.map(c => c.hex)
                    }]
                });
            } else {
                user.profile = completeProfile;
                user.analyses.unshift({
                    date: new Date(),
                    imagePath: req.file.path,
                    occasion,
                    faceShape: completeProfile.physical.faceShape.type || completeProfile.physical.faceShape,
                    skinTone: completeProfile.physical.skinTone.category || completeProfile.physical.skinTone,
                    colors: completeProfile.colorPalette.best.map(c => c.hex)
                });
                user.analyses = user.analyses.slice(0, 20);
            }
            await user.save();
            
            res.json({
                success: true,
                userImagePath: absoluteImagePath,
                fileSizeMB: (req.file.size/1024/1024).toFixed(1),
                imageQuality: analysisResult.imageQuality,
                profile: completeProfile,
                dashboardStats: {
                    totalAnalyses: user.analyses.length,
                    profileComplete: 90
                }
            });
        } catch (userError) {
            console.error('User save error:', userError);
            res.json({
                success: true,
                userImagePath: absoluteImagePath,
                fileSizeMB: (req.file.size/1024/1024).toFixed(1),
                imageQuality: analysisResult.imageQuality,
                profile: completeProfile,
                warning: 'Analysis saved, profile update failed'
            });
        }

    } catch (err) {
        console.error('❌ Analysis Error:', err.message);
        // Cleanup on error
        if (req.file && fs.existsSync(req.file.path)) {
            fs.unlinkSync(req.file.path);
        }
        // Specific error types
        if (err.message.includes('too large') || err.message.includes('fileSize')) {
            res.status(413).json({ error: 'Image too large (max 15MB). Please compress or try smaller image.' });
        } else if (err.message.includes('Timeout')) {
            res.status(408).json({ error: err.message + '. Try smaller image.' });
        } else {
            res.status(500).json({ error: err.message || 'Analysis failed' });
        }
    }
});

module.exports = router;
