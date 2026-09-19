import { protectedModuleStub } from "@/lib/module-stub";

export function GET() {
  return protectedModuleStub("activity-logs");
}
