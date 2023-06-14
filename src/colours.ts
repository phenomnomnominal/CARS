const N_COLORS = 400;

export type Colour = {
  red: number;
  blue: number;
  green: number;
};

export class Colours {
  private _red: Array<number> = [];
  private _green: Array<number> = [];
  private _blue: Array<number> = [];

  constructor() {
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
      this._red[c] = r;
      this._green[c] = g;
      this._blue[c] = b;
    }
  }

  public colour(index: number): Colour {
    let red = this._red[index];
    let green = this._green[index];
    let blue = this._blue[index];
    return { red, green, blue };
  }
}
