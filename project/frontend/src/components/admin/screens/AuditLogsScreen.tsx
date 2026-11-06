import React, { useState } from 'react';
import {
  TableContainer,
  TableHeader,
  TableRow,
  Badge,
  Button,
  Pagination,
  Input,
  Select,
} from '../AdminUI';
import { IconSearch, IconAudit, IconFilter } from '../AdminIcons';
import { AdminUser } from '../AdminLayout';

export interface AuditLogItem {
  id: number;
  createdAt: string;
  actorName: string;
  actorRole: string;
  action: string;
  actionCode: string;
  entityType: string;
  entityId: string;
  oldValue: string;
  newValue: string;
}

interface AuditLogsScreenProps {
  currentUser: AdminUser;
  logs: AuditLogItem[];
  onShowToast: (msg: string, type?: 'success' | 'error' | 'warning' | 'info') => void;
}

export const AuditLogsScreen: React.FC<AuditLogsScreenProps> = ({
  currentUser,
  logs,
  onShowToast,
}) => {
  // If user is not admin, show Unauthorized view
  if (currentUser.role !== 'admin') {
    return (
      <div className="p-8 bg-white border border-[#E5E0D8] rounded-[6px] text-center space-y-3">
        <div className="w-10 h-10 rounded-full bg-[#FDF2F2] text-[#DC2626] flex items-center justify-center mx-auto font-bold text-lg">
          !
        </div>
        <h2 className="text-base font-bold text-[#1C1917]">Bạn không có quyền truy cập</h2>
        <p className="text-xs text-[#78716C] max-w-sm mx-auto">
          Mục Nhật ký thao tác hệ thống chỉ dành riêng cho Quản trị viên cấp cao (ADMIN).
        </p>
      </div>
    );
  }

  const [filterAction, setFilterAction] = useState<string>('all');
  const [filterActor, setFilterActor] = useState<string>('all');
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [currentPage, setCurrentPage] = useState<number>(1);
  const pageSize = 10;

  // Filter logs
  const filteredLogs = logs.filter((log) => {
    if (filterAction !== 'all' && log.actionCode !== filterAction) return false;
    if (filterActor !== 'all' && !log.actorName.includes(filterActor)) return false;
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase().trim();
      const matchActor = log.actorName.toLowerCase().includes(q);
      const matchAction = log.action.toLowerCase().includes(q);
      const matchEntity = log.entityId.toLowerCase().includes(q);
      if (!matchActor && !matchAction && !matchEntity) return false;
    }
    return true;
  });

  const totalPages = Math.ceil(filteredLogs.length / pageSize) || 1;
  const paginatedLogs = filteredLogs.slice(
    (currentPage - 1) * pageSize,
    currentPage * pageSize
  );

  return (
    <div className="space-y-6">
      {/* Top Filter Bar */}
      <div className="bg-white border border-[#E5E0D8] rounded-[6px] p-4 flex flex-wrap items-center justify-between gap-3">
        <div className="flex flex-wrap items-center gap-2.5">
          {/* Action Filter */}
          <select
            value={filterAction}
            onChange={(e) => {
              setFilterAction(e.target.value);
              setCurrentPage(1);
            }}
            className="h-9 px-3 bg-[#FAF9F7] text-xs font-medium text-[#1C1917] border border-[#DDD7CE] rounded-[6px] focus:outline-none focus:ring-1 focus:ring-[#B4532A]"
          >
            <option value="all">Tất cả hành động</option>
            <option value="XEM_MA_PIN">Xem mã PIN</option>
            <option value="HUY_BOOKING">Hủy booking</option>
            <option value="DUYET_HOAN_TIEN">Duyệt hoàn tiền</option>
            <option value="THU_HOI_MA_PIN">Thu hồi mã PIN</option>
            <option value="KHOA_TAI_KHOAN">Khóa tài khoản</option>
            <option value="BAO_TRI_PHONG">Bảo trì phòng</option>
          </select>

          {/* Actor Filter */}
          <select
            value={filterActor}
            onChange={(e) => {
              setFilterActor(e.target.value);
              setCurrentPage(1);
            }}
            className="h-9 px-3 bg-[#FAF9F7] text-xs font-medium text-[#1C1917] border border-[#DDD7CE] rounded-[6px] focus:outline-none focus:ring-1 focus:ring-[#B4532A]"
          >
            <option value="all">Tất cả người thực hiện</option>
            <option value="Admin">Admin</option>
            <option value="Hương Giang">Quản lý CN1</option>
            <option value="Văn Bảo">Quản lý CN2</option>
          </select>

          {/* Search Input */}
          <div className="relative w-64">
            <input
              type="text"
              placeholder="Tìm theo đối tượng, người làm..."
              value={searchQuery}
              onChange={(e) => {
                setSearchQuery(e.target.value);
                setCurrentPage(1);
              }}
              className="w-full h-9 pl-8 pr-3 text-xs bg-[#FAF9F7] text-[#1C1917] border border-[#DDD7CE] rounded-[6px] placeholder:text-[#A8A29E] focus:outline-none focus:ring-1 focus:ring-[#B4532A]"
            />
            <span className="absolute inset-y-0 left-0 pl-2.5 flex items-center pointer-events-none text-[#A8A29E]">
              <IconSearch className="w-3.5 h-3.5" />
            </span>
          </div>
        </div>

        <div className="text-xs text-[#78716C]">
          Tổng cộng <span className="font-semibold text-[#1C1917]">{filteredLogs.length}</span> lượt ghi nhật ký
        </div>
      </div>

      {/* Audit Table (Height 48px per row) */}
      <TableContainer>
        <TableHeader>
          <tr>
            <th className="py-3 px-3.5">Thời gian</th>
            <th className="py-3 px-3.5">Người thực hiện</th>
            <th className="py-3 px-3.5">Hành động ghi nhận</th>
            <th className="py-3 px-3.5">Đối tượng tác động</th>
            <th className="py-3 px-3.5">Giá trị cũ &rarr; Mới (So sánh diff)</th>
          </tr>
        </TableHeader>
        <tbody>
          {paginatedLogs.length === 0 ? (
            <tr>
              <td colSpan={5} className="py-12 text-center text-xs text-[#78716C]">
                Không có nhật ký nào phù hợp với bộ lọc tìm kiếm.
              </td>
            </tr>
          ) : (
            paginatedLogs.map((log) => (
              <TableRow key={log.id}>
                {/* Thời gian */}
                <td className="py-2.5 px-3.5 font-mono text-xs text-[#78716C]">
                  {log.createdAt}
                </td>

                {/* Người thực hiện */}
                <td className="py-2.5 px-3.5 text-xs text-[#1C1917]">
                  <div className="font-medium">{log.actorName}</div>
                  <div className="text-[11px] text-[#78716C] uppercase font-semibold">
                    {log.actorRole}
                  </div>
                </td>

                {/* Hành động */}
                <td className="py-2.5 px-3.5 text-xs">
                  <Badge
                    variant={
                      log.actionCode === 'XEM_MA_PIN'
                        ? 'terracotta'
                        : log.actionCode === 'HUY_BOOKING' || log.actionCode === 'KHOA_TAI_KHOAN'
                        ? 'danger'
                        : log.actionCode === 'DUYET_HOAN_TIEN'
                        ? 'success'
                        : 'neutral'
                    }
                    size="sm"
                  >
                    {log.action}
                  </Badge>
                </td>

                {/* Đối tượng */}
                <td className="py-2.5 px-3.5 font-mono text-xs font-semibold text-[#1C1917]">
                  {log.entityId}
                </td>

                {/* Giá trị cũ -> mới */}
                <td className="py-2.5 px-3.5 text-xs">
                  <div className="flex items-center gap-2">
                    <span className="font-mono bg-[#FDF2F2] text-[#A83232] px-2 py-0.5 rounded border border-[#F5C2C2]">
                      {log.oldValue || 'none'}
                    </span>
                    <span className="text-[#A8A29E] font-bold">&rarr;</span>
                    <span className="font-mono bg-[#EDF5F1] text-[#2A694E] px-2 py-0.5 rounded border border-[#C6E7D2]">
                      {log.newValue}
                    </span>
                  </div>
                </td>
              </TableRow>
            ))
          )}
        </tbody>
      </TableContainer>

      {/* Pagination */}
      <Pagination
        currentPage={currentPage}
        totalPages={totalPages}
        totalItems={filteredLogs.length}
        pageSize={pageSize}
        onPageChange={setCurrentPage}
      />
    </div>
  );
};
