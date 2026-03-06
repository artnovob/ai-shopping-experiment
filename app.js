/**
 * CommerceAdvisor GPT - Shopping Assistant Chat Application
 * Research Web App for Human-AI Interaction Experiment
 * Updated for Groq API
 */

// Configuration
let currentStyle = AI_STYLE || "rational";
let conversationHistory = [];
let questionCount = 0;
let sessionId = null;

// DOM Elements
const chatMessages = document.getElementById('chatMessages');
const userInput = document.getElementById('userInput');
const sendBtn = document.getElementById('sendBtn');
const questionCounter = document.getElementById('questionCounter');

/**
 * Initialize the application
 */
function initializeApp() {
    console.log('Initializing app...');
    
    // Generate session ID
    sessionId = generateSessionId();

    // Display initial greeting
    displayInitialGreeting();

    // Set up event listeners
    console.log('Setting up event listeners...');
    sendBtn.addEventListener('click', () => {
        console.log('Send button clicked');
        sendMessage();
    });

    userInput.addEventListener('keypress', (e) => {
        if (e.key === 'Enter' && !e.shiftKey) {
            e.preventDefault();
            console.log('Enter key pressed');
            sendMessage();
        }
    });

    // Load conversation from browser storage
    loadConversation();

    // Log initialization
    console.log(`Session started: ${sessionId}`);
    console.log(`AI Style: ${currentStyle}`);
    console.log(`API Provider: ${API_CONFIG.provider}`);
    console.log('App initialized successfully');
}

/**
 * Generate a unique session ID
 */
function generateSessionId() {
    return `exp_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
}

/**
 * Display initial greeting message
 */
function displayInitialGreeting() {
    const greeting = `Hello! I am your AI shopping assistant. You can ask me questions about this product to help decide whether it is a good choice.`;
    
    addMessage('ai', greeting, true);
}

/**
 * Add a message to the chat
 */
function addMessage(sender, text, isGreeting = false) {
    console.log(`Adding message from ${sender}: ${text.substring(0, 50)}...`);
    
    const messageDiv = document.createElement('div');
    messageDiv.className = `message ${sender}`;
    
    const timestamp = new Date().toLocaleTimeString('en-US', { 
        hour: '2-digit', 
        minute: '2-digit',
        second: '2-digit'
    });

    const contentDiv = document.createElement('div');
    contentDiv.className = 'message-content';
    contentDiv.textContent = text;

    messageDiv.appendChild(contentDiv);

    const timeDiv = document.createElement('div');
    timeDiv.className = 'message-timestamp';
    timeDiv.textContent = timestamp;
    messageDiv.appendChild(timeDiv);

    chatMessages.appendChild(messageDiv);
    chatMessages.scrollTop = chatMessages.scrollHeight;

    // Store in history (but not for greeting)
    if (!isGreeting) {
        const entry = {
            sender,
            text,
            timestamp: new Date().toISOString(),
            sessionId
        };
        conversationHistory.push(entry);
        saveConversation();
    }
}

/**
 * Display typing indicator
 */
function displayTypingIndicator() {
    console.log('Showing typing indicator');
    
    const messageDiv = document.createElement('div');
    messageDiv.className = 'message ai';
    messageDiv.id = 'typingIndicator';

    const typingDiv = document.createElement('div');
    typingDiv.className = 'typing-indicator';

    for (let i = 0; i < 3; i++) {
        const dot = document.createElement('div');
        dot.className = 'typing-dot';
        typingDiv.appendChild(dot);
    }

    messageDiv.appendChild(typingDiv);
    chatMessages.appendChild(messageDiv);
    chatMessages.scrollTop = chatMessages.scrollHeight;
}

/**
 * Remove typing indicator
 */
function removeTypingIndicator() {
    console.log('Removing typing indicator');
    
    const indicator = document.getElementById('typingIndicator');
    if (indicator) {
        indicator.remove();
    }
}

/**
 * Send user message
 */
async function sendMessage() {
    const message = userInput.value.trim();
    
    console.log('Send message called, message:', message);
    
    if (!message) {
        console.log('Message is empty, aborting');
        return;
    }

    // Disable input while processing
    userInput.disabled = true;
    sendBtn.disabled = true;

    // Add user message to chat
    addMessage('user', message);
    
    // Increment question counter
    questionCount++;
    updateQuestionCounter();

    // Clear input
    userInput.value = '';

    // Show typing indicator
    displayTypingIndicator();

    try {
        // Get AI response
        console.log('Getting AI response...');
        const response = await getAIResponse(message);
        
        console.log('Got response:', response.substring(0, 50) + '...');
        
        // Remove typing indicator
        removeTypingIndicator();
        
        // Add AI response to chat
        addMessage('ai', response);

    } catch (error) {
        console.error('Error getting AI response:', error);
        removeTypingIndicator();
        addMessage('ai', `Sorry, I encountered an error: ${error.message}. Please try again.`);
    } finally {
        // Re-enable input
        userInput.disabled = false;
        sendBtn.disabled = false;
        userInput.focus();
    }
}

/**
 * Get AI response from API or mock data
 */
async function getAIResponse(userMessage) {
    console.log('getAIResponse called with:', userMessage);
    console.log('useMockResponses:', API_CONFIG.useMockResponses);
    
    if (API_CONFIG.useMockResponses) {
        console.log('Using mock responses');
        return getMockResponse(userMessage);
    } else if (API_CONFIG.provider === "groq") {
        console.log('Using Groq API');
        return getGroqResponse(userMessage);
    } else {
        console.log('Using OpenAI API');
        return getOpenAIResponse(userMessage);
    }
}

/**
 * Get AI response from Groq API
 */
async function getGroqResponse(userMessage) {
    console.log('getGroqResponse called');
    
    if (!API_CONFIG.apiKey) {
        throw new Error('Groq API key not configured. Please set it in config.js');
    }

    const systemPrompt = SYSTEM_PROMPTS[currentStyle] || SYSTEM_PROMPTS.rational;

    try {
        console.log('Calling Groq API...');
        
        const response = await fetch('https://api.groq.com/openai/v1/chat/completions', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${API_CONFIG.apiKey}`
            },
            body: JSON.stringify({
                model: API_CONFIG.model,
                messages: [
                    {
                        role: 'system',
                        content: systemPrompt
                    },
                    ...conversationHistory.map(msg => ({
                        role: msg.sender === 'user' ? 'user' : 'assistant',
                        content: msg.text
                    })),
                    {
                        role: 'user',
                        content: userMessage
                    }
                ],
                temperature: 0.7,
                max_tokens: 500
            })
        });

        console.log('Groq API response status:', response.status);

        if (!response.ok) {
            const error = await response.json();
            console.error('Groq API error:', error);
            throw new Error(error.error?.message || `API request failed with status ${response.status}`);
        }

        const data = await response.json();
        console.log('Groq API returned data');
        
        return data.choices[0].message.content;

    } catch (error) {
        console.error('Groq API Error:', error);
        throw error;
    }
}

