import { CanActivate, ExecutionContext, Injectable, UnauthorizedException } from '@nestjs/common';
import { CustomerAuthService } from './customer-auth.service';
@Injectable()
export class CustomerGuard implements CanActivate {
  constructor(private auth: CustomerAuthService) {}
  async canActivate(context: ExecutionContext) {
    const req = context.switchToHttp().getRequest();
    const match = /^Bearer (\S+)$/.exec(req.headers.authorization || '');
    if (!match) throw new UnauthorizedException();
    req.customerSession = await this.auth.authenticate(match[1]);
    return true;
  }
}
