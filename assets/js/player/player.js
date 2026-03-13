// player.js
import { keys } from "./inputs.js";
import * as PlayerConstants from "./player_constants.js";
import { setupCanvasClickHandlers } from "../editor/editor.js";
import { getTile } from "../tiles/tilemap.js";
import { getCollisionMTVForMovement } from "../tiles/tile_collision.js";
import { getCameraPos } from "../update.js";

const DEBUG_DRAW = false;

const SUBSTEPS = 4;
const SLOP = 0.5;
const ITERATIONS = 5;
const STEP_HEIGHT = 10;
const CORNER_NUDGE_MAX = 5;
const EPS = 1e-6;
const MTV_EPS = 0.05;

const MAX_SLOPE_ANGLE_DEG = 55;
const MAX_SLOPE_ANGLE = (MAX_SLOPE_ANGLE_DEG * Math.PI) / 180;
const GROUND_FRICTION = 0.90;
const SLOPE_INPUT_SCALE = 1.0;

const AIR_CONTROL = 1;
const AIR_DRAG = 0.994;
const MAX_GROUND_SPEED = PlayerConstants.speed * 1.0;
const MAX_AIR_SPEED = PlayerConstants.speed * 0.9;

const DEFAULT_NORMAL_SMOOTH_ALPHA = 0.40;

const SKIN = 0.5;

function length(x, y) { return Math.hypot(x, y); }

function normalize(x, y) {
    const l = length(x, y);
    return l === 0 ? { x: 0, y: -1 } : { x: x / l, y: y / l };
}

function clamp(v, a, b) { return Math.max(a, Math.min(b, v)); }

function dot(ax, ay, bx, by) { return ax * bx + ay * by; }

function lerp(a, b, t) { return a + (b - a) * t; }

export function getPlayerPoints(x, y, size) {
    return {
        points: [
            [x + SKIN, y + SKIN],
            [x + size - SKIN, y + SKIN],
            [x + size - SKIN, y + size - SKIN],
            [x + SKIN, y + size - SKIN]
        ]
    };
}

export default class Player {
    constructor(x, y, color, canvas, ctx) {
        this.x = x;
        this.y = y;

        this.renderX = x;
        this.renderY = y;

        this.prevX = x;
        this.prevY = y;
        this.velX = 0;
        this.velY = 0;
        this.jumpLeft = 2;
        this.jumped = false;
        this.canvas = canvas;
        this.ctx = ctx;
        this.color = color;
        this.updateMouseEditor = setupCanvasClickHandlers(this.canvas);

        this.alpha = 0.6;

        this.onGround = false;
        this.groundNormal = { x: 0, y: -1 };

        this._prevNormal = { x: 0, y: -1 };
        this._normalSmoothAlpha = DEFAULT_NORMAL_SMOOTH_ALPHA;
        this._stuckFrames = 0;
        this._stuckThreshold = 3;

        this._wasOnGround = false;
    }

    drawCollisionDebug(debug, avgNormal) {
        if (!DEBUG_DRAW) return;
        const ctx = this.ctx;
        const camera = getCameraPos();
        const cx = (this.x - camera.x) + PlayerConstants.getPlayerSize() / 2;
        const cy = (this.y - camera.y) + PlayerConstants.getPlayerSize() / 2;
        ctx.save();

        if (debug && debug.length) {
            for (const d of debug) {
                const a = d.axis;
                ctx.strokeStyle = "rgba(0,255,0,0.25)";
                ctx.lineWidth = 1;
                ctx.beginPath();
                ctx.moveTo(cx - a.x * 24, cy - a.y * 24);
                ctx.lineTo(cx + a.x * 24, cy + a.y * 24);
                ctx.stroke();
            }
        }

        if (avgNormal) {
            ctx.strokeStyle = "rgba(255,0,0,0.9)";
            ctx.lineWidth = 2;
            ctx.beginPath();
            ctx.moveTo(cx, cy);
            ctx.lineTo(cx + avgNormal.x * 28, cy + avgNormal.y * 28);
            ctx.stroke();
        }

        if (this.onGround) {
            ctx.strokeStyle = "rgba(255,165,0,0.9)";
            ctx.lineWidth = 2;
            ctx.beginPath();
            ctx.moveTo(cx, cy);
            ctx.lineTo(cx + this.groundNormal.x * 24, cy + this.groundNormal.y * 24);
            ctx.stroke();
        }

        ctx.restore();
    }

