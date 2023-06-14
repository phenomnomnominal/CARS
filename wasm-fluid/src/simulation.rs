use wasm_bindgen::prelude::*;

// When the `wee_alloc` feature is enabled, use `wee_alloc` as the global
// allocator.
#[cfg(feature = "wee_alloc")]
#[global_allocator]
static ALLOC: wee_alloc::WeeAlloc = wee_alloc::WeeAlloc::INIT;

const FOUR_NINTHS: f64 = 4.0 / 9.0;
const NINTH: f64 = 1.0 / 9.0;
const THIRTY_SIXTH: f64 = 1.0 / 36.0;

#[wasm_bindgen]
pub struct Simulation {
    x_dim: u64,
    y_dim: u64,
    speed: f64,
    steps: u64,
    viscosity: f64,

    barrier: Vec<bool>,
    curl: Vec<f64>,

    // Fluid particle densities, etc. (using 1D arrays for speed):
    // To index into these arrays, use x + y * this._xDim, traversing rows first and then columns.
    n_0: Vec<f64>,
    n_e: Vec<f64>,
    n_w: Vec<f64>,
    n_n: Vec<f64>,
    n_s: Vec<f64>,
    n_ne: Vec<f64>,
    n_se: Vec<f64>,
    n_nw: Vec<f64>,
    n_sw: Vec<f64>,

    // macroscopic density
    rho: Vec<f64>,

    // macroscopic velocity
    u_x: Vec<f64>,
    u_y: Vec<f64>,
}

#[wasm_bindgen]
impl Simulation {
    pub fn new(x_dim: u64, y_dim: u64, speed: f64, steps: u64, viscosity: f64) -> Simulation {
        let size = (x_dim * y_dim) as usize;
        let mut simulation = Simulation {
            x_dim,
            y_dim,
            speed,
            steps,
            viscosity,
            barrier: vec![false; size],
            curl: vec![0.0; size],
            n_0: vec![0.0; size],
            n_e: vec![0.0; size],
            n_w: vec![0.0; size],
            n_n: vec![0.0; size],
            n_s: vec![0.0; size],
            n_ne: vec![0.0; size],
            n_se: vec![0.0; size],
            n_nw: vec![0.0; size],
            n_sw: vec![0.0; size],
            rho: vec![0.0; size],
            u_x: vec![0.0; size],
            u_y: vec![0.0; size],
        };
        simulation.init();
        simulation
    }

    pub fn init(&mut self) {
        self.init_barrier();
        self.init_fluid();
    }

    pub fn simulate(&mut self) {
        self.set_boundaries();

        for _ in 0..self.steps {
            self.collide();
            self.stream();

            for y in 1..self.y_dim - 1 {
                for x in 1..self.x_dim - 1 {
                    let index = self.get_index(x, y);
                    let index_w = self.get_index(x + 1, y);
                    let index_e = self.get_index(x - 1, y);
                    let index_s = self.get_index(x, y + 1);
                    let index_n = self.get_index(x, y - 1);

                    self.curl[index] = self.u_y[index_w] - self.u_y[index_e] - self.u_x[index_s]
                        + self.u_x[index_n]
                }
            }
        }
    }

    pub fn barrier_ptr(&self) -> *const bool {
        self.barrier.as_ptr()
    }

    pub fn barrier(&self, x: u64, y: u64) -> bool {
        self.barrier[self.get_index(x, y)]
    }

    pub fn curl_ptr(&self) -> *const f64 {
        self.curl.as_ptr()
    }

    pub fn curl(&self, x: u64, y: u64) -> f64 {
        self.curl[self.get_index(x, y)]
    }

    pub fn set_speed(&mut self, new_speed: f64) {
        self.speed = new_speed;
    }

    pub fn set_steps(&mut self, new_steps: u64) {
        self.steps = new_steps;
    }

    pub fn set_viscosity(&mut self, new_viscosity: f64) {
        self.viscosity = new_viscosity;
    }

    pub fn add_barrier(&mut self, x: u64, y: u64) {
        if x > 1 && x < self.x_dim - 2 && y > 1 && y < self.y_dim - 2 {
            let index = self.get_index(x, y);
            self.barrier[index] = true;
        }
    }

    pub fn remove_barrier(&mut self, x: u64, y: u64) {
        let index = self.get_index(x, y);
        if self.barrier[index] {
            self.barrier[index] = false;
        }
    }

    pub fn clear_barriers(&mut self) {
        self.init_barrier();
    }

    fn init_barrier(&mut self) {
        self.barrier = (0..self.x_dim * self.y_dim).map(|_| false).collect();
    }

