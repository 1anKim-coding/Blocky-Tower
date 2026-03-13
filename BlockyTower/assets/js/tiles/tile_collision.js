// tile_collision.js
import { getTileSize, TILE_TYPE } from "./tiles.js";
import { getTileTypeName } from "./tilemap.js";
import { interactTile } from "../player/player_interaction.js";

const path = "assets/data/tile_collision_data.json";
let collision_data = null;
let tileShapes = null;
let tileTypeToShape = null;

// Tune this: fraction of tileSize used as radius to consider vertex bias
// Increased to 1.0 to bias vertex axes more aggressively for small players
const VERTEX_BIAS_RADIUS_FACTOR = 1.0;

// Slop to ignore tiny overlaps (pixels)
const SLOP = 1.0;

export async function loadCollisionData() {
    const response = await fetch(path);
    collision_data = await response.json();
    tileShapes = collision_data.tileShapes;
    tileTypeToShape = collision_data.tileTypeToShape;

    console.log("Loaded collision shapes:", Object.keys(tileShapes));
}

function rotatePoint(px, py, rot) {
    switch (rot % 4) {
        case 0:
            return [px, py];
        case 1:
            return [1 - py, px]; // 90°
        case 2:
            return [1 - px, 1 - py]; // 180°
        case 3:
            return [py, 1 - px]; // 270°
        default:
            return [px, py];
    }
}


export function getTileShapePoints(tile) {
    const shapeName = tileTypeToShape[tile.tileset][tile.id];
    if (!shapeName) return { shape: "NONE", points: [] };
    const shapePoints = tileShapes[shapeName];
    if (!shapePoints) return { shape: "NONE", points: [] };
    return { shape: shapeName, points: shapePoints.map(p => rotatePoint(p[0], p[1], tile.rot)) };
}

// ---------- SAT helpers ----------
function dot(ax, ay, bx, by) { return ax * bx + ay * by; }

function length(x, y) { return Math.hypot(x, y); }

function normalize(x, y) {
    const l = length(x, y);
    return l === 0 ? { x: 0, y: 0 } : { x: x / l, y: y / l };
}

function getEdgeNormals(points) {
    const normals = [];
    for (let i = 0; i < points.length; i++) {
        const p1 = points[i];
        const p2 = points[(i + 1) % points.length];
        const ex = p2[0] - p1[0];
        const ey = p2[1] - p1[1];
        const len = Math.hypot(ex, ey);
        if (len === 0) continue;
        const nx = -ey / len;
        const ny = ex / len;
        normals.push({ x: nx, y: ny });
    }
    return normals;
}

function project(points, axis) {
    let min = Infinity,
        max = -Infinity;
    for (let i = 0; i < points.length; i++) {
        const p = points[i];
        const v = p[0] * axis.x + p[1] * axis.y;
        if (v < min) min = v;
        if (v > max) max = v;
    }
    return { min, max };
}