    _getMTVForMove(prevX, prevY, nextX, nextY) {
        const size = PlayerConstants.getPlayerSize();
        return getCollisionMTVForMovement(getPlayerPoints(this.x, this.y, size), prevX, prevY, nextX, nextY, size, (tx, ty) => getTile(tx, ty));
    }

    _isOverlappingAt(x, y) {
        const res = this._getMTVForMove(x, y, x, y);
        const mtv = res.mtv;
        return (Math.abs(mtv.x) > EPS || Math.abs(mtv.y) > EPS);
    }

    _computeAveragedNormalAt(x, y) {
        const samples = [
            { x, y },
            { x: x - 0.5, y },
            { x: x + 0.5, y },
            { x, y: y - 0.5 }
        ];

        let sumX = 0,
            sumY = 0,
            count = 0;
        let lastDebug = null;

        for (const s of samples) {
            const res = this._getMTVForMove(s.x, s.y, s.x, s.y);
            const mtv = res.mtv;
            if (Math.abs(mtv.x) > EPS || Math.abs(mtv.y) > EPS) {
                const n = normalize(mtv.x, mtv.y);
                sumX += n.x;
                sumY += n.y;
                count++;
                lastDebug = res.debug || lastDebug;
            }
        }

        if (count === 0) return { normal: null, debug: lastDebug };

        const avg = normalize(sumX / count, sumY / count);
        return { normal: avg, debug: lastDebug };
    }

    _computeSmoothedNormal(mtv, sampledNormal) {
        const mag = Math.hypot(mtv.x, mtv.y);
        const immediate = mag === 0 ? { x: 0, y: -1 } : { x: mtv.x / mag, y: mtv.y / mag };

        let target = immediate;
        if (sampledNormal) {
            const sx = immediate.x + sampledNormal.x;
            const sy = immediate.y + sampledNormal.y;
            const L = Math.hypot(sx, sy) || 1;
            target = { x: sx / L, y: sy / L };
        }

        const a = this._normalSmoothAlpha;
        const sx = lerp(this._prevNormal.x, target.x, a);
        const sy = lerp(this._prevNormal.y, target.y, a);
        const L = Math.hypot(sx, sy) || 1;
        const sm = { x: sx / L, y: sy / L };
        this._prevNormal = sm;
        return sm;
    }

    _attemptCornerNudge(nextX, nextY) {
        for (let dx = 1; dx <= CORNER_NUDGE_MAX; dx++) {
            const tryRightX = nextX + dx;
            if (!this._isOverlappingAt(tryRightX, nextY)) {
                this.x = tryRightX;
                this.y = nextY;
                return true;
            }
            const tryLeftX = nextX - dx;
            if (!this._isOverlappingAt(tryLeftX, nextY)) {
                this.x = tryLeftX;
                this.y = nextY;
                return true;
            }
        }
        return false;
    }

    _snapPosition() {
        this.x = Math.round(this.x * 5) / 5;
        this.y = Math.round(this.y * 5) / 5;
    }

