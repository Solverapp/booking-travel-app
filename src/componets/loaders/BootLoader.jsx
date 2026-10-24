import "./style.css";

const BootLoader = ({ text = "Loading Solver..." }) => (
  <div className="app-boot-loader" role="status" aria-live="polite">
    <span className="app-boot-spinner" aria-hidden="true" />
    <span>{text}</span>
  </div>
);

export default BootLoader;
