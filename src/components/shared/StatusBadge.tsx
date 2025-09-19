interface StatusBadgeProps {
  status: 'active' | 'inactive' | 'processing' | 'error' | 'success';
  children: React.ReactNode;
}

export function StatusBadge({ status, children }: StatusBadgeProps) {
  const statusClasses = {
    active: 'bg-green-100 text-green-800',
    inactive: 'bg-gray-100 text-gray-800',
    processing: 'bg-yellow-100 text-yellow-800',
    error: 'bg-red-100 text-red-800',
    success: 'bg-green-100 text-green-800',
  };

  return (
    <span className={`status-badge ${statusClasses[status]}`}>
      {children}
    </span>
  );
}