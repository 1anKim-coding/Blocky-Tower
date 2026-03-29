import { TILE_TYPE } from "./tiles.js";
import { getTileTypeName, getTile } from "./tilemap.js";

export const AUTOTILE = {};

// PRIORITY SYSTEM
const PRIORITY = {
    ISOLATED: 1,
    CENTER: 2,
    END: 3,
    OUTER_EDGE: 4,
    STRAIGHT: 5,
    OUTER_CORNER: 6,
    INNER_SINGLE: 7,
    INNER_DOUBLE: 8,
    INNER_TRIPLE: 9,
    INNER_QUAD: 10
};

// -----------------------------
// BASE TILE DEFINITIONS
// -----------------------------
export const baseTiles = {
    [TILE_TYPE.GROUND]: [
        // ISOLATED (0)
        {
            priority: PRIORITY.ISOLATED,
            neighbor: [
                [0, 1, 0],
                [1, 2, 1],
                [0, 1, 0]
            ],
            tile: { tileset: 0, id: 0 }
        },

        // CENTER (1)
        {
            priority: PRIORITY.CENTER,
            neighbor: [
                [0, 2, 0],
                [2, 2, 2],
                [0, 2, 0]
            ],
            tile: { tileset: 0, id: 1 }
        },

        // OUTER CORNER (2)
        {
            priority: PRIORITY.OUTER_CORNER,
            neighbor: [
                [0, 1, 0],
                [1, 2, 2],
                [0, 2, 0]
            ],
            tile: { tileset: 0, id: 2 }
        },

        // OUTER EDGE (3)
        {
            priority: PRIORITY.OUTER_EDGE,
            neighbor: [
                [0, 1, 0],
                [2, 2, 2],
                [0, 2, 0]
            ],
            tile: { tileset: 0, id: 3 }
        },

        // STRAIGHT (4)
        {
            priority: PRIORITY.STRAIGHT,
            neighbor: [
                [0, 1, 0],
                [2, 2, 2],
                [0, 1, 0]
            ],
            tile: { tileset: 0, id: 4 }
        },

        // END (5)
        {
            priority: PRIORITY.END,
            neighbor: [
                [0, 1, 0],
                [1, 2, 2],
                [0, 1, 0]
            ],
            tile: { tileset: 0, id: 5 }
        },

        // INNER SINGLE CORNER (6)
        {
            priority: PRIORITY.INNER_SINGLE,
            neighbor: [
                [0, 2, 0],
                [2, 2, 2],
                [0, 2, 1]
            ],
            tile: { tileset: 0, id: 6 }
        },

        // INNER CORNER RIGHT EDGE (7)
        {
            priority: PRIORITY.INNER_SINGLE,
            neighbor: [
                [0, 1, 0],
                [2, 2, 2],
                [0, 2, 1]
            ],
            tile: { tileset: 0, id: 7 }
        },

        // INNER CORNER RIGHT EDGE (8)
        {
            priority: PRIORITY.INNER_DOUBLE,
            neighbor: [
                [0, 1, 0],
                [2, 2, 2],
                [1, 2, 0]
            ],
            tile: { tileset: 0, id: 8 }
        },

        // INNER CORNER OUTER CORNER (9)
        {
            priority: PRIORITY.INNER_SINGLE,
            neighbor: [
                [0, 1, 0],
                [1, 2, 2],
                [0, 2, 1]
            ],
            tile: { tileset: 0, id: 9 }
        },

        // CORNER + CORNER (10)
        {
            priority: PRIORITY.INNER_DOUBLE,
            neighbor: [
                [0, 1, 0],
                [2, 2, 2],
                [1, 2, 1]
            ],
            tile: { tileset: 0, id: 10 }
        },

        // DOUBLE INNER EDGE (11)
        {
            priority: PRIORITY.INNER_SINGLE,
            neighbor: [
                [0, 2, 0],
                [2, 2, 2],
                [1, 2, 1]
            ],
            tile: { tileset: 0, id: 11 }
        },

        // TRIPLE INSIDE (12)
        {
            priority: PRIORITY.INNER_TRIPLE,
            neighbor: [
                [1, 2, 0],
                [2, 2, 2],
                [1, 2, 1]
            ],
            tile: { tileset: 0, id: 12 }
        },

        // QUAD INSIDE (13)
        {
            priority: PRIORITY.INNER_QUAD,
            neighbor: [
                [1, 2, 1],
                [2, 2, 2],
                [1, 2, 1]
            ],
            tile: { tileset: 0, id: 13 }
        },

        // WEIRD INSIDE (14)
        {
            priority: PRIORITY.INNER_DOUBLE,
            neighbor: [
                [1, 2, 0],
                [2, 2, 2],
                [0, 2, 1]
            ],
            tile: { tileset: 0, id: 14 }
        }
    ],

    // KILL TILES (auto‑generated)
    [TILE_TYPE.KILL]: []
};

