import { createFileRoute } from "@tanstack/react-router";
import { useQuery } from "convex/react";
import { api } from "@/convex";
import {
  MapPin,
  Clock,
  Phone,
  Mail,
  Instagram,
  Facebook,
  MessageCircle,
  Calendar,
  Users,
  DollarSign,
  Gamepad2,
} from "lucide-react";

export const Route = createFileRoute("/")({
  component: LandingPage,
});

const GAME_TYPE_COLORS: Record<string, { bg: string; text: string }> = {
  mtg: { bg: "bg-purple-600", text: "text-white" },
  pokemon: { bg: "bg-yellow-500", text: "text-gray-900" },
  yugioh: { bg: "bg-red-600", text: "text-white" },
};

function getGameTypeBadge(gameType: string) {
  const key = gameType.toLowerCase();
  const colors = GAME_TYPE_COLORS[key] ?? {
    bg: "bg-gray-600",
    text: "text-white",
  };
  const labels: Record<string, string> = {
    mtg: "Magic: The Gathering",
    pokemon: "Pokemon",
    yugioh: "Yu-Gi-Oh!",
  };
  const label = labels[key] ?? gameType;
  return { ...colors, label };
}

function formatEventDate(timestamp: number) {
  const date = new Date(timestamp);
  return date.toLocaleDateString("en-US", {
    weekday: "long",
    year: "numeric",
    month: "long",
    day: "numeric",
  });
}

function formatEventTime(timestamp: number) {
  const date = new Date(timestamp);
  return date.toLocaleTimeString("en-US", {
    hour: "numeric",
    minute: "2-digit",
    hour12: true,
  });
}

const HOURS = [
  { days: "Monday - Thursday", hours: "11:00 AM - 9:00 PM" },
  { days: "Friday", hours: "11:00 AM - 10:00 PM" },
  { days: "Saturday", hours: "10:00 AM - 10:00 PM" },
  { days: "Sunday", hours: "12:00 PM - 7:00 PM" },
];

const NAV_LINKS = [
  { href: "#about", label: "About" },
  { href: "#hours", label: "Hours" },
  { href: "#events", label: "Events" },
  { href: "#contact", label: "Contact" },
];

