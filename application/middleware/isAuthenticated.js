export default function isAuthenticated(req, res, next) {
    // Check if userId 
    if (req.session && req.session.userId) {
        //  proceed to the next handler
        return next();
    } else {
        // User is not authenticated, redirect to the login page
        console.log('User not authenticated, redirecting to /');
        res.redirect('/'); // Redirect to home/login page
    }
}