    fn init_fluid(&mut self) {
        let u0 = self.speed;
        for y in 0..self.y_dim {
            for x in 0..self.x_dim {
                self.set_equilibrium(x, y, u0, 0.0, 1.0);
                let index = self.get_index(x, y);
                self.curl[index] = 0.0;
            }
        }
    }

    fn get_index(&self, x: u64, y: u64) -> usize {
        (x + (y * self.x_dim)) as usize
    }

    fn set_boundaries(&mut self) {
        for x in 0..self.x_dim {
            self.set_equilibrium(x, 0, self.speed, 0.0, 1.0);
            self.set_equilibrium(x, self.y_dim - 1, self.speed, 0.0, 1.0);
        }
        for y in 1..self.y_dim - 1 {
            self.set_equilibrium(0, y, self.speed, 0.0, 1.0);
            self.set_equilibrium(self.x_dim - 1, y, self.speed, 0.0, 1.0);
        }
    }

    fn set_equilibrium(&mut self, x: u64, y: u64, new_u_x: f64, new_u_y: f64, new_rho: f64) {
        let index = self.get_index(x, y);

        let u_x3 = 3.0 * new_u_x;
        let u_y3 = 3.0 * new_u_y;
        let u_x2 = new_u_x * new_u_x;
        let u_y2 = new_u_y * new_u_y;
        let u_x_u_y2 = 2.0 * new_u_x * new_u_y;
        let u2 = u_x2 + u_x2;
        let u215 = u2 * 1.5;

        self.n_0[index] = FOUR_NINTHS * new_rho * (1.0 - u215);
        self.n_e[index] = NINTH * new_rho * (1.0 + u_x3 + 4.5 * u_x2 - u215);
        self.n_w[index] = NINTH * new_rho * (1.0 - u_x3 + 4.5 * u_x2 - u215);
        self.n_n[index] = NINTH * new_rho * (1.0 + u_y3 + 4.5 * u_y2 - u215);
        self.n_s[index] = NINTH * new_rho * (1.0 - u_y3 + 4.5 * u_y2 - u215);
        self.n_ne[index] =
            THIRTY_SIXTH * new_rho * (1.0 + u_x3 + u_y3 + 4.5 * (u2 + u_x_u_y2) - u215);
        self.n_se[index] =
            THIRTY_SIXTH * new_rho * (1.0 + u_x3 - u_y3 + 4.5 * (u2 - u_x_u_y2) - u215);
        self.n_nw[index] =
            THIRTY_SIXTH * new_rho * (1.0 - u_x3 + u_y3 + 4.5 * (u2 - u_x_u_y2) - u215);
        self.n_sw[index] =
            THIRTY_SIXTH * new_rho * (1.0 - u_x3 - u_y3 + 4.5 * (u2 + u_x_u_y2) - u215);
        self.rho[index] = new_rho;
        self.u_x[index] = new_u_x;
        self.u_y[index] = new_u_y;
    }

    fn collide(&mut self) {
        let omega = 1.0 / (3.0 * self.viscosity + 0.5);
        for y in 1..self.y_dim - 1 {
            for x in 1..self.x_dim - 1 {
                let index = self.get_index(x, y);

                let rho = self.n_0[index]
                    + self.n_n[index]
                    + self.n_s[index]
                    + self.n_e[index]
                    + self.n_w[index]
                    + self.n_nw[index]
                    + self.n_ne[index]
                    + self.n_sw[index]
                    + self.n_se[index];
                self.rho[index] = rho;

                let u_x = (self.n_e[index] + self.n_ne[index] + self.n_se[index]
                    - self.n_w[index]
                    - self.n_nw[index]
                    - self.n_sw[index])
                    / rho;
                self.u_x[index] = u_x;

                let u_y = (self.n_n[index] + self.n_ne[index] + self.n_nw[index]
                    - self.n_s[index]
                    - self.n_se[index]
                    - self.n_sw[index])
                    / rho;
                self.u_y[index] = u_y;

                // pre-compute a bunch of stuff for optimization
                let ninth_rho = NINTH * rho;
                let thirty_sixth_rho = THIRTY_SIXTH * rho;
                let u_x3 = 3.0 * u_x;
                let u_y3 = 3.0 * u_y;
                let u_x2 = u_x * u_x;
                let u_y2 = u_y * u_y;
                let u_x_u_y2 = 2.0 * u_x * u_y;
                let u2 = u_x2 + u_y2;
                let u215 = 1.5 * u2;

                self.n_0[index] += omega * (FOUR_NINTHS * rho * (1.0 - u215) - self.n_0[index]);

                self.n_e[index] +=
                    omega * (ninth_rho * (1.0 + u_x3 + 4.5 * u_x2 - u215) - self.n_e[index]);
                self.n_w[index] +=
                    omega * (ninth_rho * (1.0 - u_x3 + 4.5 * u_x2 - u215) - self.n_w[index]);
                self.n_n[index] +=
                    omega * (ninth_rho * (1.0 + u_y3 + 4.5 * u_y2 - u215) - self.n_n[index]);
                self.n_s[index] +=
                    omega * (ninth_rho * (1.0 - u_y3 + 4.5 * u_y2 - u215) - self.n_s[index]);
                self.n_ne[index] += omega
                    * (thirty_sixth_rho * (1.0 + u_x3 + u_y3 + 4.5 * (u2 + u_x_u_y2) - u215)
                        - self.n_ne[index]);
                self.n_se[index] += omega
                    * (thirty_sixth_rho * (1.0 + u_x3 - u_y3 + 4.5 * (u2 - u_x_u_y2) - u215)
                        - self.n_se[index]);
                self.n_nw[index] += omega
                    * (thirty_sixth_rho * (1.0 - u_x3 + u_y3 + 4.5 * (u2 - u_x_u_y2) - u215)
                        - self.n_nw[index]);
                self.n_sw[index] += omega
                    * (thirty_sixth_rho * (1. - u_x3 - u_y3 + 4.5 * (u2 + u_x_u_y2) - u215)
                        - self.n_sw[index]);
            }
        }

        for y in 1..self.y_dim - 2 {
            let index = self.get_index(self.x_dim - 1, y);
            // at right end, copy left-flowing densities from next row to the left
            let index_w = self.get_index(self.x_dim - 2, y);
            self.n_w[index] = self.n_w[index_w];
            let index_nw = self.get_index(self.x_dim - 2, y);
            self.n_nw[index] = self.n_nw[index_nw];
            let index_sw = self.get_index(self.x_dim - 2, y);
            self.n_sw[index] = self.n_sw[index_sw];
        }
    }

