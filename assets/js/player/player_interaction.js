import { player } from "../main.js"
import { TILE_TYPE } from "../tiles/tiles.js"
import { setTile } from "../tiles/tilemap.js"

export function interactTile(tileType, tileX, tileY) {
    switch (tileType) {
        case TILE_TYPE.KILL:
            respawn();
            break;
        case TILE_TYPE.SPIKE:
            respawn();
            break;
        case TILE_TYPE.JUMP:
            setTile(tileX, tileY, { "tileset": 0, "id": 15, "rot": 0 });
            player.velY = -14;
            player.jumpLeft = 2;
            break;
    }
}

function respawn(){
    player.x = 0;
    player.y = -100;
    player.velX = 0;
    player.velY = 0;
    player.jumpLeft = 0;
}