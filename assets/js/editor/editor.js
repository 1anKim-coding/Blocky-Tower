import { getTileSize, drawTile, TILE_TYPE, TILESET } from "../tiles/tiles.js";
import {
    CAMERA_X,
    CAMERA_Y,
    changeCameraPos,
    toggleHitbox,
} from "../update.js";
import {
    getTile,
    setTile,
    getTileTypeName,
    getTilemap,
    tileMap,
} from "../tiles/tilemap.js";
import { getTileShapePoints } from "../tiles/tile_collision.js";
import { getAutoTile } from "../tiles/autotile.js";
import { showHitbox } from "../update.js";

// Editor state
let editorMode = true;
export let brushType = true; //brush (true) or remove (false)

let brushTool = "brush";
let rectStartX = null;
let rectStartY = null;

export let autoTileMode = true;
export let selectedTile = { tileset: 0, id: 0, rot: 0 };

// Mouse state
let mouseX = 0;
let mouseY = 0;
let isMouseDown = false;
let currentButton = 0;

// --------------------
// INPUT HANDLERS
// --------------------
window.addEventListener("keydown", (e) => {
    const key = e.key.toLowerCase();

    if (key === "escape") return toggleEditorMode();
    if (key === "z") return toggleAutotileMode();
    if (key === "h") return toggleHitbox();

    let tileset = selectedTile.tileset;
    let total = TILESET[tileset].total;

    if (key === "e") {
        let ts = selectedTile.tileset;
        let id = selectedTile.id;
        //safety loop to not crash
        for (let i = 0; i < 500; i++) {
            id++;

            if (id >= TILESET[ts].total) {
                id = 0;
                ts = (ts + 1) % 2;
            }
            if (getTileTypeName({ tileset: ts, id: id, rot: 0 }) !== TILE_TYPE.AIR) {
                return setSelectedTile(ts, id, selectedTile.rot);
            }
        }
    }

    if (key === "q") {
        let ts = selectedTile.tileset;
        let id = selectedTile.id;

        for (let i = 0; i < 500; i++) {
            id--;
            if (id < 0) {
                ts = (ts + 1) % 2;
                id = TILESET[ts].total - 1;
            }

            if (getTileTypeName({ tileset: ts, id: id, rot: 0 }) !== TILE_TYPE.AIR) {
                return setSelectedTile(ts, id, selectedTile.rot);
            }
        }
    }

    if (key === "t")
        return setSelectedTile(
            tileset,
            selectedTile.id,
            (selectedTile.rot + 1) & 3,
        );
    if (key === "r")
        return setSelectedTile(
            tileset,
            selectedTile.id,
            (selectedTile.rot + 3) & 3,
        );
    if (key === "delete") return clearTileMap();

    if (key === "o") {
        navigator.clipboard
            .writeText(saveTileMap())
            .then(() => alert("Copied Tilemap!"));
        return;
    }

    if (key === "l") {
        const json = prompt("Paste tilemap JSON:");
        if (json) loadTileMap(json);
        return;
    }

    if (key === "1") changeCameraPos(0, 0);
    if (key === "2") toggleRectBrush();
});

// --------------------
// MOUSE HELPERS
// --------------------
function getMouseCanvasPos(e, canvas) {
    const rect = canvas.getBoundingClientRect();
    const scaleX = canvas.width / rect.width;
    const scaleY = canvas.height / rect.height;
    return {
        x: (e.clientX - rect.left) * scaleX,
        y: (e.clientY - rect.top) * scaleY,
    };
}

// --------------------
// CANVAS CLICK SETUP
// --------------------
export function setupCanvasClickHandlers(canvas) {
    const PANEL_WIDTH = 150; // Defined once for consistency

    function updateMouseEditor() {
        if (!isMouseDown || !isEditorMode()) return;

        // STOP if mouse is over the UI panel Rect
        if (mouseX < PANEL_WIDTH) return;

        const tileSize = getTileSize();
        const gridX = Math.floor((mouseX + CAMERA_X) / tileSize);
        const gridY = Math.floor((mouseY + CAMERA_Y) / tileSize)

        if (currentButton === 0) {
            toolPlaceTile(gridX, gridY);
        } else if (currentButton === 2) {
            removeTile(gridX, gridY);
        }
    }

    canvas.addEventListener("mousedown", (e) => {

        isMouseDown = true;
        currentButton = e.button;
        updateMouseEditor();

        if (e.button === 2) e.preventDefault();
    });

    canvas.addEventListener("mousemove", (e) => {
        const pos = getMouseCanvasPos(e, canvas);
        mouseX = pos.x;
        mouseY = pos.y;
        updateMouseEditor();
    });

    canvas.addEventListener("mouseup", () => {
        isMouseDown = false;

        if (brushRect && rectStartX != null && rectStartY != null) {
            if (mouseX < PANEL_WIDTH) return;

            const tileSize = getTileSize();
            const gridX = Math.floor((mouseX + CAMERA_X) / tileSize);
            const gridY = Math.floor((mouseY + CAMERA_Y) / tileSize);
            rectPlaceTile(rectStartX, rectStartY, gridX, gridY);
            rectStartX = null;
            rectStartY = null;
        }
    });

    canvas.addEventListener("contextmenu", (e) => e.preventDefault());

    return updateMouseEditor;
}


