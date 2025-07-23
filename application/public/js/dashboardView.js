document.addEventListener('DOMContentLoaded', () => {
    console.log("DashboardView.js loaded");

    // --- Get Elements ---
    const conversationListArea = document.getElementById('conversation-list-area');
    const conversationDetailArea = document.getElementById('conversation-detail-area');

    const detailConversationHeader = document.getElementById('detail-conversation-header');
    const detailMessageList = document.getElementById('detail-message-list'); 
    const detailReplyTextarea = document.getElementById('detail-reply-textarea');
    const detailSendReplyBtn = document.getElementById('detail-send-reply-btn');
    const detailConversationIdInput = document.getElementById('detail-conversation-id');
    const detailRecipientIdInput = document.getElementById('detail-recipient-id');

    const dashboardReplyStatus = document.getElementById('dashboard-reply-status');

    // --- Get User ID ---
    const dashboardContainer = document.querySelector('.dashboard-container');
    const loggedInUserId = parseInt(dashboardContainer?.dataset.userId || '0', 10);
    if (dashboardContainer) {
        console.log("Found dashboard container. data-user-id attribute:", dashboardContainer.getAttribute('data-user-id'));
    } else {
        console.error("Dashboard container element (.dashboard-container) not found!");
    }
    console.log("Parsed Logged In User ID:", loggedInUserId, "(Type:", typeof loggedInUserId, ")");

    if (!loggedInUserId) {
        console.error("Could not determine logged-in user ID from data attribute. Styling might be incorrect.");
    }


    function handleShowConversation(element) {

        // console.log("handleShowConversation called with element:", element);

       
        // console.log("Checking variable accessibility inside handleShowConversation:");
        // console.log("typeof detailMessageList:", typeof detailMessageList); 
        // console.log("typeof conversationListArea:", typeof conversationListArea);
 

        // Check elements are accessible
        if (!conversationDetailArea || !conversationListArea || !detailConversationHeader || !detailMessageList || !detailConversationIdInput || !detailRecipientIdInput || !detailReplyTextarea || !dashboardReplyStatus) {
             console.error("One or more detail view elements were null or undefined when function called!");
             // Log which specific element is missing/null
            // console.log({conversationDetailArea, conversationListArea, detailConversationHeader, detailMessageList, detailConversationIdInput, detailRecipientIdInput, detailReplyTextarea, dashboardReplyStatus});
             return;
        }
       // console.log("All detail view elements accessible inside function.");

        // Get data
        const conversationId = element.dataset.conversationId;
        const productName = element.dataset.productName;
        const otherPartyUsername = element.dataset.otherPartyUsername; 
        const otherPartyId = element.dataset.otherPartyId; 
        const messagesJsonElement = element.querySelector('.conversation-data');
        const messagesJson = messagesJsonElement?.textContent;
       // console.log("Extracted Data:", { conversationId, productName, otherPartyUsername, otherPartyId });
      //  console.log("Raw Messages JSON:", messagesJson);

        let messages = [];
        if (messagesJson && messagesJson.trim() !== '') {
            try {
                messages = JSON.parse(messagesJson);
                // console.log("Parsed Messages Array:", messages);
                // console.log(`Parsed ${messages.length} messages.`);
            } catch (e) {
                // console.error("Error parsing conversation data JSON:", e);
                messages = [];
            }
        } else {
            console.warn("Conversation data script tag not found or JSON was empty.");
            messages = [];
        }

        // Hide list, show detail area
      //  console.log("Hiding list, showing details...");
        conversationListArea.style.display = 'none';
        conversationDetailArea.classList.remove('hidden');
      //  console.log("Areas visibility updated.");

        // Populate header
        detailConversationHeader.textContent = `Chat about "${escapeHtmlJs(productName)}" with ${escapeHtmlJs(otherPartyUsername)}`;

        // Populate message list
        detailMessageList.innerHTML = '';
        if (messages && messages.length > 0) {
            console.log("Populating message list...");
            messages.forEach((message, index) => {
                //  console.log(`Processing message ${index}:`, JSON.stringify(message));
                if (!message || typeof message.content === 'undefined' || typeof message.createdAt === 'undefined') {
                    console.warn(`Skipping message ${index} due to missing content or createdAt:`, message);
                    return;
                }

                const messageLi = document.createElement('li');
                const senderIdNum = message.sender_id ? parseInt(message.sender_id, 10) : null;
              //  console.log(`Message ${index}: Comparing sender_id=${senderIdNum} (Type: ${typeof senderIdNum}) with loggedInUserId=${loggedInUserId} (Type: ${typeof loggedInUserId})`);
                const isSender = senderIdNum !== null && senderIdNum === loggedInUserId;
             //   console.log(`Message ${index}: isSender = ${isSender}`);
                const senderName = isSender ? "You" : escapeHtmlJs(otherPartyUsername);
                messageLi.classList.add('message-item','text-sm','p-4','rounded','mb-2','max-w-[80%]','break-words', 'list-none');
                if (isSender) {
                    messageLi.classList.add('bg-blue-100', 'ml-auto', 'text-right');
                } else {
                    messageLi.classList.add('bg-gray-100', 'mr-auto');
                }

                //  messageLi.innerHTML = `
                //      <span class="block">${escapeHtmlJs(message.content)}</span>
                //      <small class="text-gray-500 text-xs">${new Date(message.createdAt).toLocaleString()}</small>
                //  `;
            
                messageLi.innerHTML = `
                <span class="font-semibold block text-xs ${isSender ? 'text-blue-700' : 'text-gray-700'}">${senderName}:</span>
                <span class="block">${escapeHtmlJs(message.content)}</span>
                <small class="text-gray-500 text-xs">${new Date(message.createdAt).toLocaleString()}</small>
            `;
                detailMessageList.appendChild(messageLi);
            });
            detailMessageList.scrollTop = detailMessageList.scrollHeight;
            // console.log("Message list population attempt finished.");
        } else {
            detailMessageList.innerHTML = '<p class="text-gray-500 italic text-center p-4">No messages in this conversation yet.</p>';
            // console.log("No messages found or array was empty.");
        }

        // Prepare reply box
    //    console.log("Preparing reply box...");
        detailConversationIdInput.value = conversationId;
        detailRecipientIdInput.value = otherPartyId; 
        detailReplyTextarea.value = '';
        dashboardReplyStatus.textContent = '';
        dashboardReplyStatus.className = 'text-sm ml-2 h-4';
        detailSendReplyBtn.disabled = false;
        detailReplyTextarea.focus();
       // console.log("Reply box ready.");
    }

    
    window.showConversation = handleShowConversation;

    // --- Define Function to Hide Conversation Detail ---
    function handleHideConversationDetail() {
       // console.log("handleHideConversationDetail called");
        if (!conversationDetailArea || !conversationListArea || !detailConversationIdInput || !detailRecipientIdInput || !detailReplyTextarea || !dashboardReplyStatus) {
             console.error("One or more detail view elements not found!");
             return;
        }
        conversationDetailArea.classList.add('hidden');
        conversationListArea.style.display = 'block';
        detailConversationIdInput.value = '';
        detailRecipientIdInput.value = '';
        detailReplyTextarea.value = '';
        dashboardReplyStatus.textContent = '';
       // console.log("Detail view hidden.");
    }
    // Assign the function to the window scope
    window.hideConversationDetail = handleHideConversationDetail;


    // --- Helper Function ---
    function escapeHtmlJs(unsafe) {
       if (typeof unsafe !== 'string') return '';
       return unsafe
            .replace(/&/g, "&amp;")
            .replace(/</g, "&lt;")
            .replace(/>/g, "&gt;")
            .replace(/"/g, "&quot;")
            .replace(/'/g, "&#039;");
    }

    // --- Event Listener for Reply Button ---
    if (detailSendReplyBtn) {
      //  console.log("Adding event listener to Send Reply button.");
        detailSendReplyBtn.addEventListener('click', () => {
          //  console.log("Send Reply button clicked.");
            if (typeof window.socket === 'undefined' || !window.socket.connected) {
            //    console.error("Socket variable not found or not connected. Ensure messagingClient.js defines 'socket' globally or provides access.");
                if(dashboardReplyStatus) {
                    dashboardReplyStatus.textContent = 'Error: Not connected.';
                    dashboardReplyStatus.className = 'text-red-600 text-sm ml-2 h-4';
                }
                return;
            }
            const body = detailReplyTextarea.value.trim();
            const conversationId = detailConversationIdInput.value;
            const recipientId = detailRecipientIdInput.value;

            if (body && conversationId && recipientId) {
                if(dashboardReplyStatus) {
                    dashboardReplyStatus.textContent = 'Sending...';
                    dashboardReplyStatus.className = 'text-blue-600 text-sm ml-2 h-4';
                }
                detailSendReplyBtn.disabled = true;
               // console.log(`Emitting sendReply: ConvID=${conversationId}, Recipient=${recipientId}`);
                window.socket.emit('sendReply', {
                    conversationId: conversationId,
                    recipientId: recipientId,
                    body: body
                });
            } else {
                // console.warn("Cannot send reply: Missing body, conversationId, or recipientId.");
                 if(dashboardReplyStatus) {
                    dashboardReplyStatus.textContent = 'Cannot send empty reply.';
                    dashboardReplyStatus.className = 'text-red-600 text-sm ml-2 h-4';
                    detailSendReplyBtn.disabled = false;
                }
            }
        });
    } else {
        console.error("Dashboard View Error: Detail Send Reply Button (detail-send-reply-btn) not found on page load.");
    }

}); 
