import { isEditorMode, displayPreviewTile, selectedTile } from "./editor/editor.js";
import { drawTilesFromMap } from "./tiles/tilemap.js";
import { player, canvas } from "./main.js"

let accumulatedTime = 0;
let fps = 0;

export var CAMERA_X = 0;
export var CAMERA_Y = 0;

const CAMERA_SMOOTHNESS = .04; // 0 = slow, 1 = instant
const CAMERA_LOOKAHEAD = 30; // multiplier for velocity lookahead

export function getCameraPos() {
    return { x: CAMERA_X, y: CAMERA_Y };
}

export function changeCameraPos(x, y) {
    x += window.innerWidth / 2;
    y += window.innerHeight / 2;
    console.log(x, y)

    player.x = x;
    player.y = y;
    CAMERA_X = x;
    CAMERA_Y = y;
}

export function updateFrame(canvas, ctx, player, dt) {
    ctx.clearRect(0, 0, canvas.width, canvas.height);

    let targetCameraX, targetCameraY;
    if (isEditorMode()) {
        player.editorUpdate(dt);
        CAMERA_X = player.x - canvas.width / 2;
        CAMERA_Y = player.y - canvas.height / 2;
    } else {
        player.update(dt);
        targetCameraX = (player.x + (player.velX * CAMERA_LOOKAHEAD)) - canvas.width / 2;
        targetCameraY = player.y - canvas.height / 2;
        CAMERA_X += (targetCameraX - CAMERA_X) * CAMERA_SMOOTHNESS;
        CAMERA_Y += (targetCameraY - CAMERA_Y) * CAMERA_SMOOTHNESS;
    }

    accumulatedTime += dt;
    if (accumulatedTime >= 1000) {
        fps = Math.round(1000 / dt);
        accumulatedTime = 0;
    }

    drawTilesFromMap(canvas, ctx, CAMERA_X, CAMERA_Y, isEditorMode(), true);

    // Draw player with camera offset
    const playerScreenX = player.x - CAMERA_X;
    const playerScreenY = player.y - CAMERA_Y;
    if (!isEditorMode()) player.drawAt(playerScreenX, playerScreenY);

    // // Draw FPS counter and editor mod`e indicator
    ctx.fillStyle = "black";
    ctx.font = "20px Arial";
    ctx.fillText(`FPS: ${fps}`, 10, canvas.height - 10);

    if (isEditorMode()) {
        displayPreviewTile(ctx);
        // Draw editor mode indicator
        ctx.fillStyle = "rgb(255, 0, 0, 0.7)";
        ctx.fillText("EDITOR MODE - ESC to toggle, Click to place, Right-click to remove, E to +1 Selected Tile, Q to -1 Selected Tile, O to Save, L to Load", 10, 25);
        //camera x display
        ctx.fillStyle = "rgb(0, 0, 0, 1)";
        ctx.fillText(`Camera x: ${Math.round(CAMERA_X)}`, 10, 50);
        //camera y display
        ctx.fillText(`Camera y: ${Math.round(CAMERA_Y)}`, 10, 75);
        //selected tile display
        ctx.fillText(`Selected Tile: ${selectedTile.tileset}, ${selectedTile.id}, ${selectedTile.rot}`, 10, 100);
    }
}