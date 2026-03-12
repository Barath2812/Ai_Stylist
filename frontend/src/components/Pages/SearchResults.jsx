import { useState, useEffect } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import axios from 'axios';
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
        try {
            setLoading(true);
            setError('');

            const token = localStorage.getItem('token');
            const response = await axios.get('https://ai-stylist-6l22.onrender.com/api/outfits/search', {
                params: { query, limit: 20 },
                headers: { Authorization: `Bearer ${token}` }
            });

            if (response.data.success) {
                setProducts(response.data.products);
            }
        } catch (err) {
            console.error('Search error:', err);
            setError('Failed to search products. Please try again.');
        } finally {
            setLoading(false);
        }
    };

    const tryOutfitMatcher = (product) => {
        // Navigate to outfit builder with selected product
        navigate('/dashboard/outfits', {
            state: { preSelected: product }
        });
    };

    return (
        <div className="search-results-page">
            <div className="search-header">
                <h1>Search Results</h1>
                {query && <p className="search-query">Showing results for: "<span>{query}</span>"</p>}
            </div>

            {loading && (
                <div className="loading-state">
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
                <div className="empty-state">
                    <span className="empty-icon">🔍</span>
                    <h3>No products found</h3>
                    <p>Try searching with different keywords</p>
                </div>
            )}

            {!loading && !error && products.length > 0 && (
                <div className="products-grid">
                    {products.map((product) => (
                        <div key={product.id} className="product-card-result">
                            <div className="product-image">
                                <img src={product.image} alt={product.name} />
                                <div className="product-source">{product.source}</div>
                            </div>

                            <div className="product-info">
                                {product.brand && (
                                    <p className="product-brand">{product.brand}</p>
                                )}
                                <h3 className="product-name">{product.name}</h3>
                                <div className="product-pricing">
                                    <span className="product-price">{product.price}</span>
                                    {product.originalPrice && (
                                        <span className="product-original-price">{product.originalPrice}</span>
                                    )}
                                    {product.discount && (
                                        <span className="product-discount">{product.discount}</span>
                                    )}
                                </div>
                                <div className="product-category-badge">{product.category}</div>
                            </div>

                            <div className="product-actions">
                                <button
                                    className="btn-outfit-matcher"
                                    onClick={() => tryOutfitMatcher(product)}
                                >
                                    🎨 Try Outfit Matcher
                                </button>
                                {product.buyLink && (
                                    <a
                                        href={product.buyLink}
                                        target="_blank"
                                        rel="noopener noreferrer"
                                        className="btn-view-product"
                                    >
                                        View Product →
                                    </a>
                                )}
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
