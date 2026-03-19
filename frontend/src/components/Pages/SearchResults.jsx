import { useState, useEffect } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import api from '../../api/axios';
import './SearchResults.css';

const SearchResults = () => {
    const [searchParams] = useSearchParams();
    const navigate = useNavigate();
    const query = searchParams.get('q');

    const [products, setProducts] = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState('');

    useEffect(() => {
        if (query) {
            searchProducts();
        }
    }, [query]);

    const searchProducts = async () => {
        const cachedResults = sessionStorage.getItem(`search_${query}`);
        if (cachedResults) {
            setProducts(JSON.parse(cachedResults));
            setLoading(false);
            return;
        }

        try {
            setLoading(true);
            setError('');

            const response = await api.get('/outfits/search', {
                params: { query, limit: 20 }
            });
            
            if (response.data.success) {
                setProducts(response.data.products);
                sessionStorage.setItem(`search_${query}`, JSON.stringify(response.data.products));
            }
        } catch (err) {
            console.error('Search error:', err);
            setError('Failed to search products. Please try again.');
        } finally {
            setLoading(false);
        }
    };

    const tryOutfitMatcher = (product) => {
        navigate('/dashboard/outfits', {
            state: { preSelected: product }
        });
    };

    const handleVirtualTryOn = (product) => {
        navigate('/dashboard/tryon', {
            state: { prefilledGarmentUrl: product.image } 
        });
    };

    return (
        <div className="search-page">
            <div className="search-page-header">
                <h1>Search Results</h1>
                {query && <p className="search-query-display">Showing results for: "<span>{query}</span>"</p>}
            </div>

            {loading && (
                <div className="search-loading">
                    <div className="loader">Searching products...</div>
                </div>
            )}

            {error && (
                <div className="error-state">
                    <p>{error}</p>
                    <button onClick={searchProducts}>Try Again</button>
                </div>
            )}

            {!loading && !error && products.length === 0 && (
                <div className="search-empty">
                    <span className="empty-icon">🔍</span>
                    <h3>No products found</h3>
                    <p>Try searching with different keywords</p>
                </div>
            )}

            {!loading && !error && products.length > 0 && (
                <div className="search-results-grid">
                    {products.map((product) => (
                        <div key={product.id} className="search-product-card">
                            <div className="product-image">
                                <img src={product.image} alt={product.name} />
                                <div className="product-source">{product.source}</div>
                            </div>

                            <div className="search-product-details">
                                {product.brand && (
                                    <p className="brand">{product.brand}</p>
                                )}
                                <h3 className="product-name">{product.name}</h3>
                                <div className="product-pricing">
                                    <span className="price">{product.price}</span>
                                    {product.originalPrice && (
                                        <span className="product-original-price">{product.originalPrice}</span>
                                    )}
                                    {product.discount && (
                                        <span className="product-discount">{product.discount}</span>
                                    )}
                                </div>
                                <div className="product-category-badge">{product.category}</div>
                            </div>

                            <div className="search-product-actions" style={{ flexDirection: 'column', gap: '0.5rem' }}>
                                <button
                                    className="btn-try-on"
                                    onClick={() => handleVirtualTryOn(product)}
                                    style={{ background: 'var(--text-primary)', color: 'var(--bg-dark)', padding: '0.65rem', borderRadius: '8px', fontWeight: '500', cursor: 'pointer', border: 'none' }}
                                >
                                    ✨ Try This Now
                                </button>
                                
                                <div style={{ display: 'flex', gap: '0.75rem', width: '100%' }}>
                                    <button
                                        className="btn-outfit-matcher"
                                        onClick={() => tryOutfitMatcher(product)}
                                        style={{ flex: 1 }}
                                    >
                                        🛒 Matcher
                                    </button>
                                    {product.buyLink && (
                                        <a
                                            href={product.buyLink}
                                            target="_blank"
                                            rel="noopener noreferrer"
                                            className="btn-view-product"
                                            style={{ flex: 1 }}
                                        >
                                            Buy →
                                        </a>
                                    )}
                                </div>
                            </div>
                        </div>
                    ))}
                </div>
            )}

            {!loading && products.length > 0 && (
                <div className="results-footer">
                    <p>Found {products.length} products</p>
                </div>
            )}
        </div>
    );
};

export default SearchResults;