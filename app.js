/**
 * CommerceAdvisor GPT - Shopping Assistant Chat Application
 * Research Web App for Human-AI Interaction Experiment
 * Backend Proxy Version
 */

let currentStyle = AI_STYLE || "rational";
let conversationHistory = [];
let questionCount = 0;
let sessionId = null;

const chatMessages = document.getElementById('chatMessages');
const userInput = document.getElementById('userInput');
const sendBtn = document.getElementById('sendBtn');
const questionCounter = document.getElementById('questionCounter');


function initializeApp() {

    sessionId = generateSessionId();

    displayInitialGreeting();

    sendBtn.addEventListener('click', sendMessage);

    userInput.addEventListener('keypress', (e) => {
        if (e.key === 'Enter' && !e.shiftKey) {
            e.preventDefault();
            sendMessage();
        }
    });

    loadConversation();

    console.log("Session:", sessionId);
    console.log("AI Style:", currentStyle);
}


function generateSessionId() {
    return `exp_${Date.now()}_${Math.random().toString(36).substr(2,9)}`;
}


function displayInitialGreeting() {

    const greeting =
`Hello! I am your AI shopping assistant. 

You can ask me questions about this product to help decide whether it is a good choice.`;

    addMessage('ai', greeting, true);
}


function addMessage(sender, text, isGreeting=false) {

    const messageDiv = document.createElement('div');
    messageDiv.className = `message ${sender}`;

    const contentDiv = document.createElement('div');
    contentDiv.className = 'message-content';

    contentDiv.style.whiteSpace = "pre-line";
    contentDiv.textContent = text;

    const timeDiv = document.createElement('div');
    timeDiv.className = 'message-timestamp';
    timeDiv.textContent = new Date().toLocaleTimeString();

    messageDiv.appendChild(contentDiv);
    messageDiv.appendChild(timeDiv);

    chatMessages.appendChild(messageDiv);

    chatMessages.scrollTop = chatMessages.scrollHeight;

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


function displayTypingIndicator(){

    const messageDiv = document.createElement('div');
    messageDiv.className = 'message ai';
    messageDiv.id = 'typingIndicator';

    const typingDiv = document.createElement('div');
    typingDiv.className = 'typing-indicator';

    for(let i=0;i<3;i++){
        const dot = document.createElement('div');
        dot.className = 'typing-dot';
        typingDiv.appendChild(dot);
    }

    messageDiv.appendChild(typingDiv);
    chatMessages.appendChild(messageDiv);

    chatMessages.scrollTop = chatMessages.scrollHeight;
}


function removeTypingIndicator(){

    const indicator = document.getElementById('typingIndicator');

    if(indicator){
        indicator.remove();
    }

}


async function sendMessage(){

    const message = userInput.value.trim();

    if(!message) return;

    userInput.disabled = true;
    sendBtn.disabled = true;

    addMessage('user', message);

    questionCount++;
    updateQuestionCounter();

    userInput.value = "";

    displayTypingIndicator();

    try{

        const response = await getAIResponse(message);

        removeTypingIndicator();

        const formatted = formatAIResponse(response);

        addMessage('ai', formatted);

    }catch(error){

        removeTypingIndicator();

        addMessage(
            'ai',
            "Sorry, something went wrong while contacting the AI service. Please try again."
        );

        console.error(error);

    }finally{

        userInput.disabled = false;
        sendBtn.disabled = false;
        userInput.focus();

    }

}


async function getAIResponse(userMessage){

    if(API_CONFIG.useMockResponses){
        return getMockResponse(userMessage);
    }

    const systemPrompt =
        SYSTEM_PROMPTS[currentStyle] || SYSTEM_PROMPTS.rational;

    const response = await fetch("/api/ai", {

        method: "POST",

        headers: {
            "Content-Type": "application/json"
        },

        body: JSON.stringify({

            model: API_CONFIG.model,

            messages: [

                {
                    role: "system",
                    content: systemPrompt
                },

                ...conversationHistory.map(msg => ({
                    role: msg.sender === "user" ? "user" : "assistant",
                    content: msg.text
                })),

                {
                    role: "user",
                    content: userMessage
                }

            ],

            temperature: 0.2,
            max_tokens: 500,
            response_format: { type: "json_object" }

        })

    });

    if(!response.ok){

        throw new Error("API request failed");

    }

    const data = await response.json();

    return data.choices[0].message.content;

}


function formatAIResponse(text){

    try{

        const data = JSON.parse(text);

        let output = "";

        if(data.advantages){

            output += "Advantages\n\n";

            data.advantages.forEach((a,i)=>{
                output += `${i+1}. ${a}\n`;
            });

            output += "\n";
        }

        if(data.limitations){

            output += "Limitations\n\n";

            data.limitations.forEach((l,i)=>{
                output += `${i+1}. ${l}\n`;
            });

            output += "\n";
        }

        if(data.analysis){
            output += data.analysis;
        }

        return output;

    }catch(e){

        return text;

    }

}


function updateQuestionCounter(){

    questionCounter.textContent = `Questions asked: ${questionCount}`;

    if(questionCount >= 2){
        questionCounter.classList.add("active");
    }

}


function saveConversation(){

    const data = {

        sessionId,
        timestamp: new Date().toISOString(),
        style: currentStyle,
        messages: conversationHistory

    };

    localStorage.setItem(
        `conversation_${sessionId}`,
        JSON.stringify(data)
    );

}


function loadConversation(){

    const saved =
        localStorage.getItem(`conversation_${sessionId}`);

    if(saved){

        const data = JSON.parse(saved);

        conversationHistory = data.messages;

        questionCount =
            conversationHistory.filter(m => m.sender === "user").length;

        updateQuestionCounter();

    }

}


function getMockResponse(userMessage){

    return `Advantages

1. Long battery life
2. Active noise reduction
3. Comfortable design

Limitations

1. Touch controls may trigger accidentally
2. Large size may reduce portability
3. Recharge time may take several hours

Overall, the product offers strong performance for everyday listening.`;

}


document.addEventListener("DOMContentLoaded", initializeApp);
