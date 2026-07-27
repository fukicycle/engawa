/**
 * Lightweight Symmetric XOR-Base64 Cipher for Moral Privacy in Engawa.
 * 
 * This utility provides synchronous, zero-dependency, multi-byte safe obfuscation
 * to prevent developers and admins from casually peeking at raw family conversations
 * in the Firebase Realtime Database Console.
 * 
 * It automatically falls back to raw text if decryption fails, ensuring full backward
 * compatibility with existing unencrypted data in the database.
 */

const ENGAWA_SECRET_KEY = "engawa-moral-privacy-key-2026";

/**
 * Encrypts a raw text string into a base64 obfuscated cipher.
 */
export const encryptText = (text: string): string => {
  if (!text) return "";
  try {
    // 1. Perform XOR obfuscation with the symmetric key
    let xorResult = "";
    for (let i = 0; i < text.length; i++) {
      const charCode = text.charCodeAt(i) ^ ENGAWA_SECRET_KEY.charCodeAt(i % ENGAWA_SECRET_KEY.length);
      xorResult += String.fromCharCode(charCode);
    }
    // 2. Encode to multi-byte safe Base64
    return btoa(encodeURIComponent(xorResult));
  } catch (e) {
    console.error("Encryption failed:", e);
    return text; // fallback to raw
  }
};

/**
 * Decrypts an obfuscated base64 cipher back into raw text.
 * Safely falls back to the original cipher if it's not base64 or decryption fails (for legacy raw posts).
 */
export const decryptText = (cipher: string): string => {
  if (!cipher) return "";
  try {
    // 1. Attempt to decode from Base64
    const decodedBase64 = atob(cipher);
    const decodedResult = decodeURIComponent(decodedBase64);
    
    // 2. Reverse XOR obfuscation with the same key
    let decryptedText = "";
    for (let i = 0; i < decodedResult.length; i++) {
      const charCode = decodedResult.charCodeAt(i) ^ ENGAWA_SECRET_KEY.charCodeAt(i % ENGAWA_SECRET_KEY.length);
      decryptedText += String.fromCharCode(charCode);
    }
    return decryptedText;
  } catch (e) {
    // If decoding or parsing fails, it's highly likely to be legacy raw unencrypted text.
    // Return the original cipher as-is to preserve full backward compatibility!
    return cipher;
  }
};
