// Simple API key encryption/decryption utilities
// Note: This is a basic implementation for demo purposes
// In production, use proper encryption with secure keys

const ENCRYPTION_KEY =
  process.env.API_KEY_ENCRYPTION_KEY || "default-key-change-in-production";

export function decryptKey(encryptedKey: string, userId: string): string {
  try {
    // Simple XOR-based decryption (not secure for production)
    const key = `${ENCRYPTION_KEY}-${userId}`;
    let result = "";

    for (let i = 0; i < encryptedKey.length; i++) {
      result += String.fromCharCode(
        encryptedKey.charCodeAt(i) ^ key.charCodeAt(i % key.length),
      );
    }

    return result;
  } catch (error) {
    console.error("Failed to decrypt API key:", error);
    throw new Error("Invalid encrypted key");
  }
}

export function encryptKey(key: string, userId: string): string {
  try {
    // Simple XOR-based encryption (not secure for production)
    const encryptionKey = `${ENCRYPTION_KEY}-${userId}`;
    let result = "";

    for (let i = 0; i < key.length; i++) {
      result += String.fromCharCode(
        key.charCodeAt(i) ^ encryptionKey.charCodeAt(i % encryptionKey.length),
      );
    }

    return result;
  } catch (error) {
    console.error("Failed to encrypt API key:", error);
    throw new Error("Failed to encrypt key");
  }
}
