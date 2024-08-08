// Prevents additional console window on Windows in release, DO NOT REMOVE!!
#![cfg_attr(not(debug_assertions), windows_subsystem = "windows")]

use serde_json::json;
use tauri::Manager;


fn main() {
  tauri::Builder::default()
    .setup(|app| {
      let main_window = app.get_window("main").expect("failed to get main window");

      // CLone the main window to be used in the closure
      let main_window_clone = main_window.clone();

      main_window.listen("get_motor_data", move |_| {
        let gear = "n";
        let drive_mode = "sport";
        let throttle = 0.69;
        let rpm = 4200;
        let speed = 69;

        main_window_clone.emit("motor_data", json!({
          "gear": gear,
          "driveMode": drive_mode,
          "throttle": throttle,
          "rpm": rpm,
          "speed": speed
        })).unwrap();
      });

      Ok(())
    })
    .run(tauri::generate_context!())
    .expect("error while running tauri application");
}