// Duplicate ground rules for kill tiles
for (let i = 0; i < baseTiles[TILE_TYPE.GROUND].length; i++) {
    const g = baseTiles[TILE_TYPE.GROUND][i];
    baseTiles[TILE_TYPE.KILL].push({
        priority: g.priority,
        neighbor: g.neighbor,
        tile: {
            tileset: 0,
            id: g.tile.id + 15
        }
    });
}

// -----------------------------
// FIXED NEIGHBOR GRID
// -----------------------------
function getNeighborGrid(x, y, type) {
    const offsets = [
        [-1, -1],
        [0, -1],
        [1, -1],
        [-1, 0],
        [1, 0],
        [-1, 1],
        [0, 1],
        [1, 1]
    ];

    const neighbors = offsets.map(([dx, dy]) => {
        const t = getTile(x + dx, y + dy);

        if (!t) return 0; // empty

        const tileType = getTileTypeName(t);

        if (tileType === type)
            return 2; // same tile type (yellow)

        return 1; // solid neighbor (green border)
    });

    return [
        [neighbors[0], neighbors[1], neighbors[2]],
        [neighbors[3], 2, neighbors[4]],
        [neighbors[5], neighbors[6], neighbors[7]]
    ];
}

// -----------------------------
// ROTATION EXPANSION
// -----------------------------
function rotateNeighbor(n) {
    return [
        [n[2][0], n[1][0], n[0][0]],
        [n[2][1], n[1][1], n[0][1]],
        [n[2][2], n[1][2], n[0][2]]
    ];
}

export function setupAutoTile() {
    for (const type in baseTiles) {
        AUTOTILE[type] = [];

        for (const rule of baseTiles[type]) {
            let mask = rule.neighbor;

            for (let rot = 0; rot < 4; rot++) {

                AUTOTILE[type].push({
                    priority: rule.priority,
                    neighbor: mask.map(r => [...r]),
                    tile: {
                        tileset: rule.tile.tileset,
                        id: rule.tile.id, // ID stays constant
                        rot // rotation applied here
                    }
                });

                mask = rotateNeighbor(mask);
            }
        }
    }
}

// -----------------------------
// MATCHING WITH PRIORITY
// -----------------------------
export function getAutoTile(x, y, type) {
    if (!baseTiles[type]) return null;
    const grid = getNeighborGrid(x, y, type);
    let best = null;
    let bestScore = -1;

    for (const rule of AUTOTILE[type]) {
        const mask = rule.neighbor;
        let match = true;
        let score = rule.priority;

        for (let yy = 0; yy < 3 && match; yy++) {
            for (let xx = 0; xx < 3 && match; xx++) {
                const req = mask[yy][xx];
                if (req === 0) continue;
                if (grid[yy][xx] !== req) match = false;
                else score++;
            }
        }

        if (match && score > bestScore) {
            bestScore = score;
            best = rule.tile;
        }
    }

    return best || { tileset: 0, id: 0, rot: 0 };
}