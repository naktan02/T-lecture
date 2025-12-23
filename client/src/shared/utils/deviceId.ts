// client/src/shared/utils/deviceId.ts

import { v4 as uuidv4 } from 'uuid';

export const getDeviceId = (): string => {
  let deviceId = localStorage.getItem('deviceId');
  if (!deviceId) {
    deviceId = uuidv4();
    localStorage.setItem('deviceId', deviceId);
  }
  return deviceId;
};
