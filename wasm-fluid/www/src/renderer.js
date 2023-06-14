import { memory } from "wasm-fluid/wasm_fluid_bg.wasm";

const N_COLORS = 400;

export class Renderer {
  _redList = [];
  _greenList = [];
  _blueList = [];

  _context;
  _image;

  constructor(_canvas, _contrast, _pxPerSquare) {
    this._canvas = _canvas;
    this._contrast = _contrast;
    this._pxPerSquare = _pxPerSquare;

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

    // Set up the array of colors for plotting (mimics matplotlib "jet" colormap):
    for (let c = 0; c <= N_COLORS; c++) {
      let r, g, b;
      if (c < N_COLORS / 8) {
        r = 0;
        g = 0;
        b = Math.round((255 * (c + N_COLORS / 8)) / (N_COLORS / 4));
      } else if (c < (3 * N_COLORS) / 8) {
        r = 0;
        g = Math.round((255 * (c - N_COLORS / 8)) / (N_COLORS / 4));
        b = 255;
      } else if (c < (5 * N_COLORS) / 8) {
        r = Math.round((255 * (c - (3 * N_COLORS) / 8)) / (N_COLORS / 4));
        g = 255;
        b = 255 - r;
      } else if (c < (7 * N_COLORS) / 8) {
        r = 255;
        g = Math.round((255 * ((7 * N_COLORS) / 8 - c)) / (N_COLORS / 4));
        b = 0;
      } else {
        r = Math.round((255 * ((9 * N_COLORS) / 8 - c)) / (N_COLORS / 4));
        g = 0;
        b = 0;
      }
      this._redList[c] = r;
      this._greenList[c] = g;
      this._blueList[c] = b;
    }
  }

  paint(simulation, xDim, yDim) {
    const barrierPtr = simulation.barrier_ptr();
    const barrier = new Uint8Array(memory.buffer, barrierPtr, xDim * yDim);

    const curlPtr = simulation.curl_ptr();
    const curl = new Float64Array(memory.buffer, curlPtr, xDim * yDim);

    var cIndex = 0;
    const contrast = this._contrast;
    for (var y = 0; y < yDim; y++) {
      for (var x = 0; x < xDim; x++) {
        const index = x + y * xDim;
        if (barrier[index]) {
          this._colorSquare(x, y, 0, 0, 0, yDim);
          continue;
        }

        cIndex = Math.round(N_COLORS * (curl[index] * 5 * contrast + 0.5));
        if (cIndex < 0) cIndex = 0;
        if (cIndex > N_COLORS) cIndex = N_COLORS;
        this._colorSquare(x, y, this._redList[cIndex], this._greenList[cIndex], this._blueList[cIndex], yDim);
      }
    }
    this._context.putImageData(this._image, 0, 0);
  }

  _colorSquare(x, y, r, g, b, yDim) {
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
