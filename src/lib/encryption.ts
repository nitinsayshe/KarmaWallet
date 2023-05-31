import crypto from 'crypto';

const { ENCRYPTION_SECRET_KEY, ENCRYPTION_SECRET_INITIALIZATION_VECTOR, ENCRYPTION_METHOD } = process.env;

const hashedKeyLength = 32;
const hashedInitializationVectorLength = 16;

if (!ENCRYPTION_SECRET_KEY || !ENCRYPTION_SECRET_INITIALIZATION_VECTOR || !ENCRYPTION_METHOD) {
  throw new Error('secretKey, secretIV, and ecnryptionMethod are required');
}

// secret key is hashed using sha512 and trimmed to the hashedKeyLength bytes for key
const key = crypto.createHash('sha512').update(ENCRYPTION_SECRET_KEY).digest('hex').substring(0, hashedKeyLength);

// initialization vector is hashed using sha512 and trimmed to hashedInitializationVectorLength bytes for the initialization vector
const encryptionInitializationVector = crypto
  .createHash('sha512')
  .update(ENCRYPTION_SECRET_INITIALIZATION_VECTOR)
  .digest('hex')
  .substring(0, hashedInitializationVectorLength);

export function encrypt(data: string): string {
  const cipher = crypto.createCipheriv(ENCRYPTION_METHOD, key, encryptionInitializationVector);
  // Encrypts data and converts to hex and base64
  return Buffer.from(cipher.update(data, 'utf8', 'hex') + cipher.final('hex')).toString('base64');
}

export function decrypt(encryptedData: string): string {
  const buff = Buffer.from(encryptedData, 'base64');
  const decipher = crypto.createDecipheriv(ENCRYPTION_METHOD, key, encryptionInitializationVector);
  // Decrypts data and converts to utf8
  return decipher.update(buff.toString('utf8'), 'hex', 'utf8') + decipher.final('utf8');
}
