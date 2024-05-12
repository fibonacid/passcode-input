import React from "react";
import ReactDOM from "react-dom/client";
import { PassCode, PassCodeInput } from "../lib/main";

ReactDOM.createRoot(document.getElementById("app")!).render(
  <React.StrictMode>
    <PassCode style={{}}>
      {Array.from({ length: 10 }).map((_, index) => (
        <PassCodeInput
          key={index}
          style={{
            width: "1em",
            height: "1em",
            margin: "0.25em",
            fontSize: "1.5em",
            textAlign: "center",
          }}
        />
      ))}
    </PassCode>
  </React.StrictMode>
);

function OTPInput() {
  return (
    <PassCode>
      <PassCode.Input />
      <PassCode.Input />
      <PassCode.Input />
      <PassCode.Input />
    </PassCode>
  );
}
