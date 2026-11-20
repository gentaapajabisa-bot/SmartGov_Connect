import TicketTracker from "@/components/TicketTracker";
import EmergencyBar from "@/components/EmergencyBar";

export default function LacakPage() {
  return (
    <main className="mx-auto max-w-3xl space-y-8 px-4 py-8">
      <div>
        <h1 className="text-2xl font-bold">Lacak Progres Pengaduan</h1>
        <p className="mt-1 text-sm text-slate-600 dark:text-slate-400">
          Pantau tindak lanjut laporan Anda dari dinas terkait di Kabupaten Purbalingga.
        </p>
      </div>

      <TicketTracker />
      <EmergencyBar />
    </main>
  );
}
