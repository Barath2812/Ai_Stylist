const puppeteer = require('puppeteer-extra');
const StealthPlugin = require('puppeteer-extra-plugin-stealth');
puppeteer.use(StealthPlugin());

console.log('hi from puppeteerScraper.js');

const searchCache = new Map();
const CACHE_TTL = 60 * 60 * 1000;

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
                '--disable-accelerated-2d-canvas',
                '--disable-gpu'
            ]
        });
        
        const page = await browser.newPage();
        
        await page.setViewport({ width: 1920, height: 1080 });
        await page.setUserAgent('Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36');
        
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
                        brand: brand,
                        price: price,
                        originalPrice: originalPrice,
                        discount: discount,
                        image: image,
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
                        brand: brand,
                        price: price,
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
    const color = colors && colors.length > 0 && colors[0] ? colors[0].toLowerCase() : '';
    
    return `${color} ${baseQuery}`.trim();
}

async function searchProducts(styleCategory, colors, occasion, options = {}) {
    const { limit = 12, gender = 'Male' } = options;
    
    console.log(`\n🛍️ Starting product search...`);
    console.log(`Style: ${styleCategory}, Colors: ${colors.join(', ')}, Gender: ${gender}`);
    
    const searchQuery = buildSearchQuery(styleCategory, colors, occasion, gender);
    console.log(`📝 Search Query: "${searchQuery}"\n`);
    
    if (searchCache.has(searchQuery)) {
        const cachedItem = searchCache.get(searchQuery);
        if (Date.now() - cachedItem.timestamp < CACHE_TTL) {
            console.log('⚡ Serving from cache');
            return cachedItem.data.slice(0, limit);
        }
        searchCache.delete(searchQuery);
    }

    let allProducts = [];
    
    try {
        const myntraProducts = await scrapeMyntraWithBrowser(searchQuery, Math.ceil(limit / 2));
        allProducts = [...allProducts, ...myntraProducts];
    } catch (e) {}
    
    if (allProducts.length < limit) {
        try {
            const ajioProducts = await scrapeAjioWithBrowser(searchQuery, limit - allProducts.length);
            allProducts = [...allProducts, ...ajioProducts];
        } catch (e) {}
    }
    
    if (allProducts.length === 0) {
        return getMockProducts(styleCategory, colors, gender);
    }
    
    searchCache.set(searchQuery, {
        data: allProducts,
        timestamp: Date.now()
    });

    console.log(`\n✅ Total: ${allProducts.length} products found\n`);
    return allProducts.slice(0, limit);
}

function getMockProducts(styleCategory, colors, gender) {
    const isFemale = gender && gender.toLowerCase() === 'female';
    const item1 = isFemale ? 'Top' : 'Shirt';
    const item2 = isFemale ? 'Dress' : 'Premium Blazer';

    return [
        {
            id: 'mock-1',
            name: `${colors[0]} ${styleCategory} ${item1}`,
            brand: 'Generic Brand',
            price: '₹1,299',
            image: 'https://via.placeholder.com/300x400?text=Product+1',
            buyLink: 'https://www.myntra.com',
            category: 'upper_body',
            source: 'Mock'
        },
        {
            id: 'mock-2',
            name: `${colors[1]} ${item2}`,
            brand: 'Generic Brand',
            price: '₹3,499',
            image: 'https://via.placeholder.com/300x400?text=Product+2',
            buyLink: 'https://www.myntra.com',
            category: 'upper_body',
            source: 'Mock'
        },
        {
            id: 'mock-3',
            name: `${colors[0]} Complete Outfit`,
            brand: 'Generic Brand',
            price: '₹5,999',
            image: 'https://via.placeholder.com/300x400?text=Product+3',
            buyLink: 'https://www.myntra.com',
            category: 'full_body',
            source: 'Mock'
        }
    ];
}

module.exports = {
    searchProducts,
    scrapeMyntraWithBrowser,
    scrapeAjioWithBrowser
};