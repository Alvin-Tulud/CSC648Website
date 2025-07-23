
export default function configureSocketIO(io, pool) {
    io.on('connection', (socket) => {
        const session = socket.request.session;
        if (!session || !session.userId) {
            console.log(`Socket ${socket.id} disconnected: Not authenticated.`);
            return socket.disconnect(true);
        }
        //get userId from login
        const userId = session.userId;
        const userRoom = `user_${userId}`;
        socket.join(userRoom);
        //console.log(`Socket ${socket.id} (User ID: ${userId}) connected and joined room: ${userRoom}`);

        // --- Handler: Initiate message from Listing Page ---
        socket.on('sendMessage', async (data) => {
            const { recipientId, productId, body } = data;
            const senderId = userId; // Logged-in user is the sender (buyer)

           // console.log(`Attempting message send (Listing): Sender=${senderId}, Recipient=${recipientId}, Product=${productId}`);
            if (!recipientId || !productId || !body) {
                console.error(`sendMessage validation failed: Missing fields.`);
                return socket.emit('messageError', { message: 'Missing required message fields.' });
            }
            if (senderId === parseInt(recipientId, 10)) {
                 return socket.emit('messageError', { message: 'Cannot send message to yourself.' });
            }

            let connection;
            try {
                connection = await pool.getConnection();
                await connection.beginTransaction();
                //Check conve exists or not
                let conversationId;
                const [existingConvo] = await connection.execute(
                    `SELECT conversationID FROM Conversation WHERE productID = ? AND buyerID = ? AND sellerID = ?`,
                    [productId, senderId, recipientId]
                );

                if (existingConvo.length > 0) { // If yes, using the currentID otherwise, insert new Conve 
                    conversationId = existingConvo[0].conversationID;
                } else {
                    const [productCheck] = await connection.execute(`SELECT user FROM Product WHERE productId = ?`, [productId]);  
                    if (productCheck.length === 0 || productCheck[0].user !== parseInt(recipientId, 10)) {
                        await connection.rollback();
                        return socket.emit('messageError', { message: 'Product not found or invalid seller.' });
                    }
                    const [newConvoResult] = await connection.execute(
                        `INSERT INTO Conversation (productID, buyerID, sellerID) VALUES (?, ?, ?)`,
                        [productId, senderId, recipientId]
                    );
                    conversationId = newConvoResult.insertId;
                }

                //
                const [messageResult] = await connection.execute(
                   `INSERT INTO Message (conversationID, content, sender_id, created_at) VALUES (?, ?, ?, NOW())`,
                   [conversationId, body.trim(), senderId] 
                );
                const newMessageId = messageResult.insertId;

                await connection.commit();

                // --- Notify Recipient (Seller) ---
                const [senderInfo] = await connection.query('SELECT username FROM User WHERE userId = ?', [senderId]);
                const senderUsername = senderInfo[0]?.username || 'Unknown User';
                const [productInfo] = await connection.query('SELECT productName FROM Product WHERE productId = ?', [productId]);
                const productName = productInfo[0]?.productName || 'Unknown Product';

                const messageDataForRecipient = {
                    messageId: newMessageId,
                    conversationId: conversationId,
                    senderId: senderId,
                    senderUsername: senderUsername,
                    recipientId: recipientId,
                    productId: productId,
                    productName: productName, 
                    body: body.trim().substring(0, 100) + (body.trim().length > 100 ? '...' : ''),
                    createdAt: new Date(),
            
                };

                const recipientRoom = `user_${recipientId}`;
                io.to(recipientRoom).emit('newMessage', messageDataForRecipient);// where the live communication start
                console.log(`Emitted 'newMessage' (ID: ${newMessageId}) to room: ${recipientRoom}`);
                // --- Send Confirmation back to Sender---


                // emit is where we init the command or data send to the server
                // socket.on - where we catch the data and insert into database
                //io manager to let the server knows that an activity just appear in server.


                socket.emit('messageSent', { messageId: newMessageId, conversationId: conversationId, recipientId: recipientId });

            } catch (err) {
                if (connection) await connection.rollback();
                console.error(`Error in sendMessage from ${senderId} to ${recipientId}:`, err);
                socket.emit('messageError', { message: 'Failed to send message.' });
            } finally {
                if (connection) connection.release();
            }
        });

        // --- Handler: Send Reply from Dashboard ---
        socket.on('sendReply', async (data) => {
            const { conversationId, recipientId, body } = data; 
            const senderId = userId;

          //  console.log(`Attempting reply send (Dashboard): Sender=${senderId}, Recipient=${recipientId}, Conversation=${conversationId}`);

            if (!conversationId || !recipientId || !body) {
                 console.error(`sendReply validation failed: Missing fields.`);
                 return socket.emit('messageError', { message: 'Missing required reply fields.' });
            }
             if (senderId === parseInt(recipientId, 10)) {
                 return socket.emit('messageError', { message: 'Cannot reply to yourself.' });
            }

            let connection;
            try {
                connection = await pool.getConnection();
                await connection.beginTransaction();

                // --- Verify Conversation and User Participation ---
                
                // Ensure the sender is actually part of this conversation
                const [convoCheck] = await connection.execute(
                    `SELECT conversationID, buyerID, sellerID FROM Conversation WHERE conversationID = ? AND (buyerID = ? OR sellerID = ?)`,
                    [conversationId, senderId, senderId]
                );
                 if (convoCheck.length === 0) {
                    await connection.rollback();
                    console.error(`sendReply failed: User ${senderId} not part of conversation ${conversationId}.`);
                    return socket.emit('messageError', { message: 'Cannot reply to this conversation.' });
                 }
                 // Ensure the recipient is the *other* party in the conversation
                 const convo = convoCheck[0];
                 const expectedRecipientId = (senderId === convo.buyerID) ? convo.sellerID : convo.buyerID;
                 if (parseInt(recipientId, 10) !== expectedRecipientId) {
                    await connection.rollback();
                    console.error(`sendReply failed: Recipient ID ${recipientId} does not match other party in conversation ${conversationId}. Expected ${expectedRecipientId}.`);
                    return socket.emit('messageError', { message: 'Invalid recipient for this conversation.' });
                 }


                // --- Insert Message ---
                const [messageResult] = await connection.execute(
                   `INSERT INTO Message (conversationID, content, sender_id, created_at) VALUES (?, ?, ?, NOW())`,
                   [conversationId, body.trim(), senderId] 
                );
                const newMessageId = messageResult.insertId;
              //  console.log(`Reply message inserted: ID ${newMessageId} into Conversation ${conversationId}`);

                await connection.commit();

            
                const [senderInfo] = await connection.query('SELECT username FROM User WHERE userId = ?', [senderId]);
                const senderUsername = senderInfo[0]?.username || 'Unknown User';
            
                const [productInfo] = await connection.query(
                    `SELECT p.productName, p.productId FROM Product p JOIN Conversation c ON p.productId = c.productID WHERE c.conversationID = ?`,
                    [conversationId]
                );
                const productName = productInfo[0]?.productName || 'Unknown Product';
                const productId = productInfo[0]?.productId;

                const messageDataForRecipient = {
                    messageId: newMessageId,
                    conversationId: conversationId,
                    senderId: senderId,
                    senderUsername: senderUsername,
                    recipientId: recipientId, 
                    productId: productId,
                    productName: productName,
                    body: body.trim().substring(0, 100) + (body.trim().length > 100 ? '...' : ''),
                    createdAt: new Date(),
                   
                };

                const recipientRoom = `user_${recipientId}`;
                io.to(recipientRoom).emit('newMessage', messageDataForRecipient);
                //console.log(`Emitted 'newMessage' (Reply ID: ${newMessageId}) to room: ${recipientRoom}`);

                // --- Send Confirmation back to Sender---
                 const replyDataForSender = {
                    messageId: newMessageId,
                    conversationId: conversationId,
                    senderId: senderId,
                    body: body.trim(), 
                    createdAt: new Date(),
                };
                socket.emit('replySent', { 
                    messageId: newMessageId,
                    conversationId: conversationId,
                    recipientId: recipientId,
                    newMessageData: replyDataForSender // Send back the message data
                });

            } catch (err) {
                 if (connection) await connection.rollback();
                 console.error(`Error in sendReply from ${senderId} to ${recipientId}:`, err);
                 socket.emit('messageError', { message: 'Failed to send reply.' });
            } finally {
                if (connection) connection.release();
            }
        });


        // --- Handle Disconnect ---
        socket.on('disconnect', () => {
            console.log(`User ID ${userId} (Socket ID: ${socket.id}) disconnected.`);
        });
    });

    console.log('Socket.IO Handler Initialized and Ready.');
}
