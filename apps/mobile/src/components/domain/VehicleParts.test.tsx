import { fireEvent, render, screen, waitFor } from "@testing-library/react-native";

import { VehicleHero, VehiclePhoto } from "./VehicleParts";

describe("VehiclePhoto", () => {
  it("shows the image, falling back to the placeholder when it fails to load", async () => {
    await render(<VehiclePhoto testID="photo" uri="http://minio/expired.jpg" />);
    expect(screen.getByTestId("photo").props.source).toEqual({ uri: "http://minio/expired.jpg" });

    // An expired signed URL fails to load.
    fireEvent(screen.getByTestId("photo"), "error");

    await waitFor(() => {
      expect(screen.getByTestId("photo").props.source).toBeUndefined();
    });
  });

  it("tries a fresh URL again after a failure", async () => {
    const view = await render(<VehiclePhoto testID="photo" uri="http://minio/expired.jpg" />);
    fireEvent(screen.getByTestId("photo"), "error");
    await waitFor(() => {
      expect(screen.getByTestId("photo").props.source).toBeUndefined();
    });

    await view.rerender(<VehiclePhoto testID="photo" uri="http://minio/fresh.jpg" />);

    expect(screen.getByTestId("photo").props.source).toEqual({ uri: "http://minio/fresh.jpg" });
  });

  it("shows the placeholder without a URI", async () => {
    await render(<VehiclePhoto testID="photo" uri={null} />);

    expect(screen.getByTestId("photo").props.source).toBeUndefined();
  });
});

describe("VehicleHero", () => {
  it("falls back to the gradient when the photo fails to load", async () => {
    await render(
      <VehicleHero testID="hero" photoUrl="http://minio/expired.jpg" name="Onix" height={300} />,
    );
    expect(screen.getByTestId("hero").props.source).toEqual({ uri: "http://minio/expired.jpg" });

    fireEvent(screen.getByTestId("hero"), "error");

    await waitFor(() => {
      expect(screen.getByText("Sem foto ainda")).toBeTruthy();
    });
  });
});
