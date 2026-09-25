import type { Vehicle } from "@mony/shared-types";
import { ImageManipulator, SaveFormat } from "expo-image-manipulator";
import * as ImagePicker from "expo-image-picker";

import { apiFetch } from "./api-client";

export interface PickedPhoto {
  uri: string;
  mimeType: string;
}

// Longest side we keep. The picker's `quality` only re-compresses — it
// keeps the camera's full resolution (12–50 MP), which makes uploads slow,
// can exceed the API's 5 MB cap, and costs every later download/decode.
// ~1600 px at 0.7 JPEG is ~250–400 KB and plenty for a vehicle photo.
const MAX_PHOTO_DIMENSION = 1600;

// Library picker (4:3 crop on Android; iOS's picker crops square), then
// downscaled and re-encoded as JPEG before upload. The system photo
// picker needs no runtime permission; null when the user cancels.
export async function pickVehiclePhoto(): Promise<PickedPhoto | null> {
  const result = await ImagePicker.launchImageLibraryAsync({
    mediaTypes: ["images"],
    allowsEditing: true,
    aspect: [4, 3],
    quality: 1,
  });
  if (result.canceled || !result.assets[0]) return null;
  const asset = result.assets[0];

  const context = ImageManipulator.manipulate(asset.uri);
  const longest = Math.max(asset.width, asset.height);
  if (longest > MAX_PHOTO_DIMENSION) {
    context.resize(
      asset.width >= asset.height
        ? { width: MAX_PHOTO_DIMENSION }
        : { height: MAX_PHOTO_DIMENSION },
    );
  }
  const image = await context.renderAsync();
  const saved = await image.saveAsync({ compress: 0.7, format: SaveFormat.JPEG });
  return { uri: saved.uri, mimeType: "image/jpeg" };
}

// `PUT /vehicles/:id/photo` as multipart. React Native's FormData takes
// a `{ uri, name, type }` descriptor for a local file instead of a Blob
// (streamed from disk, never loaded into the JS heap). The API detects
// the real type from the bytes; `type`/`name` are hints.
export function uploadVehiclePhoto(vehicleId: string, photo: PickedPhoto): Promise<Vehicle> {
  const form = new FormData();
  form.append("photo", {
    uri: photo.uri,
    name: "vehicle.jpg",
    type: photo.mimeType,
  } as unknown as Blob);
  return apiFetch<Vehicle>(`/vehicles/${vehicleId}/photo`, { method: "PUT", body: form });
}
