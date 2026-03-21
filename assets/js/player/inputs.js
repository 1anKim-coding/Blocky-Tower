// Track which keys are currently pressed
export const keys = {};

// Listen for key presses
document.addEventListener('keydown', (e) => {
    keys[e.key.toLowerCase()] = true;
});

// Listen for key releases
document.addEventListener('keyup', (e) => {
    keys[e.key.toLowerCase()] = false;
});