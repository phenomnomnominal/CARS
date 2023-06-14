import { TerminalRenderer } from "./renderer-terminal.js";
import { Simulation } from "./simulation.js";

const xDim = 100;
const yDim = 30;

const simulation = new Simulation(xDim, yDim, 0.1, 20, 0.02);
initialBarrier(simulation, yDim);
const renderer = new TerminalRenderer(1);

(async () => {
  let count = 0;
  while (count < 1000) {
    count += 1;

    console.time("simulate");
    simulation.simulate();
    console.timeEnd("simulate");
    await renderer.paint(simulation, xDim, yDim);
  }
})();

function initialBarrier(simulation: Simulation, yDim: number): void {
  const barrierSize = 8;
  const x = Math.round(yDim / 3);
  for (let y = yDim / 2 - barrierSize; y <= yDim / 2 + barrierSize; y++) {
    simulation.addBarrier(x, y);
  }
}
