const { chromium } = require('playwright');
const axios = require('axios');

const CACHE = new Map();

// =========================
// 🚀 Launch Browser
// =========================
async function launchBrowser() {
    return await chromium.launch({
        headless: true,
        args: ['--no-sandbox']
    });
}

// =========================
// 🔍 AJIO (PRIMARY)
// =========================
async function scrapeAjio(query, limit = 6) {
    let browser;

    try {
        browser = await launchBrowser();
        const context = await browser.newContext();
        const page = await context.newPage();

        await page.goto(`https://www.ajio.com/search/?text=${encodeURIComponent(query)}`);

        await page.waitForTimeout(4000);

        const products = await page.$$eval('.item', (cards, limit) => {
            return cards.slice(0, limit).map((card, i) => ({
                id: `ajio-${i}`,
                name: (card.querySelector('.brand')?.innerText || '') + ' ' +
                      (card.querySelector('.nameCls')?.innerText || ''),
                price: card.querySelector('.price')?.innerText,
                image: card.querySelector('img')?.src,
                buyLink: card.querySelector('a')?.href,
                source: 'Ajio'
            }));
        }, limit);

        await browser.close();
        return products;

    } catch (err) {
        console.log("❌ Ajio failed:", err.message);
        if (browser) await browser.close();
        return [];
    }
}

// =========================
// 🔍 MYNTRA (SECONDARY)
// =========================
async function scrapeMyntra(query, limit = 6) {
    let browser;

    try {
        browser = await launchBrowser();
        const context = await browser.newContext({
            userAgent: 'Mozilla/5.0',
            viewport: { width: 1366, height: 768 }
        });

        const page = await context.newPage();

        const url = `https://www.myntra.com/search?q=${encodeURIComponent(query)}`;

        await page.goto(url);
        await page.waitForTimeout(5000);

        const html = await page.content();

        if (!html.includes('product-base')) {
            console.log("⚠️ Myntra blocked");
            await browser.close();
            return [];
        }

        const products = await page.$$eval('.product-base', (cards, limit) => {
            return cards.slice(0, limit).map((card, i) => ({
                id: `myntra-${i}`,
                name:
                    (card.querySelector('.product-brand')?.innerText || '') +
                    ' ' +
                    (card.querySelector('.product-product')?.innerText || ''),
                price: card.querySelector('.product-discountedPrice')?.innerText,
                image: card.querySelector('img')?.src,
                buyLink: card.querySelector('a')?.href,
                source: 'Myntra'
            }));
        }, limit);

        await browser.close();
        return products;

    } catch (err) {
        console.log("❌ Myntra failed:", err.message);
        if (browser) await browser.close();
        return [];
    }
}

// =========================
// 🌐 FREE API (PLATZI)
// =========================
async function fetchPlatziAPI(query, limit = 6) {
    try {
        console.log("🌐 Fetching from Platzi API...");

        const res = await axios.get('https://api.escuelajs.co/api/v1/products');

        const filtered = res.data
            .filter(p => p.title.toLowerCase().includes(query.split(' ')[0]))
            .slice(0, limit)
            .map((p, i) => ({
                id: `api-${i}`,
                name: p.title,
                price: `₹${Math.floor(p.price * 80)}`, // convert USD → INR approx
                image: p.images?.[0],
                buyLink: '#',
                source: 'API'
            }));

        return filtered;

    } catch (err) {
        console.log("❌ API failed:", err.message);
        return [];
    }
}

// =========================
// 🎭 MOCK FALLBACK
// =========================
function getMockProducts(query) {
    return [{
        name: query,
        price: "₹999",
        image: "https://via.placeholder.com/300",
        source: "Mock"
    }];
}

// =========================
// 🔎 MAIN SEARCH LOGIC
// =========================
async function searchProducts(query) {

    if (CACHE.has(query)) return CACHE.get(query);

    let results = [];

    // 1️⃣ Ajio
    results = await scrapeAjio(query);

    // 2️⃣ Myntra
    if (!results.length) {
        results = await scrapeMyntra(query);
    }

    // 3️⃣ API fallback
    if (!results.length) {
        results = await fetchPlatziAPI(query);
    }

    // 4️⃣ Mock fallback
    if (!results.length) {
        results = getMockProducts(query);
    }

    CACHE.set(query, results);

    return results;
}

// =========================
// EXPORT
// =========================
module.exports = {
    searchProducts,
    scrapeMyntraWithBrowser: scrapeMyntra,
    scrapeAjioWithBrowser: scrapeAjio
};
