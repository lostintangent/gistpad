export function byteArrayToString(value: Uint8Array) {
  return new TextDecoder().decode(value);
}
