const puppeteer = require('puppeteer');

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

        // Set realistic viewport and user agent
        await page.setViewport({ width: 1920, height: 1080 });
        await page.setUserAgent('Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36');

        const url = `https://www.myntra.com/${searchQuery.toLowerCase().replace(/\s+/g, '-')}`;

        // Go to page and wait for content
        await page.goto(url, {
            waitUntil: 'networkidle2',
            timeout: 30000
        });

        // Wait for product grid to load
        await page.waitForSelector('.product-base', { timeout: 10000 }).catch(() => {
            console.log('Product grid not found, trying alternative selectors...');
        });

        // Extract product data
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

        // Wait for products
        await page.waitForSelector('.item', { timeout: 10000 }).catch(() => {
            console.log('Ajio products not found');
        });

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

function buildSearchQuery(styleCategory, colors, occasion) {
    const categoryMap = {
        'Formal Business Attire': 'formal shirt men',
        'Smart Casual': 'casual shirt men',
        'Casual Streetwear': 'tshirt men',
        'Party Evening Wear': 'party shirt men',
        'Traditional Ethnic': 'kurta men',
        'Sporty Athletic': 'sports tshirt men'
    };

    const baseQuery = categoryMap[styleCategory] || 'shirt men';
    const color = colors[0]?.toLowerCase() || '';

    return `${color} ${baseQuery}`;
}


async function searchProducts(styleCategory, colors, occasion, options = {}) {
    const { limit = 12 } = options;

    console.log(`\n🛍️ Starting product search...`);
    console.log(`Style: ${styleCategory}, Colors: ${colors.join(', ')}`);

    const searchQuery = buildSearchQuery(styleCategory, colors, occasion);
    console.log(`📝 Search Query: "${searchQuery}"\n`);

    let allProducts = [];

    // Try Myntra with Puppeteer
    try {
        const myntraProducts = await scrapeMyntraWithBrowser(searchQuery, Math.ceil(limit / 2));
        allProducts = [...allProducts, ...myntraProducts];
    } catch (e) {
        console.log('Myntra failed, continuing...');
    }

    // Try Ajio if not enough products
    if (allProducts.length < limit) {
        try {
            const ajioProducts = await scrapeAjioWithBrowser(searchQuery, limit - allProducts.length);
            allProducts = [...allProducts, ...ajioProducts];
        } catch (e) {
            console.log('Ajio failed, continuing...');
        }
    }

    // Fallback to mock data
    if (allProducts.length === 0) {
        console.log('⚠️ All scraping failed, using mock data');
        return getMockProducts(styleCategory, colors);
    }

    console.log(`\n✅ Total: ${allProducts.length} products found\n`);
    return allProducts.slice(0, limit);
}


function detectCategory(productName) {
    const nameLower = productName.toLowerCase();

    // Top/Upper body
    if (nameLower.match(/shirt|tshirt|t-shirt|polo|blouse|top|sweater|hoodie|jacket|blazer|coat|kurta/)) {
        return 'top';
    }

    // Bottom/Lower body
    if (nameLower.match(/pant|jeans|trouser|chino|short|skirt|legging|jogger|track|pajama/)) {
        return 'bottom';
    }

    // Shoes/Footwear
    if (nameLower.match(/shoe|sneaker|boot|sandal|slipper|loafer|oxford|formal shoe|casual shoe/)) {
        return 'shoes';
    }

    // Accessories
    if (nameLower.match(/watch|belt|wallet|bag|cap|hat|sunglasses|tie|bow|scarf|glove/)) {
        return 'accessories';
    }

    // Default to top if unclear
    return 'top';
}

