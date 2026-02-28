import { Loader2 } from "lucide-react";

export default function Loading() {
  return (
    <div className="min-h-screen flex items-center justify-center bg-white dark:bg-black">
      <Loader2 className="animate-spin text-blue-500" size={48} />
    </div>
  );
}
