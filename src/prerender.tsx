import React from "react";
import { renderToString } from "react-dom/server";
import App from "./App";

// Сборка выполняется без браузерного хранилища: только общая главная страница.
export function render() {
  return renderToString(<App />);
}
