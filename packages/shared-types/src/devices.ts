export interface DeviceProvisionRequest {
  provisionCode: string;
  tizenModel?: string;
  capabilities?: { webrtc?: boolean };
}

export interface DeviceProvisionResponse {
  deviceId: string;
  deviceToken: string;
  roomId: string | null;
}

export interface DeviceBindRequest {
  deviceId: string;
  roomNumber: string;
}

export interface DeviceBindResponse {
  roomId: string;
}
