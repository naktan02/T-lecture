// server/src/infra/email/index.ts
export {
  sendEmail,
  checkEmailLimit,
  recordEmailSent,
  getRemainingEmailCount,
  FROM_EMAIL,
  FROM_NAME,
} from './brevoClient';
export { sendAuthCode } from './sendAuthCode';
export { sendNotice } from './sendNotice';
