
document.addEventListener('DOMContentLoaded', () => {
    // --- Initialize Socket.IO and attach to window ---
  
    window.socket = io({
       
    });

    // Check if connection was successful
    if (!window.socket) {
        console.error("Socket.IO connection failed to initialize.");
       
        return; // Stop further execution if socket failed
    }

    const socket = window.socket; 

    // --- Connection Event Handlers ---
    socket.on('connect', () => console.log('Successfully connected to WebSocket server. Socket ID:', socket.id));
    socket.on('disconnect', (reason) => console.log('Disconnected from WebSocket server. Reason:', reason));
    socket.on('connect_error', (err) => console.error('WebSocket connection error:', err.message));

    // --- DOM Element References ---
    // For listing.ejs (message box)
    const messageBox = document.getElementById('messageBoxId');
    const messageInput = document.getElementById('messageInput');
    const sendMessageBtn = document.getElementById('sendMessageBtn');
    const closeMessageBoxBtn = document.getElementById('closeMessageBoxBtn');
    const messageSendStatus = document.getElementById('messageSendStatus');

    // For dashboard.ejs (message list and detail view)
    const messageListContainer = document.getElementById('conversation-list-area'); 
    const conversationDetailArea = document.getElementById('conversation-detail-area');
    const detailMessageList = document.getElementById('detail-message-list');
    const detailReplyTextarea = document.getElementById('detail-reply-textarea');
    const detailSendReplyBtn = document.getElementById('detail-send-reply-btn');
    const dashboardReplyStatus = document.getElementById('dashboard-reply-status'); 
    const dashboardContainer = document.querySelector('.dashboard-container'); 
    const loggedInUserId = parseInt(dashboardContainer?.dataset.userId || '0', 10); 

    // --- State Variables (for message box from listing page) ---
    let currentRecipientId = null;
    let currentProductId = null;

    // --- Global Function: Initialize Message Box (from listing page) ---
    window.initMessageBox = (boxId, recipientId, productId, productName) => {
        const box = document.getElementById(boxId);
       // console.log(`initMessageBox called for recipient ${recipientId}, product ${productId}`);
        if (box && recipientId && productId) {
            currentRecipientId = recipientId;
            currentProductId = productId;

            messageInput.value = ''; // Clear previous message
            if (messageSendStatus) messageSendStatus.textContent = ''; // Clear status
            if (messageSendStatus) messageSendStatus.className = ''; // Reset status style

            box.style.display = 'block'; // Show the message box
            messageInput.focus(); // Focus the input field
        } else {
            console.error("Could not initialize message box. Missing element or IDs.", { boxId, recipientId, productId });
            alert("Could not open message box. Please try again later.");
        }
    };

    // --- Event Listener: Close Message Box (from listing page) ---
    if (closeMessageBoxBtn) {
        closeMessageBoxBtn.addEventListener('click', () => {
            if (messageBox) {
                messageBox.style.display = 'none';
                currentRecipientId = null;
                currentProductId = null;
            }
        });
    }

    // --- Event Listener: Send Message Button (from listing page) ---
    if (sendMessageBtn) {
        sendMessageBtn.addEventListener('click', () => {
            const body = messageInput?.value.trim();
            if (body && currentRecipientId && currentProductId) {
                if (messageSendStatus) {
                    messageSendStatus.textContent = 'Sending...';
                    messageSendStatus.className = 'text-blue-600 text-sm';
                }
                sendMessageBtn.disabled = true;
                closeMessageBoxBtn.disabled = true;

                console.log(`Emitting sendMessage: Recipient=${currentRecipientId}, Product=${currentProductId}`);

                //Socket part
                socket.emit('sendMessage', {
                    recipientId: currentRecipientId,
                    productId: currentProductId,
                    body: body,
                   
                });
            } else {
                console.warn('Cannot send message: Missing body, recipient ID, or product ID.');
                if (messageSendStatus) {
                    messageSendStatus.textContent = 'Cannot send empty message.';
                    messageSendStatus.className = 'text-red-600 text-sm';
                }
            }
        });
    }

    // --- Socket Listener: Message Sent Confirmation (from listing page) ---
    socket.on('messageSent', ({ messageId, conversationId, recipientId }) => {
        console.log(`Confirmation received: Message ${messageId} sent to ${recipientId} (Conversation ${conversationId}).`);
        if (messageBox && messageBox.style.display === 'block' && currentRecipientId === recipientId) {
            if (messageSendStatus) {
                messageSendStatus.textContent = 'Message Sent!';
                messageSendStatus.className = 'text-green-600 text-sm'; 
            }
            messageInput.value = '';
            setTimeout(() => {
                if (messageBox.style.display === 'block') {
                     messageBox.style.display = 'none';
                     currentRecipientId = null;
                     currentProductId = null;
                }
                 sendMessageBtn.disabled = false;
                 closeMessageBoxBtn.disabled = false;
                 if (messageSendStatus) messageSendStatus.textContent = '';
            }, 1500);
        }
    });

     // --- Socket Listener: Reply Sent Confirmation (from dashboard) ---
    socket.on('replySent', ({ messageId, conversationId, recipientId, newMessageData }) => {
      //  console.log(`Confirmation received: Reply ${messageId} sent to ${recipientId} (Conversation ${conversationId}).`);
        const detailConversationIdInput = document.getElementById('detail-conversation-id');
        if (conversationDetailArea && !conversationDetailArea.classList.contains('hidden') && detailConversationIdInput && detailConversationIdInput.value === conversationId.toString()) {
            if (dashboardReplyStatus) {
                dashboardReplyStatus.textContent = 'Reply Sent!';
                dashboardReplyStatus.className = 'text-green-600 text-sm ml-2 h-4';
            }
            if(detailReplyTextarea) detailReplyTextarea.value = ''; // Clear reply textarea
            if(detailSendReplyBtn) detailSendReplyBtn.disabled = false; // Re-enable button

            // Dynamically add the sent message to the thread
            if (newMessageData && detailMessageList) {
                 const messageLi = document.createElement('li');
                 messageLi.classList.add(
                     'message-item', 'text-sm', 'p-2', 'rounded', 'mb-2', 'max-w-[80%]',
                     'bg-blue-100', 'ml-auto', 'text-right' //  sender 
                 );
                 messageLi.dataset.messageId = messageId;
                 messageLi.innerHTML = `
                     <span class="font-medium">You:</span>
                     <span class="block break-words">${escapeHtmlJs(newMessageData.body)}</span>
                     <small class="text-gray-500 text-xs">${new Date(newMessageData.createdAt).toLocaleString()}</small>
                 `;
                 detailMessageList.appendChild(messageLi);
                 detailMessageList.scrollTop = detailMessageList.scrollHeight; // Scroll 
            }

            setTimeout(() => {
                 if (dashboardReplyStatus) dashboardReplyStatus.textContent = '';
            }, 2000);
        }
    });


    // --- Socket Listener: Message Sending Error (Common Handler) ---
    socket.on('messageError', ({ message }) => {
        console.error('Message/Reply Error:', message);
        if (messageBox && messageBox.style.display === 'block') {
            if (messageSendStatus) {
                messageSendStatus.textContent = `Error: ${message}`;
                messageSendStatus.className = 'text-red-600 text-sm';
            }
            if(sendMessageBtn) sendMessageBtn.disabled = false;
            if(closeMessageBoxBtn) closeMessageBoxBtn.disabled = false;
        } else if (conversationDetailArea && !conversationDetailArea.classList.contains('hidden')) {
             if (dashboardReplyStatus) {
                dashboardReplyStatus.textContent = `Error: ${message}`;
                dashboardReplyStatus.className = 'text-red-600 text-sm ml-2 h-4';
            }
            if(detailSendReplyBtn) detailSendReplyBtn.disabled = false;
        }
    });


    // --- Socket Listener: New Message Received (For Dashboard) ---
    socket.on('newMessage', (messageData) => {
        console.log('New message received (potentially for dashboard):', messageData);

        if (window.location.pathname.includes('/dashboard')) {
            // Update Conversation Snippet in List
            const snippetElement = document.querySelector(`.conversation-snippet[data-conversation-id="${messageData.conversationId}"]`);
            if (snippetElement && messageListContainer) {
                const pElement = snippetElement.querySelector('p');
                const smallElement = snippetElement.querySelector('small');
                if (pElement) pElement.textContent = messageData.body;
                if (smallElement) smallElement.textContent = new Date(messageData.createdAt).toLocaleString();
                messageListContainer.insertBefore(snippetElement, messageListContainer.firstChild);
                snippetElement.classList.add('font-bold');

            } else if (messageListContainer) {
                console.log(`Received message for a new or unloaded conversation (ID: ${messageData.conversationId}). UI update needed.`);
            
            }

            // Update Open Conversation Detail View
            const detailConversationIdInput = document.getElementById('detail-conversation-id');
            if (conversationDetailArea && !conversationDetailArea.classList.contains('hidden') && detailConversationIdInput && detailConversationIdInput.value === messageData.conversationId.toString()) {
                if (detailMessageList) {
                    const messageLi = document.createElement('li');
                    const isSender = messageData.senderId === loggedInUserId;
                    messageLi.classList.add(
                        'message-item', 'text-sm', 'p-2', 'rounded', 'mb-2', 'max-w-[80%]',
                        isSender ? 'bg-blue-100 ml-auto text-right' : 'bg-gray-100 mr-auto'
                    );
                    messageLi.dataset.messageId = messageData.messageId;
                    messageLi.innerHTML = `
                        <span class="font-medium">${escapeHtmlJs(messageData.senderUsername || 'Unknown')}:</span>
                        <span class="block break-words">${escapeHtmlJs(messageData.body)}</span>
                        <small class="text-gray-500 text-xs">${new Date(messageData.createdAt).toLocaleString()}</small>
                    `;
                    detailMessageList.appendChild(messageLi);
                    detailMessageList.scrollTop = detailMessageList.scrollHeight;
                }
            }
        
        }
    });

    // --- Helper Functions ---
    function escapeHtmlJs(unsafe) {
        if (typeof unsafe !== 'string') return '';
        return unsafe
             .replace(/&/g, "&amp;")
             .replace(/</g, "&lt;")
             .replace(/>/g, "&gt;")
             .replace(/"/g, "&quot;")
             .replace(/'/g, "&#039;");
     }

}); // End DOMContentLoaded

