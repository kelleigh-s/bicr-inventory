"use client";

import NavBar from "@/components/nav/NavBar";

const PLANNED_REPORTS = [
  { title: "Inventory Summary", description: "Current stock levels, reorder status, and category breakdown.", icon: "chart-bar" },
  { title: "Count History", description: "Timeline of all inventory counts with who counted and variance tracking.", icon: "clock" },
  { title: "Burn Rate Trends", description: "Usage trends over time to refine reorder points and lead times.", icon: "trending" },
  { title: "Order History", description: "All vendor orders — pending, received, and closed — with cost tracking.", icon: "truck" },
  { title: "Reorder Alerts Log", description: "History of daily Slack reorder alerts and which items triggered them.", icon: "bell" },
];

function ReportIcon({ type }: { type: string }) {
  const cls = "h-5 w-5 text-bicr-teal";
  switch (type) {
    case "chart-bar":
      return (
        <svg className={cls} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
        </svg>
      );
    case "clock":
      return (
        <svg className={cls} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
        </svg>
      );
    case "trending":
      return (
        <svg className={cls} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M13 7h8m0 0v8m0-8l-8 8-4-4-6 6" />
        </svg>
      );
    case "truck":
      return (
        <svg className={cls} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M9 17a2 2 0 11-4 0 2 2 0 014 0zM19 17a2 2 0 11-4 0 2 2 0 014 0z" />
          <path strokeLinecap="round" strokeLinejoin="round" d="M13 16V6a1 1 0 00-1-1H4a1 1 0 00-1 1v10a1 1 0 001 1h1m8-1a1 1 0 01-1 1H9m4-1V8a1 1 0 011-1h2.586a1 1 0 01.707.293l3.414 3.414a1 1 0 01.293.707V16a1 1 0 01-1 1h-1m-6-1a1 1 0 001 1h1M5 17a2 2 0 104 0m-4 0a2 2 0 114 0m6 0a2 2 0 104 0m-4 0a2 2 0 114 0" />
        </svg>
      );
    case "bell":
      return (
        <svg className={cls} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6.002 6.002 0 00-4-5.659V5a2 2 0 10-4 0v.341C7.67 6.165 6 8.388 6 11v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9" />
        </svg>
      );
    default:
      return null;
  }
}

export default function ReportsPage() {
  return (
    <div className="min-h-screen bg-gray-50">
      <NavBar reorderCount={0} />
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
        <div className="mb-6">
          <h1 className="text-2xl font-bold text-bicr-navy">Reports</h1>
          <p className="text-sm text-gray-500 mt-0.5">Inventory analytics and operational insights</p>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {PLANNED_REPORTS.map((report) => (
            <div
              key={report.title}
              className="bg-white rounded-lg border border-gray-200 px-5 py-4 hover:border-bicr-teal/30 transition-colors"
            >
              <div className="flex items-center gap-3 mb-2">
                <div className="h-9 w-9 rounded-md bg-bicr-lightblue flex items-center justify-center flex-shrink-0">
                  <ReportIcon type={report.icon} />
                </div>
                <h3 className="text-sm font-semibold text-bicr-navy">{report.title}</h3>
              </div>
              <p className="text-xs text-gray-400">{report.description}</p>
              <span className="inline-block mt-3 text-xs text-gray-300 bg-gray-50 px-2 py-0.5 rounded-full">Coming soon</span>
            </div>
          ))}
        </div>
      </main>
    </div>
  );
}
