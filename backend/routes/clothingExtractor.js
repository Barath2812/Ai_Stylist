const express = require('express');
const router = express.Router();
const { exec } = require('child_process');
const path = require('path');
const fs = require('fs');
const https = require('https');
const http = require('http');
const { promisify } = require('util');

const execAsync = promisify(exec);

// Download image from URL
async function downloadImage(url, filepath) {
    return new Promise((resolve, reject) => {
        const protocol = url.startsWith('https') ? https : http;
        const file = fs.createWriteStream(filepath);

        protocol.get(url, (response) => {
            response.pipe(file);
            file.on('finish', () => {
                file.close();
                resolve(filepath);
            });
        }).on('error', (err) => {
            fs.unlink(filepath, () => { });
            reject(err);
        });
    });
}

// @route   POST /api/clothing/extract
// @desc    Extract clothing from product image
// @access  Public (for now)
router.post('/extract', async (req, res) => {
    try {
        const { imageUrl, productId } = req.body;

        if (!imageUrl) {
            return res.status(400).json({
                success: false,
                error: 'Image URL is required'
            });
        }

        console.log(`ðŸŽ¨ Extracting clothing from: ${imageUrl}`);

        // Create temp directories
        const tempDir = path.join(__dirname, '../temp');
        const outputDir = path.join(__dirname, '../uploads/extracted');

        if (!fs.existsSync(tempDir)) {
            fs.mkdirSync(tempDir, { recursive: true });
        }
        if (!fs.existsSync(outputDir)) {
            fs.mkdirSync(outputDir, { recursive: true });
        }

        // Generate unique filename
        const timestamp = Date.now();
        const inputPath = path.join(tempDir, `input_${timestamp}.jpg`);
        const outputPath = path.join(outputDir, `extracted_${timestamp}.png`);

        // Download image
        console.log('ðŸ“¥ Downloading image...');
        await downloadImage(imageUrl, inputPath);

        // Run Python extraction script
        console.log('ðŸ”§ Running clothing extraction...');
        const pythonScript = path.join(__dirname, '../python/clothing_extractor.py');
        const command = `python "${pythonScript}" "${inputPath}" "${outputPath}"`;

        const { stdout, stderr } = await execAsync(command);

        if (stderr) {
            console.log('Python stderr:', stderr);
        }

        // Parse result
        const result = JSON.parse(stdout);

        if (!result.success) {
            throw new Error(result.error);
        }

        // Clean up input file
        fs.unlinkSync(inputPath);

        // Generate URL for extracted image
        const extractedImageUrl = `/uploads/extracted/${path.basename(outputPath)}`;

        console.log('âœ… Clothing extracted successfully!');

        res.json({
            success: true,
            originalImage: imageUrl,
            extractedImage: `https://ai-stylist-6l22.onrender.com${extractedImageUrl}`,
            extractedPath: outputPath,
            method: result.method
        });

    } catch (error) {
        console.error('âŒ Clothing extraction error:', error);
        res.status(500).json({
            success: false,
            error: 'Failed to extract clothing from image',
            details: error.message
        });
    }
});

// @route   POST /api/clothing/extract-batch
// @desc    Extract clothing from multiple images
// @access  Public
router.post('/extract-batch', async (req, res) => {
    try {
        const { images } = req.body; // Array of {imageUrl, productId}

        if (!images || !Array.isArray(images)) {
            return res.status(400).json({
                success: false,
                error: 'Images array is required'
            });
        }

        console.log(`ðŸŽ¨ Batch extracting ${images.length} images...`);

        const results = [];

        for (const img of images) {
            try {
                const tempDir = path.join(__dirname, '../temp');
                const outputDir = path.join(__dirname, '../uploads/extracted');

                if (!fs.existsSync(tempDir)) {
                    fs.mkdirSync(tempDir, { recursive: true });
                }
                if (!fs.existsSync(outputDir)) {
                    fs.mkdirSync(outputDir, { recursive: true });
                }

                const timestamp = Date.now() + Math.random();
                const inputPath = path.join(tempDir, `input_${timestamp}.jpg`);
                const outputPath = path.join(outputDir, `extracted_${timestamp}.png`);

                await downloadImage(img.imageUrl, inputPath);

                const pythonScript = path.join(__dirname, '../python/clothing_extractor.py');
                const command = `python "${pythonScript}" "${inputPath}" "${outputPath}"`;

                const { stdout } = await execAsync(command);
                const result = JSON.parse(stdout);

                fs.unlinkSync(inputPath);

                if (result.success) {
                    const extractedImageUrl = `/uploads/extracted/${path.basename(outputPath)}`;
                    results.push({
                        productId: img.productId,
                        success: true,
                        extractedImage: `https://ai-stylist-6l22.onrender.com${extractedImageUrl}`
                    });
                } else {
                    results.push({
                        productId: img.productId,
                        success: false,
                        error: result.error
                    });
                }

            } catch (error) {
                results.push({
                    productId: img.productId,
                    success: false,
                    error: error.message
                });
            }
        }

        console.log(`âœ… Batch extraction complete: ${results.filter(r => r.success).length}/${images.length} successful`);

        res.json({
            success: true,
            results: results
        });

    } catch (error) {
        console.error('âŒ Batch extraction error:', error);
        res.status(500).json({
            success: false,
            error: 'Failed to process batch extraction'
        });
    }
});

module.exports = router;
