import React, { useState } from 'react';
import { Button, Input } from '../AdminUI';
import { IconLock } from '../AdminIcons';
import { AdminUser } from '../AdminLayout';
import api from '../../../services/api';

interface LoginScreenProps {
  onLoginSuccess: (user: AdminUser, token: string) => void;
  onGoHome: () => void;
}

export const LoginScreen: React.FC<LoginScreenProps> = ({ onLoginSuccess, onGoHome }) => {
  const [email, setEmail] = useState<string>('');
  const [password, setPassword] = useState<string>('');
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState<boolean>(false);

  const handleLogin = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    setErrorMessage(null);
    setIsLoading(true);
    try {
      const response = await api.post('/auth/admin/login', { email, password });
      const { access_token: token, user } = response.data;
      if (!token || !user || !['admin', 'manager'].includes(user.role)) {
        throw new Error('Tài khoản không có quyền truy cập quản trị.');
      }
      onLoginSuccess(user, token);
    } catch (error: any) {
      setErrorMessage(
        error?.response?.data?.message || error?.message || 'Không thể đăng nhập. Vui lòng thử lại.'
      );
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-[#F8F6F1] flex flex-col justify-center items-center p-4 selection:bg-[#B4532A] selection:text-white font-sans">
      <div className="w-full max-w-md bg-white border border-[#E5E0D8] rounded-[6px] shadow-sm p-6 sm:p-8 space-y-6">
        {/* Brand Header */}
        <div className="text-center space-y-1">
          <div className="w-10 h-10 rounded-full bg-[#FAF0EB] text-[#B4532A] flex items-center justify-center mx-auto mb-2 border border-[#F0D5C7]">
            <IconLock className="w-5 h-5" />
          </div>
          <h1 className="text-xl font-bold tracking-tight text-[#1C1917] uppercase">
            ĐỒI BÔNG GÒN HOMESTAY
          </h1>
          <p className="text-xs text-[#78716C]">
            Cổng đăng nhập hệ thống quản trị & tự động check-in
          </p>
        </div>

        {/* Error Alert */}
        {errorMessage && (
          <div className="p-3 bg-[#FDF2F2] border border-[#F5C2C2] rounded-[6px] text-xs text-[#DC2626] font-medium leading-relaxed">
            {errorMessage}
          </div>
        )}

        {/* Login Form */}
        <form onSubmit={handleLogin} className="space-y-4">
          <Input
            label="Email tài khoản"
            type="email"
            placeholder="admin@homestay.com"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            required
          />

          <Input
            label="Mật khẩu"
            type="password"
            placeholder="••••••••"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            required
          />

          <Button
            type="submit"
            variant="primary"
            size="lg"
            className="w-full mt-2"
            disabled={isLoading}
          >
            {isLoading ? 'Đang xác thực...' : 'Đăng nhập vào hệ thống'}
          </Button>
        </form>

        <p className="pt-4 border-t border-[#E5E0D8] text-xs text-center text-[#78716C]">
          Đăng nhập bằng tài khoản nhân viên đã được cấp trong hệ thống.
        </p>

        {/* Back to Home Button */}
        <div className="text-center pt-2">
          <button
            type="button"
            onClick={onGoHome}
            className="text-xs text-[#78716C] hover:text-[#1C1917] hover:underline cursor-pointer"
          >
            &larr; Quay lại trang đặt phòng khách hàng
          </button>
        </div>
      </div>
    </div>
  );
};
