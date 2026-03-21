import { getTileSize, drawTile, TILE_TYPE, TILESET } from "./tiles.js";
import { getTileShapePoints } from "./tile_collision.js";
import { getPlayerPoints } from "../player/player.js";
import { player } from "../main.js";
import { getPlayerSize } from "../player/player_constants.js";

// Tile map: stores {tileset: 0 [PNG] or 1 [SVG], id: # in tileset, rot: rotation}
export let tileMap = {};

export function getTilemap() {
    return tileMap;
}

export function clearTilemap() {
    tileMap = {};
}

const AIR = { tileset: 0, id: -1, rot: 0 }

export function getTileTypeName(tile) {
    const tileID = tile.id;
    const tileset = tile.tileset;
    let tileset_type = TILESET[tileset].types[tileID];
    return tileset_type; //default to AIR if not found
}

export function getTileByName(gridX, gridY) {
    return getTileTypeName(getTile(gridX, gridY)) || TILE_TYPE.AIR; // -1 = air/empty
}

export function getTile(gridX, gridY) {
    const key = `${Math.floor(gridX)},${Math.floor(gridY)}`;
    return tileMap[key] || AIR;
}

export function setTile(gridX, gridY, tile) {
    const key = `${Math.floor(gridX)},${Math.floor(gridY)}`;
    if (tile.id === -1) {
        delete tileMap[key];
    } else {
        tileMap[key] = {
            tileset: tile.tileset,
            id: tile.id,
            rot: tile.rot || 0
        };
    }
}

// Render all tiles from the map
export function drawTilesFromMap(canvas, ctx, cameraX, cameraY, showGrid = false, showHitboxes = true) {
    const tileSize = getTileSize();

    const startTileX = Math.floor(cameraX / tileSize);
    const startTileY = Math.floor(cameraY / tileSize);
    const endTileX = Math.ceil((cameraX + canvas.width) / tileSize);
    const endTileY = Math.ceil((cameraY + canvas.height) / tileSize);

    // Draw tiles from map
    for (let gridX = startTileX; gridX < endTileX; gridX++) {
        for (let gridY = startTileY; gridY < endTileY; gridY++) {
            const tile = getTile(gridX, gridY);
            if (tile.id !== TILE_TYPE.AIR) {
                const screenX = Math.round(gridX * tileSize - cameraX);
                const screenY = Math.round(gridY * tileSize - cameraY);
                drawTile(ctx, tile, screenX, screenY);
            }
        }
    }

    // Draw grid in editor mode
    if (showGrid) {
        ctx.strokeStyle = "rgba(255, 0, 0, 0.3)";
        ctx.lineWidth = 1;

        for (let gridX = startTileX; gridX <= endTileX; gridX++) {
            const screenX = Math.round(gridX * tileSize - cameraX);
            ctx.beginPath();
            ctx.moveTo(screenX, 0);
            ctx.lineTo(screenX, canvas.height);
            ctx.stroke();
        }

        for (let gridY = startTileY; gridY <= endTileY; gridY++) {
            const screenY = Math.round(gridY * tileSize - cameraY);
            ctx.beginPath();
            ctx.moveTo(0, screenY);
            ctx.lineTo(canvas.width, screenY);
            ctx.stroke();
        }

        for (let gridX = startTileX; gridX < endTileX; gridX++) {
            for (let gridY = startTileY; gridY < endTileY; gridY++) {
                const tile = getTile(gridX, gridY);
                if (tile.id == TILE_TYPE.AIR && (gridX + gridY) % 2 == 0) {
                    const screenX = Math.round(gridX * tileSize - cameraX);
                    const screenY = Math.round(gridY * tileSize - cameraY);
                    ctx.fillStyle = "rgba(0, 0, 0, 0.05)";
                    ctx.fillRect(screenX, screenY, tileSize, tileSize);
                }
            }
        }
    }

    if (showHitboxes) {
        for (let gridX = startTileX; gridX < endTileX; gridX++) {
            for (let gridY = startTileY; gridY < endTileY; gridY++) {
                const tile = getTile(gridX, gridY);
                if (tile.id != TILE_TYPE.AIR) {

                    if (getTileTypeName(tile) === TILE_TYPE.KILL)
                        ctx.strokeStyle = "rgb(0, 255, 255)"
                    else {
                        ctx.strokeStyle = "blue";
                    }
                    ctx.lineWidth = 1;
                    const points = getTileShapePoints(tile).points.map(p => [
                        Math.round(p[0] * tileSize + gridX * tileSize - cameraX),
                        Math.round(p[1] * tileSize + gridY * tileSize - cameraY)
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

        const points = getPlayerPoints(player.x - cameraX, player.y - cameraY, getPlayerSize()).points

        ctx.strokeStyle = "red";
        ctx.lineWidth = 1;
        for (let i = 0; i < points.length; i++) {
            const next = points[(i + 1) % points.length];
            ctx.beginPath();
            ctx.moveTo(points[i][0], points[i][1]);
            ctx.lineTo(next[0], next[1]);
            ctx.stroke();
        }
    }
}