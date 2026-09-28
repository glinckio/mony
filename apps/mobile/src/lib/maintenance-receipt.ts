import {
  MAINTENANCE_RECEIPT_MAX_BYTES,
  type MaintenanceReceiptKind,
  type MaintenanceRecord,
} from "@mony/shared-types";
import * as DocumentPicker from "expo-document-picker";
import { File } from "expo-file-system";
import * as ImagePicker from "expo-image-picker";
import * as WebBrowser from "expo-web-browser";

import { apiFetch } from "./api-client";
import { downscaleToJpeg } from "./vehicle-photo";

// Longest side kept for receipt photos — invoices must stay legible (the
// API stores them at the same 2560 px).
const MAX_RECEIPT_DIMENSION = 2560;

export interface PickedReceipt {
  uri: string;
  kind: MaintenanceReceiptKind;
  // Shown in the form ("nota.pdf"); photos have none.
  name?: string;
}

// The user refused camera access — the form says how to allow it.
export class CameraPermissionError extends Error {}
// A PDF over the API's 10 MB cap, caught before uploading it.
export class ReceiptTooLargeError extends Error {}

// Receipt photo from the camera (asks for permission) or the library (the
// system picker needs none), downscaled and re-encoded as JPEG like the
// vehicle photo. null when the user cancels.
export async function pickReceiptPhoto(
  source: "camera" | "library",
): Promise<PickedReceipt | null> {
  let result: ImagePicker.ImagePickerResult;
  if (source === "camera") {
    const permission = await ImagePicker.requestCameraPermissionsAsync();
    if (!permission.granted) throw new CameraPermissionError();
    result = await ImagePicker.launchCameraAsync({ mediaTypes: ["images"], quality: 1 });
  } else {
    result = await ImagePicker.launchImageLibraryAsync({ mediaTypes: ["images"], quality: 1 });
  }
  if (result.canceled || !result.assets[0]) return null;
  const photo = await downscaleToJpeg(result.assets[0], MAX_RECEIPT_DIMENSION);
  // The camera's own file (the full-size original) isn't needed anymore.
  if (source === "camera") discardFile(result.assets[0].uri);
  return { uri: photo.uri, kind: "IMAGE" };
}

// A PDF invoice from Files / Drive. null when the user cancels.
export async function pickReceiptPdf(): Promise<PickedReceipt | null> {
  const result = await DocumentPicker.getDocumentAsync({
    type: "application/pdf",
    copyToCacheDirectory: true,
    multiple: false,
  });
  if (result.canceled || !result.assets[0]) return null;
  const asset = result.assets[0];
  if (asset.size !== undefined && asset.size > MAINTENANCE_RECEIPT_MAX_BYTES) {
    throw new ReceiptTooLargeError();
  }
  return { uri: asset.uri, kind: "PDF", name: asset.name };
}

// `PUT /vehicles/:id/maintenance-records/:recordId/receipt` as multipart —
// an expo-file-system File, for the same reason as the vehicle photo
// (see uploadVehiclePhoto). The API detects the real type from the bytes.
export function uploadReceipt(
  vehicleId: string,
  recordId: string,
  receipt: PickedReceipt,
): Promise<MaintenanceRecord> {
  const form = new FormData();
  form.append("receipt", new File(receipt.uri));
  return apiFetch<MaintenanceRecord>(
    `/vehicles/${vehicleId}/maintenance-records/${recordId}/receipt`,
    { method: "PUT", body: form },
  );
}

// The local copy of a receipt (downscaled photo, or the picker's cache
// copy of a PDF) — an invoice with personal data — is removed as soon as
// it's uploaded or discarded, not left in the app cache.
export function discardPickedReceipt(receipt: PickedReceipt | null): void {
  if (receipt) discardFile(receipt.uri);
}

function discardFile(uri: string): void {
  try {
    const file = new File(uri);
    if (file.exists) file.delete();
  } catch {
    // Best-effort: the OS clears the cache eventually.
  }
}

// PDFs open in an in-app browser. On iOS that's SFSafariViewController,
// which renders the PDF inline and keeps it out of Safari's history. On
// Android it's a Custom Tab of the default browser, whose behavior with
// PDFs varies (some versions download them instead of showing them) —
// verify on a device; see docs/specs/vehicle-maintenance/design.md.
export async function openReceiptPdf(url: string): Promise<void> {
  await WebBrowser.openBrowserAsync(url);
}
