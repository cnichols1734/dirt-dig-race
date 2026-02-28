import { Application } from "pixi.js";
import { createRoot } from "react-dom/client";
import { createElement } from "react";
import { App } from "./ui/App";

async function init() {
  const canvas = document.getElementById("game") as HTMLCanvasElement;

  const app = new Application();
  await app.init({
    canvas,
    background: "#0a0a14",
    resizeTo: window,
    antialias: true,
  });

  const rootEl = document.getElementById("root")!;
  const root = createRoot(rootEl);
  root.render(createElement(App));
}

init();
