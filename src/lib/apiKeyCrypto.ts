import crypto from "crypto";

// Server-side encryption key (store in environment variables)
const ENCRYPTION_KEY = process.env.ENCRYPTION_KEY!;

if (!ENCRYPTION_KEY) {
  throw new Error("API_ENCRYPTION_KEY environment variable is required");
}

export function encryptKey(key: string, userId: string): string {
  try {
    const algorithm = "aes-256-gcm";
    const iv = crypto.randomBytes(16);

    // Create user-specific encryption key
    const derivedKey = crypto
      .createHash("sha256")
      .update(ENCRYPTION_KEY + userId)
      .digest();

    const cipher = crypto.createCipheriv(algorithm, derivedKey, iv);
    let encrypted = cipher.update(key, "utf8", "hex");
    encrypted += cipher.final("hex");

    const authTag = cipher.getAuthTag();

    // Format: iv:authTag:encryptedData
    return iv.toString("hex") + ":" + authTag.toString("hex") + ":" + encrypted;
  } catch (error) {
    console.error("Encryption error:", error);
    throw new Error("Failed to encrypt API key");
  }
}

export function decryptKey(encryptedKey: string, userId: string): string {
  const [iv, authTag, encrypted] = encryptedKey.split(":");
  const derivedKey = crypto
    .createHash("sha256")
    .update(ENCRYPTION_KEY + userId)
    .digest();
  const decipher = crypto.createDecipheriv(
    "aes-256-gcm",
    derivedKey,
    Buffer.from(iv, "hex")
  );
  decipher.setAuthTag(Buffer.from(authTag, "hex"));
  let decrypted = decipher.update(encrypted, "hex", "utf8");
  return decrypted + decipher.final("utf8");
}
