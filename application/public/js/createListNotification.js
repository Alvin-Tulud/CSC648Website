// This script handles the display of success and error notifications for creating a list.
document.addEventListener('DOMContentLoaded', () => {
    setTimeout(() => {
        const successToast = document.getElementById('toast-success');
        const errorToast = document.getElementById('toast-error');
        [successToast, errorToast].forEach(toast => {
            if (toast) {
                toast.style.transition = 'opacity 0.5s ease';
                toast.style.opacity = '0';
                setTimeout(() => toast.remove(), 500);
            }
        });
    }, 3000);
});