    fn stream(&mut self) {
        // Move particles along their directions of motion:
        for y in (1..self.y_dim - 1).rev() {
            // first start in NW corner...
            for x in 1..(self.x_dim - 1) {
                let index = self.get_index(x, y);
                // move the north-moving particles
                let index_n = self.get_index(x, y - 1);
                self.n_n[index] = self.n_n[index_n];
                // and the northwest-moving particles
                let index_nw = self.get_index(x + 1, y - 1);
                self.n_nw[index] = self.n_nw[index_nw];
            }
        }
        for y in (1..self.y_dim - 1).rev() {
            for x in (1..self.x_dim - 1).rev() {
                let index = self.get_index(x, y);
                // move the east-moving particles
                let index_e = self.get_index(x - 1, y);
                self.n_e[index] = self.n_e[index_e];
                // and the northeast-moving particles
                let index_ne = self.get_index(x - 1, y - 1);
                self.n_ne[index] = self.n_ne[index_ne];
            }
        }
        for y in 1..self.y_dim - 1 {
            for x in (1..self.x_dim - 1).rev() {
                let index = self.get_index(x, y);
                // move the south-moving particles
                let index_s = self.get_index(x, y + 1);
                self.n_s[index] = self.n_s[index_s];
                // and the southeast-moving particles
                let index_se = self.get_index(x - 1, y + 1);
                self.n_se[index] = self.n_se[index_se];
            }
        }
        for y in 1..self.y_dim - 1 {
            for x in 1..self.x_dim - 1 {
                let index = self.get_index(x, y);
                // move the west-moving particles
                let index_w = self.get_index(x + 1, y);
                self.n_w[index] = self.n_w[index_w];
                // and the southwest-moving particles
                let index_sw = self.get_index(x + 1, y + 1);
                self.n_sw[index] = self.n_sw[index_sw];
            }
        }

        for y in 1..self.y_dim - 1 {
            for x in 1..self.x_dim - 1 {
                let index = self.get_index(x, y);
                if self.barrier[index] {
                    let index_e = self.get_index(x + 1, y);
                    self.n_e[index_e] = self.n_w[index];
                    let index_w = self.get_index(x - 1, y);
                    self.n_w[index_w] = self.n_e[index];
                    let index_n = self.get_index(x, y + 1);
                    self.n_n[index_n] = self.n_s[index];
                    let index_s = self.get_index(x, y - 1);
                    self.n_s[index_s] = self.n_n[index];
                    let index_ne = self.get_index(x + 1, y + 1);
                    self.n_ne[index_ne] = self.n_sw[index];
                    let index_nw = self.get_index(x - 1, y + 1);
                    self.n_nw[index_nw] = self.n_se[index];
                    let index_se = self.get_index(x + 1, y - 1);
                    self.n_se[index_se] = self.n_nw[index];
                    let index_sw = self.get_index(x - 1, y - 1);
                    self.n_sw[index_sw] = self.n_ne[index];
                }
            }
        }
    }
}
