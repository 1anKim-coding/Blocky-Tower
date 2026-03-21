import { keys } from "./inputs.js";
import * as PlayerConstants from "./player_constants.js";
import { setupCanvasClickHandlers } from "../editor/editor.js";
import { getTile } from "../tiles/tilemap.js";
import { getCollisionMTVForMovement } from "../tiles/tile_collision.js";

const TICKS_PER_SECOND = 60;
const FIXED_DT = 1000 / TICKS_PER_SECOND;
const SUBSTEPS = 4; // This handles the precision you wanted
const MAX_FRAME_TIME = 100;
const SKIN = 0.5;

export default class Player {
    constructor(x, y, color, canvas, ctx) {
        this.x = x;
        this.y = y;
        this.prevX = x;
        this.prevY = y;
        this.renderX = x;
        this.renderY = y;
        this.velX = 0;
        this.velY = 0;
        this.accumulator = 0;
        this.jumpLeft = 0;
        this.jumped = false;
        this.canvas = canvas;
        this.ctx = ctx;
        this.color = color;
        this.updateMouseEditor = setupCanvasClickHandlers(this.canvas);
        this.alpha = 0.6;
        this.onGround = false;
    }

    _getMTV(x, y) {
        const size = PlayerConstants.getPlayerSize();
        return getCollisionMTVForMovement(getPlayerPoints(x, y, size), x, y, x, y, size, (tx, ty) => getTile(tx, ty));
    }

    tick(dt) {
        const scale = PlayerConstants.getPhysicsScale();
        const frameInputDir = (keys['d'] ? 1 : 0) - (keys['a'] ? 1 : 0);

        // Split the 16.6ms tick into steps
        const stepDT = dt / SUBSTEPS;
        // This factor makes sure 60fps constants work at any rate
        const timeFactor = stepDT / 16.666;

        for (let s = 0; s < SUBSTEPS; s++) {
            // Acceleration Logic
            const targetSpeed = frameInputDir * (this.onGround ? PlayerConstants.speed : PlayerConstants.speed * 0.9);
            const accel = (this.onGround ? 120 : 60) * timeFactor;
            const decel = (this.onGround ? 140 : 20) * timeFactor;

            if (frameInputDir !== 0) {
                if (this.velX < targetSpeed) this.velX = Math.min(this.velX + accel, targetSpeed);
                else if (this.velX > targetSpeed) this.velX = Math.max(this.velX - accel, targetSpeed);
            } else {
                if (Math.abs(this.velX) < 0.1) this.velX = 0;
                else if (this.velX > 0) this.velX = Math.max(this.velX - decel, 0);
                else if (this.velX < 0) this.velX = Math.min(this.velX + decel, 0);
            }

            // Gravity Logic
            if (!this.onGround) this.velY += PlayerConstants.gravity * timeFactor;
            if (this.velY > PlayerConstants.maxFallSpeed) this.velY = PlayerConstants.maxFallSpeed;

            // X Movement & Collision
            this.x += this.velX * scale * timeFactor;
            let mtvX = this._getMTV(this.x, this.y).mtv;
            if (Math.abs(mtvX.x) > 0.01) {
                this.x += mtvX.x;
                this.velX = 0;
            }

            // Y Movement & Collision
            this.onGround = false;
            this.y += this.velY * scale * timeFactor;
            let mtvY = this._getMTV(this.x, this.y).mtv;
            if (Math.abs(mtvY.y) > 0.01) {
                this.y += mtvY.y;
                if (mtvY.y < 0) {
                    this.onGround = true;
                    this.jumpLeft = 2;
                    this.velY = 0;
                } else {
                    this.velY = 0;
                }
            }
        }
    }

    update(dt) {
        let frameTime = (dt < 1) ? dt * 1000 : dt;
        frameTime = Math.min(frameTime, MAX_FRAME_TIME);
        this.accumulator += frameTime;

        while (this.accumulator >= FIXED_DT) {
            this.prevX = this.x;
            this.prevY = this.y;
            this.tick(FIXED_DT);
            this.accumulator -= FIXED_DT;
        }

        const alpha = this.accumulator / FIXED_DT;
        this.renderX = this.prevX + (this.x - this.prevX) * alpha;
        this.renderY = this.prevY + (this.y - this.prevY) * alpha;

        // Jump Handling
        if (keys['w'] && this.jumpLeft > 0 && !this.jumped) {
            this.velY = -PlayerConstants.jumpForce;
            this.jumpLeft--;
            this.jumped = true;
            this.onGround = false;
        } else if (!keys['w']) {
            this.jumped = false;
        }
    }

    editorUpdate(dt = 1) {
        const scale = PlayerConstants.getPhysicsScale();
        let speed = PlayerConstants.editorSpeed;
        if (keys['shift']) speed *= PlayerConstants.editorSpeedMultiplier;
        let realDt = (dt < 1) ? dt * 60 : dt / 16.66;

        if (keys['w']) this.velY -= speed * realDt;
        if (keys['s']) this.velY += speed * realDt;
        if (keys['a']) this.velX -= speed * realDt;
        if (keys['d']) this.velX += speed * realDt;

        this.velX *= 0.9;
        this.velY *= 0.9;
        this.x += this.velX * scale;
        this.y += this.velY * scale;
        this.renderX = this.x;
        this.renderY = this.y;
        if (this.velX != 0 || this.velY != 0) this.updateMouseEditor();
    }

    drawAt(x, y) {
        this.ctx.save();
        this.ctx.globalAlpha = this.alpha;
        this.ctx.fillStyle = this.color;
        this.ctx.fillRect(x, y, PlayerConstants.getPlayerSize(), PlayerConstants.getPlayerSize());
        this.ctx.restore();
    }
}

export function getPlayerPoints(x, y, size) {
    const s = SKIN;
    return {
        points: [
            [x + s, y + s],
            [x + size - s, y + s],
            [x + size - s, y + size - s],
            [x + s, y + size - s]
        ]
    };
}