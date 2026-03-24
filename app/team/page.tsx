"use client";

import NavBar from "@/components/nav/NavBar";

const TEAM_MEMBERS = [
  { name: "Kelleigh", role: "Co-CEO / CMTO", area: "Marketing, tech, finance, HR, analytics" },
  { name: "Brandon", role: "Co-CEO", area: "Wholesale, fulfillment, equipment" },
  { name: "Lora", role: "Roaster", area: "Production, roasting" },
  { name: "Haliʻa", role: "Café Manager", area: "Hilo café operations" },
];

function getInitials(name: string) {
  return name.charAt(0).toUpperCase();
}

export default function TeamPage() {
  return (
    <div className="min-h-screen bg-gray-50">
      <NavBar reorderCount={0} />
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
        <div className="mb-6">
          <h1 className="text-2xl font-bold text-bicr-navy">Team</h1>
          <p className="text-sm text-gray-500 mt-0.5">People responsible for inventory and operations</p>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {TEAM_MEMBERS.map((member) => (
            <div key={member.name} className="bg-white rounded-lg border border-gray-200 px-5 py-4">
              <div className="flex items-center gap-3 mb-2">
                <div className="h-9 w-9 rounded-full bg-bicr-teal text-white flex items-center justify-center text-sm font-bold">
                  {getInitials(member.name)}
                </div>
                <div>
                  <h3 className="text-sm font-semibold text-bicr-navy">{member.name}</h3>
                  <p className="text-xs text-gray-400">{member.role}</p>
                </div>
              </div>
              <p className="text-xs text-gray-500">{member.area}</p>
            </div>
          ))}

          {/* Placeholder for adding team members */}
          <div className="bg-white rounded-lg border border-dashed border-gray-300 px-5 py-4 flex items-center justify-center text-gray-300 text-sm">
            + Add team member (coming soon)
          </div>
        </div>

        <div className="mt-8 bg-white rounded-lg border border-gray-200 px-5 py-4">
          <h2 className="text-sm font-semibold text-bicr-navy mb-1">Planned features</h2>
          <ul className="text-xs text-gray-400 space-y-1 list-disc list-inside">
            <li>Assign inventory categories to team members</li>
            <li>Track who performed each count and when</li>
            <li>Set notification preferences per team member</li>
          </ul>
        </div>
      </main>
    </div>
  );
}
