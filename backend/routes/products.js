const express = require('express');
const router = express.Router();
const { scrapeMyntraWithBrowser, scrapeAjioWithBrowser } = require('./puppeteerScraper');

// Helper to determine product searches based on profile
function generateSearchQueries(profile) {
    const styleType = profile?.stylePersonality?.primary?.type?.toLowerCase() || 'casual';
    const topColor = profile?.colorPalette?.best?.[0]?.name?.toLowerCase() || 'black';
    const accentColor = profile?.colorPalette?.accent?.[0]?.name?.toLowerCase() || 'silver';

    let categoryContext = 'casual';
    if (styleType.includes('formal') || styleType.includes('business')) categoryContext = 'formal';
    if (styleType.includes('street')) categoryContext = 'streetwear';
    if (styleType.includes('party')) categoryContext = 'party';

    return {
        shirt: `${topColor} ${categoryContext} shirt men`,
        pant: `black ${categoryContext} trousers men`,  // Defaulting to black/dark for pants as a safe base
        shoes: `${categoryContext} shoes men`,
        watch: `${accentColor} analog watch men`,
        accessories: `${categoryContext} belt men`
    };
}

// Fallback mock function per category
function getMockCategory(category, query) {
    const images = {
        shirt: 'https://images.unsplash.com/photo-1596755094514-f87e32f85e2c?w=500&q=80',
        pant: 'https://images.unsplash.com/photo-1624378439575-d8705ad7ae80?w=500&q=80',
        shoes: 'https://images.unsplash.com/photo-1614252235316-0205888258dc?w=500&q=80',
        watch: 'https://images.unsplash.com/photo-1524592094714-0f0654e20314?w=500&q=80',
        accessories: 'https://images.unsplash.com/photo-1624222247344-550fb60583dc?w=500&q=80'
    };

    return Array(4).fill(0).map((_, i) => ({
        id: `mock-${category}-${Date.now()}-${i}`,
        name: `Premium ${query.split(' ').map(w => w.charAt(0).toUpperCase() + w.slice(1)).join(' ')}`,
        brand: 'AI Stylist Essentials',
        price: `₹${Math.floor(Math.random() * 3000) + 999}`,
        originalPrice: `₹${Math.floor(Math.random() * 3000) + 4000}`,
        discount: '40% OFF',
        image: images[category],
        buyLink: '#',
        category: category,
        source: 'Curated'
    }));
}

router.post('/recommendations', async (req, res) => {
    try {
        const { profile } = req.body;
        if (!profile) {
            return res.status(400).json({ error: 'Profile data is required' });
        }

        console.log("👗 Starting targeted product generation based on AI profile...");
        const queries = generateSearchQueries(profile);

        const results = {
            shirt: [],
            pant: [],
            shoes: [],
            watch: [],
            accessories: []
        };

        // For speed and stability, we'll run 2 parallel scrapes at most, or use focused Myntra scraping
        // To avoid timeout (since Puppeteer is slow), we might want to just scrape 2-3 items per category.
        // We will do seqential execution to not crash the browser instances.

        for (const [category, query] of Object.entries(queries)) {
            console.log(`\n🔍 Searching for ${category}: "${query}"`);

            try {
                // Limit to 4 items per category for the results page
                const scraped = await scrapeMyntraWithBrowser(query, 4);

                if (scraped && scraped.length > 0) {
                    results[category] = scraped;
                } else {
                    console.log(`⚠️ No results for ${category}, using curated fallback.`);
                    results[category] = getMockCategory(category, query);
                }
            } catch (err) {
                console.error(`❌ Scraping failed for ${category}:`, err.message);
                results[category] = getMockCategory(category, query);
            }
        }

        res.json({
            success: true,
            products: results,
            message: "Products successfully curated."
        });

    } catch (error) {
        console.error('Error fetching product recommendations:', error);
        res.status(500).json({ error: 'Failed to fetch recommendations' });
    }
});

module.exports = router;