    resolveCollision(mtv, nextX, nextY, sweepDebug = null) {
        if (Math.abs(mtv.x) < EPS && Math.abs(mtv.y) < EPS) {
            this.x = nextX;
            this.y = nextY;
            return;
        }

        const sampled = this._computeAveragedNormalAt(this.x, this.y).normal || null;

        let normal;
        if (this.onGround) {
            normal = this.groundNormal;
        } else {
            normal = this._computeSmoothedNormal(mtv, sampled);
        }

        const dotUp = clamp(dot(normal.x, normal.y, 0, -1), -1, 1);
        const angle = Math.acos(dotUp);
        const isGroundContact = (angle <= MAX_SLOPE_ANGLE) && (mtv.y < 0 || Math.abs(mtv.y) > Math.abs(mtv.x));

        if (isGroundContact) {
            this.onGround = true;
            this.groundNormal = normal;

            const tangent = { x: -normal.y, y: normal.x };
            const desiredInput = (keys['d'] ? 1 : 0) - (keys['a'] ? 1 : 0);

            let vAlongT = this.velX * tangent.x + this.velY * tangent.y;

            const movingUpSlope = tangent.y * vAlongT < 0;

            if (desiredInput !== 0) {
                const accel = PlayerConstants.speed * 2.5;
                vAlongT += desiredInput * accel * (1 / SUBSTEPS);
            } else {
                vAlongT *= GROUND_FRICTION;
                if (movingUpSlope) {
                    vAlongT = 0;
                }
                if (Math.abs(vAlongT) < 0.1) vAlongT = 0;
            }

            this.velX = tangent.x * vAlongT;
            this.velY = tangent.y * vAlongT;

            let applyX = Math.abs(mtv.x) > Math.max(SLOP, MTV_EPS) ? mtv.x : 0;
            let applyY = Math.abs(mtv.y) > Math.max(SLOP, MTV_EPS) ? mtv.y : 0;

            if (this.velY > 0 && Math.abs(mtv.y) > Math.abs(mtv.x)) {
                applyX = 0;
            }

            this.x = nextX + applyX;
            this.y = nextY + applyY;

            if (applyY < 0) {
                this.velY = Math.min(this.velY, 0);
                this.jumpLeft = 2;
            }
        }

        const applyX = Math.abs(mtv.x) > Math.max(SLOP, MTV_EPS) ? mtv.x : 0;
        const applyY = Math.abs(mtv.y) > Math.max(SLOP, MTV_EPS) ? mtv.y : 0;

        if (applyX !== 0) {
            this.x = nextX + applyX;
            if (Math.abs(applyX) > Math.abs(applyY)) this.velX = 0;
        } else {
            this.x = nextX;
        }

        if (applyY !== 0) {
            this.y = nextY + applyY;
            if (applyY < 0) {
                this.velY = 0;
                this.jumpLeft = 2;
                this.onGround = true;
                this.groundNormal = normal;
            } else {
                if (this.velY < 0) this.velY = 0;
            }
        } else {
            this.y = nextY;
        }

        if (this._isOverlappingAt(this.x, this.y)) {
            const nudged = this._attemptCornerNudge(nextX, nextY);
            if (!nudged) {
                for (let h = 1; h <= STEP_HEIGHT; h++) {
                    if (!this._isOverlappingAt(nextX, nextY - h)) {
                        this.x = nextX;
                        this.y = nextY - h;
                        if (this.velY > 0) this.velY = 0;
                        break;
                    }
                }
            }
        }

        if (DEBUG_DRAW && sweepDebug) this.drawCollisionDebug(sweepDebug, normal);
    }

