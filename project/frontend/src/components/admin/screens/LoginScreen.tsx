import React, { useState } from 'react';
import { Button, Input } from '../AdminUI';
import { IconLock } from '../AdminIcons';
import { AdminUser } from '../AdminLayout';

interface LoginScreenProps {
  onLoginSuccess: (user: AdminUser) => void;
  onGoHome: () => void;
}

export const LoginScreen: React.FC<LoginScreenProps> = ({ onLoginSuccess, onGoHome }) => {
  const [email, setEmail] = useState<string>('admin@homestay.com');
  const [password, setPassword] = useState<string>('admin123');
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState<boolean>(false);

  // Pre-configured accounts for validation
  const validAccounts: (AdminUser & { password: string; isBlocked?: boolean })[] = [
    {
      id: 1,
      name: 'Võ Minh Quân (Admin)',
      email: 'admin@homestay.com',
      password: 'admin123',
      role: 'admin',
      branchName: 'Tất cả chi nhánh',
    },
    {
      id: 2,
      name: 'Nguyễn Thị Hương Giang',
      email: 'quanly.cn1@homestay.com',
      password: 'manager123',
      role: 'manager',
      branchId: 1,
      branchName: 'CN1: Triền Núi Nhỏ',
    },
    {
      id: 3,
      name: 'Trần Văn Bảo',
      email: 'quanly.cn2@homestay.com',
      password: 'manager123',
      role: 'manager',
      branchId: 2,
      branchName: 'CN2: Bãi Trước / Núi Lớn',
    },
    {
      id: 4,
      name: 'Đặng Tuấn Kiệt',
      email: 'letan.cn1@homestay.com',
      password: 'pass123',
      role: 'manager',
      branchId: 1,
      branchName: 'CN1: Triền Núi Nhỏ',
      isBlocked: true, // Blocked test
    },
  ];

  const handleLogin = (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    setErrorMessage(null);
    setIsLoading(true);

    setTimeout(() => {
      const match = validAccounts.find(
        (a) => a.email.toLowerCase().trim() === email.toLowerCase().trim()
      );

      if (!match) {
        setErrorMessage('Tài khoản email không tồn tại trong hệ thống quản trị.');
        setIsLoading(false);
        return;
      }

      if (match.isBlocked) {
        setErrorMessage('Tài khoản này hiện đang bị KHÓA bởi Quản trị viên cấp cao.');
        setIsLoading(false);
        return;
      }

      if (match.password !== password) {
        setErrorMessage('Mật khẩu không chính xác. Vui lòng kiểm tra lại.');
        setIsLoading(false);
        return;
      }

      // Success
      setIsLoading(false);
      onLoginSuccess({
        id: match.id,
        name: match.name,
        email: match.email,
        role: match.role,
        branchId: match.branchId,
        branchName: match.branchName,
      });
    }, 400);
  };

  const handleQuickSelect = (acc: (typeof validAccounts)[0]) => {
    setEmail(acc.email);
    setPassword(acc.password);
    setErrorMessage(null);
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

        {/* 1-Click Fast Switch Demo Accounts */}
        <div className="pt-4 border-t border-[#E5E0D8] space-y-2.5">
          <div className="text-[11px] font-semibold text-[#78716C] uppercase tracking-wider text-center">
            Chọn nhanh tài khoản thử nghiệm
          </div>
          <div className="space-y-1.5 text-xs">
            {validAccounts.map((acc) => (
              <button
                key={acc.id}
                type="button"
                onClick={() => handleQuickSelect(acc)}
                className={`w-full p-2 text-left rounded-[4px] border transition-colors flex items-center justify-between cursor-pointer ${
                  email === acc.email
                    ? 'border-[#B4532A] bg-[#FAF0EB]'
                    : 'border-[#E5E0D8] hover:bg-[#F9F8F6]'
                }`}
              >
                <div>
                  <div className="font-semibold text-[#1C1917]">{acc.name}</div>
                  <div className="text-[11px] text-[#78716C]">
                    {acc.email} • {acc.branchName || 'Tất cả CN'}
                  </div>
                </div>
                <span
                  className={`text-[10px] font-bold uppercase px-1.5 py-0.5 rounded ${
                    acc.isBlocked
                      ? 'bg-[#FDF2F2] text-[#DC2626]'
                      : acc.role === 'admin'
                      ? 'bg-[#FAF0EB] text-[#B4532A]'
                      : 'bg-[#EDF5F1] text-[#2A694E]'
                  }`}
                >
                  {acc.isBlocked ? 'Bị khóa' : acc.role.toUpperCase()}
                </span>
              </button>
            ))}
          </div>
        </div>

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
