import NavBar from "@/components/nav/NavBar";

export default function InventoryPage() {
  return (
    <div className="min-h-screen">
      <NavBar reorderCount={0} />
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
        <h1 className="text-2xl font-bold text-bicr-navy">Inventory</h1>
        <p className="text-gray-500 mt-2">Loading inventory table...</p>
      </main>
    </div>
  );
}
