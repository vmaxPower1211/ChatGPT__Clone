document.addEventListener('DOMContentLoaded', function () {
    const chatType = document.getElementById('chat-type');
    const chatContainer = document.getElementById('chat-container');
    const newChatBtn = document.getElementById('new-chat');
    let currentChatId = null;

    // Set default chat type to 'chat'
    chatType.value = 'chat';

    // Initialize the chat interface
    initializeChat();

    function initializeChat() {
        addMessageInput();
        attachEventListeners();
    }

    function attachEventListeners() {
        // New chat button
        newChatBtn.addEventListener('click', handleNewChat);

        // Chat type selection
        chatType.addEventListener('change', handleChatTypeChange);

        // History items
        document.querySelectorAll('.history-item').forEach(item => {
            item.addEventListener('click', () => loadChat(item.dataset.chatId));
        });

        document.querySelectorAll('.history-item').forEach(item => {
            const deleteBtn = document.createElement('button');
            deleteBtn.className = 'delete-chat';
            deleteBtn.innerHTML = '×';
            deleteBtn.onclick = async (e) => {
                e.stopPropagation();
                if (confirm('Delete this chat?')) {
                    try {
                        const response = await fetch(`/delete_chat/${item.dataset.chatId}/`, {
                            method: 'POST',
                            headers: {
                                'X-CSRFToken': getCsrfToken()
                            }
                        });
                        if (response.ok) {
                            item.remove();
                            if (currentChatId === item.dataset.chatId) {
                                handleNewChat();
                            }
                        }
                    } catch (error) {
                        console.error('Error deleting chat:', error);
                    }
                }
            };
            item.appendChild(deleteBtn);
        });

        const style = document.createElement('style');
        style.textContent = `
    .history-item {
        display: flex;
        justify-content: space-between;
        align-items: center;
    }
    .delete-chat {
        background: none;
        border: none;
        color: #666;
        font-size: 20px;
        cursor: pointer;
        padding: 0 5px;
    }
    .delete-chat:hover {
        color: #ff4444;
    }
`;
        document.head.appendChild(style);

        // Enter key submission
        document.addEventListener('keydown', handleKeyPress);
    }

    function handleNewChat() {
        currentChatId = null;
        chatContainer.innerHTML = '';
        addMessageInput();
    }

    function handleChatTypeChange() {
        updateInputMethod(chatType.value);
    }

    function handleKeyPress(e) {
        if (e.key === 'Enter' && !e.shiftKey) {
            const textarea = document.querySelector('textarea');
            if (document.activeElement === textarea) {
                e.preventDefault();
                handleSubmission();
            }
        }
    }

    function updateInputMethod(type) {
        const inputContainer = document.querySelector('.input-container');
        if (!inputContainer) return;
    
        let inputHtml = `
            <style>
                .file-input-label {
                    cursor: pointer;
                    display: inline-flex;
                    align-items: center;
                    font-size: 24px; /* Adjust size as needed */
                }
    
                .file-input-label .icon {
                    margin-right: 8px; /* Space between icon and text */
                }
    
                .file-input-label input[type="file"] {
                    display: none; /* Hide the actual file input */
                }
            </style>
        `;
    
        if (type === 'chat') {
            inputHtml += `
                <textarea placeholder="Type your message..."></textarea>
                <button type="submit">Send</button>
            `;
        } else if (type === 'speech') {
            inputHtml += `
                <div class="file-input-container">
                    <label class="file-input-label">
                        <span class="icon">🎤</span>
                        <input type="file" accept="audio/*" style="display: none;">
                    </label>
                    <span class="file-name"></span>
                </div>
                <button type="submit">Process</button>
            `;
        } else if (type === 'pdf') {
            inputHtml += `
                <div class="file-input-container">
                    <label class="file-input-label">
                        <span class="icon">📄</span>
                        <input type="file" accept=".pdf" multiple style="display: none;">
                    </label>
                    <span class="file-name"></span>
                </div>
                <textarea placeholder="Ask a question about the PDF..."></textarea>
                <button type="submit">Ask</button>
            `;
        }
    
        inputContainer.innerHTML = inputHtml;
    
        // Add file input listeners
        const fileInput = inputContainer.querySelector('input[type="file"]');
        if (fileInput) {
            fileInput.addEventListener('change', updateFileName);
        }
    
        // Add submit button listener
        const submitButton = inputContainer.querySelector('button');
        if (submitButton) {
            submitButton.addEventListener('click', handleSubmission);
        }
    }

    function updateFileName(e) {
        const fileNameSpan = document.querySelector('.file-name');
        if (e.target.files.length > 0) {
            const fileNames = Array.from(e.target.files).map(file => file.name).join(', ');
            fileNameSpan.textContent = fileNames;
        } else {
            fileNameSpan.textContent = '';
        }
    }

    function addMessageInput() {
        if (!document.querySelector('.input-container')) {
            const inputDiv = document.createElement('div');
            inputDiv.className = 'input-container';
            document.querySelector('.chat-progress').appendChild(inputDiv);
        }
        updateInputMethod(chatType.value);
    }

    async function handleSubmission() {
        const type = chatType.value;
        const formData = new FormData();
        formData.append('type', type);
        formData.append('chat_id', currentChatId || ''); // Ensure chat_id is not null

        let content = '';
        let canSubmit = false;

        if (type === 'chat') {
            const textarea = document.querySelector('textarea');
            content = textarea.value.trim();
            canSubmit = content.length > 0;
            if (canSubmit) {
                formData.append('content', content);
                textarea.value = '';
            }
        } else if (type === 'speech') {
            const fileInput = document.querySelector('input[type="file"]');
            canSubmit = fileInput.files.length > 0;
            if (canSubmit) {
                formData.append('audio', fileInput.files[0]);
                content = 'Processing audio file: ' + fileInput.files[0].name;
            }
        } else if (type === 'pdf') {
            const fileInput = document.querySelector('input[type="file"]');
            const textarea = document.querySelector('textarea');
            content = textarea.value.trim();
            canSubmit = fileInput.files.length > 0 && content.length > 0;
            if (canSubmit) {
                Array.from(fileInput.files).forEach(file => {
                    formData.append('pdf', file);
                });
                formData.append('content', content);
                textarea.value = '';
            }
        }

        if (!canSubmit) return;

        displayMessage(content, true);
        const loadingMessage = showLoading();

        try {
            const response = await fetch('/process_message/', {
                method: 'POST',
                body: formData,
                headers: {
                    'X-CSRFToken': getCsrfToken()
                }
            });

            const data = await response.json();
            loadingMessage.remove();

            if (data.status === 'error') {
                displayMessage(data.error || 'An error occurred while processing your request.', false);
                return;
            }

            displayMessage(data.response, false);

            if (!currentChatId) {
                currentChatId = data.chat_id;
                updateChatHistory();
            }

        } catch (error) {
            loadingMessage.remove();
            displayMessage('Error processing your request. Please try again.', false);
        }
    }

    function displayMessage(content, isUser) {
        const messageDiv = document.createElement('div');
        messageDiv.className = `message ${isUser ? 'user-message' : 'bot-message'}`;
        messageDiv.textContent = content;
        chatContainer.appendChild(messageDiv);
    
        // Scroll to the bottom of the chat container
        chatContainer.scrollTop = chatContainer.scrollHeight;
    }

    function showLoading() {
        const loadingDiv = document.createElement('div');
        loadingDiv.className = 'message bot-message';
        loadingDiv.innerHTML = '<div class="loading"></div>';
        chatContainer.appendChild(loadingDiv);
        chatContainer.scrollTop = chatContainer.scrollHeight;
        return loadingDiv;
    }

    async function loadChat(chatId) {
        try {
            const response = await fetch(`/chat/${chatId}/`);
            const html = await response.text();
            const parser = new DOMParser();
            const doc = parser.parseFromString(html, 'text/html');
            chatContainer.innerHTML = doc.querySelector('#chat-container').innerHTML;
            currentChatId = chatId;
            addMessageInput();
        } catch (error) {
            console.error('Error loading chat:', error);
            displayMessage('Error loading chat history. Please try again.', false);
        }
    }

    async function updateChatHistory() {
        try {
            const response = await fetch('/');
            const html = await response.text();
            const parser = new DOMParser();
            const doc = parser.parseFromString(html, 'text/html');
            const historyList = doc.querySelector('.history-list');
            document.querySelector('.history-list').innerHTML = historyList.innerHTML;

            // Reattach event listeners to new history items
            document.querySelectorAll('.history-item').forEach(item => {
                item.addEventListener('click', () => loadChat(item.dataset.chatId));
            });
        } catch (error) {
            console.error('Error updating chat history:', error);
        }
    }

    function getCsrfToken() {
        return document.cookie.split('; ')
            .find(row => row.startsWith('csrftoken='))
            ?.split('=')[1];
    }
});