import { Application } from 'pixi.js';
import { createRoot } from 'react-dom/client';
import { createElement } from 'react';
import { App, setGameManager } from './ui/App';
import { GameManager } from './game/GameManager';

async function init() {
  const canvas = document.getElementById('game') as HTMLCanvasElement;

  const app = new Application();
  await app.init({
    canvas,
    background: '#0a0a14',
    resizeTo: window,
    antialias: false,
  });

  const gameManager = new GameManager(app);
  setGameManager(gameManager);

  (window as any).__game = gameManager;

  const rootEl = document.getElementById('root')!;
  const root = createRoot(rootEl);
  root.render(createElement(App));
}

init();
