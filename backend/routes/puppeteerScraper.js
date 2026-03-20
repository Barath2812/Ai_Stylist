const puppeteer = require('puppeteer-extra');
const StealthPlugin = require('puppeteer-extra-plugin-stealth');

puppeteer.use(StealthPlugin());

const CACHE = new Map();

async function launchBrowser() {
    return await puppeteer.launch({
        headless: true,
        executablePath: process.env.PUPPETEER_EXECUTABLE_PATH || '/usr/bin/google-chrome',
        args: [
            '--no-sandbox',
            '--disable-setuid-sandbox',
            '--disable-dev-shm-usage',
            '--disable-gpu',
            '--single-process',
            '--no-zygote'
        ]
    });
}

// =========================
// 🔍 Myntra Scraper
// =========================
async function scrapeMyntra(query, limit = 6) {
    let browser;

    try {
        console.log("🔍 Myntra:", query);

        browser = await launchBrowser();
        const page = await browser.newPage();

        await page.setUserAgent(
            'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 Chrome/120 Safari/537.36'
        );

        await page.setViewport({ width: 1366, height: 768 });

        const url = `https://www.myntra.com/${query.replace(/\s+/g, '-')}`;

        await page.goto(url, { waitUntil: 'domcontentloaded', timeout: 60000 });

        await page.waitForTimeout(4000);

        await page.evaluate(() => window.scrollBy(0, window.innerHeight));

        await page.waitForSelector('.product-base', { timeout: 15000 });

        const products = await page.evaluate((limit) => {
            const data = [];
            const cards = document.querySelectorAll('.product-base');

            cards.forEach((card, i) => {
                if (i >= limit) return;

                const name = card.querySelector('.product-product')?.innerText;
                const brand = card.querySelector('.product-brand')?.innerText;
                const price = card.querySelector('.product-discountedPrice')?.innerText;
                const image = card.querySelector('img')?.src;
                const link = card.querySelector('a')?.href;

                if (name && price) {
                    data.push({
                        id: `myntra-${i}`,
                        name: `${brand || ''} ${name}`,
                        price,
                        image,
                        buyLink: link,
                        source: "Myntra"
                    });
                }
            });

            return data;
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

        await page.setUserAgent('Mozilla/5.0');

        const url = `https://www.ajio.com/search/?text=${encodeURIComponent(query)}`;

        await page.goto(url, { waitUntil: 'domcontentloaded' });

        await page.waitForTimeout(4000);

        await page.waitForSelector('.item', { timeout: 15000 });

        const products = await page.evaluate((limit) => {
            const data = [];
            const cards = document.querySelectorAll('.item');

            cards.forEach((card, i) => {
                if (i >= limit) return;

                const name = card.querySelector('.nameCls')?.innerText;
                const brand = card.querySelector('.brand')?.innerText;
                const price = card.querySelector('.price')?.innerText;
                const image = card.querySelector('img')?.src;
                const link = card.querySelector('a')?.href;

                if (name && price) {
                    data.push({
                        id: `ajio-${i}`,
                        name: `${brand || ''} ${name}`,
                        price,
                        image,
                        buyLink: link,
                        source: "Ajio"
                    });
                }
            });

            return data;
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
            name: "Sample Shirt",
            price: "₹999",
            image: "https://via.placeholder.com/300",
            source: "Mock"
        }];
    }

    CACHE.set(query, results);

    return results;
}

module.exports = { searchProducts };
