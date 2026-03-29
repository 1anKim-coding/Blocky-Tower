import { TILESET, TILE_TYPE } from "../tiles/tiles.js";
import { setSelectedTile } from "./editor.js"

setupTileButton();

function setupTileButton() {
    const panel = document.getElementById('tile-panel');
    if (!panel) return;

    panel.innerHTML = '';

    Object.keys(TILESET).forEach(tilesetId => {
        const tilesetTile = TILESET[tilesetId];
        const total = tilesetTile.cols * tilesetTile.rows;

        for (let id = 0; id < total; id++) {
            if (tilesetTile.types[id] === TILE_TYPE.AIR) continue;

            const button = document.createElement("button");
            button.classList.add("tile-button");

            const btnSize = 40;
            const borderWidth = 2;
            const innerSize = btnSize - (borderWidth * 2);

            const col = id % tilesetTile.cols;
            const row = Math.floor(id / tilesetTile.cols);

            const sx = col * tilesetTile.tileSize;
            const sy = row * tilesetTile.tileSize;

            const scale = innerSize / tilesetTile.tileSize;

            const fullSheetW = (tilesetTile.cols * tilesetTile.tileSize) * scale;
            const fullSheetH = (tilesetTile.rows * tilesetTile.tileSize) * scale;

            button.style.width = `${btnSize}px`;
            button.style.height = `${btnSize}px`;
            button.style.backgroundImage = `url(${tilesetTile.tileset.src})`;
            button.style.backgroundRepeat = "no-repeat";

            button.style.backgroundOrigin = "border-box";
            button.style.backgroundSize = `${fullSheetW}px ${fullSheetH}px`;
            button.style.backgroundPosition = `${borderWidth - (sx * scale)}px ${borderWidth - (sy * scale)}px`;

            button.onclick = () => {
                document.querySelectorAll('.tile-button').forEach(b => b.classList.remove('active'));
                button.classList.add('active');
                setSelectedTile(tilesetId, id, 0);
            };

            panel.appendChild(button);
        }
    });
}