function LandingPage() {
  const events = useQuery(api.events.listUpcoming);

  return (
    <div className="min-h-screen bg-gray-950 text-gray-100">
      {/* Navigation */}
      <nav className="sticky top-0 z-50 border-b border-gray-800 bg-gray-950/90 backdrop-blur-md">
        <div className="mx-auto flex max-w-6xl items-center justify-between px-4 py-4">
          <a href="#" className="text-xl font-bold tracking-tight text-white">
            OrbinSpire
          </a>
          <div className="hidden gap-6 sm:flex">
            {NAV_LINKS.map((link) => (
              <a
                key={link.href}
                href={link.href}
                className="text-sm font-medium text-gray-400 transition-colors hover:text-white"
              >
                {link.label}
              </a>
            ))}
          </div>
        </div>
      </nav>

      {/* Hero Section */}
      <section className="relative overflow-hidden bg-gray-950 py-24 sm:py-32 lg:py-40">
        <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_center,_var(--tw-gradient-stops))] from-purple-900/20 via-gray-950 to-gray-950" />
        <div className="relative mx-auto max-w-4xl px-4 text-center">
          <h1 className="text-5xl font-extrabold tracking-tight text-white sm:text-6xl lg:text-7xl">
            OrbinSpire
          </h1>
          <p className="mt-4 text-lg text-purple-300 sm:text-xl lg:text-2xl">
            Your Premier Card Game Destination
          </p>
          <div className="mt-8 flex flex-wrap justify-center gap-3">
            <span className="rounded-full bg-purple-600/20 px-4 py-1.5 text-sm font-medium text-purple-300 ring-1 ring-purple-500/30">
              Magic: The Gathering
            </span>
            <span className="rounded-full bg-yellow-600/20 px-4 py-1.5 text-sm font-medium text-yellow-300 ring-1 ring-yellow-500/30">
              Pokemon
            </span>
            <span className="rounded-full bg-red-600/20 px-4 py-1.5 text-sm font-medium text-red-300 ring-1 ring-red-500/30">
              Yu-Gi-Oh!
            </span>
          </div>
          <div className="mt-10">
            <a
              href="#events"
              className="inline-flex items-center gap-2 rounded-lg bg-purple-600 px-6 py-3 text-sm font-semibold text-white transition-colors hover:bg-purple-500"
            >
              <Calendar className="h-4 w-4" />
              View Upcoming Events
            </a>
          </div>
        </div>
      </section>

      {/* About Section */}
      <section id="about" className="bg-gray-900 py-16 sm:py-24">
        <div className="mx-auto max-w-4xl px-4">
          <h2 className="text-center text-3xl font-bold text-white sm:text-4xl">
            About Us
          </h2>
          <div className="mx-auto mt-2 h-1 w-16 rounded bg-purple-600" />
          <p className="mt-8 text-center text-lg leading-relaxed text-gray-300">
            Welcome to OrbinSpire — your local card game shop specializing in
            Magic: The Gathering, Pokemon, Yu-Gi-Oh!, and more. Whether you're a
            seasoned player or just starting your collection, we have everything
            you need.
          </p>
          <div className="mt-12 grid gap-6 sm:grid-cols-3">
            <div className="rounded-xl border border-gray-800 bg-gray-950 p-6 text-center">
              <Gamepad2 className="mx-auto h-8 w-8 text-purple-400" />
              <h3 className="mt-4 font-semibold text-white">Wide Selection</h3>
              <p className="mt-2 text-sm text-gray-400">
                Booster packs, singles, decks, and accessories for all major
                TCGs.
              </p>
            </div>
            <div className="rounded-xl border border-gray-800 bg-gray-950 p-6 text-center">
              <Calendar className="mx-auto h-8 w-8 text-purple-400" />
              <h3 className="mt-4 font-semibold text-white">Weekly Events</h3>
              <p className="mt-2 text-sm text-gray-400">
                Tournaments, casual play nights, and prereleases every week.
              </p>
            </div>
            <div className="rounded-xl border border-gray-800 bg-gray-950 p-6 text-center">
              <Users className="mx-auto h-8 w-8 text-purple-400" />
              <h3 className="mt-4 font-semibold text-white">Community</h3>
              <p className="mt-2 text-sm text-gray-400">
                A welcoming space for players of all skill levels to gather and
                play.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* Hours & Location Section */}
      <section id="hours" className="bg-gray-950 py-16 sm:py-24">
        <div className="mx-auto max-w-4xl px-4">
          <h2 className="text-center text-3xl font-bold text-white sm:text-4xl">
            Hours & Location
          </h2>
          <div className="mx-auto mt-2 h-1 w-16 rounded bg-purple-600" />

          <div className="mt-12 grid gap-8 lg:grid-cols-2">
            {/* Hours */}
            <div className="rounded-xl border border-gray-800 bg-gray-900 p-6">
              <div className="flex items-center gap-3">
                <Clock className="h-5 w-5 text-purple-400" />
                <h3 className="text-lg font-semibold text-white">
                  Store Hours
                </h3>
              </div>
              <div className="mt-6 space-y-3">
                {HOURS.map((entry) => (
                  <div
                    key={entry.days}
                    className="flex items-center justify-between border-b border-gray-800 pb-3 last:border-0 last:pb-0"
                  >
                    <span className="text-sm font-medium text-gray-300">
                      {entry.days}
                    </span>
                    <span className="text-sm text-gray-400">{entry.hours}</span>
                  </div>
                ))}
              </div>
            </div>

            {/* Location */}
            <div className="rounded-xl border border-gray-800 bg-gray-900 p-6">
              <div className="flex items-center gap-3">
                <MapPin className="h-5 w-5 text-purple-400" />
                <h3 className="text-lg font-semibold text-white">Location</h3>
              </div>
              <p className="mt-4 text-gray-300">123 Main Street</p>
              <p className="text-gray-300">Your City, ST 12345</p>

              {/* Map placeholder */}
              <div className="mt-6 flex h-48 items-center justify-center rounded-lg border border-dashed border-gray-700 bg-gray-950">
                <div className="text-center">
                  <MapPin className="mx-auto h-8 w-8 text-gray-600" />
                  <p className="mt-2 text-sm text-gray-500">
                    Google Maps embed coming soon
                  </p>
                  <p className="mt-1 text-xs text-gray-600">
                    123 Main Street, Your City, ST 12345
                  </p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Events Calendar Section */}
      <section id="events" className="bg-gray-900 py-16 sm:py-24">
        <div className="mx-auto max-w-4xl px-4">
          <h2 className="text-center text-3xl font-bold text-white sm:text-4xl">
            Upcoming Events
          </h2>
          <div className="mx-auto mt-2 h-1 w-16 rounded bg-purple-600" />

          <div className="mt-12">
            {events === undefined ? (
              <div className="flex justify-center py-12">
                <div className="h-8 w-8 animate-spin rounded-full border-2 border-purple-600 border-t-transparent" />
              </div>
            ) : events.length === 0 ? (
              <div className="rounded-xl border border-gray-800 bg-gray-950 py-16 text-center">
                <Calendar className="mx-auto h-12 w-12 text-gray-700" />
                <p className="mt-4 text-lg text-gray-400">
                  No upcoming events. Check back soon!
                </p>
              </div>
            ) : (
              <div className="grid gap-4 sm:grid-cols-2">
                {events.map((event) => {
                  const badge = getGameTypeBadge(event.gameType);
                  return (
                    <div
                      key={event._id}
                      className="rounded-xl border border-gray-800 bg-gray-950 p-5 transition-colors hover:border-gray-700"
                    >
                      <div className="flex items-start justify-between gap-3">
                        <h3 className="font-semibold text-white">
                          {event.title}
                        </h3>
                        <span
                          className={`shrink-0 rounded-full px-2.5 py-0.5 text-xs font-medium ${badge.bg} ${badge.text}`}
                        >
                          {badge.label}
                        </span>
                      </div>

                      <div className="mt-3 flex items-center gap-2 text-sm text-gray-400">
                        <Calendar className="h-3.5 w-3.5" />
                        <span>{formatEventDate(event.startDate)}</span>
                      </div>
                      <div className="mt-1 flex items-center gap-2 text-sm text-gray-400">
                        <Clock className="h-3.5 w-3.5" />
                        <span>
                          {formatEventTime(event.startDate)} -{" "}
                          {formatEventTime(event.endDate)}
                        </span>
                      </div>

                      <div className="mt-3 flex flex-wrap gap-3 text-sm text-gray-400">
                        {event.format && (
                          <span className="flex items-center gap-1.5">
                            <Gamepad2 className="h-3.5 w-3.5" />
                            {event.format}
                          </span>
                        )}
                        {event.entryFee !== undefined && (
                          <span className="flex items-center gap-1.5">
                            <DollarSign className="h-3.5 w-3.5" />$
                            {event.entryFee.toFixed(2)} entry
                          </span>
                        )}
                        {event.maxPlayers !== undefined && (
                          <span className="flex items-center gap-1.5">
                            <Users className="h-3.5 w-3.5" />
                            {event.maxPlayers} players max
                          </span>
                        )}
                      </div>

                      {event.description && (
                        <p className="mt-3 text-sm leading-relaxed text-gray-500">
                          {event.description}
                        </p>
                      )}
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </div>
      </section>

      {/* Contact & Social Section */}
      <section id="contact" className="bg-gray-950 py-16 sm:py-24">
        <div className="mx-auto max-w-4xl px-4">
          <h2 className="text-center text-3xl font-bold text-white sm:text-4xl">
            Get In Touch
          </h2>
          <div className="mx-auto mt-2 h-1 w-16 rounded bg-purple-600" />

          <div className="mt-12 grid gap-8 sm:grid-cols-2">
            {/* Contact Info */}
            <div className="rounded-xl border border-gray-800 bg-gray-900 p-6">
              <h3 className="text-lg font-semibold text-white">Contact Us</h3>
              <div className="mt-6 space-y-4">
                <a
                  href="tel:+15551234567"
                  className="flex items-center gap-3 text-gray-300 transition-colors hover:text-purple-400"
                >
                  <Phone className="h-5 w-5 text-purple-400" />
                  <span>(555) 123-4567</span>
                </a>
                <a
                  href="mailto:info@orbinspire.com"
                  className="flex items-center gap-3 text-gray-300 transition-colors hover:text-purple-400"
                >
                  <Mail className="h-5 w-5 text-purple-400" />
                  <span>info@orbinspire.com</span>
                </a>
                <div className="flex items-center gap-3 text-gray-300">
                  <MapPin className="h-5 w-5 text-purple-400" />
                  <span>123 Main Street, Your City, ST 12345</span>
                </div>
              </div>
            </div>

            {/* Social Links */}
            <div className="rounded-xl border border-gray-800 bg-gray-900 p-6">
              <h3 className="text-lg font-semibold text-white">Follow Us</h3>
              <p className="mt-2 text-sm text-gray-400">
                Stay updated on events, new arrivals, and community happenings.
              </p>
              <div className="mt-6 flex gap-4">
                <a
                  href="#"
                  aria-label="Instagram"
                  className="flex h-12 w-12 items-center justify-center rounded-lg border border-gray-800 bg-gray-950 text-gray-400 transition-colors hover:border-purple-600 hover:text-purple-400"
                >
                  <Instagram className="h-5 w-5" />
                </a>
                <a
                  href="#"
                  aria-label="Facebook"
                  className="flex h-12 w-12 items-center justify-center rounded-lg border border-gray-800 bg-gray-950 text-gray-400 transition-colors hover:border-purple-600 hover:text-purple-400"
                >
                  <Facebook className="h-5 w-5" />
                </a>
                <a
                  href="#"
                  aria-label="Discord"
                  className="flex h-12 w-12 items-center justify-center rounded-lg border border-gray-800 bg-gray-950 text-gray-400 transition-colors hover:border-purple-600 hover:text-purple-400"
                >
                  <MessageCircle className="h-5 w-5" />
                </a>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="border-t border-gray-800 bg-gray-950 py-8">
        <div className="mx-auto max-w-4xl px-4 text-center">
          <p className="text-sm text-gray-500">
            &copy; 2026 OrbinSpire. All rights reserved.
          </p>
          <p className="mt-1 text-xs text-gray-600">
            123 Main Street, Your City, ST 12345
          </p>
        </div>
      </footer>
    </div>
  );
}
