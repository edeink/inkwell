import { useEffect, useState } from "react";
import "./App.css";
import Editor from ".";

function App() {
  useEffect(() => {
    new Editor("editor-wrapper");
  }, []);
  return <div id="editor-wrapper"></div>;
}

export default App;
