import { useState } from "react";
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
  Calendar,
  Users,
  DollarSign,
  Gamepad2,
  Swords,
  BookOpen,
  Box,
  Navigation,
  ChevronLeft,
  ChevronRight,
} from "lucide-react";
import {
  startOfMonth,
  endOfMonth,
  startOfWeek,
  endOfWeek,
  eachDayOfInterval,
  isSameMonth,
  isSameDay,
  addMonths,
  subMonths,
  format,
} from "date-fns";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";

export const Route = createFileRoute("/")({
  component: LandingPage,
});

const GAME_TYPE_COLORS: Record<string, { bg: string; text: string; dot: string }> = {
  mtg: { bg: "bg-purple-600", text: "text-white", dot: "bg-purple-600" },
  pokemon: { bg: "bg-yellow-500", text: "text-gray-900", dot: "bg-yellow-500" },
  yugioh: { bg: "bg-red-600", text: "text-white", dot: "bg-red-600" },
};

function getGameTypeBadge(gameType: string) {
  const key = gameType.toLowerCase();
  const colors = GAME_TYPE_COLORS[key] ?? {
    bg: "bg-gray-600",
    text: "text-white",
    dot: "bg-gray-600",
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

const NAV_LINKS = [
  { href: "#about", label: "About" },
  { href: "#events", label: "Events" },
  { href: "#contact", label: "Contact" },
];

const BRAND_LOGOS = [
  { src: "/img/flesh-and-blood-tcg.jpeg", alt: "Flesh and Blood", bg: "bg-white" },
  {
    src: "/img/riftbound-league-of-legends.jpeg",
    alt: "Riftbound - League of Legends",
    bg: "bg-slate-800",
  },
  { src: "/img/gundam-card-game.jpeg", alt: "Gundam Card Game", bg: "bg-white" },
  { src: "/img/warhammer.jpeg", alt: "Warhammer", bg: "bg-white" },
  { src: "/img/d20-tabletop-rpg.jpeg", alt: "Tabletop RPGs", bg: "bg-white" },
  { src: "/img/gunpla-model-kits.jpeg", alt: "Gunpla", bg: "bg-gray-900" },
];

const WEEKDAYS = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];

function LandingPage() {
  const events = useQuery(api.events.listUpcoming);
  const nextEvent = events?.[0];

  const dbHours = useQuery(api.storeHours.list);
  const hours = dbHours ?? [
    { days: "Monday - Thursday", hours: "12:00 PM - 9:00 PM" },
    { days: "Friday", hours: "12:00 PM - 10:00 PM" },
    { days: "Saturday", hours: "11:00 AM - 10:00 PM" },
    { days: "Sunday", hours: "12:00 PM - 7:00 PM" },
  ];

  const [currentMonth, setCurrentMonth] = useState(new Date());
  const [selectedEvent, setSelectedEvent] = useState<typeof nextEvent | null>(null);

  const today = new Date();
  const minMonth = subMonths(startOfMonth(today), 2);
  const maxMonth = addMonths(startOfMonth(today), 2);

  const monthStart = startOfMonth(currentMonth);
  const monthEnd = endOfMonth(currentMonth);
  const calendarStart = startOfWeek(monthStart);
  const calendarEnd = endOfWeek(monthEnd);
  const calendarDays = eachDayOfInterval({ start: calendarStart, end: calendarEnd });

  // Pad to exactly 42 days (6 rows) if needed
  while (calendarDays.length < 42) {
    const lastDay = calendarDays[calendarDays.length - 1];
    calendarDays.push(new Date(lastDay.getFullYear(), lastDay.getMonth(), lastDay.getDate() + 1));
  }

  const canGoPrev = startOfMonth(currentMonth) > minMonth;
  const canGoNext = startOfMonth(currentMonth) < maxMonth;

  const calendarEvents = useQuery(api.events.listByRange, {
    start: calendarStart.getTime(),
    end: calendarEnd.getTime(),
  });

  function getEventsForDay(day: Date) {
    if (!calendarEvents) return [];
    return calendarEvents.filter((event) => isSameDay(new Date(event.startDate), day));
  }

  return (
    <div className="min-h-screen bg-white text-stone-800">
      {/* Navigation */}
      <nav className="sticky top-0 z-50 border-b border-stone-200 bg-white/90 backdrop-blur-md">
        <div className="mx-auto flex max-w-6xl items-center justify-between px-4 py-4">
          <a
            href="#"
            className="text-xl font-bold tracking-tight text-stone-900"
          >
            OrbInSpire Games
          </a>
          <div className="hidden gap-6 sm:flex">
            {NAV_LINKS.map((link) => (
              <a
                key={link.href}
                href={link.href}
                className="text-sm font-medium text-stone-500 transition-colors hover:text-purple-700"
              >
                {link.label}
              </a>
            ))}
          </div>
        </div>
      </nav>

      {/* Hero Section */}
      <section className="relative overflow-hidden bg-gradient-to-b from-purple-50 via-white to-white py-16 sm:py-24 lg:py-28">
        <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_top,_var(--tw-gradient-stops))] from-amber-100/40 via-transparent to-transparent" />
        <div className="relative mx-auto max-w-5xl px-4">
          <div className="flex flex-col items-center gap-10 lg:flex-row lg:gap-16">
            {/* Logo & Text */}
            <div className="flex-1 text-center lg:text-left">
              <img
                src="/img/orbinspire-logo.jpeg"
                alt="OrbInSpire Games"
                className="mx-auto h-48 w-auto sm:h-56 lg:mx-0 lg:h-64"
              />
              <p className="mt-6 text-lg leading-relaxed text-stone-600 sm:text-xl">
                North Fort Worth's game shop for card games, wargaming,
                models, and more. Look for the mural on the wall!
              </p>

              {/* Credentials */}
              <div className="mt-8 flex items-center justify-center gap-8 lg:justify-start">
                <img
                  src="/img/wizards-play-network.jpeg"
                  alt="Wizards Play Network"
                  className="h-16 w-auto sm:h-20"
                />
                <img
                  src="/img/play-pokemon.jpeg"
                  alt="Play! Pokemon"
                  className="h-12 w-auto rounded sm:h-14"
                />
              </div>
            </div>

            {/* Hours, Location & Next Event */}
            <div className="w-full flex-shrink-0 space-y-4 lg:w-80">
              <div className="rounded-xl border border-stone-200 bg-white p-5 shadow-sm">
                <div className="flex items-center gap-2">
                  <Clock className="h-4 w-4 text-purple-600" />
                  <h3 className="text-sm font-semibold text-stone-900">
                    Store Hours
                  </h3>
                </div>
                <div className="mt-3 space-y-2">
                  {hours.map((entry) => (
                    <div
                      key={entry.days}
                      className="flex items-center justify-between"
                    >
                      <span className="text-xs font-medium text-stone-600">
                        {entry.days}
                      </span>
                      <span className="text-xs text-stone-500">
                        {entry.hours}
                      </span>
                    </div>
                  ))}
                </div>
              </div>
              <div className="rounded-xl border border-stone-200 bg-white p-5 shadow-sm">
                <div className="flex items-center gap-2">
                  <MapPin className="h-4 w-4 text-purple-600" />
                  <h3 className="text-sm font-semibold text-stone-900">
                    Location
                  </h3>
                </div>
                <p className="mt-3 text-sm text-stone-700">
                  5970 Park Vista Cir, Unit 178B
                </p>
                <p className="text-sm text-stone-700">Fort Worth, TX 76244</p>
                <a
                  href="https://www.google.com/maps/dir/?api=1&destination=5970+Park+Vista+Cir+Fort+Worth+TX+76244"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="mt-3 inline-flex items-center gap-1.5 text-xs font-medium text-purple-600 transition-colors hover:text-purple-800"
                >
                  <Navigation className="h-3 w-3" />
                  Get Directions
                </a>
              </div>

              {/* Next Event Card */}
              <div className="rounded-xl border border-stone-200 bg-white p-5 shadow-sm">
                <div className="flex items-center gap-2">
                  <Calendar className="h-4 w-4 text-purple-600" />
                  <h3 className="text-sm font-semibold text-stone-900">
                    Next Event
                  </h3>
                </div>
                {nextEvent ? (
                  <>
                    <p className="mt-3 text-sm font-semibold text-stone-900">
                      {nextEvent.title}
                    </p>
                    <span
                      className={`mt-1.5 inline-block rounded-full px-2 py-0.5 text-xs font-medium ${getGameTypeBadge(nextEvent.gameType).bg} ${getGameTypeBadge(nextEvent.gameType).text}`}
                    >
                      {getGameTypeBadge(nextEvent.gameType).label}
                    </span>
                    <div className="mt-2 flex items-center gap-1.5 text-xs text-stone-500">
                      <Calendar className="h-3 w-3" />
                      <span>{formatEventDate(nextEvent.startDate)}</span>
                    </div>
                    <div className="mt-1 flex items-center gap-1.5 text-xs text-stone-500">
                      <Clock className="h-3 w-3" />
                      <span>
                        {formatEventTime(nextEvent.startDate)} -{" "}
                        {formatEventTime(nextEvent.endDate)}
                      </span>
                    </div>
                  </>
                ) : (
                  <p className="mt-3 text-xs text-stone-400">
                    No upcoming events
                  </p>
                )}
                <a
                  href="#events"
                  className="mt-3 inline-flex items-center gap-1.5 text-xs font-medium text-purple-600 transition-colors hover:text-purple-800"
                >
                  View All Events
                  <ChevronRight className="h-3 w-3" />
                </a>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Brand Logos Strip */}
      <section className="border-y border-stone-200 bg-stone-50 py-8 sm:py-10">
        <div className="mx-auto max-w-5xl px-4">
          <div className="flex flex-wrap items-center justify-center gap-6 sm:gap-10">
            {BRAND_LOGOS.map((brand) => (
              <div
                key={brand.alt}
                className={`flex h-24 w-36 items-center justify-center overflow-hidden rounded-xl p-3 transition-transform duration-200 hover:scale-110 sm:h-28 sm:w-44 ${brand.bg}`}
              >
                <img
                  src={brand.src}
                  alt={brand.alt}
                  className="h-full w-full object-contain"
                />
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Events Calendar Section */}
      <section id="events" className="bg-white py-16 sm:py-24">
        <div className="mx-auto max-w-4xl px-4">
          <h2 className="text-center text-3xl font-bold text-stone-900 sm:text-4xl">
            Events Calendar
          </h2>
          <div className="mx-auto mt-2 h-1 w-16 rounded bg-purple-600" />

          <div className="mt-12">
            {/* Calendar Navigation */}
            <div className="flex items-center justify-between">
              <button
                onClick={() => setCurrentMonth((m) => subMonths(m, 1))}
                disabled={!canGoPrev}
                className="flex h-9 w-9 items-center justify-center rounded-lg border border-stone-200 text-stone-600 transition-colors hover:bg-stone-50 disabled:cursor-not-allowed disabled:opacity-30"
              >
                <ChevronLeft className="h-4 w-4" />
              </button>
              <h3 className="text-lg font-semibold text-stone-900">
                {format(currentMonth, "MMMM yyyy")}
              </h3>
              <button
                onClick={() => setCurrentMonth((m) => addMonths(m, 1))}
                disabled={!canGoNext}
                className="flex h-9 w-9 items-center justify-center rounded-lg border border-stone-200 text-stone-600 transition-colors hover:bg-stone-50 disabled:cursor-not-allowed disabled:opacity-30"
              >
                <ChevronRight className="h-4 w-4" />
              </button>
            </div>

            {/* Weekday Headers */}
            <div className="mt-4 grid grid-cols-7">
              {WEEKDAYS.map((day) => (
                <div
                  key={day}
                  className="py-2 text-center text-xs font-semibold text-stone-400"
                >
                  {day}
                </div>
              ))}
            </div>

            {/* Calendar Grid */}
            {calendarEvents === undefined ? (
              <div className="flex justify-center py-12">
                <div className="h-8 w-8 animate-spin rounded-full border-2 border-purple-600 border-t-transparent" />
              </div>
            ) : (
              <div className="grid grid-cols-7 border-l border-t border-stone-200">
                {calendarDays.map((day, i) => {
                  const dayEvents = getEventsForDay(day);
                  const isCurrentMonth = isSameMonth(day, currentMonth);
                  const isToday = isSameDay(day, today);

                  return (
                    <div
                      key={i}
                      className={`min-h-[4.5rem] border-b border-r border-stone-200 p-1 sm:min-h-[5.5rem] sm:p-2 ${
                        !isCurrentMonth ? "bg-stone-50" : "bg-white"
                      }`}
                    >
                      <span
                        className={`inline-flex h-6 w-6 items-center justify-center rounded-full text-xs sm:text-sm ${
                          isToday
                            ? "bg-purple-600 font-bold text-white"
                            : isCurrentMonth
                              ? "font-medium text-stone-700"
                              : "text-stone-300"
                        }`}
                      >
                        {format(day, "d")}
                      </span>
                      <div className="mt-0.5 space-y-0.5">
                        {/* Mobile: show dots only */}
                        <div className="flex flex-wrap gap-0.5 sm:hidden">
                          {dayEvents.map((event) => {
                            const badge = getGameTypeBadge(event.gameType);
                            return (
                              <button
                                key={event._id}
                                onClick={() => setSelectedEvent(event)}
                                className={`h-2 w-2 rounded-full ${badge.dot}`}
                                aria-label={event.title}
                              />
                            );
                          })}
                        </div>
                        {/* Desktop: show small pills */}
                        <div className="hidden sm:block">
                          {dayEvents.slice(0, 2).map((event) => {
                            const badge = getGameTypeBadge(event.gameType);
                            return (
                              <button
                                key={event._id}
                                onClick={() => setSelectedEvent(event)}
                                className={`mb-0.5 block w-full truncate rounded px-1 py-0.5 text-left text-[10px] font-medium leading-tight transition-opacity hover:opacity-80 ${badge.bg} ${badge.text}`}
                              >
                                {event.title}
                              </button>
                            );
                          })}
                          {dayEvents.length > 2 && (
                            <button
                              onClick={() => setSelectedEvent(dayEvents[2])}
                              className="block w-full truncate px-1 text-left text-[10px] font-medium text-purple-600"
                            >
                              +{dayEvents.length - 2} more
                            </button>
                          )}
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </div>
      </section>

      {/* Event Detail Modal */}
      <Dialog open={!!selectedEvent} onOpenChange={(open) => !open && setSelectedEvent(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{selectedEvent?.title}</DialogTitle>
          </DialogHeader>
          {selectedEvent && (
            <div className="space-y-4">
              <span
                className={`inline-block rounded-full px-2.5 py-0.5 text-xs font-medium ${getGameTypeBadge(selectedEvent.gameType).bg} ${getGameTypeBadge(selectedEvent.gameType).text}`}
              >
                {getGameTypeBadge(selectedEvent.gameType).label}
              </span>

              <div className="space-y-2 text-sm text-stone-600">
                <div className="flex items-center gap-2">
                  <Calendar className="h-4 w-4 text-purple-600" />
                  <span>{formatEventDate(selectedEvent.startDate)}</span>
                </div>
                <div className="flex items-center gap-2">
                  <Clock className="h-4 w-4 text-purple-600" />
                  <span>
                    {formatEventTime(selectedEvent.startDate)} -{" "}
                    {formatEventTime(selectedEvent.endDate)}
                  </span>
                </div>
                {selectedEvent.format && (
                  <div className="flex items-center gap-2">
                    <Gamepad2 className="h-4 w-4 text-purple-600" />
                    <span>{selectedEvent.format}</span>
                  </div>
                )}
                {selectedEvent.entryFee !== undefined && (
                  <div className="flex items-center gap-2">
                    <DollarSign className="h-4 w-4 text-purple-600" />
                    <span>${selectedEvent.entryFee.toFixed(2)} entry</span>
                  </div>
                )}
                {selectedEvent.maxPlayers !== undefined && (
                  <div className="flex items-center gap-2">
                    <Users className="h-4 w-4 text-purple-600" />
                    <span>{selectedEvent.maxPlayers} players max</span>
                  </div>
                )}
              </div>

              {selectedEvent.description && (
                <p className="text-sm leading-relaxed text-stone-500">
                  {selectedEvent.description}
                </p>
              )}
            </div>
          )}
        </DialogContent>
      </Dialog>

      {/* About Section */}
      <section id="about" className="bg-stone-50 py-16 sm:py-24">
        <div className="mx-auto max-w-4xl px-4">
          <h2 className="text-center text-3xl font-bold text-stone-900 sm:text-4xl">
            About Us
          </h2>
          <div className="mx-auto mt-2 h-1 w-16 rounded bg-purple-600" />
          <p className="mt-8 text-center text-lg leading-relaxed text-stone-500">
            Welcome to OrbInSpire Games in North Fort Worth — your local
            destination for trading card games, wargaming, collectibles, and
            model kits. Whether you're a seasoned player or just starting your
            collection, we have everything you need.
          </p>
          <div className="mt-12 grid gap-6 sm:grid-cols-2 lg:grid-cols-4">
            <div className="rounded-xl border border-stone-200 bg-white p-6 text-center shadow-sm">
              <Gamepad2 className="mx-auto h-8 w-8 text-purple-600" />
              <h3 className="mt-4 font-semibold text-stone-900">
                Trading Card Games
              </h3>
              <p className="mt-2 text-sm text-stone-500">
                Booster packs, singles, decks, and accessories for all major
                TCGs.
              </p>
            </div>
            <div className="rounded-xl border border-stone-200 bg-white p-6 text-center shadow-sm">
              <Swords className="mx-auto h-8 w-8 text-purple-600" />
              <h3 className="mt-4 font-semibold text-stone-900">Wargames</h3>
              <p className="mt-2 text-sm text-stone-500">
                Warhammer miniatures, paints, tools, and terrain for tabletop
                battles.
              </p>
            </div>
            <div className="rounded-xl border border-stone-200 bg-white p-6 text-center shadow-sm">
              <Box className="mx-auto h-8 w-8 text-purple-600" />
              <h3 className="mt-4 font-semibold text-stone-900">
                Models & Kits
              </h3>
              <p className="mt-2 text-sm text-stone-500">
                Gunpla, model kits, and building supplies for hobbyists and
                collectors.
              </p>
            </div>
            <div className="rounded-xl border border-stone-200 bg-white p-6 text-center shadow-sm">
              <BookOpen className="mx-auto h-8 w-8 text-purple-600" />
              <h3 className="mt-4 font-semibold text-stone-900">
                Tabletop RPGs
              </h3>
              <p className="mt-2 text-sm text-stone-500">
                Rulebooks, dice, accessories, and a great space to run your
                campaigns.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* Contact & Social Section */}
      <section id="contact" className="bg-white py-16 sm:py-24">
        <div className="mx-auto max-w-4xl px-4">
          <h2 className="text-center text-3xl font-bold text-stone-900 sm:text-4xl">
            Get In Touch
          </h2>
          <div className="mx-auto mt-2 h-1 w-16 rounded bg-purple-600" />

          <div className="mt-12 grid gap-8 sm:grid-cols-2">
            {/* Contact Info */}
            <div className="rounded-xl border border-stone-200 bg-white p-6 shadow-sm">
              <h3 className="text-lg font-semibold text-stone-900">
                Contact Us
              </h3>
              <div className="mt-6 space-y-4">
                <a
                  href="tel:+16823721837"
                  className="flex items-center gap-3 text-stone-600 transition-colors hover:text-purple-700"
                >
                  <Phone className="h-5 w-5 text-purple-600" />
                  <span>(682) 372-1837</span>
                </a>
                <a
                  href="mailto:orbinspiregames@gmail.com"
                  className="flex items-center gap-3 text-stone-600 transition-colors hover:text-purple-700"
                >
                  <Mail className="h-5 w-5 text-purple-600" />
                  <span>orbinspiregames@gmail.com</span>
                </a>
                <div className="flex items-center gap-3 text-stone-600">
                  <MapPin className="h-5 w-5 text-purple-600" />
                  <span>
                    5970 Park Vista Cir, Unit 178B, Fort Worth, TX 76244
                  </span>
                </div>
              </div>
            </div>

            {/* Social Links */}
            <div className="rounded-xl border border-stone-200 bg-white p-6 shadow-sm">
              <h3 className="text-lg font-semibold text-stone-900">
                Follow Us
              </h3>
              <p className="mt-2 text-sm text-stone-500">
                Stay updated on events, new arrivals, and community happenings.
              </p>
              <div className="mt-6 flex gap-4">
                <a
                  href="https://www.instagram.com/orbinspiregames/"
                  target="_blank"
                  rel="noopener noreferrer"
                  aria-label="Instagram"
                  className="flex h-12 w-12 items-center justify-center rounded-lg border border-stone-200 bg-stone-50 text-stone-500 transition-colors hover:border-purple-600 hover:text-purple-600"
                >
                  <Instagram className="h-5 w-5" />
                </a>
                <a
                  href="https://www.facebook.com/profile.php?id=61577208479338"
                  target="_blank"
                  rel="noopener noreferrer"
                  aria-label="Facebook"
                  className="flex h-12 w-12 items-center justify-center rounded-lg border border-stone-200 bg-stone-50 text-stone-500 transition-colors hover:border-purple-600 hover:text-purple-600"
                >
                  <Facebook className="h-5 w-5" />
                </a>
                <a
                  href="https://discord.gg/U5QBUQhw2U"
                  target="_blank"
                  rel="noopener noreferrer"
                  aria-label="Discord"
                  className="flex h-12 w-12 items-center justify-center rounded-lg border border-stone-200 bg-stone-50 text-stone-500 transition-colors hover:border-purple-600 hover:text-purple-600"
                >
                  <svg
                    className="h-5 w-5"
                    viewBox="0 0 24 24"
                    fill="currentColor"
                  >
                    <path d="M20.317 4.37a19.791 19.791 0 0 0-4.885-1.515.074.074 0 0 0-.079.037c-.21.375-.444.864-.608 1.25a18.27 18.27 0 0 0-5.487 0 12.64 12.64 0 0 0-.617-1.25.077.077 0 0 0-.079-.037A19.736 19.736 0 0 0 3.677 4.37a.07.07 0 0 0-.032.027C.533 9.046-.32 13.58.099 18.057a.082.082 0 0 0 .031.057 19.9 19.9 0 0 0 5.993 3.03.078.078 0 0 0 .084-.028c.462-.63.874-1.295 1.226-1.994a.076.076 0 0 0-.041-.106 13.107 13.107 0 0 1-1.872-.892.077.077 0 0 1-.008-.128 10.2 10.2 0 0 0 .372-.292.074.074 0 0 1 .077-.01c3.928 1.793 8.18 1.793 12.062 0a.074.074 0 0 1 .078.01c.12.098.246.198.373.292a.077.077 0 0 1-.006.127 12.299 12.299 0 0 1-1.873.892.077.077 0 0 0-.041.107c.36.698.772 1.362 1.225 1.993a.076.076 0 0 0 .084.028 19.839 19.839 0 0 0 6.002-3.03.077.077 0 0 0 .032-.054c.5-5.177-.838-9.674-3.549-13.66a.061.061 0 0 0-.031-.03zM8.02 15.33c-1.183 0-2.157-1.085-2.157-2.419 0-1.333.956-2.419 2.157-2.419 1.21 0 2.176 1.096 2.157 2.42 0 1.333-.956 2.418-2.157 2.418zm7.975 0c-1.183 0-2.157-1.085-2.157-2.419 0-1.333.955-2.419 2.157-2.419 1.21 0 2.176 1.096 2.157 2.42 0 1.333-.946 2.418-2.157 2.418z" />
                  </svg>
                </a>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="border-t border-stone-200 bg-white py-8">
        <div className="mx-auto max-w-4xl px-4 text-center">
          <p className="text-sm font-semibold text-stone-600">
            OrbInSpire Games
          </p>
          <p className="mt-1 text-sm text-stone-400">
            &copy; 2026 OrbInSpire Games. All rights reserved.
          </p>
          <p className="mt-1 text-xs text-stone-400">
            5970 Park Vista Cir, Unit 178B, Fort Worth, TX 76244
          </p>
        </div>
      </footer>
    </div>
  );
}
