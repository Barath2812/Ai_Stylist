import { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import axios from 'axios';
import './ChatPage.css';

const ChatPage = () => {
    const [messages, setMessages] = useState([]);
    const [inputMessage, setInputMessage] = useState('');
    const [loading, setLoading] = useState(false);
    const [typing, setTyping] = useState(false);
    const [connectionError, setConnectionError] = useState(false);
    const messagesEndRef = useRef(null);
    const navigate = useNavigate();
    const REQUEST_TIMEOUT = 30000; // 30 second timeout

    // Scroll to bottom when new messages arrive
    const scrollToBottom = () => {
        messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    };

    useEffect(() => {
        scrollToBottom();
    }, [messages]);

    // Load greeting on mount
    useEffect(() => {
        loadChatHistory();
    }, []);

    const loadChatHistory = async () => {
        // Try to load from localStorage first
        const savedMessages = localStorage.getItem('chatHistory');

        if (savedMessages) {
            try {
                const parsed = JSON.parse(savedMessages);
                setMessages(parsed);
                return; // Use saved messages
            } catch (error) {
                console.error('Error loading chat history:', error);
            }
        }

        // If no saved messages, load greeting
        loadGreeting();
    };

    const saveChatHistory = (newMessages) => {
        try {
            localStorage.setItem('chatHistory', JSON.stringify(newMessages));
        } catch (error) {
            console.error('Error saving chat history:', error);
        }
    };

    const loadGreeting = async () => {
        try {
            const token = localStorage.getItem('token');
            if (!token) {
                navigate('/login');
                return;
            }
            const response = await axios.get('http://localhost:5000/api/chat/greeting', {
                headers: { Authorization: `Bearer ${token}` },
                timeout: REQUEST_TIMEOUT
            });

            if (response.data.success) {
                setMessages([{
                    role: 'assistant',
                    message: response.data.greeting,
                    timestamp: new Date().toISOString()
                }]);
            }
            setConnectionError(false);
        } catch (error) {
            console.error('Greeting error:', error);
            if (error.response?.status === 401) {
                localStorage.removeItem('token');
                navigate('/login');
                return;
            }
            setConnectionError(error.code === 'ERR_NETWORK');
            setMessages([{
                role: 'assistant',
                message: error.code === 'ERR_NETWORK' 
                    ? "⚠️ Cannot connect to the server. Please check if the backend is running."
                    : "👋 Hi! I'm your AI Style Assistant! How can I help you today?",
                timestamp: new Date().toISOString()
            }]);
        }
    };

    const handleSendMessage = async (messageText = null) => {
        const messageToSend = messageText || inputMessage.trim();

        if (!messageToSend) return;

        // Add user message to chat
        const userMessage = {
            role: 'user',
            message: messageToSend,
            timestamp: new Date().toISOString()
        };

        const updatedMessages = [...messages, userMessage];
        setMessages(updatedMessages);
        saveChatHistory(updatedMessages);
        setInputMessage('');
        setLoading(true);
        setTyping(true);

        try {
            const token = localStorage.getItem('token');
            if (!token) {
                navigate('/login');
                return;
            }

            // Send message with conversation history
            const response = await axios.post(
                'http://localhost:5000/api/chat/message',
                {
                    message: messageToSend,
                    conversationHistory: messages
                },
                {
                    headers: { Authorization: `Bearer ${token}` },
                    timeout: REQUEST_TIMEOUT
                }
            );

            setTyping(false);
            setConnectionError(false);

            if (response.data.success) {
                // Add bot response
                const botMessage = {
                    role: 'assistant',
                    message: response.data.message,
                    products: response.data.products || [],
                    suggestions: response.data.suggestions || [],
                    timestamp: new Date().toISOString()
                };

                const newMessages = [...updatedMessages, botMessage];
                setMessages(newMessages);
                saveChatHistory(newMessages);
            }
        } catch (error) {
            setTyping(false);
            console.error('Chat error:', error);

            // Token expired
            if (error.response?.status === 401) {
                localStorage.removeItem('token');
                navigate('/login');
                return;
            }

            let errorMsg = "Sorry, I couldn't process that. Please try again!";
            if (error.code === 'ERR_NETWORK') {
                errorMsg = "⚠️ Cannot reach the server. Please check your connection.";
                setConnectionError(true);
            } else if (error.code === 'ECONNABORTED') {
                errorMsg = "⏱️ Request timed out. The server might be busy — try again.";
            } else if (error.response?.status >= 500) {
                errorMsg = "🔧 Server error. Please try again in a moment.";
            }

            const errorMessage = {
                role: 'assistant',
                message: errorMsg,
                timestamp: new Date().toISOString()
            };
            setMessages(prev => [...prev, errorMessage]);
        } finally {
            setLoading(false);
        }
    };

    const handleKeyPress = (e) => {
        if (e.key === 'Enter' && !e.shiftKey) {
            e.preventDefault();
            handleSendMessage();
        }
    };

    const handleProductClick = (product) => {
        navigate('/dashboard/outfits', {
            state: { preSelected: product }
        });
    };

    const handleQuickReply = (suggestion) => {
        handleSendMessage(suggestion);
    };

    return (
        <div className="chat-page">
            {/* Chat Header */}
            <div className="chat-header">
                <div className="chat-header-content">
                    <div className="chat-avatar">🤖</div>
                    <div className="chat-info">
                        <h2>AI Style Assistant</h2>
                        <p className="chat-status">Online •  Ready to help</p>
                    </div>
                </div>
            </div>

            {/* Messages Container */}
            <div className="chat-messages">
                {messages.map((msg, index) => (
                    <div key={index} className={`message-wrapper ${msg.role}`}>
                        <div className="message-bubble">
                            <p className="message-text">{msg.message}</p>

                            {/* Product Cards */}
                            {msg.products && msg.products.length > 0 && (
                                <div className="chat-products">
                                    {msg.products.map((product, idx) => (
                                        <div
                                            key={idx}
                                            className="chat-product-card"
                                            onClick={() => handleProductClick(product)}
                                        >
                                            <div className="chat-product-image">
                                                <img src={product.image} alt={product.name} />
                                            </div>
                                            <div className="chat-product-info">
                                                <h4>{product.name}</h4>
                                                <p className="chat-product-price">{product.price}</p>
                                                <span className="chat-product-source">{product.source}</span>
                                            </div>
                                            <button className="chat-product-btn">
                                                Add to Outfit →
                                            </button>
                                        </div>
                                    ))}
                                </div>
                            )}

                            {/* Quick Replies */}
                            {msg.suggestions && msg.suggestions.length > 0 && (
                                <div className="quick-replies">
                                    {msg.suggestions.map((suggestion, idx) => (
                                        <button
                                            key={idx}
                                            className="quick-reply-btn"
                                            onClick={() => handleQuickReply(suggestion)}
                                        >
                                            {suggestion}
                                        </button>
                                    ))}
                                </div>
                            )}

                            <span className="message-time">
                                {(() => {
                                    try {
                                        const d = typeof msg.timestamp === 'string' ? new Date(msg.timestamp) : msg.timestamp;
                                        return d.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' });
                                    } catch {
                                        return '';
                                    }
                                })()}
                            </span>
                        </div>
                    </div>
                ))}

                {/* Typing Indicator */}
                {typing && (
                    <div className="message-wrapper assistant">
                        <div className="message-bubble typing-indicator">
                            <span></span>
                            <span></span>
                            <span></span>
                        </div>
                    </div>
                )}

                <div ref={messagesEndRef} />
            </div>

            {/* Input Area */}
            <div className="chat-input-area">
                <div className="chat-input-container">
                    <input
                        type="text"
                        className="chat-input"
                        placeholder="Ask me anything about fashion..."
                        value={inputMessage}
                        onChange={(e) => setInputMessage(e.target.value)}
                        onKeyPress={handleKeyPress}
                        disabled={loading}
                    />
                    <button
                        className="chat-send-btn"
                        onClick={() => handleSendMessage()}
                        disabled={loading || !inputMessage.trim()}
                    >
                        {loading ? '...' : '→'}
                    </button>
                </div>
                <p className="chat-hint">
                    💡 Try asking: "What colors suit me?" or "Help me with an outfit"
                </p>
            </div>
        </div>
    );
};

export default ChatPage;
