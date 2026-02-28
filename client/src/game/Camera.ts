import { Container } from 'pixi.js';
import { lerp } from '../utils/helpers';
import { SCALED_TILE } from '../utils/constants';

export class Camera {
  container: Container;
  targetX: number = 0;
  targetY: number = 0;
  currentX: number = 0;
  currentY: number = 0;
  shakeX: number = 0;
  shakeY: number = 0;
  shakeIntensity: number = 0;
  shakeDuration: number = 0;
  shakeTimer: number = 0;
  zoom: number = 1;
  targetZoom: number = 1;
  screenWidth: number = 0;
  screenHeight: number = 0;

  constructor(container: Container) {
    this.container = container;
  }

  setScreenSize(w: number, h: number) {
    this.screenWidth = w;
    this.screenHeight = h;
  }

  lookAt(tileX: number, tileY: number) {
    this.targetX = tileX * SCALED_TILE + SCALED_TILE / 2;
    this.targetY = tileY * SCALED_TILE + SCALED_TILE / 2;
  }

  shake(intensity: number, duration: number) {
    this.shakeIntensity = intensity;
    this.shakeDuration = duration;
    this.shakeTimer = duration;
  }

  microZoom(amount: number = 0.02, duration: number = 200) {
    this.targetZoom = 1 + amount;
    setTimeout(() => { this.targetZoom = 1; }, duration / 2);
  }

  update(dt: number) {
    this.currentX = lerp(this.currentX, this.targetX, 0.12);
    this.currentY = lerp(this.currentY, this.targetY, 0.12);

    if (this.shakeTimer > 0) {
      this.shakeTimer -= dt;
      const progress = this.shakeTimer / this.shakeDuration;
      const intensity = this.shakeIntensity * progress;
      this.shakeX = (Math.random() - 0.5) * 2 * intensity;
      this.shakeY = (Math.random() - 0.5) * 2 * intensity;
    } else {
      this.shakeX = lerp(this.shakeX, 0, 0.3);
      this.shakeY = lerp(this.shakeY, 0, 0.3);
    }

    this.zoom = lerp(this.zoom, this.targetZoom, 0.1);

    const cx = -this.currentX + this.screenWidth / 2 + this.shakeX;
    const cy = -this.currentY + this.screenHeight / 2 + this.shakeY;

    this.container.x = cx;
    this.container.y = cy;
    this.container.scale.set(this.zoom);
    this.container.pivot.set(
      -cx / this.zoom + cx,
      -cy / this.zoom + cy,
    );
  }

  screenToWorld(sx: number, sy: number): { x: number; y: number } {
    const cx = -this.currentX + this.screenWidth / 2;
    const cy = -this.currentY + this.screenHeight / 2;
    return {
      x: (sx - cx) / this.zoom,
      y: (sy - cy) / this.zoom,
    };
  }
}
