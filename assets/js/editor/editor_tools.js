import { toggleRectBrush, toggleBrushType, getSelectedTile, setSelectedTile } from "./editor.js";
const toolbar = document.getElementById('toolbar');
console.log(toolbar);

toolbar.addEventListener('click', (event) => {
    const button = event.target.closest('.tool');

    if (!button) return;

    const isActive = !button.classList.contains('active');

    if (button.dataset.category != "none") {
        if (button.classList.contains('active')) {
            if (button.dataset.category == "brush") {
                button.classList.remove('active');
            }
        } else {
            if (button.dataset.category == "tool") {
                toolbar.querySelectorAll(".tool").forEach(function(element) {
                    if (element.dataset.category == "tool") {
                        element.classList.remove("active")
                    }
                });
            }
            button.classList.add('active');
        }
    }

    handleToolSelection(button, isActive);

});

function handleToolSelection(button, active) {
    switch (button.dataset.action) {
        case "place":
            button.textContent = active ? "Place" : "Erase";
            toggleBrushType(active);
            break;
        case "rectangle":
            toggleRectBrush(active);
            break;
        case "rotate":
            let tile = getSelectedTile();
            setSelectedTile(
                tile.tileset,
                tile.id,
                (tile.rot - 1) & 3,
            );
            break;
    }
}