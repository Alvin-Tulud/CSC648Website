import express from 'express';
import db from "../schema/database.js"; 
import path from "path";
import { fileURLToPath } from "url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const router = express.Router();


router.get('/', async (req, res, next) => {
    const userId = req.session.userId;
    const username = req.session.username;

    if (!userId) {
        console.error('Dashboard route accessed without userId in session.');
        return res.redirect('/');
    }

    console.log(`Fetching dashboard data for user ${userId}...`);

    try {
        const [productsResult, messagesResult] = await Promise.all([
            // --- Fetch products owned by the user ---
            db.query( // Use 'db'
                `SELECT
                    p.productId, p.productName, p.description, p.price, p.isApproved,
                    (SELECT i.name FROM Image_Product i WHERE i.productId = p.productId ORDER BY i.imageId LIMIT 1) AS imageName
                 FROM Product p
                 WHERE p.user = ?
                 ORDER BY p.created_at DESC`,
                [userId]
            ),
            // --- Fetch conversations where the user is EITHER the buyer OR the seller ---
            db.query( // Use 'db'
                `SELECT
                    m.messageId, m.content, m.created_at AS message_created_at, m.sender_id,
                    c.conversationID, c.productID, c.buyerID, c.sellerID,
                    p.productName,
                    buyer.username AS buyerUsername,
                    seller.username AS sellerUsername
                FROM Message m
                JOIN Conversation c ON m.conversationID = c.conversationID
                LEFT JOIN Product p ON c.productID = p.productId
                LEFT JOIN User buyer ON c.buyerID = buyer.userId
                LEFT JOIN User seller ON c.sellerID = seller.userId
                WHERE c.buyerID = ? OR c.sellerID = ?
                ORDER BY c.conversationID, m.created_at ASC
                `,
                [userId, userId]
            )
        ]);

        // console.log("--- Raw Database Results ---");
        // console.log("Products Result Structure:", JSON.stringify(productsResult, null, 2));
        // console.log("Messages Result Structure:", JSON.stringify(messagesResult, null, 2));
        // console.log("----------------------------");

        const productsRaw = Array.isArray(productsResult) ? productsResult[0] : [];
        const messagesRaw = Array.isArray(messagesResult) ? messagesResult[0] : [];

        if (!Array.isArray(productsRaw)) {
             console.error("Error: productsRaw is not an array!", productsRaw);
             return next(new Error("Failed to fetch product data correctly."));
        }
         if (!Array.isArray(messagesRaw)) {
             console.error("Error: messagesRaw is not an array!", messagesRaw);
             return next(new Error("Failed to fetch message data correctly."));
        }

        // Process products:
        const products = productsRaw.map(p => ({
            ...p,
           
            image: p.imageName ? `/dashboard/my-product-image/${p.imageName}` : null 
        }));

        // Process messages: Group by conversation
        const messagesGrouped = messagesRaw.reduce((acc, msg) => {
            const key = msg.conversationID;
            if (!acc[key]) {
                const isUserTheBuyer = msg.buyerID === userId;
                acc[key] = {
                    conversationId: msg.conversationID,
                    productId: msg.productID,
                    productName: msg.productName || '[Product Deleted]',
                    buyerId: msg.buyerID,
                    buyerUsername: msg.buyerUsername || '[User Deleted]',
                    sellerId: msg.sellerID,
                    sellerUsername: msg.sellerUsername || '[User Deleted]',
                    otherPartyUsername: isUserTheBuyer ? (msg.sellerUsername || '[User Deleted]') : (msg.buyerUsername || '[User Deleted]'),
                    otherPartyId: isUserTheBuyer ? msg.sellerID : msg.buyerID,
                    messages: []
                };
            }
            acc[key].messages.push({
                messageId: msg.messageId,
                content: msg.content,
                createdAt: msg.message_created_at,
                sender_id: msg.sender_id
            });
            return acc;
        }, {});

        console.log("Rendering dashboard view...");
        res.render('dashboard', {
            user: username,
            userId: userId,
            products: products,
            conversations: Object.values(messagesGrouped).sort((a,b) => {
                 const lastMsgA = a.messages[a.messages.length - 1]?.createdAt;
                 const lastMsgB = b.messages[b.messages.length - 1]?.createdAt;
                 if (!lastMsgA && !lastMsgB) return 0;
                 if (!lastMsgA) return 1;
                 if (!lastMsgB) return -1;
                 return new Date(lastMsgB) - new Date(lastMsgA);
            })
        });

    } catch (err) {
        console.error(`Error fetching dashboard data for user ${userId}:`, err);
        next(err);
    }
});

// Check if userId is matched, then load the image in dashboard, included product's image that isn't approved.

router.get('/my-product-image/:imageName', async (req, res, next) => {
    const userId = req.session.userId;
    const { imageName } = req.params;

    if (!userId) {
        return res.status(401).send('Unauthorized');
    }
    if (!imageName || typeof imageName !== 'string' || imageName.includes('..') || imageName.includes('/')) {
        return res.status(400).send('Invalid image name.');
    }

    try {
        // Check if the image exists AND belongs to the logged-in user's product
        const query = `
            SELECT p.user
            FROM Image_Product i
            JOIN Product p ON i.productId = p.productId
            WHERE i.name = ? AND p.user = ?
        `;
    
        const [results] = await db.query(query, [imageName, userId]);

        if (results.length === 0) {
            console.log(`Image access denied or not found for user ${userId}, image ${imageName}`);
            return res.status(404).send('Image not found or access denied.');
        }

        // Construct the absolute path to the image file
        const imagePath = path.join(__dirname, '../images_product', imageName); 
        
        res.sendFile(imagePath, (err) => {
            if (err) {
                console.error(`Error sending image file for user ${userId}:`, imageName, err);
                if (!res.headersSent) {
                     res.status(404).send('Image file not found on server.');
                }
            } else {
                //console.log(`Served image ${imageName} to user ${userId}`);
                
            }
        });

    } catch (err) {
        console.error(`Error serving user image for user ${userId}, image ${imageName}:`, err);
        next(err);
    }
});

export default router;
