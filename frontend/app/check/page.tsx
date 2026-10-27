import type { Metadata } from "next";
import { Checker } from "../components/Checker";

export const metadata: Metadata = {
  title: "Check",
  description: "Paste what you’re about to send to an AI model and see exactly what it will receive.",
};

export default function CheckPage() {
  return <Checker />;
}
