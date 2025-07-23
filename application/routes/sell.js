
import express from 'express';
import multer from 'multer';
import sharp from 'sharp';
import connectToDatabase from '../schema/database.js'; 
import path from "path";
import { fileURLToPath } from 'url';
import isAuthenticated from '../middleware/isAuthenticated.js'; 

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const router = express.Router();

// create prefix abs image path
const imageDir = path.join(__dirname, '../images_product'); 

// Configure Multer 
const storage = multer.memoryStorage();
const upload = multer({
    storage: storage,
    limits: { fileSize: 10 * 1024 * 1024 },
    fileFilter: (req, file, cb) => {
        if (file.mimetype.startsWith('image/')) {
            cb(null, true);
        } else {
            cb(new Error('Only image files are allowed!'), false);
        }
    }
});


router.get('/', isAuthenticated, (req, res) => {
   
    res.render('sell', {
        title: "Sell Item",
        user: req.session.username, 
        errorMessage: null, 
        successMessage: null
    });
});

router.post('/upload', isAuthenticated, upload.single('fileName'), async (req, res) => {
   
    const userId = req.session.userId;
    if (!userId) {
       
        return res.status(401).send("Authentication required.");
    }

    
    if (!req.file) {
        return res.status(400).render('sell', {
            title: "Sell Item",
            user: req.session.username,
            errorMessage: "Please select an image file to upload.",
            successMessage: null
        });
    }

    try {
        const {
            productName,
            description,
            price,
            className, 
            quantity,
            category,
        } = req.body;


        if (!productName || !price || !quantity || !category) {
             return res.status(400).render('sell', {
                title: "Sell Item", user: req.session.username,
                errorMessage: "Missing required product fields.", successMessage: null
            });
        }
        const priceNum = parseFloat(price);
        const quantityNum = parseInt(quantity, 10);
        if (isNaN(priceNum) || priceNum < 0 || isNaN(quantityNum) || quantityNum <= 0) {
             return res.status(400).render('sell', {
                title: "Sell Item", user: req.session.username,
                errorMessage: "Invalid price or quantity.", successMessage: null
            });
        }

        // --- Database: Insert Product ---
       
        const [productResult] = await connectToDatabase.execute(
            `INSERT INTO Product (productName, description, price, class, quantity, category, user)
             VALUES (?, ?, ?, ?, ?, ?, ?)`, 
            [
                productName.trim(),
                description.trim(),
                priceNum,
                className?.trim() || null, 
                quantityNum,
                category, 
                userId,
            ]
        );

        const productId = productResult.insertId;
        console.log(`Product inserted with ID: ${productId}`);

        // --- Image Processing and Saving ---
        const imageBuffer = req.file.buffer;
        const fileExt = path.extname(req.file.originalname).toLowerCase();
        const baseName = path.basename(req.file.originalname, fileExt);
        // Create a more robust unique filename
        const uniqueSuffix = `${Date.now()}-${Math.round(Math.random() * 1E5)}`;
        const fileName = `${baseName.replace(/[^a-z0-9]/gi, '_')}-${uniqueSuffix}${fileExt}`; 
        const outputPath = path.join(imageDir, fileName);

        // Resize and save image using Sharp
        await sharp(imageBuffer)
            .resize({ width: 800, height: 800, fit: 'inside', withoutEnlargement: true })
            .toFormat(fileExt === '.png' ? 'png' : 'jpeg', { quality: 85 }) 
            .toFile(outputPath);
        console.log(`Image processed and saved to: ${outputPath}`);

        // --- Database: Insert Image Record ---
   
        await connectToDatabase.execute(
            `INSERT INTO Image_Product (name, productId) VALUES (?, ?)`,
            [fileName, productId]
        );
        console.log(`Image record inserted for product ID: ${productId}`);

        // --- Success Response ---
    
         res.render('sell', {
            title: "Sell Item",
            user: req.session.username,
            errorMessage: null,
            successMessage: "Product listing created successfully! It will be visible after approval."
        });
        // Or redirect: res.redirect('/dashboard?status=created');

    } catch (err) {
        console.error("Upload Error:", err);
        
        let errorMessage = "Something went wrong during upload.";
        if (err.message === 'Only image files are allowed!') {
            errorMessage = err.message;
        }
        res.status(500).render('sell', {
            title: "Sell Item",
            user: req.session.username,
            errorMessage: errorMessage,
            successMessage: null
        });
    }
});

export default router;