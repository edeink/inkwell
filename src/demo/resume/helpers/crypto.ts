function bytesToHex(bytes: ArrayBuffer): string {
  const arr = new Uint8Array(bytes);
  let out = '';
  for (let i = 0; i < arr.length; i++) {
    out += arr[i].toString(16).padStart(2, '0');
  }
  return out;
}

export async function sha256Hex(text: string): Promise<string> {
  const buf = new TextEncoder().encode(text);
  const subtle = (globalThis.crypto as Crypto | undefined)?.subtle;
  if (!subtle) {
    throw new Error('当前环境不支持加密校验');
  }
  const digest = await subtle.digest('SHA-256', buf);
  return bytesToHex(digest);
}
