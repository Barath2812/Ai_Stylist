
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

// Configure Multer Storage
const storage = multer.diskStorage({
    destination: (req, file, cb) => {
        cb(null, 'uploads/');
    },
    filename: (req, file, cb) => {
        cb(null, Date.now() + '-' + file.originalname);
    }
});

const upload = multer({ storage: storage });

function fileToGenerativePart(path, mimeType) {
    return {
        inlineData: {
            data: fs.readFileSync(path).toString("base64"),
            mimeType
        },
    };
}

// Removed static mock color recommendations - using Gemini AI for dynamic colors

// ============================================
// HAIRSTYLE & BEARD RECOMMENDATIONS
// ============================================
// Removed static mock style recommendations - using Gemini AI for dynamic recommendations

// ============================================
// PRODUCT SEARCH - WEB SCRAPING WITH PUPPETEER
// ============================================
const { searchProducts } = require('./puppeteerScraper');

// ============================================
// MAIN ANALYZE ROUTE
// ============================================
router.post('/analyze', upload.single('image'), async (req, res) => {
    if (!req.file) {
        return res.status(400).json({ error: 'No image uploaded' });
    }

    const { occasion } = req.body;
    const imagePath = req.file.path;
    const absoluteImagePath = path.resolve(imagePath);

    // Path to Python script
    const scriptPath = path.join(__dirname, '../python/face_analysis.py');

    console.log(`Analyzing image: ${absoluteImagePath} for occasion: ${occasion}`);

    // Direct Python spawn (bypasses port 7070 dependency)
        const pythonProcess = spawn('python', [
            path.join(__dirname, '../python/face_analysis.py'), 
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

        // Wait for Python to complete
        await new Promise((resolve, reject) => {
            pythonProcess.on('close', (code) => {
                if (code !== 0) {
                    const err = new Error(`Python exit ${code}: ${errorString}`);
                    console.error('Python Error:', err.message);
                    reject(err);
                    return;
                }
                resolve();
            });
        });
        // Parse Python JSON output once, post-spawn
        const startIdx = dataString.indexOf('{');
        const endIdx = dataString.lastIndexOf('}') + 1;
        if (startIdx === -1 || endIdx <= startIdx) {
            throw new Error('No valid JSON in Python output');
        }
        const analysisResult = JSON.parse(dataString.slice(startIdx, endIdx));
        console.log("✅ Face Analysis Complete:", analysisResult);

        if (analysisResult.error) {
            return res.status(400).json({ error: analysisResult.error });
        }

        try {
            let styleProfile = null;

            try {
                if (process.env.GEMINI_API_KEY) {
                    console.log("🤖 Calling Gemini for Deep Style Analysis...");

                    const model = genAI.getGenerativeModel({ model: "gemini-2.5-flash" });
                    const imagePart = fileToGenerativePart(imagePath, req.file.mimetype);

                    // Enhanced prompt with Python data
                    const prompt = `
You are an expert fashion stylist analyzing this person's photo.

VERIFIED PHYSICAL DATA (from precise measurements):
- Face Shape: ${analysisResult.faceShapeData?.type || analysisResult.faceShape} (${Math.round((analysisResult.faceShapeData?.confidence || 0.8) * 100)}% confidence)
- Skin Tone: ${analysisResult.skinToneData?.category || analysisResult.skinTone} with ${analysisResult.skinToneData?.undertone || 'Neutral'} undertone
- Skin Color: ${analysisResult.skinToneData?.hex || '#C68642'}
- Facial Symmetry: ${Math.round((analysisResult.facialSymmetry || 0.85) * 100)}%
- Occasion Context: ${occasion}

ANALYZE THIS IMAGE AND PR
1. BODY TYPE:
   - Category (Ectomorph/Mesomorph/Endomorph)
   - Build description
   - Shoulder type
   - Best fit recommendations

2. PHYSICAL FEATURES:
   - Hair color (exact shade)
   - Hair texture & style
   - Eye color
   - Overall appearance notes

3. STYLE PERSONALITY (with percentages):
   - Primary style (e.g., Smart Casual 60%)
   - Secondary style (e.g., Formal 30%)
   - Accent style (e.g., Streetwear 10%)
   - Fashion maturity level (Classic/Modern/Trendy)

4. COMPLETE COLOR PALETTE:
   - 5 Best colors with hex codes and reasons
   - 3 Accent colors with hex codes
   - 5 Colors to avoid with reasons
   - 4 Neutral staples

5. PERSONALIZED RECOMMENDATIONS:
   - Best necklines for face shape
   - Ideal fits for body type
   - Suggested accessories
   - Overall style direction
   - Seasonal considerations

Return ONLY valid JSON in this exact format:
{
  "bodyType": {
    "category": "Mesomorph",
    "build": "Athletic",
    "shoulders": "Broad",
    "recommendation": "Tailored and structured fits"
  },
  "physical": {
    "hair": {
      "color": "Dark Brown",
      "texture": "Straight",
      "style": "Short"
    },
    "eyes": {
      "color": "Dark Brown"
    },
    "notes": "Well-groomed, confident appearance"
  },
  "stylePersonality": {
    "primary": {"type": "Smart Casual", "percentage": 60},
    "secondary": {"type": "Formal", "percentage": 30},
    "accent": {"type": "Streetwear", "percentage": 10},
    "maturity": "Modern Classic"
  },
  "colorPalette": {
    "best": [
      {"name": "Navy Blue", "hex": "#000080", "reason": "Complements warm skin tone"},
      {"name": "Burgundy", "hex": "#800020", "reason": "Rich warm color"},
      {"name": "Forest Green", "hex": "#228B22", "reason": "Earthy, suits undertone"},
      {"name": "Cream", "hex": "#FFFDD0", "reason": "Neutral warmth"},
      {"name": "Charcoal", "hex": "#36454F", "reason": "Sophisticated base"}
    ],
    "accent": [
      {"name": "Gold", "hex": "#FFD700", "reason": "Warm metallic"},
      {"name": "Rust", "hex": "#B7410E", "reason": "Warm accent"},
      {"name": "Teal", "hex": "#008080", "reason": "Cool contrast"}
    ],
    "avoid": [
      {"name": "Neon Yellow", "hex": "#FFFF00", "reason": "Too harsh"},
      {"name": "Hot Pink", "hex": "#FF69B4", "reason": "Clashes with undertone"},
      {"name": "Pure White", "hex": "#FFFFFF", "reason": "Washes out warm skin"},
      {"name": "Orange", "hex": "#FFA500", "reason": "Too warm"},
      {"name": "Lime Green", "hex": "#00FF00", "reason": "Overwhelming"}
    ],
    "neutrals": ["Charcoal", "Tan", "Olive", "Cream"]
  },
  "recommendations": {
    "necklines": ["V-neck", "Spread collar", "Button-down"],
    "fits": ["Tailored", "Slim fit", "Structured"],
    "accessories": ["Leather watch", "Minimal jewelry", "Quality belt"],
    "direction": "Focus on quality over quantity. Invest in navy, charcoal, and cream basics. Add personality with burgundy and green pieces.",
    "seasonal": "In summer, opt for lighter fabrics in cream and navy. Winter allows for richer burgundy and forest green."
  }
}

IMPORTANT: Return ONLY the JSON, no markdown, no explanation.
                    `;

                    const result = await model.generateContent([prompt, imagePart]);
                    const response = await result.response;
                    let responseText = response.text().trim();

                    // Clean response (remove markdown if present)
                    responseText = responseText.replace(/```json\n?/g, '').replace(/```\n?/g, '').trim();

                    styleProfile = JSON.parse(responseText);
                    console.log("✅ Gemini Deep Analysis Complete!");

                } else {
                    throw new Error("GEMINI_API_KEY required for style analysis");
                }
            } catch (geminiError) {
                console.error("❌ Gemini Error:", geminiError.message);
                throw new Error(`Style analysis failed: ${geminiError.message}`);
            }

            if (!styleProfile) {
                throw new Error("No style profile generated");
            }

            // ============================================
            // COMBINE PYTHON + GEMINI DATA
            // ============================================

            const completeProfile = {
                physical: {
                    faceShape: analysisResult.faceShapeData || { type: analysisResult.faceShape, confidence: 0.8 },
                    skinTone: analysisResult.skinToneData || { category: analysisResult.skinTone, undertone: "Neutral", hex: "#C68642" },
                    facialSymmetry: analysisResult.facialSymmetry || 0.85,
                    ...styleProfile.physical  // hair, eyes, beardStyle from Gemini
                },
                bodyType: styleProfile.bodyType,
                stylePersonality: styleProfile.stylePersonality,
                colorPalette: styleProfile.colorPalette,
                recommendations: styleProfile.recommendations,
                occasion: occasion,
                analyzedAt: new Date()
            };

            // ============================================
            // SAVE TO DATABASE
            // ============================================
            const newResult = new Result({
                imagePath: req.file.path,
                occasion: occasion,
                faceShape: analysisResult.faceShape,
                skinTone: analysisResult.skinTone,
                outfit: styleProfile.stylePersonality.primary.type,
                hairstyle: styleProfile.physical.hair.style || "Short",
                beardStyle: styleProfile.physical.beardStyle || "Clean Shaven",
            });

            await newResult.save();

// ============================================
            // SAVE FULL PROFILE TO USER
            // ============================================
            try {
                const userId = req.userId || 'temp-user';
                const User = require('../models/User');
                let user = await User.findOne({ email: userId });
                
                if (!user) {
                    user = new User({
                        name: 'Guest',
                        email: userId,
                        password: 'guest123',
                        profile: completeProfile,
                        analyses: [{
                            date: new Date(),
                            imagePath: req.file.path,
                            occasion: occasion,
                            faceShape: completeProfile.physical.faceShape.type,
                            skinTone: completeProfile.physical.skinTone.category,
                            colors: completeProfile.colorPalette.best.map(c => c.hex),
                            products: null
                        }]
                    });
                } else {
                    // Update existing user
                    user.profile = completeProfile;
                    user.analyses.unshift({
                        date: new Date(),
                        imagePath: req.file.path,
                        occasion: occasion,
                        faceShape: completeProfile.physical.faceShape.type,
                        skinTone: completeProfile.physical.skinTone.category,
                        colors: completeProfile.colorPalette.best.map(c => c.hex),
                        products: null
                    });
                    // Keep only last 20 analyses
                    user.analyses = user.analyses.slice(0, 20);
                }
                
                await user.save();
                console.log('✅ Profile saved to user:', user.email);
                
                res.json({
                    success: true,
                    userImagePath: absoluteImagePath,
                    imageQuality: analysisResult.imageQuality,
                    profile: completeProfile,
                    dashboardStats: {
                        totalAnalyses: user.analyses.length,
                        profileComplete: 85
                    }
                });
            } catch (userError) {
                console.error('User save error:', userError);
                // Fallback - return analysis without user save
                res.json({
                    success: true,
                    userImagePath: absoluteImagePath,
                    imageQuality: analysisResult.imageQuality,
                    profile: completeProfile,
                    warning: 'Analysis complete but user profile save failed'
                });
            }

        } catch (err) {
            console.error('❌ Error:', err);
            res.status(500).json({
                error: 'Failed to process analysis',
                details: err.message
            });
        }
    });
;

module.exports = router;