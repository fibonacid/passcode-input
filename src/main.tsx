import React from "react";
import ReactDOM from "react-dom/client";
import { PassCode, PassCodeInput } from "../lib/main";

ReactDOM.createRoot(document.getElementById("app")!).render(
  <React.StrictMode>
    <PassCode style={{}}>
      {Array.from({ length: 4 }).map((_, index) => (
        <PassCodeInput
          key={index}
          style={{
            width: "1em",
            height: "1em",
            margin: "0.25em",
            fontSize: "1.5em",
          }}
        />
      ))}
    </PassCode>
  </React.StrictMode>
);
