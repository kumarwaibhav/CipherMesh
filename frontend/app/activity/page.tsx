import type { Metadata } from "next";
import { Activity } from "../components/Activity";

export const metadata: Metadata = {
  title: "Activity",
  description: "What the CipherMesh gateway has checked, cleaned, held and stopped.",
};

export default function ActivityPage() {
  return <Activity />;
}
