"use client";

import { LocaleProvider } from "@/lib/i18n/context";
import { PerfTestPage } from "@/components/perf-test/perf-test-page";

export default function Home() {
  return (
    <LocaleProvider>
      <PerfTestPage />
    </LocaleProvider>
  );
}
