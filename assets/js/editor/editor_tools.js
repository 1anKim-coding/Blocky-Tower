import {
    toggleBrushType, 
    getSelectedTile, 
    setSelectedTile, 
    changeTool, 
    undoTile, 
    redoTile,
    saveTileMap,
    loadTileMap,
    clearTileMap
} from "./editor.js";
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
        case "brush":
            changeTool("brush");
            break;
        case "fill":
            changeTool("fill");
            break;
        case "line":
            changeTool("line");
            break;
        case "rectangle":
            changeTool("rectangle");
            break;
        case "rotate":
            let tile = getSelectedTile();
            setSelectedTile(
                tile.tileset,
                tile.id,
                (tile.rot - 1) & 3,
            );
            break;
        case "undo":
            undoTile();
            break;
        case "redo":
            redoTile();
            break;
        case "save":
            navigator.clipboard
            .writeText(saveTileMap())
            .then(() => alert("Copied Tilemap!"));
            break;
        case "load":
            const json = prompt("Paste tilemap JSON:");
            if (json) loadTileMap(json);
            break;
        case "clear-tilemap":
            clearTileMap();
            break;
    }
}