// --------------------
// EDITOR STATE
// --------------------
export function toggleEditorMode() {
    editorMode = !editorMode;
    Object.keys(tileMap).forEach(function(key) {
        const tile = tileMap[key];
        const grid = key.split(','); // string with "x,y" spilt makes to a list [x, y]
        const gridX = grid[0];
        const gridY = grid[1];
        if (tile.tileset == 0 && tile.id == 15) { //deactivated jump block
            setTile(gridX, gridY, { tileset: 0, id: 14, rot: tile.rot }); //jump block
        }
    })
    console.log(editorMode ? "Editor Mode ON" : "Editor Mode OFF");
}

export function toggleAutotileMode() {
    autoTileMode = !autoTileMode;
    console.log(autoTileMode ? "Autotile Mode ON" : "Autotile Mode OFF");
}

export function isEditorMode() {
    return editorMode;
}

export function setSelectedTile(tileset, id, rot) {
    selectedTile = { tileset, id, rot };
    console.log(`Selected tile:`, selectedTile);
}

export function getSelectedTile() {
    return selectedTile;
}

export function toggleRectBrush(state) {
    brushRect = state || !brushRect;
    console.log("Brush Rect")
}

export function toggleBrushType(state) {
    brushType = state || !brushType;
    console.log("Brush Rect")
}

// --------------------
// TILE PLACEMENT/REMOVAL
// --------------------
export function handleCanvasClick(canvas, event, cameraX, cameraY) {
    if (!editorMode) return;

    const tileSize = getTileSize();
    const rect = canvas.getBoundingClientRect();
    const worldX = event.clientX - rect.left + cameraX;
    const worldY = event.clientY - rect.top + cameraY;
    const gridX = Math.floor(worldX / tileSize);
    const gridY = Math.floor(worldY / tileSize);

    if (event.button === 0) {
        toolPlaceTile(gridX, gridY);
    } else if (event.button === 2) {
        // remove
        removeTile(gridX, gridY);
    }
}

export function removeTile(gridX, gridY) {
    setTile(gridX, gridY, { tileset: 0, id: -1, rot: 0, manual: false });
}

function toolPlaceTile(gridX, gridY) {
    if (brushRect) {
        if (rectStartX != null && rectStartX != null) return;
        rectStartX = gridX;
        rectStartY = gridY;
    } else placeTile(gridX, gridY);
}

function placeTile(gridX, gridY) {
    if (brushType == "remove") {
        removeTile(gridX, gridY);
        return;
    }
    if (brushType) {
        setTile(gridX, gridY, selectedTile);

        if (autoTileMode) {
            const tileType = getTileTypeName(selectedTile);
            if (tileType !== TILE_TYPE.AIR) {
                updateAutoTile(gridX, gridY, tileType);
            }
        }
    } else removeTile(gridX, gridY);
}

function rectPlaceTile(x0, y0, x1, y1) {
    const startX = Math.min(x0, x1);
    const startY = Math.min(y0, y1);
    const endX = Math.max(x0, x1);
    const endY = Math.max(y0, y1);
    for (let x = startX; x < endX + 1; x++) {
        for (let y = startY; y < endY + 1; y++) {
            placeTile(x, y);
        }
    }
}

// --------------------
// AUTO TILE UPDATE
// --------------------
function updateAutoTile(gridX, gridY, tileType) {
    for (let dx = -1; dx < 2; dx++) {
        for (let dy = -1; dy < 2; dy++) {
            const tile = getTile(gridX + dx, gridY + dy);
            if (!tile) continue;
            const type = getTileTypeName(tile);
            if (type === TILE_TYPE.AIR || type !== tileType) continue;
            let newAutoTile = getAutoTile(gridX + dx, gridY + dy, tileType);
            if (!newAutoTile) newAutoTile = tile;
            setTile(
                gridX + dx,
                gridY + dy,
                newAutoTile
            );
        }
    }
}

