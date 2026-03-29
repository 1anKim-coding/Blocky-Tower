import { updateFrame } from "./update.js";
import Player from "./player/player.js";
import { loadCollisionData } from "./tiles/tile_collision.js";
import { loadLevel } from "./editor/editor.js"
import { setupAutoTile } from "./tiles/autotile.js"

async function start() {
    await loadCollisionData();
    console.log("Collision data loaded, starting game...");
    init();
}

export let player = null;
export let canvas = null;

function setup() {
    setupAutoTile();
    //load level
    loadLevel(1);
}

function init() {
    canvas = document.getElementById("game-canvas");
    const ctx = canvas.getContext("2d");
    resizeCanvas();

    function resizeCanvas() {
        canvas.width = window.innerWidth;
        canvas.height = window.innerHeight;
    }

    setup();
    // Player setup
    player = new Player(0, 0, "red", canvas, ctx);


    window.addEventListener('resize', resizeCanvas);

    var lastTime = 0;

    function gameLoop(timestamp) {
        let dt = timestamp - lastTime;
        lastTime = timestamp;
        resizeCanvas();
        updateFrame(canvas, ctx, player, dt);
        requestAnimationFrame(gameLoop);
    }

    requestAnimationFrame(gameLoop); //start game loop
}

window.onload = start;