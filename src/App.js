import React from "react";
import "./App.css";
import Demo from "./calmap.tsx";

const devices = ["D250AC01", "D250AC02", "D250AC03"];

function App() {
  return (
    <div className="App">
      {devices.map((device) => (
        <div key={device} className="device-row">
          <h2 className="device-title">{device}</h2>
          <div className="data-grid">
            <div className="data-box">
              <h3>Unit Consumption</h3>
              <Demo deviceId={device} dataType="energy" />
            </div>
            <div className="data-box">
              <h3>Temperature</h3>
              <Demo deviceId={device} dataType="temperature" />
            </div>
            <div className="data-box">
              <h3>Humidity</h3>
              <Demo deviceId={device} dataType="humidity" />
            </div>
          </div>
        </div>
      ))}
    </div>
  );
}

export default App;
