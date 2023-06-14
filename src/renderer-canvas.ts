import { Colours } from "./colours.js";
import { Simulation } from "./simulation.js";

const N_COLORS = 400;

export class CanvasRenderer {
  private _colours: Colours;

  private _context: CanvasRenderingContext2D;
  private _image: ImageData;

  constructor(private _canvas: HTMLCanvasElement, private _contrast: number, private _pxPerSquare: number) {
    this._colours = new Colours();

    const context = this._canvas.getContext("2d");
    if (!context) {
      throw new Error();
    }
    this._context = context;

    // for direct pixel manipulation (faster than fillRect)
    this._image = context.createImageData(this._canvas.width, this._canvas.height);

    for (var i = 3; i < this._image.data.length; i += 4) {
      this._image.data[i] = 255; // set all alpha values to opaque
    }
  }

  public paint(simulation: Simulation, xDim: number, yDim: number): void {
    var cIndex = 0;
    const contrast = this._contrast;
    for (var y = 0; y < yDim; y++) {
      for (var x = 0; x < xDim; x++) {
        if (simulation.barrier(x, y)) {
          this._colorSquare(x, y, 0, 0, 0, yDim);
          continue;
        }

        cIndex = Math.round(N_COLORS * (simulation.curl(x, y) * 5 * contrast + 0.5));
        if (cIndex < 0) cIndex = 0;
        if (cIndex > N_COLORS) cIndex = N_COLORS;
        const { red, green, blue } = this._colours.colour(cIndex);
        this._colorSquare(x, y, red, green, blue, yDim);
      }
    }
    this._context.putImageData(this._image, 0, 0);
  }

  private _colorSquare(x: number, y: number, r: number, g: number, b: number, yDim: number): void {
    // put y=0 at the bottom
    const flip = yDim - y - 1;
    for (var py = flip * this._pxPerSquare; py < (flip + 1) * this._pxPerSquare; py++) {
      for (var px = x * this._pxPerSquare; px < (x + 1) * this._pxPerSquare; px++) {
        const index = (px + py * this._image.width) * 4;
        this._image.data[index + 0] = r;
        this._image.data[index + 1] = g;
        this._image.data[index + 2] = b;
      }
    }
  }
}
