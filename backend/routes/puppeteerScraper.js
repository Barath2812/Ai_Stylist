const { chromium } = require('playwright');

const CACHE = new Map();

// =========================
// 🚀 Launch Browser
// =========================
async function launchBrowser() {
    return await chromium.launch({
        headless: true,
        args: ['--no-sandbox',
              '--disable-setuid-sandbox',
            '--disable-blink-features=AutomationControlled']
    });
}

// =========================
// 🔍 Myntra Scraper
// =========================
async function scrapeMyntra(query, limit = 6) {
    let browser;

    try {
        browser = await launchBrowser();

        const context = await browser.newContext({
            userAgent: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 Chrome/120 Safari/537.36',
            viewport: { width: 1366, height: 768 },
            locale: 'en-US'
        });

        const page = await context.newPage();

        await page.setExtraHTTPHeaders({
            'accept-language': 'en-US,en;q=0.9'
        });

        const url = `https://www.myntra.com/${query.replace(/\s+/g, '-')}`;

        await page.goto(url, { waitUntil: 'domcontentloaded', timeout: 60000 });

        await page.waitForTimeout(5000);

        await page.mouse.wheel(0, 2000);

        await page.waitForTimeout(2000);

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
// 🔍 Ajio Scraper
// =========================
async function scrapeAjio(query, limit = 6) {
    let browser;

    try {
        console.log("🔍 Ajio:", query);

        browser = await launchBrowser();
        const page = await browser.newPage();

        await page.goto(`https://www.ajio.com/search/?text=${encodeURIComponent(query)}`);

        await page.waitForTimeout(4000);

        await page.waitForSelector('.item', { timeout: 15000 });

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
// 🔎 Main Search
// =========================
async function searchProducts(query) {

    if (CACHE.has(query)) return CACHE.get(query);

    let results = [];

    results.push(...await scrapeMyntra(query));

    if (results.length < 10) {
        results.push(...await scrapeAjio(query));
    }

    if (results.length === 0) {
        results = [{
            name: "Sample Product",
            price: "₹999",
            image: "https://via.placeholder.com/300",
            source: "Mock"
        }];
    }

    CACHE.set(query, results);

    return results;
}

// ✅ Export (important)
module.exports = {
    searchProducts,
    scrapeMyntraWithBrowser: scrapeMyntra,
    scrapeAjioWithBrowser: scrapeAjio
};
