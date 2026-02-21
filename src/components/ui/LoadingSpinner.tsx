export function LoadingSpinner({ message }: { message?: string }) {
  return (
    <div className="flex flex-col items-center justify-center py-20 gap-4">
      <div className="size-12 border-4 border-primary border-t-transparent rounded-full animate-spin" />
      {message && <p className="text-slate-500 font-medium">{message}</p>}
    </div>
  );
}
