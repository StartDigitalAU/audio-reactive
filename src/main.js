import "./style.css";
import ThreeOrb from "src/three-orb";

document.addEventListener("DOMContentLoaded", () => {
  const container = document.querySelector("#app");
  new ThreeOrb(container);
});
