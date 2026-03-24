"use client";

import NavBar from "@/components/nav/NavBar";

const PLANNED_SOPS = [
  { title: "Weekly Inventory Count", description: "Step-by-step process for conducting weekly inventory counts across all categories." },
  { title: "Reorder Process", description: "How to evaluate reorder alerts, place orders with vendors, and mark items as received." },
  { title: "New Item Setup", description: "Adding a new inventory item including vendor assignment, burn rates, and reorder thresholds." },
  { title: "Receiving Shipments", description: "Inspecting deliveries, updating counts, and closing open orders." },
  { title: "Café Stock Transfer", description: "Moving inventory between storage and the Hilo café, including variant tracking." },
];

export default function SOPsPage() {
  return (
    <div className="min-h-screen bg-gray-50">
      <NavBar reorderCount={0} />
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
        <div className="mb-6">
          <h1 className="text-2xl font-bold text-bicr-navy">SOPs</h1>
          <p className="text-sm text-gray-500 mt-0.5">Standard operating procedures for inventory management</p>
        </div>

        <div className="bg-white rounded-lg border border-gray-200 divide-y divide-gray-100">
          {PLANNED_SOPS.map((sop) => (
            <div key={sop.title} className="px-5 py-4 flex items-start gap-4">
              <div className="mt-0.5 h-8 w-8 rounded-md bg-bicr-lightblue flex items-center justify-center flex-shrink-0">
                <svg className="h-4 w-4 text-bicr-teal" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                </svg>
              </div>
              <div>
                <h3 className="text-sm font-semibold text-bicr-navy">{sop.title}</h3>
                <p className="text-xs text-gray-400 mt-0.5">{sop.description}</p>
              </div>
              <span className="ml-auto text-xs text-gray-300 bg-gray-50 px-2 py-1 rounded-full whitespace-nowrap">Coming soon</span>
            </div>
          ))}
        </div>
      </main>
    </div>
  );
}
