import { createParamDecorator, ExecutionContext } from '@nestjs/common';
import { StaffContext } from '../config/permissions.config';

export const CurrentStaff = createParamDecorator(
  (data: unknown, ctx: ExecutionContext): StaffContext => {
    const request = ctx.switchToHttp().getRequest();
    return request.staffContext || {
      role: request.staffRole || 'manager',
      apartmentId: request.staffApartmentId || 1,
      actor: request.staffActor || 'staff',
    };
  },
);
