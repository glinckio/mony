import { render, screen } from "@testing-library/react-native";

import App from "./App";

describe("App", () => {
  it("renders the register screen when there is no active session", async () => {
    await render(<App />);

    expect(screen.getByText("Criar sua conta")).toBeTruthy();
  });
});
