import Link from "next/link";
import { LargeTitle } from "./components/AppShell";
import { buttonPrimary, focusRing } from "./components/ui";

export default function NotFound() {
  return (
    <main className="mx-auto flex max-w-[880px] flex-col gap-5 px-4 sm:px-6">
      <LargeTitle title="Page Not Found" subtitle="This address doesn’t exist in CipherMesh. Nothing you checked was affected." />
      <div>
        <Link href="/check" className={`${buttonPrimary} ${focusRing}`}>
          Go to Check
        </Link>
      </div>
    </main>
  );
}
