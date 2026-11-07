import { createFileRoute } from "@tanstack/react-router";
import { PdfDesk } from "@/components/pdf-desk";

export const Route = createFileRoute("/")({ component: PdfDesk });
