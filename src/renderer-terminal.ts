import { Colours } from "./colours.js";
import { Simulation } from "./simulation.js";

const N_COLORS = 400;

export class TerminalRenderer {
  private _colours: Colours;

  constructor(private _contrast: number) {
    process.stdout.cursorTo(0, 0);
    process.stdout.clearScreenDown();
    this._colours = new Colours();
  }

  public async paint(simulation: Simulation, xDim: number, yDim: number): Promise<void> {
    process.stdout.cursorTo(0, 0);
    return new Promise<void>((resolve) => {
      let result = "";

      const contrast = this._contrast;
      for (let y = 0; y < yDim; y++) {
        for (let x = 0; x < xDim; x++) {
          if (simulation.barrier(x, y)) {
            result += "\x1b[0m ";
            continue;
          }

          let cIndex = Math.round(N_COLORS * (simulation.curl(x, y) * 5 * contrast + 0.5));
          if (cIndex < 0) cIndex = 0;
          if (cIndex > N_COLORS) cIndex = N_COLORS - 1;
          const { red, green, blue } = this._colours.colour(cIndex);
          result += `\x1b[48;2;${red};${green};${blue}m `;
        }
        result += "\x1b[0m\n";
      }
      process.stdout.write(result, () => resolve());
    });
  }
}
