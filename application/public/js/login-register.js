// log.js

function openModal(ModalId) {
    document.getElementById(ModalId).classList.remove('hidden');
    if (ModalId === 'loginModal') {
        document.getElementById('signupModal').classList.add('hidden');
    }
    if (ModalId === 'signupModal') {
        document.getElementById('loginModal').classList.add('hidden');
    }
}

function closeModal(ModalId) {
    document.getElementById(ModalId).classList.add('hidden');
    if (ModalId === 'signupModal') {
        const errorBox = document.getElementById('signupErrorMessage');
        if (errorBox) {
            errorBox.textContent = '';
            errorBox.classList.add('hidden');
        }
    }

    if (ModalId === 'loginModal') {
        const errorBox = document.getElementById('loginErrorMessage');
        if (errorBox) {
            errorBox.textContent = '';
            errorBox.classList.add('hidden');
        }
    }
}

function switchToSignUp() {
    document.getElementById('loginModal').classList.add('hidden');
    document.getElementById('signupModal').classList.remove('hidden');
}

function switchToLogin() {
    document.getElementById('signupModal').classList.add('hidden');
    document.getElementById('loginModal').classList.remove('hidden');
}
function promptLoginAndRedirect(targetUrl) {
    console.log("Prompting login for target:", targetUrl);
    const loginModal = document.getElementById('loginModal');
    const returnToInput = document.getElementById('loginReturnTo'); 

    if (loginModal && returnToInput) {
        returnToInput.value = targetUrl; // Set the hidden input's value
        openModal('loginModal'); // Open the login modal
    } else {
        if (!loginModal) console.error("Login modal (loginModal) not found.");
        if (!returnToInput) console.error("Hidden input for returnTo (loginReturnTo) not found in login modal.");
       
        // window.location.href = '/'; 
    }
    return false;
}