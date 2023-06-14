use wasm_bindgen::prelude::*;

pub const N_COLORS: u64 = 400;

#[wasm_bindgen]
pub struct Colours {
    red: Vec<u64>,
    blue: Vec<u64>,
    green: Vec<u64>,
}

#[wasm_bindgen]
pub struct Colour {
    pub red: u64,
    pub blue: u64,
    pub green: u64,
}

#[wasm_bindgen]
impl Colours {
    pub fn new() -> Colours {
        let n = N_COLORS as usize;
        let mut red = vec![0; n];
        let mut blue = vec![0; n];
        let mut green = vec![0; n];

        for c in 0..N_COLORS {
            let r: u64;
            let g: u64;
            let b: u64;
            if c < N_COLORS / 8 {
                r = 0;
                g = 0;
                b = (255 * (c + N_COLORS / 8)) / (N_COLORS / 4);
            } else if c < (3 * N_COLORS) / 8 {
                r = 0;
                g = (255 * (c - N_COLORS / 8)) / (N_COLORS / 4);
                b = 255;
            } else if c < (5 * N_COLORS) / 8 {
                r = (255 * (c - (3 * N_COLORS) / 8)) / (N_COLORS / 4);
                g = 255;
                b = 255 - r;
            } else if c < (7 * N_COLORS) / 8 {
                r = 255;
                g = (255 * ((7 * N_COLORS) / 8 - c)) / (N_COLORS / 4);
                b = 0;
            } else {
                r = (255 * ((9 * N_COLORS) / 8 - c)) / (N_COLORS / 4);
                g = 0;
                b = 0;
            }
            red[c as usize] = r;
            green[c as usize] = g;
            blue[c as usize] = b;
        }

        Colours { red, blue, green }
    }

    pub fn colour(&self, index: usize) -> Colour {
        let red = self.red[index];
        let green = self.green[index];
        let blue = self.blue[index];
        Colour { red, green, blue }
    }
}
