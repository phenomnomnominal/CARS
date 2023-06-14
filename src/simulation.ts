const FOUR_NINTHS = 4 / 9;
const NINTH = 1 / 9;
const THIRTY_SIXTH = 1 / 36;

export class Simulation {
  // Fluid particle densities, etc. (using 1D arrays for speed):
  // To index into these arrays, use x + y * this._xDim, traversing rows first and then columns.

  // microscopic densities along each lattice direction
  private _n0: Array<number> = [];
  private _nN: Array<number> = [];
  private _nS: Array<number> = [];
  private _nE: Array<number> = [];
  private _nW: Array<number> = [];
  private _nNE: Array<number> = [];
  private _nSE: Array<number> = [];
  private _nNW: Array<number> = [];
  private _nSW: Array<number> = [];

  // macroscopic density
  private _rho: Array<number> = [];

  // macroscopic velocity
  private _uX: Array<number> = [];
  private _uY: Array<number> = [];

  private _curl: Array<number> = [];
  private _barrier: Array<boolean> = [];

  constructor(
    private _xDim: number,
    private _yDim: number,
    private _speed: number,
    private _steps: number,
    private _viscosity: number
  ) {
    this.init();
  }

  public get xDim(): number {
    return this._xDim;
  }

  public get yDim(): number {
    return this._yDim;
  }

  public barrier(x: number, y: number): boolean {
    return this._barrier[this.getIndex(x, y)];
  }

  public curl(x: number, y: number): number {
    return this._curl[this.getIndex(x, y)];
  }

  public init(): void {
    this._initBarrier();
    this._initFluid();
  }

  public getIndex(x: number, y: number): number {
    return x + y * this._xDim;
  }

  public setSpeed(newSpeed: number): void {
    this._speed = newSpeed;
  }

  public setSteps(newSteps: number): void {
    this._steps = newSteps;
  }

  public setViscosity(newViscosity: number): void {
    this._viscosity = newViscosity;
  }

  public simulate() {
    this._setBoundaries();

    // Execute a bunch of time steps:
    for (var step = 0; step < this._steps; step++) {
      this._collide();
      this._stream();

      for (var y = 1; y < this._yDim - 1; y++) {
        // interior sites only; leave edges set to zero
        for (var x = 1; x < this._xDim - 1; x++) {
          let index = this.getIndex(x, y);
          let indexW = this.getIndex(x + 1, y);
          let indexE = this.getIndex(x - 1, y);
          let indexS = this.getIndex(x, y + 1);
          let indexN = this.getIndex(x, y - 1);

          this._curl[index] = this._uY[indexW] - this._uY[indexE] - this._uX[indexS] + this._uX[indexN];
        }
      }
    }
  }

  public addBarrier(x: number, y: number): void {
    if (x > 1 && x < this._xDim - 2 && y > 1 && y < this._yDim - 2) {
      this._barrier[x + y * this._xDim] = true;
    }
  }

  public removeBarrier(x: number, y: number): void {
    const index = x + y * this._xDim;
    if (this._barrier[index]) {
      this._barrier[index] = false;
    }
  }

  public clearBarriers(): void {
    this._initBarrier();
  }

  private _initBarrier(): void {
    // Initialize to a steady rightward flow with no barriers:
    for (let y = 0; y < this._yDim; y++) {
      for (let x = 0; x < this._xDim; x++) {
        this._barrier[x + y * this._xDim] = false;
      }
    }
  }

  // Function to initialize or re-initialize the fluid, based on speed slider setting:
  private _initFluid(): void {
    // Amazingly, if the y loop is nested inside the x loop, Firefox slows down by a factor of 20
    const u0 = this._speed;
    for (let y = 0; y < this._yDim; y++) {
      for (let x = 0; x < this._xDim; x++) {
        this._setEquilibrium(x, y, u0, 0, 1);
        this._curl[x + y * this._xDim] = 0.0;
      }
    }
  }

