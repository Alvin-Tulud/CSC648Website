function initMessageBox(messageBoxId) {
    const messageBox = document.getElementById(messageBoxId);
    const closeMessageBoxBtn = document.getElementById("closeMessageBoxBtn");

    // Show the message box
    messageBox.classList.remove("hidden");

    // Close message box when Close button is clicked
    closeMessageBoxBtn.addEventListener("click", () => {
        messageBox.classList.add("hidden");
    });
}

