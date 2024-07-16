// Prevents additional console window on Windows in release, DO NOT REMOVE!!
#![cfg_attr(not(debug_assertions), windows_subsystem = "windows")]

use tauri::{App, Manager};

fn main() {
  tauri::Builder::default()
    .setup(|app: &mut App| {
      let main_window = app.get_window("main").unwrap();
      main_window.show().unwrap();
      Ok(())
    })
    .run(tauri::generate_context!())
    .expect("error while running tauri application");
}
