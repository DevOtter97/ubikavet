import { AlertTriangle } from 'lucide-react';

export function ErrorMessage({ message }: { message: string }) {
  return (
    <div className="bg-red-50 p-4 rounded-2xl border border-red-100 text-red-600 text-sm flex items-center gap-3">
      <AlertTriangle size={20} className="shrink-0" />
      <p>{message}</p>
    </div>
  );
}
