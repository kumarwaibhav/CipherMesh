import type { Metadata } from "next";
import { Approvals } from "../components/Approvals";

export const metadata: Metadata = {
  title: "Approvals",
  description: "Prompts held for a person to approve or deny.",
};

export default function ApprovalsPage() {
  return <Approvals />;
}
