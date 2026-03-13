import { useState, useEffect } from 'react';
import { useLocation } from 'react-router-dom';
import api from '../../api/axios';
import './Outfit.css';

const OutfitsPage = () => {
    const location = useLocation();
    const [outfitItems, setOutfitItems] = useState({
        top: null,
        bottom: null,
        shoes: null,
        accessories: null
    });
    const [savedOutfits, setSavedOutfits] = useState([]);
    const [outfitName, setOutfitName] = useState('');
    const [showSaveModal, setShowSaveModal] = useState(false);
    const [showSearchModal, setShowSearchModal] = useState(false);
    const [searchCategory, setSearchCategory] = useState('');
    const [searchQuery, setSearchQuery] = useState('');
    const [searchResults, setSearchResults] = useState([]);
    const [searching, setSearching] = useState(false);

    // Handle pre-selected product from search results
    useEffect(() => {
        if (location.state?.preSelected) {
            const product = location.state.preSelected;
            setOutfitItems(prev => ({
                ...prev,
                [product.category]: product
            }));
            // Clear the navigation state
            window.history.replaceState({}, document.title);
        }
    }, [location]);

    // Load saved outfits
    useEffect(() => {
        loadSavedOutfits();
    }, []);

    const loadSavedOutfits = async () => {
        try {
            const response = await api.get('/outfits');
            if (response.data.success) {
                setSavedOutfits(response.data.outfits);
            }
        } catch (error) {
            console.error('Error loading outfits:', error);
        }
    };

    const openSearchModal = (category) => {
        setSearchCategory(category);
        setShowSearchModal(true);
        setSearchQuery('');
        setSearchResults([]);
    };

    const closeSearchModal = () => {
        setShowSearchModal(false);
        setSearchCategory('');
        setSearchQuery('');
        setSearchResults([]);
    };

    const searchProducts = async (e) => {
        e.preventDefault();
        if (!searchQuery.trim()) return;

        try {
            setSearching(true);
            const response = await api.get('/outfits/search', {
                params: {
                    query: searchQuery,
                    category: searchCategory,
                    limit: 12
                }
            });

            if (response.data.success) {
                setSearchResults(response.data.products);
            }
        } catch (error) {
            console.error('Search error:', error);
            alert('Failed to search products');
        } finally {
            setSearching(false);
        }
    };


    const selectProduct = (product) => {
        setOutfitItems(prev => ({
            ...prev,
            [searchCategory]: product
        }));
        closeSearchModal();
    };

    const removeItem = (category) => {
        setOutfitItems(prev => ({
            ...prev,
            [category]: null
        }));
    };

    const clearOutfit = () => {
        setOutfitItems({
            top: null,
            bottom: null,
            shoes: null,
            accessories: null
        });
        setOutfitName('');
    };

    const calculateTotal = () => {
        let total = 0;
        Object.values(outfitItems).forEach(item => {
            if (item && item.price) {
                // Extract number from price string (â‚¹1,299 -> 1299)
                const priceNum = parseInt(item.price.replace(/[^\d]/g, ''));
                if (!isNaN(priceNum)) {
                    total += priceNum;
                }
            }
        });
        return total;
    };

    const saveOutfit = async () => {
        if (!outfitName.trim()) {
            alert('Please enter an outfit name!');
            return;
        }

        const itemCount = Object.values(outfitItems).filter(item => item !== null).length;
        if (itemCount === 0) {
            alert('Please add at least one item to your outfit!');
            return;
        }

        try {
            const outfitData = {
                name: outfitName,
                items: outfitItems,
                totalPrice: calculateTotal(),
                itemCount: itemCount
            };

            const response = await api.post('/outfits/save', outfitData);

            if (response.data.success) {
alert('Outfit saved successfully! 🎉');
                loadSavedOutfits();
                setShowSaveModal(false);
                clearOutfit();
            }
        } catch (error) {
            console.error('Error saving outfit:', error);
            alert('Failed to save outfit. Please try again.');
        }
    };

    const loadOutfit = (outfit) => {
        setOutfitItems(outfit.items);
        setOutfitName(outfit.name);
    };

    const deleteOutfit = async (outfitId) => {
        if (!confirm('Are you sure you want to delete this outfit?')) return;

        try {
            const response = await api.delete(`/outfits/${outfitId}`);

            if (response.data.success) {
                alert('Outfit deleted!');
                loadSavedOutfits();
            }
        } catch (error) {
            console.error('Error deleting outfit:', error);
            alert('Failed to delete outfit.');
        }
    };

    const categoryLabels = {
        top: 'Shirt/Top',
        bottom: 'Pants/Bottoms',
        shoes: 'Shoes',
        accessories: 'Accessories'
    };

    return (
        <div className="outfits-page">
            {/* Header */}
            <div className="outfit-header">
                <h1>Outfit Builder</h1>
                <p>Mix and match to create your perfect look</p>
            </div>

            {/* Main Builder */}
            <div className="outfit-builder-v2">
                {/* Canvas */}
                <div className="outfit-canvas-main">
                    <h2 className="canvas-title">Your Outfit</h2>

                    <div className="outfit-slots-grid">
                        {/* Top Slot */}
                        <div className={`outfit-slot-v2 ${outfitItems.top ? 'filled' : 'empty'}`}>
                            {outfitItems.top ? (
                                <div className="slot-content">
                                    <button className="remove-btn" onClick={() => removeItem('top')}>Ã—</button>
                                    <img src={outfitItems.top.image} alt={outfitItems.top.name} />
                                    <div className="item-details">
                                        <p className="item-name">{outfitItems.top.name}</p>
                                        <p className="item-price">{outfitItems.top.price}</p>
                                    </div>
                                </div>
                            ) : (
                                <button className="select-btn" onClick={() => openSearchModal('top')}>
                                    <span className="select-icon">👔</span>
                                    <span>Select Shirt/Top</span>
                                </button>
                            )}
                        </div>

                        {/* Bottom Slot */}
                        <div className={`outfit-slot-v2 ${outfitItems.bottom ? 'filled' : 'empty'}`}>
                            {outfitItems.bottom ? (
                                <div className="slot-content">
                                    <button className="remove-btn" onClick={() => removeItem('bottom')}>Ã—</button>
                                    <img src={outfitItems.bottom.image} alt={outfitItems.bottom.name} />
                                    <div className="item-details">
                                        <p className="item-name">{outfitItems.bottom.name}</p>
                                        <p className="item-price">{outfitItems.bottom.price}</p>
                                    </div>
                                </div>
                            ) : (
                                <button className="select-btn" onClick={() => openSearchModal('bottom')}>
                                    <span className="select-icon">👖</span>
                                    <span>Select Pants</span>
                                </button>
                            )}
                        </div>

                        {/* Shoes Slot */}
                        <div className={`outfit-slot-v2 ${outfitItems.shoes ? 'filled' : 'empty'}`}>
                            {outfitItems.shoes ? (
                                <div className="slot-content">
                                    <button className="remove-btn" onClick={() => removeItem('shoes')}>Ã—</button>
                                    <img src={outfitItems.shoes.image} alt={outfitItems.shoes.name} />
                                    <div className="item-details">
                                        <p className="item-name">{outfitItems.shoes.name}</p>
                                        <p className="item-price">{outfitItems.shoes.price}</p>
                                    </div>
                                </div>
                            ) : (
                                <button className="select-btn" onClick={() => openSearchModal('shoes')}>
                                    <span className="select-icon">👞</span>
                                    <span>Select Shoes</span>
                                </button>
                            )}
                        </div>

                        {/* Accessories Slot */}
                        <div className={`outfit-slot-v2 ${outfitItems.accessories ? 'filled' : 'empty'}`}>
                            {outfitItems.accessories ? (
                                <div className="slot-content">
                                    <button className="remove-btn" onClick={() => removeItem('accessories')}>Ã—</button>
                                    <img src={outfitItems.accessories.image} alt={outfitItems.accessories.name} />
                                    <div className="item-details">
                                        <p className="item-name">{outfitItems.accessories.name}</p>
                                        <p className="item-price">{outfitItems.accessories.price}</p>
                                    </div>
                                </div>
                            ) : (
                                <button className="select-btn" onClick={() => openSearchModal('accessories')}>
                                    <span className="select-icon">⌚</span>
                                    <span>Select Accessories</span>
                                </button>
                            )}
                        </div>
                    </div>

                    {/* Summary */}
                    <div className="outfit-summary">
                        <div className="total-price">
                            <span>Total:</span>
                            <span className="price-value">₹{calculateTotal().toLocaleString()}</span>
                        </div>
                        <div className="outfit-actions">
                            <button className="btn-clear" onClick={clearOutfit}>
                                Clear All
                            </button>
                            <button
                                className="btn-save"
                                onClick={() => setShowSaveModal(true)}
                                disabled={calculateTotal() === 0}
                            >
                                Save Outfit
                            </button>
                        </div>
                    </div>
                </div>
            </div>

            {/* Saved Outfits */}
            {savedOutfits.length > 0 && (
                <div className="saved-outfits-section">
                    <h2 className="section-title">Your Saved Outfits</h2>
                    <div className="saved-outfits-grid">
                        {savedOutfits.map(outfit => (
                            <div key={outfit.id} className="saved-outfit-card">
                                <div className="outfit-card-header">
                                    <h3>{outfit.name}</h3>
                                    <button className="delete-btn" onClick={() => deleteOutfit(outfit.id)}>ðŸ—‘ï¸</button>
                                </div>
                                <div className="outfit-preview-images">
                                    {Object.values(outfit.items).filter(item => item).map((item, idx) => (
                                        <img key={idx} src={item.image} alt={item.name} className="mini-preview" />
                                    ))}
                                </div>
                                <p className="outfit-total">â‚¹{outfit.totalPrice?.toLocaleString() || 0}</p>
                                <button className="btn-load" onClick={() => loadOutfit(outfit)}>
                                    Load Outfit
                                </button>
                            </div>
                        ))}
                    </div>
                </div>
            )}

            {/* Search Modal */}
            {showSearchModal && (
                <div className="modal-overlay" onClick={closeSearchModal}>
                    <div className="modal-content-search" onClick={(e) => e.stopPropagation()}>
                        <div className="modal-header">
                            <h2>Search {categoryLabels[searchCategory]}</h2>
                            <button className="close-modal-btn" onClick={closeSearchModal}>Ã—</button>
                        </div>

                        <form className="modal-search-form" onSubmit={searchProducts}>
                            <input
                                type="text"
                                placeholder={`Search for ${categoryLabels[searchCategory].toLowerCase()}...`}
                                value={searchQuery}
                                onChange={(e) => setSearchQuery(e.target.value)}
                                autoFocus
                            />
                            <button type="submit" disabled={searching}>
                                {searching ? 'Searching...' : 'Search'}
                            </button>
                        </form>

                        <div className="modal-results">
                            {searching && <div className="modal-loading">Searching products...</div>}

                            {!searching && searchResults.length === 0 && searchQuery && (
                                <div className="modal-empty">
                                    <p>No products found. Try different keywords.</p>
                                </div>
                            )}

                            {!searching && searchResults.length > 0 && (
                                <div className="modal-products-grid">
                                    {searchResults.map(product => (
                                        <div
                                            key={product.id}
                                            className="modal-product-card"
                                            onClick={() => selectProduct(product)}
                                        >
                                            <img src={product.image} alt={product.name} />
                                            <div className="modal-product-info">
                                                <p className="modal-product-name">{product.name}</p>
                                                <p className="modal-product-price">{product.price}</p>
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            )}
                        </div>
                    </div>
                </div>
            )}

            {/* Save Modal */}
            {showSaveModal && (
                <div className="modal-overlay" onClick={() => setShowSaveModal(false)}>
                    <div className="modal-content" onClick={(e) => e.stopPropagation()}>
                        <h2>Save Your Outfit</h2>
                        <input
                            type="text"
                            placeholder="Enter outfit name (e.g., Summer Casual)"
                            value={outfitName}
                            onChange={(e) => setOutfitName(e.target.value)}
                            className="outfit-name-input"
                        />
                        <div className="modal-actions">
                            <button className="btn-cancel" onClick={() => setShowSaveModal(false)}>
                                Cancel
                            </button>
                            <button className="btn-confirm" onClick={saveOutfit}>
                                Save
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};

export default OutfitsPage;
