import { TILE_TYPE } from "./tiles.js";
import { getTileTypeName, getTile } from "./tilemap.js";

export const AUTOTILE = {};
export const baseTiles = {
    [TILE_TYPE.GROUND]: [
        //isolate
        {
            neighbor: [
                [0, 1, 0],
                [1, 2, 1],
                [0, 1, 0]
            ],
            tile: { tileset: 0, id: 0, rot: 0 }
        },
        //middle
        {
            neighbor: [
                [0, 2, 0],
                [2, 2, 2],
                [0, 2, 0]
            ],
            tile: { tileset: 0, id: 1, rot: 0 }
        },
        //top left corner
        {
            neighbor: [
                [0, 1, 0],
                [1, 2, 2],
                [0, 2, 0]
            ],
            tile: { tileset: 0, id: 2, rot: 0 }
        },
        //top edge
        {
            neighbor: [
                [0, 0, 0],
                [2, 2, 2],
                [0, 2, 0]
            ],
            tile: { tileset: 0, id: 3, rot: 0 }
        },
        //left to right
        {
            neighbor: [
                [0, 1, 0],
                [2, 2, 2],
                [0, 1, 0]
            ],
            tile: { tileset: 0, id: 4, rot: 0 }
        },
        //left end
        {
            neighbor: [
                [0, 1, 0],
                [1, 2, 2],
                [0, 1, 0]
            ],
            tile: { tileset: 0, id: 5, rot: 0 }
        }
    ],
    [TILE_TYPE.KILL]: [
        //isolate
        {
            neighbor: [
                [0, 1, 0],
                [1, 2, 1],
                [0, 1, 0]
            ],
            tile: { tileset: 0, id: 6, rot: 0 }
        },
        //inside left corner
        {
            neighbor: [
                [0, 2, 0],
                [2, 2, 2],
                [0, 2, 1]
            ],
            tile: { tileset: 0, id: 13, rot: 0 }
        },
        //middle
        {
            neighbor: [
                [0, 2, 0],
                [2, 2, 2],
                [0, 2, 0]
            ],
            tile: { tileset: 0, id: 7, rot: 0 }
        },
        //top edge
        {
            neighbor: [
                [0, 0, 0],
                [2, 2, 2],
                [0, 2, 0]
            ],
            tile: { tileset: 0, id: 9, rot: 0 }
        },
        //single block top left corner
        {
            neighbor: [
                [0, 0, 0],
                [0, 2, 2],
                [0, 2, 1]
            ],
            tile: { tileset: 0, id: 12, rot: 0 }
        },
        //top left corner
        {
            neighbor: [
                [0, 1, 0],
                [1, 2, 2],
                [0, 2, 0]
            ],
            tile: { tileset: 0, id: 8, rot: 0 }
        },
        //left to right
        {
            neighbor: [
                [0, 1, 0],
                [2, 2, 2],
                [0, 1, 0]
            ],
            tile: { tileset: 0, id: 10, rot: 0 }
        },
        //left end
        {
            neighbor: [
                [0, 1, 0],
                [1, 2, 2],
                [0, 1, 0]
            ],
            tile: { tileset: 0, id: 11, rot: 0 }
        },
    ]
};

function rotateNeighbor(neighbor) {
    return [
        [neighbor[2][0], neighbor[1][0], neighbor[0][0]],
        [neighbor[2][1], neighbor[1][1], neighbor[0][1]],
        [neighbor[2][2], neighbor[1][2], neighbor[0][2]]
    ];
}

export function setupAutoTile() {
    for (const type in baseTiles) {
        for (const base of baseTiles[type]) {
            let neighbor = base.neighbor;
            for (let rot = 0; rot < 4; rot++) {
                if (!AUTOTILE[type]) AUTOTILE[type] = [];
                AUTOTILE[type].push({
                    neighbor: neighbor.map(row => [...row]),
                    tile: { tileset: base.tile.tileset, id: base.tile.id, rot }
                });
                neighbor = rotateNeighbor(neighbor);
            }
        }
    }
}

function getNeighborGrid(gridX, gridY, type = TILE_TYPE.GROUND) {
    const offsets = [
        [-1, -1],
        [0, -1],
        [1, -1],
        [-1, 0], /*0,0*/
        [1, 0],
        [-1, 1],
        [0, 1],
        [1, 1]
    ];

    const neighbors = offsets.map(([dx, dy]) => {
        const t = getTile(gridX + dx, gridY + dy);
        if (!t) return 0; // 0 = anything/empty
        if (getTileTypeName(t) !== type) return 1; // 1 = exclude
        return 2; // 2 = include
    });

    return [
        [neighbors[0], neighbors[1], neighbors[2]],
        [neighbors[3], 2, neighbors[4]],
        [neighbors[5], neighbors[6], neighbors[7]]
    ];
}

export function getAutoTile(gridX, gridY, type = TILE_TYPE.GROUND) {
    const neighborGrid = getNeighborGrid(gridX, gridY, type);
    if (!AUTOTILE[type]) return null;

    for (const entry of AUTOTILE[type]) {
        const n = entry.neighbor;
        let match = true;
        for (let y = 0; y < 3 && match; y++) {
            for (let x = 0; x < 3 && match; x++) {
                const required = n[y][x];
                if (required === 0) continue; // 0 = anything
                if (neighborGrid[y][x] !== required) match = false;
            }
        }
        if (match) return entry.tile;
    }

    return { tileset: 0, id: 0, rot: 0 };
}