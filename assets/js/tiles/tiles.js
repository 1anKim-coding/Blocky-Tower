const tilesetPNG = new Image();
tilesetPNG.src = "assets/images/tilesetPNG.png";
const tilesetSVG = new Image();
tilesetSVG.src = "assets/images/tilesetSVG.svg";

export const TILE_TYPE = {
    AIR: -1,
    GROUND: 0,
    KILL: 1,
    JUMP: 2,
    WATER: 3,
    SPIKE: 4
}

//TILE SET DEFINITION
/*
total is the total amount of tile that are NOT AIR tiles 
types is each blocks type from the TILE_TYPE var above
*/
export const TILESET = {
    //PNG
    0: {
        "tileset": tilesetPNG,
        "tileSize": 16,
        "cols": 4,
        "rows": 9,
        "total": (4 * 9),
        "types": [
            0, 0, 0, 0,
            0, 0, 0, 0,
            0, 0, 0, 0,
            0, 0, 0, 1,
            1, 1, 1, 1,
            1, 1, 1, 1,
            1, 1, 1, 1,
            1, 1, 2, -1,
            3, -1, -1, -1
        ]
    },

    //SVG
    1: {
        "tileset": tilesetSVG,
        "tileSize": 16,
        "cols": 5,
        "rows": 2,
        "total": (5 * 2) - 0,
        "types": [
            4, 4, 4, 4, 4,
            4, 4, 4, 4, 4
        ]
    }
};

const TILES_WIDTH = 50;
const TILES_HEIGHT = 30;

export function getTileSize() {
    return Math.ceil(Math.max(window.innerWidth / TILES_WIDTH, window.innerHeight / TILES_HEIGHT));
}

export function getGridDimensions() {
    const tileSize = getTileSize();
    return {
        width: Math.ceil(window.innerWidth / tileSize),
        height: Math.ceil(window.innerHeight / tileSize)
    };
}



// at module scope
const tileCache = {};

function cacheTile(tile) {
    const key = `${tile.tileset}_${tile.id}_${tile.rot}`;
    if (tileCache[key]) return tileCache[key];

    const tileset = TILESET[tile.tileset];
    const off = document.createElement("canvas");
    const size = getTileSize();
    off.width = size;
    off.height = size;
    const offCtx = off.getContext("2d");
    offCtx.imageSmoothingEnabled = false;

    const col = tile.id % tileset.cols;
    const row = Math.floor(tile.id / tileset.cols);
    const sx = col * tileset.tileSize;
    const sy = row * tileset.tileSize;

    offCtx.save();
    offCtx.translate(size / 2, size / 2);
    offCtx.rotate(tile.rot * (Math.PI / 2));
    offCtx.drawImage(tileset.tileset, sx, sy, tileset.tileSize, tileset.tileSize, -size / 2, -size / 2, size, size);
    offCtx.restore();

    tileCache[key] = off;
    return off;
}

export function drawTile(ctx, tile, x, y) {
    if (tile.id === TILE_TYPE.AIR) return;
    const cached = cacheTile(tile);
    ctx.drawImage(cached, x, y);
}