/**
 * Get AI response from OpenAI API
 */
async function getOpenAIResponse(userMessage) {
    if (!API_CONFIG.apiKey) {
        throw new Error('OpenAI API key not configured. Please set it in config.js');
    }

    const systemPrompt = SYSTEM_PROMPTS[currentStyle] || SYSTEM_PROMPTS.rational;

    try {
        const response = await fetch('https://api.openai.com/v1/chat/completions', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${API_CONFIG.apiKey}`
            },
            body: JSON.stringify({
                model: API_CONFIG.model,
                messages: [
                    {
                        role: 'system',
                        content: systemPrompt
                    },
                    ...conversationHistory.map(msg => ({
                        role: msg.sender === 'user' ? 'user' : 'assistant',
                        content: msg.text
                    })),
                    {
                        role: 'user',
                        content: userMessage
                    }
                ],
                temperature: 0.7,
                max_tokens: 500
            })
        });

        if (!response.ok) {
            const error = await response.json();
            throw new Error(error.error?.message || 'API request failed');
        }

        const data = await response.json();
        return data.choices[0].message.content;

    } catch (error) {
        console.error('OpenAI API Error:', error);
        throw error;
    }
}

/**
 * Get mock AI response (for testing without API)
 */
function getMockResponse(userMessage) {
    console.log('getMockResponse called with:', userMessage);
    
    const responses = {
        rational: {
            battery: "The headphones offer up to 30 hours of battery life on a single charge, which is excellent for everyday use. This means approximately 6 weeks of casual use (1-2 hours per day). The quick-charge feature provides extended playback from brief charging sessions.",
            noise_reduction: "The active noise reduction technology uses advanced microphone arrays to detect and reduce ambient noise in real-time. This is particularly effective for travel, office environments, and public spaces. The technology works continuously to provide consistent noise isolation.",
            price: "At $149, these headphones are competitively priced for the features offered. Consider the value proposition: active noise reduction, 30-hour battery life, comfort design, and wireless connectivity. This represents good value for consumer-grade audio equipment.",
            comfort: "The over-ear cushioned design is engineered to distribute weight evenly across the head. The padding materials are selected for extended wear comfort. For typical daily use sessions, these headphones maintain comfort for several hours without adjustment.",
            recommendation: "Based on specifications and features, if you need wireless headphones with noise reduction and long battery life for everyday listening, these represent a solid choice. Evaluate your specific use cases to determine if the features align with your needs."
        },
        emotional: {
            battery: "Wow, 30 hours of battery life! That's incredible - you'll have weeks of uninterrupted listening pleasure. Imagine traveling, commuting, or just enjoying your favorite music without constantly worrying about charging. It's freedom and peace of mind rolled into one!",
            noise_reduction: "The noise reduction is absolutely wonderful! Step into your own peaceful world, whether you're on a busy commute, in a crowded coffee shop, or at a hectic office. It creates this magical bubble of calm around you - users absolutely love how immersive and serene it feels.",
            price: "For just $149, you're getting something truly special! It's that sweet spot where you get premium features without breaking the bank. So many people say it's one of the best investments they've made for their everyday happiness and comfort.",
            comfort: "Oh, these are so comfortable! The padding feels like a gentle embrace, and the weight distribution is perfectly balanced. You can wear them all day and forget you're even wearing them. It's the kind of comfort that makes your listening experience genuinely delightful!",
            recommendation: "I think you'd absolutely love these! They're designed to make your everyday moments more enjoyable and connected. Whether it's your music, calls, or just escaping into your own world, these headphones create that perfect experience. Your ears will thank you!"
        }
    };

    // Try to match the question with response keys
    const lowerMessage = userMessage.toLowerCase();
    const styleResponses = responses[currentStyle];

    if (lowerMessage.includes('battery') || lowerMessage.includes('charge')) {
        return styleResponses.battery;
    } else if (lowerMessage.includes('noise') || lowerMessage.includes('reduction') || lowerMessage.includes('cancel')) {
        return styleResponses.noise_reduction;
    } else if (lowerMessage.includes('price') || lowerMessage.includes('cost') || lowerMessage.includes('worth') || lowerMessage.includes('expensive')) {
        return styleResponses.price;
    } else if (lowerMessage.includes('comfort') || lowerMessage.includes('comfortable')) {
        return styleResponses.comfort;
    } else if (lowerMessage.includes('recommend') || lowerMessage.includes('should i buy') || lowerMessage.includes('worth buying')) {
        return styleResponses.recommendation;
    } else {
        // Generic response based on style
        return currentStyle === 'rational'
            ? "That's a good question about the product. These wireless over-ear headphones feature active noise reduction, up to 30 hours of battery life, Bluetooth connectivity, and a cushioned design. If you'd like more specific information about any particular feature or aspect, I'd be happy to provide detailed analysis."
            : "Great question! I'm here to help you discover whether these headphones are the perfect fit for you. Whether you're curious about comfort, performance, or how they'll enhance your daily life, I'd love to tell you more. What would you like to know?";
    }
}

/**
 * Update question counter display
 */
function updateQuestionCounter() {
    questionCounter.textContent = `Questions asked: ${questionCount}`;
    
    if (questionCount >= 2) {
        questionCounter.classList.add('active');
    }
}

/**
 * Save conversation to browser storage
 */
function saveConversation() {
    const data = {
        sessionId,
        timestamp: new Date().toISOString(),
        style: currentStyle,
        messages: conversationHistory
    };
    
    localStorage.setItem(`conversation_${sessionId}`, JSON.stringify(data));
}

/**
 * Load conversation from browser storage
 */
function loadConversation() {
    const saved = localStorage.getItem(`conversation_${sessionId}`);
    if (saved) {
        const data = JSON.parse(saved);
        conversationHistory = data.messages;
        questionCount = conversationHistory.filter(m => m.sender === 'user').length;
        updateQuestionCounter();
    }
}

/**
 * Utility: Log session data (for research analysis)
 */
function logSessionData() {
    const data = {
        sessionId,
        style: currentStyle,
        startTime: new Date().toISOString(),
        questionCount,
        messages: conversationHistory.length
    };
    
    console.log('Session Data:', JSON.stringify(data, null, 2));
    return data;
}

// Initialize the app when DOM is loaded
document.addEventListener('DOMContentLoaded', initializeApp);