// ============================================
// OUTFIT BUILDER SEARCH (SIMPLE QUERY)
// ============================================
async function searchForOutfitBuilder(query, options = {}) {
    const { limit = 10, category = null } = options;

    console.log(`\n🎨 Outfit Builder Search: "${query}"`);
    if (category) console.log(`📂 Category Filter: ${category}`);

    let allProducts = [];

    // Try Myntra
    try {
        const myntraProducts = await scrapeMyntraWithBrowser(query, Math.ceil(limit / 2));

        // Add category detection
        const categorized = myntraProducts.map(product => ({
            ...product,
            category: category || detectCategory(product.name)
        }));

        allProducts = [...allProducts, ...categorized];
    } catch (e) {
        console.log('Myntra failed, continuing...');
    }

    // Try Ajio if we need more
    if (allProducts.length < limit) {
        try {
            const ajioProducts = await scrapeAjioWithBrowser(query, limit - allProducts.length);

            // Add category detection
            const categorized = ajioProducts.map(product => ({
                ...product,
                category: category || detectCategory(product.name)
            }));

            allProducts = [...allProducts, ...categorized];
        } catch (e) {
            console.log('Ajio failed, continuing...');
        }
    }

    // Filter by category if specified
    if (category) {
        allProducts = allProducts.filter(p => p.category === category);
    }

    // Fallback to enhanced mock data if empty
    if (allProducts.length === 0) {
        console.log('⚠️ Scraping failed, using mock data');
        return getOutfitMockData(query, category);
    }

    console.log(`✅ Found ${allProducts.length} products for outfit builder\n`);
    return allProducts.slice(0, limit);
}

// ============================================
// ENHANCED MOCK DATA FOR OUTFIT BUILDER
// ============================================
function getOutfitMockData(query, category = null) {
    const mockProducts = [
        // Tops
        {
            id: 'mock-top-1',
            name: 'Blue Formal Shirt',
            brand: 'Peter England',
            price: '₹1,299',
            image: 'https://via.placeholder.com/300x400/4A90E2/FFFFFF?text=Blue+Shirt',
            buyLink: 'https://www.myntra.com',
            category: 'top',
            source: 'Mock'
        },
        {
            id: 'mock-top-2',
            name: 'White Casual Shirt',
            brand: 'Allen Solly',
            price: '₹999',
            image: 'https://via.placeholder.com/300x400/FFFFFF/000000?text=White+Shirt',
            buyLink: 'https://www.myntra.com',
            category: 'top',
            source: 'Mock'
        },
        // Bottoms
        {
            id: 'mock-bottom-1',
            name: 'Black Formal Trousers',
            brand: 'Louis Philippe',
            price: '₹1,799',
            image: 'https://via.placeholder.com/300x400/000000/FFFFFF?text=Black+Pants',
            buyLink: 'https://www.myntra.com',
            category: 'bottom',
            source: 'Mock'
        },
        {
            id: 'mock-bottom-2',
            name: 'Cream Chinos',
            brand: 'US Polo',
            price: '₹1,499',
            image: 'https://via.placeholder.com/300x400/F5DEB3/000000?text=Cream+Chinos',
            buyLink: 'https://www.myntra.com',
            category: 'bottom',
            source: 'Mock'
        },
        // Shoes
        {
            id: 'mock-shoes-1',
            name: 'Brown Leather Shoes',
            brand: 'Clarks',
            price: '₹3,999',
            image: 'https://via.placeholder.com/300x400/8B4513/FFFFFF?text=Brown+Shoes',
            buyLink: 'https://www.myntra.com',
            category: 'shoes',
            source: 'Mock'
        },
        {
            id: 'mock-shoes-2',
            name: 'White Sneakers',
            brand: 'Nike',
            price: '₹4,999',
            image: 'https://via.placeholder.com/300x400/FFFFFF/000000?text=White+Sneakers',
            buyLink: 'https://www.myntra.com',
            category: 'shoes',
            source: 'Mock'
        },
        // Accessories
        {
            id: 'mock-acc-1',
            name: 'Silver Watch',
            brand: 'Titan',
            price: '₹5,999',
            image: 'https://via.placeholder.com/300x400/C0C0C0/000000?text=Silver+Watch',
            buyLink: 'https://www.myntra.com',
            category: 'accessories',
            source: 'Mock'
        },
        {
            id: 'mock-acc-2',
            name: 'Leather Belt',
            brand: 'Woodland',
            price: '₹899',
            image: 'https://via.placeholder.com/300x400/654321/FFFFFF?text=Leather+Belt',
            buyLink: 'https://www.myntra.com',
            category: 'accessories',
            source: 'Mock'
        }
    ];

    // Filter by category if specified
    if (category) {
        return mockProducts.filter(p => p.category === category);
    }

    return mockProducts;
}

module.exports = {
    searchProducts,
    scrapeMyntraWithBrowser,
    scrapeAjioWithBrowser,
    searchForOutfitBuilder,  
    detectCategory            
};