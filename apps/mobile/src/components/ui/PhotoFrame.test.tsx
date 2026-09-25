import { fireEvent, render, screen, waitFor } from "@testing-library/react-native";

import { PhotoFrame } from "./PhotoFrame";

describe("PhotoFrame", () => {
  it("shows the image, falling back to the placeholder when it fails to load", async () => {
    await render(
      <PhotoFrame
        testID="frame"
        uri="http://minio/expired.jpg"
        placeholderIcon="car-sport-outline"
      />,
    );
    expect(screen.getByTestId("frame").props.source).toEqual({ uri: "http://minio/expired.jpg" });

    fireEvent(screen.getByTestId("frame"), "error");

    await waitFor(() => {
      expect(screen.getByTestId("frame").props.source).toBeUndefined();
    });
  });

  it("shows the placeholder without a URI", async () => {
    await render(<PhotoFrame testID="frame" uri={null} placeholderIcon="camera-outline" />);

    expect(screen.getByTestId("frame").props.source).toBeUndefined();
  });
});
