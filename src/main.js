import "./style.css";
import ThreeOrb from "@/three-orb";

document.addEventListener("DOMContentLoaded", () => {
  const container = document.querySelector("#app");
  new ThreeOrb(container);
});
