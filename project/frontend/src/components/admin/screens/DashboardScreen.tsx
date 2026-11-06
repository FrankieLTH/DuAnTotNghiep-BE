import React, { useState } from 'react';
import {
  StatRow,
  Badge,
  Button,
  TableContainer,
  TableHeader,
  TableRow,
  formatMoney,
  ConfirmDialog,
} from '../AdminUI';
import { IconCompare, IconRefresh } from '../AdminIcons';
import { AdminUser } from '../AdminLayout';

interface DashboardScreenProps {
  currentUser: AdminUser;
  selectedBranchId: number; // 0 = all, 1 = CN1, 2 = CN2
  onNavigateToBooking: (bookingId?: string) => void;
  onShowToast: (msg: string, type?: 'success' | 'error' | 'warning' | 'info') => void;
}

export const DashboardScreen: React.FC<DashboardScreenProps> = ({
  currentUser,
  selectedBranchId,
  onNavigateToBooking,
  onShowToast,
}) => {
  const [period, setPeriod] = useState<'week' | 'month' | 'quarter' | 'year' | 'all'>('week');
  const [showComparisonModal, setShowComparisonModal] = useState<boolean>(false);
  const [selectedRefundItem, setSelectedRefundItem] = useState<any | null>(null);
  const [showApproveRefundConfirm, setShowApproveRefundConfirm] = useState<boolean>(false);
  const [showRejectRefundConfirm, setShowRejectRefundConfirm] = useState<boolean>(false);
  const [refundReason, setRefundReason] = useState<string>('');

  // Sample data tailored by branch
  // Branch 1: CN1 Triền Núi Nhỏ, Branch 2: CN2 Núi Lớn
  const isBranch1 = selectedBranchId === 1;
  const isBranch2 = selectedBranchId === 2;

  // KPI stats
  const revenueValue = isBranch1 ? 28400000 : isBranch2 ? 19800000 : 48200000;
  const bookingCount = isBranch1 ? 16 : isBranch2 ? 12 : 28;
  const vacantRooms = isBranch1 ? '3 / 8' : isBranch2 ? '2 / 6' : '5 / 14';
  const pendingRefundCount = isBranch1 ? 1 : isBranch2 ? 1 : 2;

  const statItems = [
    {
      label: 'Tổng Doanh Thu',
      value: formatMoney(revenueValue),
      subValue: period === 'week' ? 'Tăng +12.4% so với tuần trước' : 'Trong kỳ được chọn',
      highlight: true,
    },
    {
      label: 'Số Booking',
      value: `${bookingCount} đơn`,
      subValue: '100% tự check-in bằng mã PIN',
    },
    {
      label: 'Phòng Trống Hôm Nay',
      value: vacantRooms,
      subValue: 'Tỷ lệ lấp đầy đạt ~65%',
    },
    {
      label: 'Yêu Cầu Hoàn Tiền Chờ Xử Lý',
      value: `${pendingRefundCount} đơn`,
      subValue: currentUser.role === 'admin' ? 'Cần duyệt chuyển khoản' : 'Đang chờ Admin phê duyệt',
      highlight: pendingRefundCount > 0,
    },
  ];

  // Revenue chart data (7 days of week)
  const chartData = [
    { day: 'T2 (28/10)', cn1: 3400000, cn2: 2100000 },
    { day: 'T3 (29/10)', cn1: 2900000, cn2: 1800000 },
    { day: 'T4 (30/10)', cn1: 3100000, cn2: 2400000 },
    { day: 'T5 (31/10)', cn1: 4200000, cn2: 2800000 },
    { day: 'T6 (01/11)', cn1: 5800000, cn2: 3900000 },
    { day: 'T7 (02/11)', cn1: 6200000, cn2: 4500000 },
    { day: 'CN (03/11)', cn1: 2800000, cn2: 2300000 },
  ];

  const maxChartVal = 7000000;

  // Short list 1: Sắp trả phòng hôm nay
  const checkoutsToday = [
    {
      roomNumber: 'P.201',
      branchName: 'CN1 - Triền Núi Nhỏ',
      branchId: 1,
      bookingCode: 'BK-89021',
      guestName: 'Nguyễn Văn An',
      phone: '0903123456',
      checkoutTime: '12:00 Hôm nay',
      pinStatus: 'Sẵn sàng thu hồi',
    },
    {
      roomNumber: 'P.104',
      branchName: 'CN2 - Bãi Trước',
      branchId: 2,
      bookingCode: 'BK-89025',
      guestName: 'Trần Thị Mai',
      phone: '0918765432',
      checkoutTime: '12:00 Hôm nay',
      pinStatus: 'Sẵn sàng thu hồi',
    },
    {
      roomNumber: 'P.302',
      branchName: 'CN1 - Triền Núi Nhỏ',
      branchId: 1,
      bookingCode: 'BK-89030',
      guestName: 'Lê Hoàng Nam',
      phone: '0982334455',
      checkoutTime: '12:00 Hôm nay',
      pinStatus: 'Khách yêu cầu check-out sớm',
    },
  ].filter((item) => selectedBranchId === 0 || item.branchId === selectedBranchId);

  // Short list 2: Yêu cầu hoàn tiền chờ xử lý
  const pendingRefunds = [
    {
      id: 1,
      bookingCode: 'BK-88914',
      branchName: 'CN1 - Triền Núi Nhỏ',
      branchId: 1,
      guestName: 'Võ Quốc Huy',
      amount: 1890000,
      reason: 'Khách đổi lịch trình công tác khẩn cấp',
      proposedBy: 'Lễ tân / Quản lý CN1',
      proposedAt: '03/11/2026 14:20',
    },
    {
      id: 2,
      bookingCode: 'BK-88902',
      branchName: 'CN2 - Bãi Trước',
      branchId: 2,
      guestName: 'Đặng Thảo Vy',
      amount: 1250000,
      reason: 'Bão thời tiết hủy chuyến tàu cao tốc',
      proposedBy: 'Lễ tân / Quản lý CN2',
      proposedAt: '03/11/2026 16:45',
    },
  ].filter((item) => selectedBranchId === 0 || item.branchId === selectedBranchId);

  const handleApproveRefund = () => {
    if (!selectedRefundItem) return;
    onShowToast(`Đã duyệt hoàn tiền ${formatMoney(selectedRefundItem.amount)} cho đơn ${selectedRefundItem.bookingCode}`, 'success');
    setSelectedRefundItem(null);
  };

  const handleRejectRefund = () => {
    if (!selectedRefundItem) return;
    onShowToast(`Đã từ chối yêu cầu hoàn tiền đơn ${selectedRefundItem.bookingCode}. Lý do: ${refundReason || 'Không hợp lệ'}`, 'warning');
    setSelectedRefundItem(null);
    setRefundReason('');
  };

  return (
    <div className="space-y-6">
      {/* Period Filter Bar & Comparison Button */}
      <div className="flex flex-wrap items-center justify-between gap-3 bg-white p-3 border border-[#E5E0D8] rounded-[6px]">
        <div className="flex items-center gap-1.5 text-xs">
          <span className="font-medium text-[#78716C] mr-1">Xem theo kỳ:</span>
          {(['week', 'month', 'quarter', 'year', 'all'] as const).map((pKey) => {
            const labels = {
              week: 'Tuần này',
              month: 'Tháng này',
              quarter: 'Quý này',
              year: 'Năm nay',
              all: 'Toàn thời gian',
            };
            return (
              <button
                key={pKey}
                onClick={() => setPeriod(pKey)}
                className={`px-3 py-1.5 rounded-[4px] font-medium transition-colors cursor-pointer ${
                  period === pKey
                    ? 'bg-[#B4532A] text-white'
                    : 'bg-[#F4F2EE] text-[#44403C] hover:bg-[#EBE7E0]'
                }`}
              >
                {labels[pKey]}
              </button>
            );
          })}
        </div>

        {currentUser.role === 'admin' && (
          <Button
            variant="outline"
            size="sm"
            icon={<IconCompare className="w-4 h-4 text-[#B4532A]" />}
            onClick={() => setShowComparisonModal(true)}
          >
            So sánh 2 chi nhánh
          </Button>
        )}
      </div>

      {/* KPI Stat Row */}
      <StatRow items={statItems} />

      {/* Bar Chart: Doanh thu theo ngày */}
      <div className="bg-white border border-[#E5E0D8] rounded-[6px] p-5">
        <div className="flex flex-wrap items-center justify-between gap-2 mb-4 pb-3 border-b border-[#E5E0D8]">
          <div>
            <h2 className="text-base font-semibold text-[#1C1917]">
              Biểu đồ doanh thu {period === 'week' ? '7 ngày gần nhất' : 'theo chu kỳ'}
            </h2>
            <p className="text-xs text-[#78716C] mt-0.5">
              Đơn vị: VNĐ • Cột màu đất nung thể hiện doanh thu thực nhận
            </p>
          </div>
          <div className="flex items-center gap-4 text-xs">
            {selectedBranchId === 0 ? (
              <>
                <div className="flex items-center gap-1.5">
                  <span className="w-3 h-3 bg-[#B4532A] rounded-sm" />
                  <span className="text-[#44403C]">CN1: Triền Núi Nhỏ</span>
                </div>
                <div className="flex items-center gap-1.5">
                  <span className="w-3 h-3 bg-[#D97706] rounded-sm" />
                  <span className="text-[#44403C]">CN2: Bãi Trước</span>
                </div>
              </>
            ) : (
              <div className="flex items-center gap-1.5">
                <span className="w-3 h-3 bg-[#B4532A] rounded-sm" />
                <span className="text-[#44403C]">
                  {selectedBranchId === 1 ? 'CN1: Triền Núi Nhỏ' : 'CN2: Bãi Trước'}
                </span>
              </div>
            )}
          </div>
        </div>

        {/* Clean Bar Visualization */}
        <div className="pt-4 pb-2">
          <div className="grid grid-cols-7 gap-3 sm:gap-6 items-end h-56 border-b border-[#E5E0D8] px-2">
            {chartData.map((d, idx) => {
              const val1 = isBranch2 ? 0 : d.cn1;
              const val2 = isBranch1 ? 0 : d.cn2;
              const totalVal = val1 + val2;
              const heightPct1 = Math.round((val1 / maxChartVal) * 100);
              const heightPct2 = Math.round((val2 / maxChartVal) * 100);

              return (
                <div key={idx} className="flex flex-col items-center h-full justify-end group">
                  <div className="text-[11px] font-mono font-medium text-[#78716C] mb-1.5 tabular-nums opacity-0 group-hover:opacity-100 transition-opacity">
                    {formatMoney(totalVal)}
                  </div>
                  <div className="w-full max-w-[48px] flex items-end gap-1 h-44 justify-center">
                    {val1 > 0 && (
                      <div
                        className="w-1/2 bg-[#B4532A] rounded-t-[2px] hover:opacity-90 transition-all cursor-pointer"
                        style={{ height: `${heightPct1}%` }}
                        title={`CN1: ${formatMoney(val1)}`}
                      />
                    )}
                    {val2 > 0 && (
                      <div
                        className="w-1/2 bg-[#D97706] rounded-t-[2px] hover:opacity-90 transition-all cursor-pointer"
                        style={{ height: `${heightPct2}%` }}
                        title={`CN2: ${formatMoney(val2)}`}
                      />
                    )}
                  </div>
                  <span className="text-xs text-[#78716C] mt-2 font-medium truncate w-full text-center">
                    {d.day}
                  </span>
                </div>
              );
            })}
          </div>
        </div>
      </div>

      {/* Two Short Lists: Checkouts & Pending Refunds */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Short List 1: Sắp trả phòng hôm nay */}
        <div className="bg-white border border-[#E5E0D8] rounded-[6px] overflow-hidden">
          <div className="p-4 border-b border-[#E5E0D8] bg-[#FAF9F7] flex items-center justify-between">
            <div>
              <h3 className="text-sm font-semibold text-[#1C1917]">Sắp trả phòng hôm nay</h3>
              <p className="text-xs text-[#78716C] mt-0.5">
                Các phòng cần dọn dẹp và thu hồi mã PIN lúc 12:00
              </p>
            </div>
            <Badge variant="neutral" size="sm">
              {checkoutsToday.length} phòng
            </Badge>
          </div>

          <TableContainer className="border-0 rounded-none">
            <TableHeader>
              <tr>
                <th className="py-2.5 px-3">Phòng</th>
                <th className="py-2.5 px-3">Mã đơn / Khách</th>
                <th className="py-2.5 px-3">Giờ trả</th>
                <th className="py-2.5 px-3 text-right">Trạng thái mã</th>
              </tr>
            </TableHeader>
            <tbody>
              {checkoutsToday.length === 0 ? (
                <tr>
                  <td colSpan={4} className="py-8 text-center text-xs text-[#78716C]">
                    Không có phòng nào sắp trả hôm nay
                  </td>
                </tr>
              ) : (
                checkoutsToday.map((row, idx) => (
                  <TableRow key={idx}>
                    <td className="py-2 px-3 font-mono font-bold text-[#1C1917]">
                      {row.roomNumber}
                      <span className="block text-[11px] font-normal text-[#78716C]">
                        {row.branchName}
                      </span>
                    </td>
                    <td className="py-2 px-3">
                      <button
                        onClick={() => onNavigateToBooking(row.bookingCode)}
                        className="font-mono text-xs text-[#B4532A] hover:underline cursor-pointer font-medium"
                      >
                        {row.bookingCode}
                      </button>
                      <div className="text-xs text-[#44403C]">{row.guestName}</div>
                    </td>
                    <td className="py-2 px-3 text-xs text-[#78716C]">{row.checkoutTime}</td>
                    <td className="py-2 px-3 text-right">
                      <Badge variant="warning" size="sm">
                        {row.pinStatus}
                      </Badge>
                    </td>
                  </TableRow>
                ))
              )}
            </tbody>
          </TableContainer>
        </div>

        {/* Short List 2: Yêu cầu hoàn tiền chờ xử lý */}
        <div className="bg-white border border-[#E5E0D8] rounded-[6px] overflow-hidden">
          <div className="p-4 border-b border-[#E5E0D8] bg-[#FAF9F7] flex items-center justify-between">
            <div>
              <h3 className="text-sm font-semibold text-[#1C1917]">
                Yêu cầu hoàn tiền chờ xử lý
              </h3>
              <p className="text-xs text-[#78716C] mt-0.5">
                {currentUser.role === 'admin'
                  ? 'Admin có quyền duyệt và hoàn qua PayOS'
                  : 'Quản lý chỉ theo dõi tiến độ duyệt'}
              </p>
            </div>
            <Badge variant={pendingRefunds.length > 0 ? 'danger' : 'neutral'} size="sm">
              {pendingRefunds.length} yêu cầu
            </Badge>
          </div>

          <TableContainer className="border-0 rounded-none">
            <TableHeader>
              <tr>
                <th className="py-2.5 px-3">Mã đơn / Khách</th>
                <th className="py-2.5 px-3">Số tiền / Lý do</th>
                <th className="py-2.5 px-3 text-right">Thao tác</th>
              </tr>
            </TableHeader>
            <tbody>
              {pendingRefunds.length === 0 ? (
                <tr>
                  <td colSpan={3} className="py-8 text-center text-xs text-[#78716C]">
                    Không có yêu cầu hoàn tiền nào chờ xử lý
                  </td>
                </tr>
              ) : (
                pendingRefunds.map((row) => (
                  <TableRow key={row.id}>
                    <td className="py-2 px-3">
                      <span className="font-mono text-xs font-semibold text-[#1C1917]">
                        {row.bookingCode}
                      </span>
                      <div className="text-xs text-[#44403C]">{row.guestName}</div>
                      <div className="text-[11px] text-[#78716C]">{row.branchName}</div>
                    </td>
                    <td className="py-2 px-3">
                      <div className="font-mono text-sm font-bold text-[#DC2626] tabular-nums">
                        {formatMoney(row.amount)}
                      </div>
                      <div className="text-xs text-[#78716C] line-clamp-1" title={row.reason}>
                        {row.reason}
                      </div>
                    </td>
                    <td className="py-2 px-3 text-right">
                      {currentUser.role === 'admin' ? (
                        <div className="flex items-center justify-end gap-1.5">
                          <Button
                            variant="primary"
                            size="sm"
                            onClick={() => {
                              setSelectedRefundItem(row);
                              setShowApproveRefundConfirm(true);
                            }}
                          >
                            Duyệt
                          </Button>
                          <Button
                            variant="secondary"
                            size="sm"
                            onClick={() => {
                              setSelectedRefundItem(row);
                              setShowRejectRefundConfirm(true);
                            }}
                          >
                            Từ chối
                          </Button>
                        </div>
                      ) : (
                        <Badge variant="warning" size="sm">
                          Chờ Admin duyệt
                        </Badge>
                      )}
                    </td>
                  </TableRow>
                ))
              )}
            </tbody>
          </TableContainer>
        </div>
      </div>

      {/* Comparison Modal for Admin */}
      <ConfirmDialog
        isOpen={showComparisonModal}
        onClose={() => setShowComparisonModal(false)}
        onConfirm={() => setShowComparisonModal(false)}
        title="So sánh chỉ số 2 chi nhánh"
        variant="primary"
        confirmLabel="Đóng so sánh"
        cancelLabel="Trở về"
        message="Bảng tổng hợp đối chiếu hiệu suất kinh doanh giữa Chi nhánh 1 (Triền Núi Nhỏ) và Chi nhánh 2 (Bãi Trước / Núi Lớn)."
      >
        <div className="mt-4 border border-[#E5E0D8] rounded-[6px] overflow-hidden text-xs">
          <table className="w-full text-left">
            <thead className="bg-[#FAF9F7] border-b border-[#E5E0D8]">
              <tr>
                <th className="p-2.5">Chỉ số vận hành</th>
                <th className="p-2.5 text-[#B4532A] font-semibold">CN1: Triền Núi Nhỏ</th>
                <th className="p-2.5 text-[#D97706] font-semibold">CN2: Bãi Trước</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[#E5E0D8]">
              <tr>
                <td className="p-2.5 font-medium">Tổng phòng vận hành</td>
                <td className="p-2.5 font-mono">8 phòng</td>
                <td className="p-2.5 font-mono">6 phòng</td>
              </tr>
              <tr>
                <td className="p-2.5 font-medium">Doanh thu tuần</td>
                <td className="p-2.5 font-mono font-bold text-[#1C1917]">28.400.000đ</td>
                <td className="p-2.5 font-mono font-bold text-[#1C1917]">19.800.000đ</td>
              </tr>
              <tr>
                <td className="p-2.5 font-medium">Số lượt booking</td>
                <td className="p-2.5 font-mono">16 đơn</td>
                <td className="p-2.5 font-mono">12 đơn</td>
              </tr>
              <tr>
                <td className="p-2.5 font-medium">Tỷ lệ lấp đầy</td>
                <td className="p-2.5 font-mono">68.5%</td>
                <td className="p-2.5 font-mono">62.0%</td>
              </tr>
              <tr>
                <td className="p-2.5 font-medium">Doanh thu TB / phòng (RevPAR)</td>
                <td className="p-2.5 font-mono font-semibold">507.000đ/ngày</td>
                <td className="p-2.5 font-mono font-semibold">471.000đ/ngày</td>
              </tr>
            </tbody>
          </table>
        </div>
      </ConfirmDialog>

      {/* Approve Refund Modal */}
      <ConfirmDialog
        isOpen={showApproveRefundConfirm}
        onClose={() => setShowApproveRefundConfirm(false)}
        onConfirm={handleApproveRefund}
        title="Duyệt hoàn tiền PayOS"
        message={`Bạn có chắc chắn muốn duyệt hoàn tiền ${formatMoney(
          selectedRefundItem?.amount
        )} cho đơn ${selectedRefundItem?.bookingCode}? Giao dịch hoàn tiền sẽ được ghi vào PayOS và Nhật ký thao tác.`}
        confirmLabel="Duyệt & Hoàn tiền ngay"
        variant="primary"
        reasonRequired={true}
        reasonValue={refundReason}
        onReasonChange={setRefundReason}
      />

      {/* Reject Refund Modal */}
      <ConfirmDialog
        isOpen={showRejectRefundConfirm}
        onClose={() => setShowRejectRefundConfirm(false)}
        onConfirm={handleRejectRefund}
        title="Từ chối yêu cầu hoàn tiền"
        message={`Từ chối yêu cầu hoàn tiền đơn ${selectedRefundItem?.bookingCode}. Vui lòng nhập lý do để thông báo cho Quản lý cơ sở.`}
        confirmLabel="Xác nhận từ chối"
        variant="danger"
        reasonRequired={true}
        reasonValue={refundReason}
        onReasonChange={setRefundReason}
      />
    </div>
  );
};