  private _setBoundaries() {
    for (let x = 0; x < this._xDim; x++) {
      this._setEquilibrium(x, 0, this._speed, 0, 1);
      this._setEquilibrium(x, this._yDim - 1, this._speed, 0, 1);
    }
    for (let y = 1; y < this._yDim - 1; y++) {
      this._setEquilibrium(0, y, this._speed, 0, 1);
      this._setEquilibrium(this._xDim - 1, y, this._speed, 0, 1);
    }
  }

  // Set all densities in a cell to their equilibrium values for a given velocity and density:
  // (If density is omitted, it's left unchanged.)
  private _setEquilibrium(x: number, y: number, newUX: number, newUY: number, newRho: number): void {
    const i = x + y * this._xDim;
    if (newRho == null) {
      newRho = this._rho[i];
    }
    const uX3 = 3 * newUX;
    const uY3 = 3 * newUY;
    const uX2 = newUX * newUX;
    const uY2 = newUY * newUY;
    const uXuY2 = 2 * newUX * newUY;
    const u2 = uX2 + uX2;
    const u215 = 1.5 * u2;
    this._n0[i] = FOUR_NINTHS * newRho * (1 - u215);
    this._nE[i] = NINTH * newRho * (1 + uX3 + 4.5 * uX2 - u215);
    this._nW[i] = NINTH * newRho * (1 - uX3 + 4.5 * uX2 - u215);
    this._nN[i] = NINTH * newRho * (1 + uY3 + 4.5 * uY2 - u215);
    this._nS[i] = NINTH * newRho * (1 - uY3 + 4.5 * uY2 - u215);
    this._nNE[i] = THIRTY_SIXTH * newRho * (1 + uX3 + uY3 + 4.5 * (u2 + uXuY2) - u215);
    this._nSE[i] = THIRTY_SIXTH * newRho * (1 + uX3 - uY3 + 4.5 * (u2 - uXuY2) - u215);
    this._nNW[i] = THIRTY_SIXTH * newRho * (1 - uX3 + uY3 + 4.5 * (u2 - uXuY2) - u215);
    this._nSW[i] = THIRTY_SIXTH * newRho * (1 - uX3 - uY3 + 4.5 * (u2 + uXuY2) - u215);
    this._rho[i] = newRho;
    this._uX[i] = newUX;
    this._uY[i] = newUY;
  }

  private _collide() {
    // reciprocal of relaxation time
    const omega = 1 / (3 * this._viscosity + 0.5);

    for (let y = 1; y < this._yDim - 1; y++) {
      for (let x = 1; x < this._xDim - 1; x++) {
        // array index for this lattice site
        const i = x + y * this._xDim;
        const rho =
          this._n0[i] +
          this._nN[i] +
          this._nS[i] +
          this._nE[i] +
          this._nW[i] +
          this._nNW[i] +
          this._nNE[i] +
          this._nSW[i] +
          this._nSE[i];
        this._rho[i] = rho;

        const uX = (this._nE[i] + this._nNE[i] + this._nSE[i] - this._nW[i] - this._nNW[i] - this._nSW[i]) / rho;
        this._uX[i] = uX;

        const uY = (this._nN[i] + this._nNE[i] + this._nNW[i] - this._nS[i] - this._nSE[i] - this._nSW[i]) / rho;
        this._uY[i] = uY;

        // pre-compute a bunch of stuff for optimization
        const one9thRho = NINTH * rho;
        const one36thRho = THIRTY_SIXTH * rho;
        const uX3 = 3 * uX;
        const uY3 = 3 * uY;
        const uX2 = uX * uX;
        const uY2 = uY * uY;
        const uXuY2 = 2 * uX * uY;
        const u2 = uX2 + uY2;
        const u215 = 1.5 * u2;

        this._n0[i] += omega * (FOUR_NINTHS * rho * (1 - u215) - this._n0[i]);
        this._nE[i] += omega * (one9thRho * (1 + uX3 + 4.5 * uX2 - u215) - this._nE[i]);
        this._nW[i] += omega * (one9thRho * (1 - uX3 + 4.5 * uX2 - u215) - this._nW[i]);
        this._nN[i] += omega * (one9thRho * (1 + uY3 + 4.5 * uY2 - u215) - this._nN[i]);
        this._nS[i] += omega * (one9thRho * (1 - uY3 + 4.5 * uY2 - u215) - this._nS[i]);
        this._nNE[i] += omega * (one36thRho * (1 + uX3 + uY3 + 4.5 * (u2 + uXuY2) - u215) - this._nNE[i]);
        this._nSE[i] += omega * (one36thRho * (1 + uX3 - uY3 + 4.5 * (u2 - uXuY2) - u215) - this._nSE[i]);
        this._nNW[i] += omega * (one36thRho * (1 - uX3 + uY3 + 4.5 * (u2 - uXuY2) - u215) - this._nNW[i]);
        this._nSW[i] += omega * (one36thRho * (1 - uX3 - uY3 + 4.5 * (u2 + uXuY2) - u215) - this._nSW[i]);
      }
    }

    for (var y = 1; y < this._yDim - 2; y++) {
      // at right end, copy left-flowing densities from next row to the left
      this._nW[this._xDim - 1 + y * this._xDim] = this._nW[this._xDim - 2 + y * this._xDim];
      this._nNW[this._xDim - 1 + y * this._xDim] = this._nNW[this._xDim - 2 + y * this._xDim];
      this._nSW[this._xDim - 1 + y * this._xDim] = this._nSW[this._xDim - 2 + y * this._xDim];
    }
  }

