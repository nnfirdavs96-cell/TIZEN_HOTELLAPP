import { Body, Controller, HttpCode, Post } from "@nestjs/common";
import { DevicesService } from "./devices.service";
import { BindRequestDto, ProvisionRequestDto } from "./dto/provision.dto";
import type { DeviceBindResponse, DeviceProvisionResponse } from "@hga/shared-types";

@Controller("devices")
export class DevicesController {
  constructor(private readonly devices: DevicesService) {}

  @Post("provision")
  @HttpCode(201)
  provision(@Body() body: ProvisionRequestDto): Promise<DeviceProvisionResponse> {
    return this.devices.provision(body);
  }

  @Post("bind")
  @HttpCode(200)
  bind(@Body() body: BindRequestDto): Promise<DeviceBindResponse> {
    return this.devices.bind(body.deviceId, body.roomNumber);
  }
}
