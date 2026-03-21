import { getTileSize } from "../tiles/tiles.js";

export const jumpForce = 13;
export const gravity = 0.003 * 200;
export const friction = 0.8 * 15;
export const speed = 0.4 * 15;
export const maxFallSpeed = 2 * 15;

//editor
export const editorSpeed = 1.5;
export const editorSpeedMultiplier = 3;

// Scale factor for physics based on tile size (default 35)
export function getPhysicsScale() {
    return getTileSize() / 35;
}

export function getPlayerSize() {
    return getTileSize() * 0.8; //player size scales with tile size (80% of a tile)
}