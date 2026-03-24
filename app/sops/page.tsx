"use client";

import NavBar from "@/components/nav/NavBar";

export default function SOPsPage() {
  return (
    <div className="min-h-screen bg-gray-50">
      <NavBar reorderCount={0} />
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
        <div className="text-center py-24">
          <h1 className="text-2xl font-bold text-bicr-navy mb-2">SOPs</h1>
          <p className="text-gray-400 text-sm">Coming soon — standard operating procedures will live here.</p>
        </div>
      </main>
    </div>
  );
}
