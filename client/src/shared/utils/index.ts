// client/src/shared/utils/index.ts
// Barrel file for utility functions

export { getDeviceId } from './deviceId';
export { logger } from './logger';
export * from './formatPhoneNumber';

export { formatDateToString, formatDay, parseStringToDate } from './dateFormat';
export {
  getHolidaysForMonth,
  isHoliday,
  getHolidayName,
  isSaturday,
  isSunday,
  isSelectableDate,
} from './holidays';
export {
  showSuccess,
  showError,
  showInfo,
  showWarning,
  showLoading,
  dismissLoading,
  showConfirm,
  dismissAll,
} from './toast';
