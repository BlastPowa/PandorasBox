import { PBoxLoader } from "@/components/pwa/pbox-loader";

export default function Loading() {
  return <div className="grid min-h-[70svh] place-items-center"><PBoxLoader label="Loading your next world" /></div>;
}
