import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useQuery } from "convex/react";
import { api } from "@/convex";
import { useState } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Search, Calendar } from "lucide-react";

export const Route = createFileRoute("/admin/")({
  component: AdminDashboard,
});

function AdminDashboard() {
  const user = useQuery(api.users.current);
  const navigate = useNavigate();
  const [searchTerm, setSearchTerm] = useState("");

  const customers = useQuery(
    api.customers.search,
    searchTerm ? { query: searchTerm } : "skip",
  );
  const upcomingEvents = useQuery(api.events.listUpcoming);

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-3xl font-bold">
          Welcome{user?.name ? `, ${user.name}` : ""}
        </h1>
        <p className="text-muted-foreground">OrbinSpire Admin Dashboard</p>
      </div>

      {/* Upcoming Events */}
      <section className="space-y-4">
        <h2 className="text-xl font-semibold flex items-center gap-2">
          <Calendar className="h-5 w-5" />
          Upcoming Events
        </h2>
        {upcomingEvents === undefined ? (
          <p className="text-sm text-muted-foreground">Loading events...</p>
        ) : upcomingEvents.length === 0 ? (
          <p className="text-sm text-muted-foreground">No upcoming events</p>
        ) : (
          <div className="space-y-2">
            {upcomingEvents.slice(0, 5).map((event) => (
              <Card key={event._id} className="py-0 gap-0">
                <CardContent className="flex items-center justify-between py-3">
                  <div className="space-y-1">
                    <p className="font-medium">{event.title}</p>
                    <p className="text-sm text-muted-foreground">
                      {new Date(event.startDate).toLocaleDateString()} at{" "}
                      {new Date(event.startDate).toLocaleTimeString([], {
                        hour: "2-digit",
                        minute: "2-digit",
                      })}
                    </p>
                  </div>
                  <div className="flex items-center gap-2 text-sm">
                    <span className="rounded-md bg-secondary px-2 py-1 text-xs font-medium uppercase">
                      {event.gameType}
                    </span>
                    {event.format && (
                      <span className="text-muted-foreground">
                        {event.format}
                      </span>
                    )}
                    {event.entryFee != null && (
                      <span className="font-medium">
                        ${event.entryFee.toFixed(2)}
                      </span>
                    )}
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        )}
      </section>

      {/* Quick Customer Lookup */}
      <section className="space-y-4">
        <h2 className="text-xl font-semibold">Quick Lookup</h2>
        <div className="relative">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            placeholder="Search by name or phone number..."
            className="pl-9"
          />
        </div>
        {searchTerm && (
          <div className="space-y-2">
            {customers === undefined ? (
              <p className="text-sm text-muted-foreground py-2 text-center">
                Searching...
              </p>
            ) : customers.length === 0 ? (
              <p className="text-sm text-muted-foreground py-2 text-center">
                No customers found
              </p>
            ) : (
              customers.map((customer) => (
                <Card
                  key={customer._id}
                  className="py-0 gap-0 cursor-pointer transition-colors hover:bg-muted/50"
                  onClick={() =>
                    navigate({
                      to: "/admin/credit/$customerId",
                      params: { customerId: customer._id },
                    })
                  }
                >
                  <CardContent className="flex items-center justify-between py-3">
                    <div>
                      <p className="font-medium">
                        {customer.firstName} {customer.lastName}
                      </p>
                      <p className="text-sm text-muted-foreground">
                        {customer.phoneNumber}
                      </p>
                    </div>
                    <span className="text-muted-foreground">&rarr;</span>
                  </CardContent>
                </Card>
              ))
            )}
          </div>
        )}
      </section>
    </div>
  );
}
