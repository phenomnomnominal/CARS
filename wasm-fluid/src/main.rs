mod colours;
mod renderer_terminal;
mod simulation;

use renderer_terminal::RendererTerminal;
use simulation::Simulation;

use std::time::{Instant};

fn main() {
    let x_dim = 300;
    let y_dim = 120;

    let mut simulation = Simulation::new(x_dim, y_dim, 0.1, 10, 0.02);

    initial_barrier(&mut simulation, y_dim);
    let renderer = RendererTerminal::new(1.0);

    let mut count = 0;
    while count < 1000 {
        count += 1;

        let start = Instant::now();
        simulation.simulate();
        let duration = start.elapsed();

        renderer.paint(&simulation, x_dim, y_dim);

        println!("simulate: {:?}", duration);
    }
}

fn initial_barrier(simulation: &mut Simulation, y_dim: u64) {
    let barrier_size = 8;
    let x = y_dim / 3;
    let y_mid = y_dim / 2;
    for y in y_mid - barrier_size..y_mid + barrier_size {
        simulation.add_barrier(x, y);
    }
}
