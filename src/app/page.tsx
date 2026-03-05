import { Suspense } from "react";
import { HomeContent } from "./HomeContent";
import { Loader2 } from "lucide-react";

export default function HomePage() {
  return (
    <Suspense fallback={
      <div className="min-h-screen flex items-center justify-center bg-white dark:bg-black">
        <Loader2 className="animate-spin text-blue-500" size={48} />
      </div>
    }>
      <HomeContent />
    </Suspense>
  );
}
