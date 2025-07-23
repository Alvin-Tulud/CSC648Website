import express from 'express';
import connectToDatabase from "../schema/database.js"; // Ensure path is correct
import path from "path";
import { fileURLToPath } from "url";

const __filename = fileURLToPath(
    import.meta.url);
const __dirname = path.dirname(__filename);
const router = express.Router();

// Base URL prefix for images 
const IMAGE_URL_PREFIX = `/images_product/`;


router.get('/', async(req, res, next) => {
    const { keyWord, category, classKey, minPrice, maxPrice } = req.query;

    // Get user info from session (use userId and username)
    const userId = req.session.userId;
    const username = req.session.username;

    // Get flash messages from session and clear them immediately
    const signUpError = req.session.signUpError;
    const loginError = req.session.loginError;

    delete req.session.signUpError; // Clear after reading
    delete req.session.loginError; // Clear after reading



    let query = `
        SELECT
            p.productId, p.productName, p.description, p.price, p.class, p.quantity, p.category,
            (SELECT i.name FROM Image_Product i WHERE i.productId = p.productId ORDER BY i.imageId LIMIT 1) AS imageName
        FROM Product p
        WHERE p.isApproved = 1  
    `;
    let queryParams = [];

    // --- Filtering Logic ---
    if (classKey && classKey.trim() !== '') {

        query += ` AND LOWER(p.class) LIKE ?`;
        queryParams.push(`%${classKey.toLocaleLowerCase().trim()}%`);
    }
    if (category) {
        query += ` AND p.category = ?`;
        queryParams.push(category);
    }
    if (keyWord) {
        query += ` AND (p.productName LIKE ? OR p.description LIKE ?)`;
        const searchTerm = `%${keyWord}%`;
        queryParams.push(searchTerm, searchTerm);
    }


    let minP = parseFloat(minPrice);
    let maxP = parseFloat(maxPrice);

    if (!isNaN(minP) && minP >= 0) {
        query += ` AND p.price >= ?`;
        queryParams.push(minP);
    }
    if (!isNaN(maxP) && maxP >= 0 && (isNaN(minP) || maxP >= minP)) {
        query += ` AND p.price <= ?`;
        queryParams.push(maxP);
    }

    // --- Sorting ---

    query += ` ORDER BY p.price ASC`;

    try {
        // Execute the query using promises
        const [results] = await connectToDatabase.query(query, queryParams);


        const products = results.map(row => ({
            productId: row.productId,
            name: row.productName,
            description: row.description,
            price: row.price,
            class: row.class,
            quantity: row.quantity,
            category: row.category,

            image: row.imageName ? `${IMAGE_URL_PREFIX}${row.imageName}` : '/images/DuckMom.png'
        }));

        res.render('home', {
            // Pass session/user info
            user: username, // Pass username for display
            userId: userId, // Pass userId if needed in template
            // Pass errors
            signUpError: signUpError,
            loginError: loginError,
            // Pass search results and parameters
            products: products,
            productCount: products.length,
            keyWord: keyWord,
            category: category, 
            classKey: classKey,
            minPrice: minPrice,
            maxPrice: maxPrice,
            url: req.originalUrl
        });

    } catch (err) {
        console.error('Error fetching products:', err);
        next(err);
    }
});


router.get('/images_product/:imageName', async(req, res, next) => {
    const { imageName } = req.params;
    if (!imageName) {
        return res.status(400).send('Image name required.');
    }

    try {
        // Check if the image exists AND belongs to an approved product
        const query = `
            SELECT p.isApproved
            FROM Image_Product i
            JOIN Product p ON i.productId = p.productId
            WHERE i.name = ? AND p.isApproved = 1 -- Check approval status
        `;
        const [results] = await connectToDatabase.query(query, [imageName]);

        if (results.length === 0) {

            return res.status(404).send('Image not found or not available.');
        }


        const imagePath = path.join(__dirname, '../images_product', imageName);

        // Send the file
        res.sendFile(imagePath, (err) => {
            if (err) {
                console.error("Error sending image file:", err);

                if (!res.headersSent) {
                    res.status(404).send('Image not found.');
                }
            }
        });

    } catch (err) {
        console.error('Error serving image:', err);
        next(err); // Pass error to global handler
    }
});

router.get('/listing/:id', async(req, res, next) => {
    const productId = req.params.id;
    const userId = req.session.userId; // Get current user's ID
    const username = req.session.username; // Get current user's username

    if (isNaN(parseInt(productId, 10))) {
        return res.status(400).send('Invalid Product ID');
    }

    try {
        // Fetch product details, image, and seller username
        const query = `
            SELECT
                p.productId, p.productName, p.description, p.price, p.class, p.quantity, p.category, p.user AS ownerId,
                u.username AS sellerUsername,
                (SELECT i.name FROM Image_Product i WHERE i.productId = p.productId ORDER BY i.imageId LIMIT 1) AS imageName
            FROM Product p
            JOIN User u ON p.user = u.userId 
            WHERE p.productId = ? AND p.isApproved = 1 
        `;
        const [rows] = await connectToDatabase.query(query, [productId]);

        if (rows.length === 0) {
            return res.status(404).send('Product not found or not approved.');
        }

        const row = rows[0];
        const product = {
            productId: row.productId,
            name: row.productName,
            description: row.description,
            price: row.price,
            class: row.class,
            quantity: row.quantity,
            category: row.category,
            ownerId: row.ownerId, // ID of the user selling the product
            sellerUsername: row.sellerUsername, // Username of the seller
            image: row.imageName ? `${IMAGE_URL_PREFIX}${row.imageName}` : '/images/placeholder.png'
        };

        res.render('listing', {
            user: username, // Current user's username
            userId: userId, // Current user's ID
            product: product
        });

    } catch (err) {
        console.error('Error fetching product details:', err);
        next(err);
    }
});

export default router;