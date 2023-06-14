import { Renderer } from "./renderer.js";
import { Simulation } from "wasm-fluid";

const canvas = document.createElement("canvas");
canvas.width = 600;
canvas.height = 240;
document.body.append(canvas);

const pxPerSquare = 3;

const xDim = canvas.width / pxPerSquare;
const yDim = canvas.height / pxPerSquare;

const simulation = Simulation.new(BigInt(xDim), BigInt(yDim), 0.1, BigInt(20), 0.02);

initialBarrier(simulation);

const renderer = new Renderer(canvas, 1, pxPerSquare);

function initialBarrier(simulation) {
  const barrierSize = 8;
  const x = Math.round(yDim / 3);
  for (var y = yDim / 2 - barrierSize; y <= yDim / 2 + barrierSize; y++) {
    simulation.add_barrier(BigInt(x), BigInt(y));
  }
}

const renderLoop = () => {
  console.time("simulation");
  simulation.simulate();
  console.timeEnd("simulation");
  renderer.paint(simulation, xDim, yDim);

  requestAnimationFrame(renderLoop);
};

renderer.paint(simulation, xDim, yDim);
requestAnimationFrame(renderLoop);
