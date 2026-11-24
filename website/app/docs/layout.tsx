import { DocsSidebar } from "@/components/DocsSidebar";
import { Toc } from "@/components/Toc";

export default function DocsLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="wrap">
      <div className="frame docs">
        <DocsSidebar />
        <main className="doc">{children}</main>
        <Toc />
      </div>
    </div>
  );
}
