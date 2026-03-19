const puppeteer = require('puppeteer-extra');
const StealthPlugin = require('puppeteer-extra-plugin-stealth');
const fs = require('fs');

puppeteer.use(StealthPlugin());

console.log('hi from puppeteerScraper.js');

// ✅ Ensure Puppeteer cache directory exists (important for Render)
const CACHE_PATH = '/opt/render/.cache/puppeteer';
if (!fs.existsSync(CACHE_PATH)) {
    fs.mkdirSync(CACHE_PATH, { recursive: true });
}

const searchCache = new Map();
const CACHE_TTL = 60 * 60 * 1000;

// ✅ Helper to get executable path safely
function getChromePath() {
    if (process.env.PUPPETEER_EXECUTABLE_PATH) {
        return process.env.PUPPETEER_EXECUTABLE_PATH;
    }

    // fallback path (auto-installed chrome)
    return undefined; 
}

// =========================
// 🔍 Myntra Scraper
// =========================
async function scrapeMyntraWithBrowser(searchQuery, limit = 10) {
    let browser;

    try {
        console.log(`🔍 Scraping Myntra with browser: ${searchQuery}`);

        browser = await puppeteer.launch({
            headless: true,
            executablePath: getChromePath(), // ✅ FIX
            args: [
                '--no-sandbox',
                '--disable-setuid-sandbox',
                '--disable-dev-shm-usage',
                '--disable-accelerated-2d-canvas',
                '--disable-gpu'
            ]
        });

        const page = await browser.newPage();

        await page.setViewport({ width: 1920, height: 1080 });
        await page.setUserAgent(
            'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 ' +
            '(KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36'
        );

        const url = `https://www.myntra.com/${searchQuery.toLowerCase().replace(/\s+/g, '-')}`;

        await page.goto(url, {
            waitUntil: 'networkidle2',
            timeout: 30000
        });

        await page.waitForSelector('.product-base', { timeout: 10000 }).catch(() => {});

        const products = await page.evaluate((limit) => {
            const items = [];
            const productCards = document.querySelectorAll('.product-base');

            for (let i = 0; i < Math.min(productCards.length, limit); i++) {
                const card = productCards[i];

                const name = card.querySelector('.product-product')?.textContent?.trim();
                const brand = card.querySelector('.product-brand')?.textContent?.trim();
                const price = card.querySelector('.product-discountedPrice')?.textContent?.trim();
                const originalPrice = card.querySelector('.product-strike')?.textContent?.trim();
                const discount = card.querySelector('.product-discountPercentage')?.textContent?.trim();
                const image = card.querySelector('img')?.src;
                const link = card.querySelector('a')?.href;

                if (name && price && image) {
                    items.push({
                        id: `myntra-${Date.now()}-${i}`,
                        name: `${brand || ''} ${name}`,
                        brand,
                        price,
                        originalPrice,
                        discount,
                        image,
                        buyLink: link,
                        category: 'upper_body',
                        source: 'Myntra'
                    });
                }
            }

            return items;
        }, limit);

        await browser.close();

        console.log(`✅ Myntra: Found ${products.length} products`);
        return products;

    } catch (error) {
        console.error('❌ Myntra browser scraping failed:', error.message);
        if (browser) await browser.close();
        return [];
    }
}

