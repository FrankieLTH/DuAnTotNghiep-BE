import { Injectable, CanActivate, ExecutionContext, ForbiddenException, UnauthorizedException } from '@nestjs/common';
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

    // Admin routes only accept an active STAFF identity verified by JwtStrategy.
    if (!request.user?.isStaff || ![1, 2].includes(Number(request.user.roleId))) {
      throw new UnauthorizedException('Đăng nhập bằng tài khoản nhân viên để tiếp tục.');
    }
    const staffRole: StaffRole = Number(request.user.roleId) === 1 ? 'admin' : 'manager';

    // Branch and actor are loaded from the authenticated STAFF row, never request headers.
    const apartmentId = request.user.apartmentId == null ? null : Number(request.user.apartmentId);
    if (staffRole === 'manager' && !apartmentId) {
      throw new ForbiddenException('Tài khoản quản lý chưa được gán chi nhánh.');
    }
    const staffActor = request.user.email;

    const staffContext: StaffContext = {
      role: staffRole,
      apartmentId,
      actor: String(staffActor),
      email: request.user?.email,
      staffId: request.user.staffId,
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
