"use client";

interface AlertBannerProps {
  reorderCount: number;
  onShowReorderItems: () => void;
}

export default function AlertBanner({ reorderCount, onShowReorderItems }: AlertBannerProps) {
  if (reorderCount === 0) return null;

  return (
    <div className="flex items-center gap-3 bg-red-50 border border-red-200 rounded-lg px-4 py-3 mb-4">
      <span className="text-red-500 text-lg">⚠</span>
      <p className="text-sm text-red-700 font-medium">
        {reorderCount} {reorderCount === 1 ? "item needs" : "items need"} reorder.
      </p>
      <button
        onClick={onShowReorderItems}
        className="ml-auto text-sm font-semibold text-red-700 underline hover:text-red-900 transition-colors"
      >
        Show items
      </button>
    </div>
  );
}