function overlapAmount(projA, projB) {
    if (projA.max < projB.min || projB.max < projA.min) return 0;
    return Math.min(projA.max, projB.max) - Math.max(projA.min, projB.min);
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

function polygonsCollide(polyA, polyB) {
    const A = polyA.points;
    const B = polyB.points;
    if (!A.length || !B.length) return { collided: false, mtv: { x: 0, y: 0 }, debug: null };

    const axes = getEdgeNormals(A).concat(getEdgeNormals(B));

    // Vertex bias: add axis from vertex -> player center when close
    const centerA = getCenter(A);
    let minX = Infinity,
        minY = Infinity,
        maxX = -Infinity,
        maxY = -Infinity;
    for (const p of B) {
        minX = Math.min(minX, p[0]);
        minY = Math.min(minY, p[1]);
        maxX = Math.max(maxX, p[0]);
        maxY = Math.max(maxY, p[1]);
    }
    const tileSize = Math.max(maxX - minX, maxY - minY) || 1;
    const vertexRadius = tileSize * VERTEX_BIAS_RADIUS_FACTOR;

    for (let i = 0; i < B.length; i++) {
        const vx = B[i][0],
            vy = B[i][1];
        const dx = centerA.x - vx,
            dy = centerA.y - vy;
        const dist = Math.hypot(dx, dy);
        if (VERTEX_BIAS_RADIUS_FACTOR > 0 && dist <= vertexRadius && dist > 0) {
            const axis = normalize(dx, dy);
            let dup = false;
            for (const a of axes) {
                const d = Math.abs(dot(a.x, a.y, axis.x, axis.y));
                if (d > 0.999) { dup = true; break; }
            }
            if (!dup) axes.push(axis);
        }
    }

    let smallestOverlap = Infinity;
    let smallestAxis = null;
    const debug = [];

    for (const axis of axes) {
        const projA = project(A, axis);
        const projB = project(B, axis);
        const overlap = overlapAmount(projA, projB);
        debug.push({ axis, projA, projB, overlap });
        if (overlap === 0) return { collided: false, mtv: { x: 0, y: 0 }, debug };
        if (overlap < smallestOverlap) {
            smallestOverlap = overlap;
            smallestAxis = axis;
        }
    }

    const centerB = getCenter(B);
    const dirX = centerA.x - centerB.x;
    const dirY = centerA.y - centerB.y;
    const d = dot(dirX, dirY, smallestAxis.x, smallestAxis.y);
    const sign = d < 0 ? -1 : 1;

    const overlapToApply = smallestOverlap <= SLOP ? 0 : smallestOverlap;

    return {
        collided: overlapToApply > 0,
        mtv: { x: smallestAxis.x * overlapToApply * sign, y: smallestAxis.y * overlapToApply * sign },
        axis: smallestAxis,
        debug
    };
}

export function checkCollision(playerPoly, tile, tileX, tileY) {
    const tileSize = getTileSize();
    const tileShape = getTileShapePoints(tile);
    if (!tileShape || tileShape.points.length === 0) return { collided: false, mtv: { x: 0, y: 0 }, debug: null };

    const tilePoly = { points: tileShape.points.map(p => [p[0] * tileSize + tileX, p[1] * tileSize + tileY]) };
    return polygonsCollide(playerPoly, tilePoly);
}

export function getCollisionMTVForMovement(playerPoly, prevX, prevY, x, y, size, getTileFn) {
    const minX = Math.min(prevX, x);
    const minY = Math.min(prevY, y);
    const maxX = Math.max(prevX, x) + size;
    const maxY = Math.max(prevY, y) + size;
    const tileSize = getTileSize();
    const tx0 = Math.floor(minX / tileSize);
    const ty0 = Math.floor(minY / tileSize);
    const tx1 = Math.floor((maxX - 1) / tileSize);
    const ty1 = Math.floor((maxY - 1) / tileSize);

    let totalMTV = { x: 0, y: 0 };
    let bestDebug = null;

    for (let ty = ty0; ty <= ty1; ty++) {
        for (let tx = tx0; tx <= tx1; tx++) {
            const tile = getTileFn(tx, ty);
            if (tile == null || tile === undefined || tile.id === -1) continue;
            const tileX = tx * tileSize;
            const tileY = ty * tileSize;
            const res = checkCollision(playerPoly, tile, tileX, tileY);

            if (!res.collided) continue;

            const tileType = getTileTypeName(tile);
            //ground is only for collision (MTV)
            if (tileType != TILE_TYPE.GROUND) {
                console.log(tileType)
                interactTile(tileType, tx, ty)
                continue;
            }

            totalMTV.x += res.mtv.x;
            totalMTV.y += res.mtv.y;

            if (Math.abs(totalMTV.x) < 0.001) totalMTV.x = 0;
            if (Math.abs(totalMTV.y) < 0.001) totalMTV.y = 0;

            bestDebug = res.debug || bestDebug;
        }
    }

    return { mtv: totalMTV, debug: bestDebug };
}