// --------------------
// TILE PREVIEW
// --------------------
export function displayPreviewTile(ctx) {
    if (!isEditorMode()) return;

    const tileSize = getTileSize();
    const previewGridX = Math.floor((mouseX + CAMERA_X) / tileSize);
    const previewGridY = Math.floor((mouseY + CAMERA_Y) / tileSize);
    const screenX = previewGridX * tileSize - CAMERA_X;
    const screenY = previewGridY * tileSize - CAMERA_Y;

    if (selectedTile.id === -1) {
        ctx.fillStyle = "rgba(255,0,0,0.5)";
        ctx.fillRect(screenX, screenY, tileSize, tileSize);
    } else {
        if (brushRect && rectStartX != null && rectStartY != null) {
            for (let x = Math.min(rectStartX, previewGridX); x < Math.max(rectStartX, previewGridX) + 1; x++) {
                for (let y = Math.min(rectStartY, previewGridY); y < Math.max(rectStartY, previewGridY) + 1; y++) {
                    if (brushType) {
                        ctx.save();
                        ctx.globalAlpha = 0.5;
                        const rectScreenX = x * tileSize - CAMERA_X;
                        const rectScreenY = y * tileSize - CAMERA_Y;
                        drawTile(ctx, selectedTile, rectScreenX, rectScreenY);
                        ctx.restore();

                        if (selectedTile.id !== TILE_TYPE.AIR && showHitbox) {
                            ctx.strokeStyle = "blue";
                            ctx.lineWidth = 1;
                            const points = getTileShapePoints(selectedTile).points.map((p) => [
                                Math.round(p[0] * tileSize + rectScreenX),
                                Math.round(p[1] * tileSize + rectScreenY),
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
            }

            ctx.strokeStyle = "red";
            ctx.lineWidth = 5;
            const startPreviewGridX = Math.min(rectStartX * tileSize - CAMERA_X, screenX);
            const startPreviewGridY = Math.min(rectStartY * tileSize - CAMERA_Y, screenY);
            const endPreviewGridX = Math.max(rectStartX * tileSize - CAMERA_X, screenX) + tileSize;
            const endPreviewGridY = Math.max(rectStartY * tileSize - CAMERA_Y, screenY) + tileSize;
            ctx.strokeRect(startPreviewGridX, startPreviewGridY, endPreviewGridX - startPreviewGridX, endPreviewGridY - startPreviewGridY);
            ctx.save();
            ctx.fillStyle = "red"
            ctx.globalAlpha = 0.2;
            ctx.fillRect(startPreviewGridX, startPreviewGridY, endPreviewGridX - startPreviewGridX, endPreviewGridY - startPreviewGridY)
            ctx.restore();
            return;
        }
        if (brushType) {
            ctx.save();
            ctx.globalAlpha = 0.5;
            drawTile(ctx, selectedTile, screenX, screenY);
            ctx.restore();

            if (selectedTile.id !== TILE_TYPE.AIR && showHitbox) {
                ctx.strokeStyle = "blue";
                ctx.lineWidth = 1;
                const points = getTileShapePoints(selectedTile).points.map((p) => [
                    Math.round(p[0] * tileSize + screenX),
                    Math.round(p[1] * tileSize + screenY),
                ]);
                for (let i = 0; i < points.length; i++) {
                    const next = points[(i + 1) % points.length];
                    ctx.beginPath();
                    ctx.moveTo(points[i][0], points[i][1]);
                    ctx.lineTo(next[0], next[1]);
                    ctx.stroke();
                }

            }
        } else {
            ctx.save();
            ctx.globalAlpha = 0.5;
            ctx.fillStyle = "red";
            ctx.fillRect(screenX, screenY, tileSize, tileSize);
            ctx.restore();
        }
    }
}

// --------------------
// TILEMAP SAVE/LOAD
// --------------------
export function saveTileMap() {
    const json = JSON.stringify(getTilemap());
    console.log("Tilemap saved:", json);
    return json;
}

export function loadTileMap(json) {
    const loaded = JSON.parse(json);
    Object.keys(tileMap).forEach((key) => delete tileMap[key]);
    Object.assign(tileMap, loaded);
    console.log("Tilemap loaded");
}

export async function loadLevel(level) {
    const path = "assets/data/levels.json";
    const response = await fetch(path);
    const levels_data = await response.json();

    const level_json = levels_data.LEVELS[level.toString()];
    if (!level_json) return;
    loadTileMap(JSON.stringify(level_json));
}

export function clearTileMap() {
    Object.keys(tileMap).forEach((key) => delete tileMap[key]);
    console.log("Tilemap cleared");
}