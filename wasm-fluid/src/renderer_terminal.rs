use crate::colours::{Colours, N_COLORS};
use crate::simulation::Simulation;

pub struct RendererTerminal {
    contrast: f64,
    pub colours: Colours,
}

impl RendererTerminal {
    pub fn new(contrast: f64) -> RendererTerminal {
        print!("\x1B[2J\x1B[1;1H");

        RendererTerminal {
            contrast,
            colours: Colours::new(),
        }
    }

    pub fn paint(&self, simulation: &Simulation, x_dim: u64, y_dim: u64) {
        print!("\x1B[1;1H");

        let mut result = "".to_string();
        for y in 0..y_dim {
            for x in 0..x_dim {
                if simulation.barrier(x, y) {
                    result.push_str("\x1b[0m ");
                } else {
                    let colour_value =
                        (N_COLORS as f64) * (simulation.curl(x, y) * 5.0 * self.contrast + 0.5);

                    let colour_index = colour_value.clamp(0.0, (N_COLORS - 1) as f64).floor();
                    let colour = self.colours.colour(colour_index as usize);
                    result.push_str(&format!(
                        "\x1b[48;2;{};{};{}m ",
                        colour.red, colour.green, colour.blue
                    ));
                }
            }
            result.push_str("\x1b[0m\n");
        }
        print!("{}", result);
    }
}