  private _stream(): void {
    // Move particles along their directions of motion:
    for (let y = this._yDim - 2; y > 0; y--) {
      // first start in NW corner...
      for (let x = 1; x < this._xDim - 1; x++) {
        this._nN[x + y * this._xDim] = this._nN[x + (y - 1) * this._xDim]; // move the north-moving particles
        this._nNW[x + y * this._xDim] = this._nNW[x + 1 + (y - 1) * this._xDim]; // and the northwest-moving particles
      }
    }
    for (let y = this._yDim - 2; y > 0; y--) {
      // now start in NE corner...
      for (let x = this._xDim - 2; x > 0; x--) {
        this._nE[x + y * this._xDim] = this._nE[x - 1 + y * this._xDim]; // move the east-moving particles
        this._nNE[x + y * this._xDim] = this._nNE[x - 1 + (y - 1) * this._xDim]; // and the northeast-moving particles
      }
    }
    for (let y = 1; y < this._yDim - 1; y++) {
      // now start in SE corner...
      for (let x = this._xDim - 2; x > 0; x--) {
        this._nS[x + y * this._xDim] = this._nS[x + (y + 1) * this._xDim]; // move the south-moving particles
        this._nSE[x + y * this._xDim] = this._nSE[x - 1 + (y + 1) * this._xDim]; // and the southeast-moving particles
      }
    }
    for (let y = 1; y < this._yDim - 1; y++) {
      // now start in the SW corner...
      for (let x = 1; x < this._xDim - 1; x++) {
        this._nW[x + y * this._xDim] = this._nW[x + 1 + y * this._xDim]; // move the west-moving particles
        this._nSW[x + y * this._xDim] = this._nSW[x + 1 + (y + 1) * this._xDim]; // and the southwest-moving particles
      }
    }

    for (let y = 1; y < this._yDim - 1; y++) {
      // Now handle bounce-back from barriers
      for (let x = 1; x < this._xDim - 1; x++) {
        if (this._barrier[x + y * this._xDim]) {
          const index = x + y * this._xDim;
          this._nE[x + 1 + y * this._xDim] = this._nW[index];
          this._nW[x - 1 + y * this._xDim] = this._nE[index];
          this._nN[x + (y + 1) * this._xDim] = this._nS[index];
          this._nS[x + (y - 1) * this._xDim] = this._nN[index];
          this._nNE[x + 1 + (y + 1) * this._xDim] = this._nSW[index];
          this._nNW[x - 1 + (y + 1) * this._xDim] = this._nSE[index];
          this._nSE[x + 1 + (y - 1) * this._xDim] = this._nNW[index];
          this._nSW[x - 1 + (y - 1) * this._xDim] = this._nNE[index];
        }
      }
    }
  }
}
