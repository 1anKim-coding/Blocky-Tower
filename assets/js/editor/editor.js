import { getTileSize, drawTile, TILE_TYPE, TILESET } from "../tiles/tiles.js";
import { CAMERA_X, CAMERA_Y, changeCameraPos } from "../update.js";
import { getTile, setTile, getTileTypeName, clearTilemap, getTilemap, tileMap } from "../tiles/tilemap.js";
import { getTileShapePoints } from "../tiles/tile_collision.js";

// Editor mode
let editorMode = true;
export let selectedTile = { "tileset": 0, "id": 0, "rot": 0 }; //0 is NOT AIR, its the starting tile

// Set up canvas click handlers
let mouseX = 0;
let mouseY = 0;
let isMouseDown = false;
let currentButton = 0;

//INPUTS
window.addEventListener('keydown', (e) => {
    const key = e.key.toLowerCase();

    // Toggle editor
    if (key === 'tab') {
        toggleEditorMode();
        return;
    }

    // Cycle tile ID backward (Q)
    if (key === 'q') {
        const tileset = selectedTile.tileset;
        const total = TILESET[tileset].total;

        let newId = selectedTile.id - 1
        if (newId < 0) {
            newId = total - 1;
        }
        let newTile = { "tileset": tileset, "id": newId, "rot": selectedTile.rot }
        while (getTileTypeName(newTile) === TILE_TYPE.AIR) {
            newId -= 1
            newTile = { "tileset": tileset, "id": newId, "rot": selectedTile.rot }
        }

        setSelectedTile(tileset, newId, selectedTile.rot);
        return;
    }

    // Cycle tile ID forward (E)   
    if (key === 'e') {
        const tileset = selectedTile.tileset;
        const total = TILESET[tileset].cols * TILESET[tileset].rows;

        const newId = (selectedTile.id + 1) % total;

        setSelectedTile(tileset, newId, selectedTile.rot);
        return;
    }

    // Rotate clockwise (T)
    if (key === 't') {
        setSelectedTile(
            selectedTile.tileset,
            selectedTile.id,
            (selectedTile.rot + 1) & 3
        );
        return;
    }

    // Rotate counter‑clockwise (R)
    if (key === 'r') {
        setSelectedTile(
            selectedTile.tileset,
            selectedTile.id,
            (selectedTile.rot + 3) & 3 // same as -1 wrapped
        );
        return;
    }
    //reset tilemap
    if (key === 'delete') {
        clearTilemap();
        return;
    }

    // Switch tileset (0)
    // toggle between 0 and 1 using bitwise wrap
    if (key === '0') {
        const newTileset = (selectedTile.tileset + 1) & 1;
        setSelectedTile(newTileset, 0, selectedTile.rot);
        return;
    }

    // Copy tilemap (O)
    if (key === 'o') {
        navigator.clipboard.writeText(saveTileMap())
            .then(() => alert("Copied Tilemap as text!"))
            .catch(err => console.error('Copy failed:', err));
        return;
    }

    // Load tilemap (L)
    if (key === 'l') {
        const json = prompt("Paste tilemap JSON:");
        if (json) loadTileMap(json);
        return;
    }

    if (key === '1') {
        changeCameraPos(0, 0);
        return;
    }
});

function getMouseCanvasPos(e, canvas) {
    const rect = canvas.getBoundingClientRect();

    // scale mouse to canvas resolution
    const scaleX = canvas.width / rect.width;
    const scaleY = canvas.height / rect.height;

    const x = (e.clientX - rect.left) * scaleX;
    const y = (e.clientY - rect.top) * scaleY;

    return { x, y };
}

export function setupCanvasClickHandlers(canvas) {

    function updateMouseEditor() {
        if (!isMouseDown || !isEditorMode()) return;

        const tileSize = getTileSize();

        // convert canvas -> world
        const worldX = mouseX + CAMERA_X;
        const worldY = mouseY + CAMERA_Y;

        // convert world -> grid
        const gridX = Math.floor(worldX / tileSize);
        const gridY = Math.floor(worldY / tileSize);

        if (currentButton === 0) setTile(gridX, gridY, selectedTile);
        else if (currentButton === 2) removeTile(gridX, gridY);
    }

    canvas.addEventListener('mousedown', (e) => {
        if (!isEditorMode()) return;
        isMouseDown = true;
        currentButton = e.button;

        const pos = getMouseCanvasPos(e, canvas);
        mouseX = pos.x;
        mouseY = pos.y;

        updateMouseEditor();
        if (e.button === 2) e.preventDefault();
    });

    canvas.addEventListener('mousemove', (e) => {
        const pos = getMouseCanvasPos(e, canvas);
        mouseX = pos.x;
        mouseY = pos.y;

        updateMouseEditor();
    });

    canvas.addEventListener('mouseup', () => {
        isMouseDown = false;
    });

    canvas.addEventListener('contextmenu', (e) => e.preventDefault());

    return updateMouseEditor;
}