// =========================
// 🔍 Ajio Scraper
// =========================
async function scrapeAjioWithBrowser(searchQuery, limit = 10) {
    let browser;

    try {
        console.log(`🔍 Scraping Ajio with browser: ${searchQuery}`);

        browser = await puppeteer.launch({
            headless: true,
            executablePath: getChromePath(), // ✅ FIX
            args: ['--no-sandbox', '--disable-setuid-sandbox']
        });

        const page = await browser.newPage();

        await page.setViewport({ width: 1920, height: 1080 });
        await page.setUserAgent('Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36');

        const url = `https://www.ajio.com/search/?text=${encodeURIComponent(searchQuery)}`;

        await page.goto(url, {
            waitUntil: 'networkidle2',
            timeout: 30000
        });

        await page.waitForSelector('.item', { timeout: 10000 }).catch(() => {});

        const products = await page.evaluate((limit) => {
            const items = [];
            const productCards = document.querySelectorAll('.item');

            for (let i = 0; i < Math.min(productCards.length, limit); i++) {
                const card = productCards[i];

                const name = card.querySelector('.nameCls')?.textContent?.trim();
                const brand = card.querySelector('.brand')?.textContent?.trim();
                const price = card.querySelector('.price')?.textContent?.trim();
                const image = card.querySelector('img')?.src;
                const link = card.querySelector('a')?.href;

                if (name && price) {
                    items.push({
                        id: `ajio-${Date.now()}-${i}`,
                        name: `${brand || ''} ${name}`,
                        brand,
                        price,
                        image: image?.startsWith('http') ? image : `https:${image}`,
                        buyLink: link,
                        category: 'upper_body',
                        source: 'Ajio'
                    });
                }
            }

            return items;
        }, limit);

        await browser.close();

        console.log(`✅ Ajio: Found ${products.length} products`);
        return products;

    } catch (error) {
        console.error('❌ Ajio browser scraping failed:', error.message);
        if (browser) await browser.close();
        return [];
    }
}

// =========================
// 🔎 Query Builder + Search
// =========================

function buildSearchQuery(styleCategory, colors, occasion, gender) {
    const isFemale = gender && gender.toLowerCase() === 'female';
    const suffix = isFemale ? 'women' : 'men';

    const categoryMap = {
        'Formal Business Attire': isFemale ? 'formal shirt women' : 'formal shirt men',
        'Smart Casual': isFemale ? 'casual top women' : 'casual shirt men',
        'Casual Streetwear': isFemale ? 'tshirt women' : 'tshirt men',
        'Party Evening Wear': isFemale ? 'party dress women' : 'party shirt men',
        'Traditional Ethnic': isFemale ? 'kurti women' : 'kurta men',
        'Sporty Athletic': isFemale ? 'sports tshirt women' : 'sports tshirt men'
    };

    const baseQuery = categoryMap[styleCategory] || `shirt ${suffix}`;
    const color = colors?.[0]?.toLowerCase() || '';

    return `${color} ${baseQuery}`.trim();
}

async function searchProducts(styleCategory, colors, occasion, options = {}) {
    const { limit = 12, gender = 'Male' } = options;

    const searchQuery = buildSearchQuery(styleCategory, colors, occasion, gender);

    if (searchCache.has(searchQuery)) {
        const cached = searchCache.get(searchQuery);
        if (Date.now() - cached.timestamp < CACHE_TTL) {
            return cached.data.slice(0, limit);
        }
        searchCache.delete(searchQuery);
    }

    let allProducts = [];

    try {
        const myntra = await scrapeMyntraWithBrowser(searchQuery, Math.ceil(limit / 2));
        allProducts.push(...myntra);
    } catch {}

    if (allProducts.length < limit) {
        try {
            const ajio = await scrapeAjioWithBrowser(searchQuery, limit - allProducts.length);
            allProducts.push(...ajio);
        } catch {}
    }

    if (allProducts.length === 0) {
        return getMockProducts(styleCategory, colors, gender);
    }

    searchCache.set(searchQuery, {
        data: allProducts,
        timestamp: Date.now()
    });

    return allProducts.slice(0, limit);
}

// =========================
// 🎭 Fallback Products
// =========================

function getMockProducts(styleCategory, colors, gender) {
    const isFemale = gender?.toLowerCase() === 'female';
    const item1 = isFemale ? 'Top' : 'Shirt';
    const item2 = isFemale ? 'Dress' : 'Blazer';

    return [
        {
            id: 'mock-1',
            name: `${colors[0]} ${styleCategory} ${item1}`,
            brand: 'Generic',
            price: '₹1,299',
            image: 'https://via.placeholder.com/300x400',
            buyLink: '#',
            category: 'upper_body',
            source: 'Mock'
        }
    ];
}

module.exports = {
    searchProducts,
    scrapeMyntraWithBrowser,
    scrapeAjioWithBrowser
};
