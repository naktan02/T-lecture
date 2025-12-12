import { v4 as uuidv4 } from 'uuid'; 
export const getDeviceId = () => {
    let deviceId = localStorage.getItem('deviceId');
    if (!deviceId) {
        deviceId = uuidv4(); // 혹은 Date.now() + Math.random().toString()
        localStorage.setItem('deviceId', deviceId);
    }
    return deviceId;
};