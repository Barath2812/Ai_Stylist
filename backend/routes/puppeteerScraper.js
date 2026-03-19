const puppeteer = require('puppeteer-extra');
const StealthPlugin = require('puppeteer-extra-plugin-stealth');
const fs = require('fs');

puppeteer.use(StealthPlugin());

console.log('hi from puppeteerScraper.js');

// ✅ Ensure cache directory exists
const CACHE_PATH = '/opt/render/.cache/puppeteer';
if (!fs.existsSync(CACHE_PATH)) {
    fs.mkdirSync(CACHE_PATH, { recursive: true });
}

const searchCache = new Map();
const CACHE_TTL = 60 * 60 * 1000;

// =========================
// 🔍 Myntra Scraper
// =========================
async function scrapeMyntraWithBrowser(searchQuery, limit = 10) {
    let browser;

    try {
        console.log(`🔍 Scraping Myntra with browser: ${searchQuery}`);

        browser = await puppeteer.launch({
            headless: true,
            args: [
                '--no-sandbox',
                '--disable-setuid-sandbox',
                '--disable-dev-shm-usage',
                '--disable-gpu'
            ]
        });

        const page = await browser.newPage();

        await page.setViewport({ width: 1920, height: 1080 });
        await page.setUserAgent(
            'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 Chrome/120.0.0.0 Safari/537.36'
        );

        const url = `https://www.myntra.com/${searchQuery.toLowerCase().replace(/\s+/g, '-')}`;

        await page.goto(url, {
            waitUntil: 'networkidle2',
            timeout: 30000
        });

        await page.waitForSelector('.product-base', { timeout: 10000 }).catch(() => {});

        const products = await page.evaluate((limit) => {
            const items = [];
            const cards = document.querySelectorAll('.product-base');

            for (let i = 0; i < Math.min(cards.length, limit); i++) {
                const card = cards[i];

                const name = card.querySelector('.product-product')?.textContent?.trim();
                const brand = card.querySelector('.product-brand')?.textContent?.trim();
                const price = card.querySelector('.product-discountedPrice')?.textContent?.trim();
                const image = card.querySelector('img')?.src;
                const link = card.querySelector('a')?.href;

                if (name && price && image) {
                    items.push({
                        id: `myntra-${Date.now()}-${i}`,
                        name: `${brand || ''} ${name}`,
                        brand,
                        price,
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
            args: ['--no-sandbox', '--disable-setuid-sandbox']
        });

        const page = await browser.newPage();

        await page.setViewport({ width: 1920, height: 1080 });
        await page.setUserAgent('Mozilla/5.0');

        const url = `https://www.ajio.com/search/?text=${encodeURIComponent(searchQuery)}`;

        await page.goto(url, {
            waitUntil: 'networkidle2',
            timeout: 30000
        });

        await page.waitForSelector('.item', { timeout: 10000 }).catch(() => {});

        const products = await page.evaluate((limit) => {
            const items = [];
            const cards = document.querySelectorAll('.item');

            for (let i = 0; i < Math.min(cards.length, limit); i++) {
                const card = cards[i];

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
// 🔎 Search Logic
// =========================
function buildSearchQuery(styleCategory, colors, occasion, gender) {
    const suffix = gender?.toLowerCase() === 'female' ? 'women' : 'men';
    const base = `shirt ${suffix}`;
    const color = colors?.[0] || '';
    return `${color} ${base}`.trim();
}

async function searchProducts(styleCategory, colors, occasion, options = {}) {
    const { limit = 12, gender = 'Male' } = options;

    const query = buildSearchQuery(styleCategory, colors, occasion, gender);

    if (searchCache.has(query)) {
        const cached = searchCache.get(query);
        if (Date.now() - cached.timestamp < CACHE_TTL) {
            return cached.data.slice(0, limit);
        }
    }

    let products = [];

    try {
        products.push(...await scrapeMyntraWithBrowser(query, 6));
    } catch {}

    if (products.length < limit) {
        try {
            products.push(...await scrapeAjioWithBrowser(query, limit - products.length));
        } catch {}
    }

    if (products.length === 0) {
        return getMockProducts(colors);
    }

    searchCache.set(query, { data: products, timestamp: Date.now() });

    return products.slice(0, limit);
}

// =========================
// 🎭 Mock fallback
// =========================
function getMockProducts(colors) {
    return [
        {
            id: 'mock-1',
            name: `${colors[0] || ''} Shirt`,
            price: '₹999',
            image: 'https://via.placeholder.com/300x400',
            source: 'Mock'
        }
    ];
}

module.exports = {
    searchProducts,
    scrapeMyntraWithBrowser,
    scrapeAjioWithBrowser
};
