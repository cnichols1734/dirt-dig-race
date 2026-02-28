export class SpriteManager {
  private loaded = false;

  async load() {
    this.loaded = true;
  }

  isLoaded(): boolean {
    return this.loaded;
  }
}

export const spriteManager = new SpriteManager();
