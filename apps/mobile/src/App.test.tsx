import { render, screen } from "@testing-library/react-native";

import App from "./App";

describe("App", () => {
  it("renders the login screen when there is no active session", async () => {
    await render(<App />);

    expect(
      screen.getByText("Acesse sua conta para continuar organizando suas finanças."),
    ).toBeTruthy();
  });
});