export function toggleEditorMode() {
    editorMode = !editorMode;
    console.log(editorMode ? "Editor Mode ON" : "Editor Mode OFF");
}

export function isEditorMode() {
    return editorMode;
}

export function setSelectedTile(tileset, id, rot) {
    selectedTile = { "tileset": tileset, "id": id, "rot": rot };
    console.log(`Selected tile type: ${selectedTile}`);
}

// Handle canvas click for placing/removing tiles
export function handleCanvasClick(canvas, event, cameraX, cameraY) {
    if (!editorMode) return;

    const tileSize = getTileSize();
    const rect = canvas.getBoundingClientRect();
    const screenX = event.clientX - rect.left;
    const screenY = event.clientY - rect.top;

    // Convert screen coordinates to world coordinates
    const worldX = screenX + cameraX;
    const worldY = screenY + cameraY;

    // Convert to grid coordinates
    gridX = Math.floor(worldX / tileSize);
    gridY = Math.floor(worldY / tileSize);

    // Left click = place, right click = remove
    if (event.button === 0) {
        placeTile(gridX, gridY, selectedTile);
    } else if (event.button === 2) {
        removeTile(gridX, gridY);
    }
}

// Remove tile at grid position
export function removeTile(gridX, gridY) {
    setTile(gridX, gridY, { "tileset": 0, "id": -1, "rot": 0 });
}

export function displayPreviewTile(ctx) {
    if (!isEditorMode()) return;

    const tileSize = getTileSize();
    // Convert mouse canvas position to world coordinates
    const worldX = mouseX + CAMERA_X;
    const worldY = mouseY + CAMERA_Y;

    // Convert world coordinates to grid coordinates
    const previewGridX = Math.floor(worldX / tileSize);
    const previewGridY = Math.floor(worldY / tileSize);

    // Convert back to screen coordinates for rendering
    const screenX = previewGridX * tileSize - CAMERA_X;
    const screenY = Math.floor(previewGridY * tileSize - CAMERA_Y);

    // Set preview color
    if (selectedTile.id == -1) {
        const previewColor = "rgba(255, 0, 0, 0.5)";
        ctx.fillStyle = previewColor;
        ctx.fillRect(screenX, screenY, tileSize, tileSize);
    } else {
        ctx.save();
        ctx.globalAlpha = 0.5;

        // Draw the preview tile
        drawTile(ctx, selectedTile, screenX, screenY);
        ctx.restore();

        if (selectedTile.id != TILE_TYPE.AIR) {
            ctx.strokeStyle = "blue";
            ctx.lineWidth = 1;
            const points = getTileShapePoints(selectedTile).points.map(p => [
                Math.round(p[0] * tileSize + screenX),
                Math.round(p[1] * tileSize + screenY)
            ]);

            for (let i = 0; i < points.length; i++) {
                const next = points[(i + 1) % points.length];
                ctx.beginPath();
                ctx.moveTo(points[i][0], points[i][1]);
                ctx.lineTo(next[0], next[1]);
                ctx.stroke();
            }
        }
    }
}

// Save tilemap to JSON
export function saveTileMap() {
    const json = JSON.stringify(getTilemap());
    console.log("Tilemap saved:", json);
    return json;
}

// Load tilemap from JSON
export function loadTileMap(json) {
    const loaded = JSON.parse(json);
    Object.keys(tileMap).forEach(key => delete tileMap[key]);
    Object.assign(tileMap, loaded);
    console.log("Tilemap loaded");
}

export async function loadLevel(level) {
    const path = "assets/data/levels.json";
    const response = await fetch(path);
    const levels_data = await response.json();

    console.log("Loaded LEVEL", level);

    const level_json = levels_data.LEVELS[level.toString()];
    if (!level_json) return;
    loadTileMap(JSON.stringify(level_json));
}

// Clear all tiles
export function clearTileMap() {
    Object.keys(tileMap).forEach(key => delete tileMap[key]);
    console.log("Tilemap cleared");
}
