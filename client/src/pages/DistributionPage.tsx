import DashboardLayout from "@/components/DashboardLayout";

export default function DistributionPage() {
  return (
    <DashboardLayout>
      <div className="space-y-8 h-full flex flex-col">
        <div>
          <h1 className="text-2xl font-serif font-semibold tracking-tight text-foreground">
            Distribution - Festivals
          </h1>
          <p className="text-sm text-muted-foreground mt-1">
            Gérez les festivals et les événements
          </p>
        </div>

        <div className="flex-1 rounded-lg border border-border overflow-hidden">
          <iframe
            src="https://festcalendar-7owazg9j.manus.space"
            title="FestCalendar"
            className="w-full h-full border-0"
            allow="same-origin"
          />
        </div>
      </div>
    </DashboardLayout>
  );
}