    update(dt = 1) {
        const scale = PlayerConstants.getPhysicsScale();

        this.prevX = this.x;
        this.prevY = this.y;

        const wasOnGround = this._wasOnGround;
        this.onGround = false;
        this.groundNormal = { x: 0, y: -1 };

        const frameInputDir = (keys['d'] ? 1 : 0) - (keys['a'] ? 1 : 0);

        const stepDT = dt / SUBSTEPS;

        for (let s = 0; s < SUBSTEPS; s++) {
            const grounded = this.onGround || wasOnGround;

            const targetSpeed = frameInputDir * (grounded ? MAX_GROUND_SPEED : MAX_AIR_SPEED);

            const accel = grounded ? 120 : 60;
            const decel = grounded ? 140 : 80;

            if (frameInputDir !== 0) {
                if (this.velX < targetSpeed) {
                    this.velX = Math.min(this.velX + accel * stepDT, targetSpeed);
                } else if (this.velX > targetSpeed) {
                    this.velX = Math.max(this.velX - accel * stepDT, targetSpeed);
                }
            } else {
                if (this.velX > 0) {
                    this.velX = Math.max(this.velX - decel * stepDT, 0);
                } else if (this.velX < 0) {
                    this.velX = Math.min(this.velX + decel * stepDT, 0);
                }
            }
            if (!this.onGround) {
                this.velY += PlayerConstants.gravity * stepDT;
            }
            if (this.velY > PlayerConstants.maxFallSpeed) this.velY = PlayerConstants.maxFallSpeed;

            const dx = this.velX * scale * stepDT;
            const dy = this.velY * scale * stepDT;
            const nextX = this.x + dx;
            const nextY = this.y + dy;

            let iterX = nextX;
            let iterY = nextY;

            for (let i = 0; i < ITERATIONS; i++) {

                const sweep = this._getMTVForMove(this.x, this.y, iterX, iterY);
                const mtv = sweep.mtv;

                if (this.velY > 0 && Math.abs(mtv.y) < Math.abs(mtv.x)) {
                    mtv.x *= 0.2;
                }

                if (Math.abs(mtv.x) < 0.0001) mtv.x = 0;
                if (Math.abs(mtv.y) < 0.0001) mtv.y = 0;

                if (Math.abs(mtv.x) < EPS && Math.abs(mtv.y) < EPS) {
                    this.x = iterX;
                    this.y = iterY;
                    break;
                }

                this.resolveCollision(mtv, iterX, iterY, sweep.debug);

                iterX = this.x;
                iterY = this.y;
            }

            const stillOverlapping = this._isOverlappingAt(this.x, this.y);
            if (stillOverlapping) {
                this._stuckFrames++;
            } else {
                this._stuckFrames = 0;
            }

            if (this._stuckFrames >= this._stuckThreshold) {
                const inputDirN = (keys['d'] ? 1 : 0) - (keys['a'] ? 1 : 0);
                let nudge = inputDirN !== 0 ? Math.sign(inputDirN) * 1.5 : ((this._stuckFrames % 2 === 0) ? 1.5 : -1.5);
                this.x += nudge;
                this.y -= 0.5;
                this._stuckFrames = 0;
            }
        }

        if (!this.onGround && this.velY >= 0) {

            const snapDist = 3;
            const res = this._getMTVForMove(this.x, this.y, this.x, this.y + snapDist);
            const mtv = res.mtv;

            if (mtv.y < 0 && Math.abs(mtv.y) <= snapDist) {
                this.y += mtv.y;
                this.onGround = true;
                this.velY = 0;
            }
        }

        this._snapPosition();

        if (Math.abs(this.velX) < 0.01) this.velX = 0;
        if (Math.abs(this.velY) < 0.01) this.velY = 0;

        this._wasOnGround = this.onGround;

        if (keys['w'] && this.jumpLeft > 0 && !this.jumped) {
            this.velY = -PlayerConstants.jumpForce;
            this.jumpLeft--;
            this.jumped = true;
        } else if (!keys['w']) {
            this.jumped = false;
        }
        const alpha = 0;
        this.renderX = this.prevX + (this.x - this.prevX) * alpha;
        this.renderY = this.prevY + (this.y - this.prevY) * alpha;
    }

    editorUpdate(dt = 1) {
        const scale = PlayerConstants.getPhysicsScale();
        let speed = PlayerConstants.editorSpeed;
        if (keys['shift']) speed *= PlayerConstants.editorSpeedMultiplier;
        if (keys['w']) this.velY -= speed * dt;
        if (keys['s']) this.velY += speed * dt;
        if (keys['a']) this.velX -= speed * dt;
        if (keys['d']) this.velX += speed * dt;
        this.velX *= PlayerConstants.friction;
        this.velY *= PlayerConstants.friction;
        this.x += this.velX * scale;
        this.y += this.velY * scale;
        if (this.velX != 0 || this.velY != 0) this.updateMouseEditor();
    }

    draw() {
        this.ctx.save();
        this.ctx.globalAlpha = this.alpha;
        this.ctx.fillStyle = this.color;
        this.ctx.fillRect(this.renderX, this.renderY, PlayerConstants.getPlayerSize(), PlayerConstants.getPlayerSize());
        this.ctx.restore();
    }

    drawAt(x, y) {
        this.ctx.save();
        if (DEBUG_DRAW) {
            this.ctx.globalAlpha = this.alpha * 0.6;
        } else {
            this.ctx.globalAlpha = this.alpha;
        }
        this.ctx.fillStyle = this.color;
        this.ctx.fillRect(x, y, PlayerConstants.getPlayerSize(), PlayerConstants.getPlayerSize());
        this.ctx.restore();
    }
}