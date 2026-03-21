import {
    isEditorMode,
    displayPreviewTile,
    selectedTile,
    autoTileMode
} from "./editor/editor.js";
import { drawTilesFromMap } from "./tiles/tilemap.js";
import { player, canvas } from "./main.js";

let accumulatedTime = 0;
let fps = 0;

export var CAMERA_X = 0;
export var CAMERA_Y = 0;

const CAMERA_SMOOTHNESS = 0.02;
const CAMERA_LOOKAHEAD = 30;

export let showHitbox = false;

export function getCameraPos() {
    return { x: CAMERA_X, y: CAMERA_Y };
}

export function changeCameraPos(x, y) {
    x += window.innerWidth / 2;
    y += window.innerHeight / 2;
    player.x = x;
    player.y = y;
    player.renderX = x;
    player.renderY = y;
    CAMERA_X = x;
    CAMERA_Y = y;
}

export function toggleHitbox() {
    showHitbox = !showHitbox;
}

export function updateFrame(canvas, ctx, player, dt) {
    ctx.clearRect(0, 0, canvas.width, canvas.height);

    if (isEditorMode()) {
        player.editorUpdate(dt);
        CAMERA_X = player.renderX - canvas.width / 2;
        CAMERA_Y = player.renderY - canvas.height / 2;
    } else {
        player.update(dt);

        const targetCameraX = player.renderX + (player.velX * CAMERA_LOOKAHEAD) - canvas.width / 2;
        const targetCameraY = player.renderY - canvas.height / 2;

        CAMERA_X += (targetCameraX - CAMERA_X) * CAMERA_SMOOTHNESS;
        CAMERA_Y += (targetCameraY - CAMERA_Y) * CAMERA_SMOOTHNESS;
    }

    const drawCamX = Math.floor(CAMERA_X);
    const drawCamY = Math.floor(CAMERA_Y);

    const playerScreenX = Math.floor(player.renderX - drawCamX);
    const playerScreenY = Math.floor(player.renderY - drawCamY);

    drawTilesFromMap(canvas, ctx, drawCamX, drawCamY, isEditorMode(), showHitbox);

    if (!isEditorMode()) {
        player.drawAt(playerScreenX, playerScreenY);
    }

    accumulatedTime += dt;
    if (accumulatedTime >= 1000) {
        fps = Math.round(1000 / dt);
        accumulatedTime = 0;
    }

    ctx.textAlign = "center"
    ctx.fillStyle = "black";
    ctx.font = "20px Arial";
    ctx.fillText(`FPS: ${fps}`, canvas.width - 82, canvas.height - (isEditorMode() ? 100 : 10));

    if (isEditorMode()) {
        const toolbar = document.getElementById("toolbar");
        if (toolbar) toolbar.style.display = "";
        const tilePanel = document.getElementById("tile-panel");
        if (tilePanel) tilePanel.style.display = "";

        displayPreviewTile(ctx);

        ctx.font = "bold 15px Arial";
        ctx.textAlign = "center";
        ctx.fillStyle = "rgb(255, 0, 0, 0.7)";
        ctx.fillText("EDITOR MODE - ESC to toggle", ((canvas.width) / 2) + 50, canvas.height - 100);

        ctx.font = "bold 15px Arial";
        ctx.textAlign = "left"
        ctx.fillStyle = "black";
        ctx.fillText(`Camera: ( ${Math.round(CAMERA_X)}, ${Math.round(CAMERA_Y)} )`, 10, 135);
        ctx.fillText(`Autotile (Z): ${autoTileMode}`, 10, 155);
        ctx.fillText(`Show Hitbox (H): ${showHitbox}`, 10, 175);
        ctx.fillText(`Left Click to PLACE`, 10, 195);
        ctx.fillText(`Right Click to REMOVE`, 10, 215);

        ctx.textAlign = "right";
        ctx.fillText("Q and E to SWITCH between Tiles", canvas.width - 10, 135);
        ctx.fillText("T and R to ROTATE Tile", canvas.width - 10, 155);
        ctx.fillText("O to SAVE Tilemap", canvas.width - 10, 175);
        ctx.fillText("L to LOAD Tilemap", canvas.width - 10, 195);
        ctx.fillText("0 (zero) to RESET Camera to origin", canvas.width - 10, 215);
        ctx.fillText("DEL to RESET Tilemap", canvas.width - 10, 235);
    } else {
        const toolbar = document.getElementById("toolbar");
        if (toolbar) toolbar.style.display = "none";
        const tilePanel = document.getElementById("tile-panel");
        if (tilePanel) tilePanel.style.display = "none";
    }
}