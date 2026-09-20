import { render, screen } from "@testing-library/react-native";

import App from "./App";

describe("App", () => {
  it("renders the app title", () => {
    render(<App />);

    expect(screen.getByText("Mony")).toBeTruthy();
  });
});
