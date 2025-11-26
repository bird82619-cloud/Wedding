export interface FormData {
  fullName: string;
  email: string;
  relationship: string; // 男方親友 or 女方親友
  attendance: string;
  phone: string;
  attendeeCount: string; // 1, 2, 3, Other
  childSeats: string; // 0, 1, 2, 3, Other
  vegetarianCount: string; // 0, 1, 2, 3, Other
  comments: string;
}

export enum FormStatus {
  IDLE = 'IDLE',
  PROCESSING = 'PROCESSING',
  COMPLETED = 'COMPLETED',
  ERROR = 'ERROR'
}