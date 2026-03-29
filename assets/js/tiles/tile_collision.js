// tile_collision.js
import { getTileSize, TILE_TYPE } from "./tiles.js";
import { getTileTypeName } from "./tilemap.js";
import { interactTile } from "../player/player_interaction.js";

const path = "assets/data/tile_collision_data.json";
let collision_data = null;
let tileShapes = null;
let tileTypeToShape = null;

const SLOP = 0.01; // 🔥 MUCH smaller = more stable

export async function loadCollisionData() {
    const response = await fetch(path);
    collision_data = await response.json();
    tileShapes = collision_data.tileShapes;
    tileTypeToShape = collision_data.tileTypeToShape;
}

function rotatePoint(px, py, rot) {
    switch (rot % 4) {
        case 0:
            return [px, py];
        case 1:
            return [1 - py, px];
        case 2:
            return [1 - px, 1 - py];
        case 3:
            return [py, 1 - px];
        default:
            return [px, py];
    }
}

export function getTileShapePoints(tile) {
    const tilesetData = tileTypeToShape[tile.tileset];
    if (!tilesetData) return { shape: "NONE", points: [] };

    const shapeName = tilesetData[tile.id];
    if (!shapeName) return { shape: "NONE", points: [] };

    const shapePoints = tileShapes[shapeName];
    if (!shapePoints) return { shape: "NONE", points: [] };

    return {
        shape: shapeName,
        points: shapePoints.map(p => rotatePoint(p[0], p[1], tile.rot))
    };
}

// --- Math helpers ---
function dot(ax, ay, bx, by) { return ax * bx + ay * by; }

function length(x, y) { return Math.hypot(x, y); }

function normalize(x, y) {
    const l = length(x, y);
    return l === 0 ? { x: 0, y: 0 } : { x: x / l, y: y / l };
}

// --- SAT helpers ---
function getEdgeNormals(points) {
    const normals = [];
    for (let i = 0; i < points.length; i++) {
        const p1 = points[i];
        const p2 = points[(i + 1) % points.length];

        const nx = -(p2[1] - p1[1]);
        const ny = (p2[0] - p1[0]);

        const len = Math.hypot(nx, ny);
        if (len > 0) normals.push({ x: nx / len, y: ny / len });
    }
    return normals;
}

function project(points, axis) {
    let min = Infinity,
        max = -Infinity;

    for (const p of points) {
        const v = p[0] * axis.x + p[1] * axis.y;
        if (v < min) min = v;
        if (v > max) max = v;
    }

    return { min, max };
}

function getCenter(points) {
    let x = 0,
        y = 0;
    for (const p of points) {
        x += p[0];
        y += p[1];
    }
    return { x: x / points.length, y: y / points.length };
}

// --- CORE SAT ---
function polygonsCollide(polyA, polyB) {
    const A = polyA.points;
    const B = polyB.points;

    const axes = getEdgeNormals(A).concat(getEdgeNormals(B));

    const centerA = getCenter(A);
    const centerB = getCenter(B);

    let smallestOverlap = Infinity;
    let smallestAxis = null;

    for (const axis of axes) {
        const projA = project(A, axis);
        const projB = project(B, axis);

        const overlap = Math.min(projA.max, projB.max) - Math.max(projA.min, projB.min);

        if (overlap <= 0) {
            return {
                collided: false,
                mtv: { x: 0, y: 0 },
                normal: null
            };
        }

        if (overlap < smallestOverlap) {
            smallestOverlap = overlap;
            smallestAxis = axis;
        }
    }

    // Direction from tile -> player
    const dirX = centerA.x - centerB.x;
    const dirY = centerA.y - centerB.y;

    const sign = dot(dirX, dirY, smallestAxis.x, smallestAxis.y) < 0 ? -1 : 1;

    const overlapToApply = smallestOverlap <= SLOP ? 0 : smallestOverlap;

    const nx = smallestAxis.x * sign;
    const ny = smallestAxis.y * sign;

    return {
        collided: overlapToApply > 0,
        mtv: {
            x: nx * overlapToApply,
            y: ny * overlapToApply
        },
        normal: {
            x: nx,
            y: ny
        }
    };
}

// --- Tile collision ---
export function checkCollision(playerPoly, tile, tileX, tileY) {
    const tileSize = getTileSize();

    const tileShape = getTileShapePoints(tile);
    if (!tileShape.points.length) {
        return { collided: false, mtv: { x: 0, y: 0 }, normal: null };
    }

    const tilePoly = {
        points: tileShape.points.map(p => [
            p[0] * tileSize + tileX,
            p[1] * tileSize + tileY
        ])
    };

    return polygonsCollide(playerPoly, tilePoly);
}

// --- MAIN MOVEMENT COLLISION ---
export function getCollisionMTVForMovement(playerPoly, prevX, prevY, x, y, size, getTileFn) {
    const tileSize = getTileSize();

    const tx0 = Math.floor(Math.min(prevX, x) / tileSize);
    const ty0 = Math.floor(Math.min(prevY, y) / tileSize);
    const tx1 = Math.floor((Math.max(prevX, x) + size - 1) / tileSize);
    const ty1 = Math.floor((Math.max(prevY, y) + size - 1) / tileSize);

    let bestMTV = { x: 0, y: 0 };
    let bestNormal = null;
    let smallestLen = Infinity;

    for (let ty = ty0; ty <= ty1; ty++) {
        for (let tx = tx0; tx <= tx1; tx++) {
            const tile = getTileFn(tx, ty);
            if (!tile || tile.id === -1) continue;

            const res = checkCollision(playerPoly, tile, tx * tileSize, ty * tileSize);
            if (!res.collided) continue;

            const tileType = getTileTypeName(tile);

            if (tileType !== TILE_TYPE.GROUND) {
                interactTile(tileType, tx, ty);
                continue;
            }

            const len = Math.hypot(res.mtv.x, res.mtv.y);

            // ✅ pick smallest MTV (correct SAT resolution)
            if (len < smallestLen) {
                smallestLen = len;
                bestMTV = res.mtv;
                bestNormal = res.normal;
            }
        }
    }

    return {
        mtv: bestMTV,
        normal: bestNormal
    };
}