import cors from 'cors';
import { AllowedOrigins } from '../lib/constants';

export default () => cors({
  origin: (origin, callback) => {
    // allow requests with no origin
    // (like mobile apps or curl requests)
    if (!origin) return callback(null, true);
    if (AllowedOrigins.indexOf(origin) === -1) {
      console.log('cors blocked', origin, AllowedOrigins);
      const msg = 'The CORS policy for this site does not '
                + 'allow access from the specified Origin.';
      return callback(new Error(msg), false);
    }
    return callback(null, true);
  },
  allowedHeaders: ['Authorization', 'authkey', 'content-type', 'X-Requested-With', 'serviceName', 'X-KW-API-ID', 'X-KW-API-Key'],
  exposedHeaders: ['API-Token-Expiry'],
  credentials: true,
});
