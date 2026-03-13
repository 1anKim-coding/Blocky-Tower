import { player } from "../main.js"
import { TILE_TYPE } from "../tiles/tiles.js"
import { setTile } from "../tiles/tilemap.js"

export function interactTile(tileType, tileX, tileY) {
    switch (tileType) {
        case TILE_TYPE.KILL:
            player.x = 0;
            player.y = -100;
            break;
        case TILE_TYPE.JUMP:
            setTile(tileX, tileY, { "tileset": 0, "id": 14, "rot": 0 });
            player.velY = -1.6;
            break;
    }
}