import { Injectable, CanActivate, ExecutionContext, ForbiddenException } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { PERMISSIONS_KEY } from '../decorators/permissions.decorator';
import { Permission, StaffRole, StaffContext, hasPermission } from '../config/permissions.config';

@Injectable()
export class PermissionsGuard implements CanActivate {
  constructor(private reflector: Reflector) {}

  canActivate(context: ExecutionContext): boolean {
    const requiredPermissions = this.reflector.getAllAndOverride<Permission[]>(PERMISSIONS_KEY, [
      context.getHandler(),
      context.getClass(),
    ]);

    const request = context.switchToHttp().getRequest();

    // 1. Lấy thông tin role từ JWT user hoặc header giả lập (x-staff-role)
    let staffRole: StaffRole = 'manager';
    const roleHeader = request.headers['x-staff-role']?.toString()?.toLowerCase();

    if (roleHeader === 'admin' || roleHeader === 'manager') {
      staffRole = roleHeader as StaffRole;
    } else if (request.user?.role) {
      staffRole = request.user.role.toLowerCase() === 'admin' ? 'admin' : 'manager';
    } else if (request.user?.roleId === 1) {
      staffRole = 'admin';
    } else if (request.user?.roleId === 2) {
      staffRole = 'manager';
    }

    // 2. Lấy apartment_id cho phạm vi chi nhánh (STAFF.apartment_id)
    let apartmentId: number | null = null;
    const aptHeader = request.headers['x-staff-apartment-id'];
    if (aptHeader !== undefined && aptHeader !== null && aptHeader !== '') {
      apartmentId = Number(aptHeader);
    } else if (request.user?.apartment_id || request.user?.apartmentId) {
      apartmentId = Number(request.user.apartment_id || request.user.apartmentId);
    } else if (staffRole === 'manager') {
      apartmentId = 1; // Mặc định cho manager cơ sở 1 nếu không truyền
    }

    const staffActor =
      request.headers['x-staff-actor'] || request.user?.email || `${staffRole}_user`;

    const staffContext: StaffContext = {
      role: staffRole,
      apartmentId: staffRole === 'admin' ? (apartmentId || null) : (apartmentId || 1),
      actor: String(staffActor),
      email: request.user?.email,
      staffId: request.user?.staff_id || request.user?.id,
    };

    // Gắn thông tin vào request
    request.staffRole = staffRole;
    request.staffActor = staffActor;
    request.staffApartmentId = staffContext.apartmentId;
    request.staffContext = staffContext;

    // Nếu endpoint không yêu cầu permission cụ thể nào thì cho phép qua
    if (!requiredPermissions || requiredPermissions.length === 0) {
      return true;
    }

    const isVerificationQueue =
      request.url?.includes('verification') || request.query?.context === 'verification';

    // Kiểm tra tất cả permissions yêu cầu
    const hasAll = requiredPermissions.every((perm) =>
      hasPermission(staffRole, perm, { isVerificationQueue }),
    );

    if (!hasAll) {
      throw new ForbiddenException(
        `Bạn không có quyền thực hiện thao tác này. Quyền yêu cầu: [${requiredPermissions.join(
          ', ',
        )}]. Vai trò hiện tại: ${staffRole}`,
      );
    }

    return true;
  }
}
