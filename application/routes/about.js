import express from 'express';

const router = express.Router();



router.use((req, res, next) => {

    res.locals.user = req.session.username || null;
    res.locals.userId = req.session.userId || null;

    res.locals.signUpError = req.session.signUpError || null;
    res.locals.loginError = req.session.loginError || null;

    if (req.session.signUpError) delete req.session.signUpError;
    if (req.session.loginError) delete req.session.loginError;

    next();
});

//About page

// Main About page
router.get('/', (req, res) => {
   
    res.render('about', { title: "About Us" });
});

// Team member pages
router.get('/about_Alvin', (req, res) => {
    res.render('about_Us/about_Alvin', { title: "About Alvin" });
});

router.get('/about_Angelie', (req, res) => {
    res.render('about_Us/about_Angelie', { title: "About Angelie" });
});

router.get('/about_Chan-Chun', (req, res) => {
    res.render('about_Us/about_Chan-Chun', { title: "About Chan-Chun" });
});

router.get('/about_Lap', (req, res) => {
    res.render('about_Us/about_Lap', { title: "About Lap" });
});

export default router;